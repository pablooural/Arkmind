/**
 * Snapshot Manager
 * ────────────────────────────────────────────────────────────────────────────
 * Gestión de snapshots con persistencia en IndexedDB.
 *
 * CAMBIOS (paso 1 — persistencia):
 *   - Snapshots ya NO son sólo en memoria. Se persisten en `snapshotStore` (IndexedDB).
 *   - `hydrate()` carga los snapshots existentes al iniciar el manager.
 *   - `createSnapshot(paths, …)` ahora lee el contenido de cada path y lo guarda.
 *   - `deleteSnapshot()` y `cleanOldSnapshots()` también limpian en IndexedDB.
 *   - El rollback queda como TODO consciente (siguiente paso) — esta capa
 *     deja la estructura lista para implementarlo leyendo desde `snapshotStore`.
 *
 * Reglas:
 *   - El manager se hidrata lazy en la primera operación (no hace falta llamarlo
 *     manualmente, pero `hydrate()` está disponible por si se quiere forzar).
 *   - El path `[]` se acepta y produce un snapshot "vacío" (metadatos sin contenido).
 *     Útil para checkpoints lógicos antes de operaciones estructurales.
 */

import { Snapshot, FileNode, RollbackResult, RollbackFailure } from "./types";
import { snapshotStore, SnapshotRecord } from "./snapshotStore";
import { webFilesystemProvider } from "./WebFilesystemProvider";

export class SnapshotManager {
  /** Caché en memoria (mirror del store). Acelera lecturas. */
  private snapshots: Map<string, Snapshot> = new Map();

  /** Prefijo "lógico" del store. El contenido real vive en IndexedDB. */
  private storePath = ".arkmind-snapshots";

  /** ¿Se ha hidratado desde IndexedDB? */
  private hydrated = false;

  /** Inicialización: carga los snapshots existentes desde IndexedDB. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    if (!snapshotStore.isSupported()) {
      console.warn("[SnapshotManager] IndexedDB no disponible. Snapshots serán sólo en memoria.");
      this.hydrated = true;
      return;
    }
    try {
      const records = await snapshotStore.listSnapshots();
      for (const record of records) {
        this.snapshots.set(record.id, this.recordToSnapshot(record));
      }
      this.hydrated = true;
    } catch (error) {
      console.error("[SnapshotManager] Error hidratando desde IndexedDB:", error);
      // No marcamos hydrated=true para reintentar en la siguiente operación
      throw error;
    }
  }

  /**
   * Crea un snapshot del contenido de los archivos en `filePaths`.
   * Lee cada archivo vía WebFilesystemProvider y persiste (metadatos + blobs) en IndexedDB.
   *
   * @param contextPath  ruta del contexto que se está protegiendo
   * @param filePaths    lista de paths (relativos a la raíz) a capturar
   * @param reason       motivo del snapshot (afecta al label/description)
   * @param label        etiqueta opcional legible
   */
  async createSnapshot(
    contextPath: string,
    filePaths: string[],
    reason: "write" | "delete" | "refactor" | "auto" | "manual",
    label?: string
  ): Promise<Snapshot> {
    await this.hydrate();

    const id = this.generateSnapshotId();
    const timestamp = Date.now();

    // 1) Leer contenido de los archivos vía provider
    const fileContents: Array<{ path: string; content: string }> = [];
    let totalSize = 0;
    const skipped: string[] = [];

    for (const path of filePaths) {
      const result = await webFilesystemProvider.readFile(path);
      if (result.success && result.content !== undefined) {
        fileContents.push({ path, content: result.content });
        totalSize += result.size ?? new Blob([result.content]).size;
      } else {
        // Si el archivo no existe (p.ej. en una creación) lo saltamos pero no fallamos
        skipped.push(path);
      }
    }

    if (skipped.length > 0) {
      console.warn(
        `[SnapshotManager] ${skipped.length} archivo(s) no se pudieron leer (se omiten):`,
        skipped
      );
    }

    // 2) Construir el snapshot (modelo de dominio)
    const snapshot: Snapshot = {
      id,
      timestamp,
      label: label || `Auto-snapshot ${new Date(timestamp).toISOString()}`,
      description: `${reason} operation snapshot`,
      contextPath,
      metadata: {
        resourceCount: fileContents.length,
        changedResources: fileContents.map((f) => f.path),
        totalSize,
      },
      storePath: `${this.storePath}/${id}`,
    };

    // 3) Persistir (metadatos + blobs) en IndexedDB
    if (snapshotStore.isSupported()) {
      const record: SnapshotRecord = {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        label: snapshot.label,
        description: snapshot.description,
        contextPath: snapshot.contextPath,
        trigger: reason,
        metadata: snapshot.metadata,
        fileCount: fileContents.length,
        filePaths: fileContents.map((f) => f.path),
        storePath: snapshot.storePath,
      };
      try {
        await snapshotStore.saveSnapshot(record, fileContents);
      } catch (error) {
        console.error("[SnapshotManager] No se pudo persistir el snapshot:", error);
        // Decidimos: si no se persiste, NO lo añadimos a la caché
        // (el siguiente hydrate() tampoco lo verá, así que es consistente)
        throw error;
      }
    } else {
      console.warn("[SnapshotManager] Persistiendo sólo en memoria (IndexedDB no disponible).");
    }

    // 4) Actualizar caché
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  /** Obtiene un snapshot de la caché. No toca el store. */
  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /** Lista snapshots de un contexto, ordenados por timestamp DESC. */
  listSnapshots(contextPath: string): Snapshot[] {
    const result: Snapshot[] = [];
    this.snapshots.forEach((snapshot) => {
      if (snapshot.contextPath === contextPath) {
        result.push(snapshot);
      }
    });
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Restaura los archivos de un snapshot.
   *
   * Flujo (ver SPEC `rollback-engine` y ADR 0002):
   *   1) Lee el contenido desde IndexedDB vía `snapshotStore.getSnapshotFileContents(id)`.
   *   2) Para cada par [path, content] llama a `webFilesystemProvider.writeFile`.
   *   3) Verifica la post-condición releyendo cada archivo y comparando contenido.
   *   4) Devuelve un `RollbackResult` discriminado por `success`.
   *
   * Contrato:
   *   - Si el snapshot no existe → throw `Error("snapshot not found: <id>")`.
   *   - Si el FS provider no está listo → throw `Error("filesystem provider not available")`.
   *   - En cualquier otro caso (fallo individual de write/verify) NO throw;
   *     se acumula en `failedFiles` y se devuelve `success: false`.
   *   - Snapshot vacío (Map sin entradas) → `{ success: true, restoredFiles: [], snapshotId }`.
   *
   * Decisión: este módulo NO actualiza `Transaction.status`. Es responsabilidad
   * del caller (`transactions.ts → rollbackTransaction`) traducir el resultado.
   */
  async rollback(snapshotId: string): Promise<RollbackResult> {
    // Pre-condición 1: el snapshot debe existir (al menos en nuestra caché).
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`snapshot not found: ${snapshotId}`);
    }

    // Pre-condición 2: el FS provider debe estar listo.
    if (!webFilesystemProvider.isReady()) {
      throw new Error("filesystem provider not available");
    }

    // 1) Leer contenido desde IndexedDB.
    const files = await this.loadSnapshotFiles(snapshotId);

    // Snapshot vacío → caso válido (checkpoint lógico), no es error.
    if (files.size === 0) {
      return { success: true, restoredFiles: [], snapshotId };
    }

    const restoredFiles: string[] = [];
    const failedFiles: RollbackFailure[] = [];

    // 2) Escribir cada archivo. Los fallos individuales NO abortan el batch.
    for (const [path, content] of files.entries()) {
      const writeResult = await webFilesystemProvider.writeFile(path, content);
      if (!writeResult.success) {
        failedFiles.push({
          path,
          reason: "write_error",
          error: writeResult.error,
        });
        continue;
      }

      // 3) Verificar post-condición (re-leer y comparar).
      const ok = await this.verifyRestoration(path, content);
      if (!ok) {
        failedFiles.push({
          path,
          reason: "verify_error",
        });
        continue;
      }

      restoredFiles.push(path);
    }

    // 4) Construir resultado discriminado.
    if (failedFiles.length === 0) {
      return { success: true, restoredFiles, snapshotId };
    }
    return { success: false, restoredFiles, failedFiles, snapshotId };
  }

  /**
   * Verifica que el contenido en disco de un archivo coincide con el esperado.
   * Método interno pero exportado para que pueda probarse de forma aislada.
   *
   * Política: NO reintenta. Si la verificación falla, devuelve `false` y
   * el caller registra `verify_error` en el `RollbackResult`.
   */
  async verifyRestoration(path: string, expectedContent: string): Promise<boolean> {
    try {
      const readResult = await webFilesystemProvider.readFile(path);
      if (!readResult.success) return false;
      if (readResult.content === undefined) return false;
      return readResult.content === expectedContent;
    } catch {
      return false;
    }
  }

  /** Borra un snapshot de la caché Y de IndexedDB. */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const existed = this.snapshots.delete(snapshotId);
    if (!existed) return false;

    if (snapshotStore.isSupported()) {
      try {
        await snapshotStore.deleteSnapshot(snapshotId);
      } catch (error) {
        console.error(`[SnapshotManager] Error borrando snapshot ${snapshotId} del store:`, error);
        // Devolvemos true igualmente: ya no está en caché, aunque quede huérfano en IDB
      }
    }
    return true;
  }

  /**
   * Borra snapshots con más de `daysOld` días.
   * Devuelve el número de snapshots eliminados.
   */
  async cleanOldSnapshots(daysOld: number = 30): Promise<number> {
    await this.hydrate();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const idsToDelete: string[] = [];

    this.snapshots.forEach((snapshot, id) => {
      if (snapshot.timestamp < cutoffTime) {
        idsToDelete.push(id);
      }
    });

    for (const id of idsToDelete) {
      await this.deleteSnapshot(id);
    }
    return idsToDelete.length;
  }

  // ── Utilidades públicas (nuevas) ────────────────────────────────────────

  /** Tamaño total estimado en bytes del contenido persistido. */
  async getPersistedSize(): Promise<number> {
    if (!snapshotStore.isSupported()) return 0;
    return await snapshotStore.totalSize();
  }

  /** Número total de snapshots persistidos. */
  async getPersistedCount(): Promise<number> {
    if (!snapshotStore.isSupported()) return this.snapshots.size;
    return await snapshotStore.count();
  }

  /**
   * Carga bajo demanda los archivos de un snapshot.
   * Útil para preview o diff antes de un rollback.
   */
  async loadSnapshotFiles(snapshotId: string): Promise<Map<string, string>> {
    if (!snapshotStore.isSupported()) {
      throw new Error("IndexedDB no disponible — no se pueden cargar archivos del snapshot.");
    }
    return await snapshotStore.getSnapshotFileContents(snapshotId);
  }

  // ── Helpers privados ─────────────────────────────────────────────────────

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** Convierte un SnapshotRecord (IDB) en un Snapshot (modelo de dominio). */
  private recordToSnapshot(record: SnapshotRecord): Snapshot {
    return {
      id: record.id,
      timestamp: record.timestamp,
      label: record.label,
      description: record.description,
      contextPath: record.contextPath,
      metadata: record.metadata,
      storePath: record.storePath,
    };
  }

  // ── Métodos legacy (compatibilidad con FileNode[]) ─────────────────────
  // Algunas llamadas antiguas (e.g. transactions.ts en su estado actual) siguen
  // pasando FileNode[]. Estos wrappers deprecados los siguen aceptando pero
  // ya no leen `files` — sólo extraen paths.

  /**
   * @deprecated Usar `createSnapshot(contextPath, filePaths: string[], …)`
   */
  async createSnapshotFromNodes(
    contextPath: string,
    files: FileNode[],
    reason: "write" | "delete" | "refactor" | "auto" | "manual",
    label?: string
  ): Promise<Snapshot> {
    const filePaths = this.collectFilePaths(files);
    return this.createSnapshot(contextPath, filePaths, reason, label);
  }

  private collectFilePaths(files: FileNode[]): string[] {
    const paths: string[] = [];
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file") paths.push(node.path);
        if (node.children) traverse(node.children);
      }
    };
    traverse(files);
    return paths;
  }
}

export const snapshotManager = new SnapshotManager();
