/**
 * Transaction Manager
 * Gestión de transacciones seguras con validación y sandbox
 * 
 * CAMBIOS CAPA 1:
 * - Permission, SimulationResult, FileSystemOperation movidos a tipos locales
 * - Transaction.permissions y Transaction.simulationResult eliminados
 * - Estos datos se manejan internamente en Maps separados
 * - createTransaction simplificado: solo recibe type y targetPath
 */

import { Transaction } from "./types";
import { snapshotManager } from "./snapshots";

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

interface FileSystemOperation {
  id: string;
  type: "read" | "write" | "delete" | "create" | "move" | "copy";
  sourcePath: string;
  targetPath?: string;
  content?: string;
  options?: Record<string, any>;
}

// ============ MANAGER ============

export class TransactionManager {
  private transactions: Map<string, Transaction> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private simulations: Map<string, SimulationResult> = new Map();

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
      [], // TODO: Obtener archivos del contexto
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

    return transaction;
  }

  /**
   * Validar transacción
   */
  async validateTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;

    // TODO: Implementar validaciones
    // 1. Verificar permisos
    // 2. Validar ruta
    // 3. Verificar integridad de archivos
    // 4. Ejecutar simulación

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

    // TODO: Implementar simulación en sandbox
    const result: SimulationResult = {
      success: true,
      warnings: [],
      errors: [],
      affectedFiles: [],
      estimatedSize: 0,
    };

    this.simulations.set(transactionId, result);
    return result;
  }

  /**
   * Ejecutar transacción confirmada
   */
  async executeTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;

    if (transaction.status !== "validated") {
      console.error("Transaction not validated");
      return false;
    }

    try {
      // TODO: Implementar ejecución real
      transaction.status = "executed";
      transaction.executedAt = Date.now();
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
    return true;
  }

  /**
   * Rollback de transacción.
   *
   * Decisión arquitectural (ADR 0002): el caller traduce el `RollbackResult`
   * (discriminated union) a `Transaction.status`. Este módulo NO se acopla
   * con `snapshots.ts`; mantiene su responsabilidad: restaurar + reportar.
   *
   * - `result.success === true`            → `transaction.status = "rolled_back"`
   * - `result.success === false`           → `transaction.status = "rollback_failed"`
   *
   * Si `snapshotManager.rollback()` lanza (snapshot no existe o FS no listo),
   * se propaga el error. Pre-condiciones rotas no se silencian.
   */
  async rollbackTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;

    if (!transaction.snapshotId) return false;

    const result = await snapshotManager.rollback(transaction.snapshotId);

    if (result.success) {
      transaction.status = "rolled_back";
      return true;
    } else {
      transaction.status = "rollback_failed";
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

    // Auto-cleanup después de expiración
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
    let hasPermission = false;

    this.permissions.forEach((permission, id) => {
      if (
        permission.type === type &&
        this.pathMatches(permission.resourcePath, resourcePath)
      ) {
        if (permission.temporary && permission.expiresAt && permission.expiresAt < Date.now()) {
          permissionsToDelete.push(id);
        } else {
          hasPermission = true;
        }
      }
    });

    permissionsToDelete.forEach((id) => this.permissions.delete(id));
    return hasPermission;
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
