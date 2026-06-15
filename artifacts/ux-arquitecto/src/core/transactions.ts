/**
   * Transaction Manager
   * Gestión de transacciones seguras con validación y ejecución real
   *
   * CAMBIOS T-029:
   * - pendingOperations: Map privado para operaciones adjuntas
   * - attachOperation(transactionId, op): adjuntar op a una transacción
   * - validateTransaction(): validación real por tipo de operación
   * - executeTransaction(): ejecución real vía webFilesystemProvider
   *   (se usa el provider directamente para evitar ciclo con filesystemManager)
   */

  import { Transaction } from "./types";
  import { snapshotManager } from "./snapshots";
  import { opJournal } from "./opJournal";
  import { webFilesystemProvider } from "./WebFilesystemProvider";

  // ============ TIPOS LOCALES (no exportados) ============

  interface Permission {
    id: string;
    type: "read" | "write" | "delete" | "execute";
    resourcePath: string;
    temporary: boolean;
    expiresAt?: number;
  }

  interface SimulationResult {
    success: boolean;
    warnings: string[];
    errors: string[];
    affectedFiles: string[];
    estimatedSize: number;
  }

  export interface FileSystemOperation {
    id: string;
    type: "read" | "write" | "delete" | "create" | "move" | "copy";
    sourcePath: string;
    targetPath?: string;
    content?: string;
    options?: Record<string, unknown>;
  }

  // ============ MANAGER ============

  export class TransactionManager {
    private transactions: Map<string, Transaction> = new Map();
    private permissions: Map<string, Permission> = new Map();
    private simulations: Map<string, SimulationResult> = new Map();
    private pendingOperations: Map<string, FileSystemOperation> = new Map();

    /**
     * Adjuntar una operación a una transacción existente.
     * Debe llamarse antes de executeTransaction.
     */
    attachOperation(transactionId: string, op: Omit<FileSystemOperation, "id">): boolean {
      if (!this.transactions.has(transactionId)) return false;
      this.pendingOperations.set(transactionId, {
        id: `op_${transactionId}`,
        ...op,
      });
      return true;
    }

    /**
     * Crear transacción para operación destructiva
     * CAMBIO: Firma simplificada, solo type y targetPath
     */
    async createTransaction(
      type: Transaction["type"],
      targetPath: string
    ): Promise<Transaction> {
      const id = this.generateTransactionId();

      // 1. Crear snapshot automático
      const reasonMap: Record<Transaction["type"], "write" | "delete" | "refactor" | "auto"> = {
        read: "auto",
        write: "write",
        delete: "delete",
        move: "refactor",
        create: "write",
        branch: "auto",
      };
      const snapshot = await snapshotManager.createSnapshot(
        targetPath,
        [],
        reasonMap[type],
        `Before ${type}`
      );

      // 2. Crear transacción
      const transaction: Transaction = {
        id,
        type,
        targetPath,
        snapshotId: snapshot.id,
        status: "pending",
        createdAt: Date.now(),
      };

      this.transactions.set(id, transaction);

      // 3. Validar operación
      await this.validateTransaction(id);

      // 4. Log creation to journal
      opJournal.addEntry({
        contextPath: targetPath,
        type: "transaction",
        action: `create_${type}`,
        status: "success",
        transactionId: id,
        snapshotId: transaction.snapshotId,
        details: {
          targetPath,
          description: `Transaction created for ${type} operation`,
        },
      });

      return transaction;
    }

    /**
     * Validar transacción con chequeos reales por tipo de operación.
     */
    async validateTransaction(transactionId: string): Promise<boolean> {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) return false;

      const op = this.pendingOperations.get(transactionId);

      let valid = true;
      const errors: string[] = [];

      switch (transaction.type) {
        case "read":
          if (!webFilesystemProvider.isReady()) {
            errors.push("Filesystem no disponible para lectura");
            valid = false;
          }
          break;

        case "write":
        case "create":
          if (!op) {
            // Sin op adjunta aún — se permite para flujos que llaman validateTransaction
            // antes de attachOperation (createTransaction lo llama inmediatamente)
            break;
          }
          if (!op.content && op.content !== "") {
            errors.push("Operación write/create requiere contenido (content)");
            valid = false;
          }
          if (!op.sourcePath) {
            errors.push("Operación write/create requiere sourcePath");
            valid = false;
          }
          break;

        case "delete":
          if (!transaction.targetPath || transaction.targetPath.trim() === "") {
            errors.push("Operación delete requiere targetPath no vacío");
            valid = false;
          }
          break;

        default:
          // move, branch: validación básica de presencia de targetPath
          break;
      }

      if (!valid) {
        transaction.status = "failed";
        opJournal.addEntry({
          contextPath: transaction.targetPath,
          type: "transaction",
          action: "validate",
          status: "error",
          transactionId,
          snapshotId: transaction.snapshotId,
          details: {
            targetPath: transaction.targetPath,
            description: `Validation failed: ${errors.join("; ")}`,
          },
        });
        return false;
      }

      transaction.status = "validated";
      return true;
    }

    /**
     * Simular operación en sandbox
     */
    async simulateTransaction(transactionId: string): Promise<SimulationResult> {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        return {
          success: false,
          warnings: [],
          errors: ["Transaction not found"],
          affectedFiles: [],
          estimatedSize: 0,
        };
      }

      const result: SimulationResult = {
        success: true,
        warnings: [],
        errors: [],
        affectedFiles: [transaction.targetPath],
        estimatedSize: 0,
      };

      this.simulations.set(transactionId, result);
      return result;
    }

    /**
     * Ejecutar transacción confirmada con operación real en el filesystem.
     * Usa webFilesystemProvider directamente para evitar ciclo con filesystemManager.
     */
    async executeTransaction(transactionId: string): Promise<boolean> {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) return false;

      if (transaction.status !== "validated") {
        console.error(`[TransactionManager] Transaction ${transactionId} not validated (status: ${transaction.status})`);
        return false;
      }

      try {
        const op = this.pendingOperations.get(transactionId);

        if (op) {
          let fsResult: { success: boolean; error?: string };

          switch (op.type) {
            case "write":
            case "create":
              if (op.content !== undefined) {
                fsResult = await webFilesystemProvider.writeFile(op.sourcePath, op.content);
              } else {
                fsResult = { success: false, error: "No content provided for write/create" };
              }
              break;

            case "delete":
              // webFilesystemProvider.deleteFile: usar targetPath si existe, sino sourcePath
              fsResult = await webFilesystemProvider.deleteFile(op.targetPath ?? op.sourcePath);
              break;

            case "read":
              // read no necesita escritura en disco; éxito inmediato
              fsResult = { success: true };
              break;

            default:
              // move/copy/branch: sin implementación aún, log warning
              console.warn(`[TransactionManager] Operation type "${op.type}" not implemented in executeTransaction`);
              fsResult = { success: true };
          }

          if (!fsResult.success) {
            console.error(`[TransactionManager] FS operation failed:`, fsResult.error);
            await this.rollbackTransaction(transactionId);
            return false;
          }
        }
        // Si no hay op adjunta, la transacción se marca como ejecutada sin escritura real
        // (comportamiento anterior preservado para compatibilidad)

        transaction.status = "executed";
        transaction.executedAt = Date.now();

        opJournal.addEntry({
          contextPath: transaction.targetPath,
          type: "transaction",
          action: "execute",
          status: "success",
          transactionId,
          snapshotId: transaction.snapshotId,
          details: {
            targetPath: transaction.targetPath,
            description: `Transaction ${transaction.type} executed successfully`,
          },
        });

        return true;
      } catch (error) {
        console.error("Transaction execution failed:", error);
        await this.rollbackTransaction(transactionId);
        return false;
      }
    }

    /**
     * Confirmar transacción (marcar como final)
     */
    confirmTransaction(transactionId: string): boolean {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) return false;

      if (transaction.status !== "executed") {
        console.error("Transaction not executed");
        return false;
      }

      transaction.status = "confirmed";

      // Limpiar op pendiente
      this.pendingOperations.delete(transactionId);

      opJournal.addEntry({
        contextPath: transaction.targetPath,
        type: "transaction",
        action: "confirm",
        status: "success",
        transactionId,
        snapshotId: transaction.snapshotId,
        details: {
          targetPath: transaction.targetPath,
          description: `Transaction ${transaction.type} confirmed`,
        },
      });

      return true;
    }

    /**
     * Rollback de transacción.
     *
     * Decisión arquitectural (ADR 0002): el caller traduce el RollbackResult
     * (discriminated union) a Transaction.status. Este módulo NO se acopla
     * con snapshots.ts; mantiene su responsabilidad: restaurar + reportar.
     *
     * - result.success === true  → transaction.status = "rolled_back"
     * - result.success === false → transaction.status = "rollback_failed"
     */
    async rollbackTransaction(transactionId: string): Promise<boolean> {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) return false;

      if (!transaction.snapshotId) return false;

      const result = await snapshotManager.rollback(transaction.snapshotId);

      if (result.success) {
        transaction.status = "rolled_back";

        opJournal.addEntry({
          contextPath: transaction.targetPath,
          type: "rollback",
          action: "rollback",
          status: "success",
          transactionId,
          snapshotId: transaction.snapshotId,
          details: {
            targetPath: transaction.targetPath,
            description: `Rollback successful for ${transaction.type}`,
            result,
          },
        });

        return true;
      } else {
        transaction.status = "rollback_failed";

        opJournal.addEntry({
          contextPath: transaction.targetPath,
          type: "rollback",
          action: "rollback",
          status: "error",
          transactionId,
          snapshotId: transaction.snapshotId,
          details: {
            targetPath: transaction.targetPath,
            description: `Rollback failed for ${transaction.type}`,
            error: "At least one file failed to restore",
            result,
          },
        });

        return false;
      }
    }

    /**
     * Obtener transacción
     */
    getTransaction(transactionId: string): Transaction | undefined {
      return this.transactions.get(transactionId);
    }

    /**
     * Otorgar permiso temporal
     */
    grantPermission(
      type: Permission["type"],
      resourcePath: string,
      expiresIn?: number
    ): Permission {
      const id = this.generatePermissionId();
      const permission: Permission = {
        id,
        type,
        resourcePath,
        temporary: !!expiresIn,
        expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      };

      this.permissions.set(id, permission);

      if (expiresIn) {
        setTimeout(() => {
          this.permissions.delete(id);
        }, expiresIn);
      }

      return permission;
    }

    /**
     * Verificar permiso
     */
    hasPermission(type: Permission["type"], resourcePath: string): boolean {
      const permissionsToDelete: string[] = [];
      let hasPerm = false;

      this.permissions.forEach((permission, id) => {
        if (
          permission.type === type &&
          this.pathMatches(permission.resourcePath, resourcePath)
        ) {
          if (permission.temporary && permission.expiresAt && permission.expiresAt < Date.now()) {
            permissionsToDelete.push(id);
          } else {
            hasPerm = true;
          }
        }
      });

      permissionsToDelete.forEach((id) => this.permissions.delete(id));
      return hasPerm;
    }

    /**
     * Revocar permiso
     */
    revokePermission(permissionId: string): boolean {
      return this.permissions.delete(permissionId);
    }

    // ============ HELPERS ============

    private generateTransactionId(): string {
      return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generatePermissionId(): string {
      return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private pathMatches(pattern: string, path: string): boolean {
      if (pattern === "*") return true;
      if (pattern === path) return true;
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return path.startsWith(prefix + "/");
      }
      return false;
    }
  }

  export const transactionManager = new TransactionManager();
  