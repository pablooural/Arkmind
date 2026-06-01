/**
 * SnapshotStore
 * ────────────────────────────────────────────────────────────────────────────
 * Capa de persistencia para snapshots usando IndexedDB.
 *
 * Almacena:
 *   - `snapshots`        → metadatos del snapshot (key: id)
 *   - `snapshot_files`   → contenido de cada archivo capturado (key: `${snapshotId}::${path}`)
 *
 * Diseño:
 *   - DB estable: `arkmind_runtime` v1
 *   - Los blobs se guardan como `Blob` nativo → eficiente en espacio
 *   - Lectura y escritura asíncronas, transaccionales
 *   - Independiente del FS provider (no toca WebFilesystemProvider aquí)
 *
 * Reglas:
 *   - El manager de snapshots es el único que debería usar este store
 *   - El rollback() del manager leerá desde aquí y escribirá al FS
 *   - No usar fuera de core/
 */

const DB_NAME = "arkmind_runtime";
const DB_VERSION = 1;
const STORE_SNAPSHOTS = "snapshots";
const STORE_FILES = "snapshot_files";

// ─── Tipos del store (internos) ──────────────────────────────────────────────

/** Registro de metadatos del snapshot persistido */
export interface SnapshotRecord {
  id: string;
  timestamp: number;
  label?: string;
  description?: string;
  contextPath: string;
  trigger: "write" | "delete" | "refactor" | "auto" | "manual";
  metadata: {
    resourceCount: number;
    changedResources: string[];
    totalSize?: number;
  };
  fileCount: number;
  filePaths: string[];
  storePath: string;
}

/** Registro de archivo persistido (blob) */
export interface SnapshotFileRecord {
  id: string; // `${snapshotId}::${path}`
  snapshotId: string;
  path: string;
  content: Blob;
  size: number;
}

/** Entrada de archivo a persistir (input del save) */
export interface SnapshotFileInput {
  path: string;
  content: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compone el id de un SnapshotFileRecord de forma estable */
function makeFileRecordId(snapshotId: string, path: string): string {
  return `${snapshotId}::${path}`;
}

/** Promisifica un IDBRequest */
function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Promisifica la finalización de una transacción */
function txToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });
}

// ─── Store ──────────────────────────────────────────────────────────────────

export class SnapshotStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private supported: boolean;

  constructor() {
    this.supported = typeof indexedDB !== "undefined";
  }

  /** ¿Hay IndexedDB disponible en este entorno? */
  isSupported(): boolean {
    return this.supported;
  }

  /** Acceso lazy a la DB. Inicializa el schema en la primera llamada. */
  private getDB(): Promise<IDBDatabase> {
    if (!this.supported) {
      return Promise.reject(new Error("IndexedDB no está disponible en este entorno"));
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const store = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "id" });
          store.createIndex("contextPath", "contextPath", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("trigger", "trigger", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_FILES)) {
          const fileStore = db.createObjectStore(STORE_FILES, { keyPath: "id" });
          fileStore.createIndex("snapshotId", "snapshotId", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));

      // Si la conexión se cierra (p. ej. pestaña cerrada en mitad de uso),
      // reseteamos para permitir reapertura limpia.
      request.result?.addEventListener?.("close", () => {
        this.dbPromise = null;
      });
    });

    return this.dbPromise;
  }

  // ── Escritura ─────────────────────────────────────────────────────────────

  /**
   * Persiste un snapshot completo: metadatos + archivos.
   * Atómico a nivel de transacción (ambos object stores en la misma tx).
   */
  async saveSnapshot(snapshot: SnapshotRecord, files: SnapshotFileInput[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_FILES], "readwrite");
    const snapStore = tx.objectStore(STORE_SNAPSHOTS);
    const fileStore = tx.objectStore(STORE_FILES);

    snapStore.put(snapshot);

    for (const f of files) {
      const blob = new Blob([f.content], { type: "text/plain" });
      const fileRecord: SnapshotFileRecord = {
        id: makeFileRecordId(snapshot.id, f.path),
        snapshotId: snapshot.id,
        path: f.path,
        content: blob,
        size: blob.size,
      };
      fileStore.put(fileRecord);
    }

    await txToPromise(tx);
  }

  // ── Lectura ──────────────────────────────────────────────────────────────

  /** Devuelve los metadatos del snapshot, o null si no existe. */
  async getSnapshotRecord(snapshotId: string): Promise<SnapshotRecord | null> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS], "readonly");
    const result = await reqToPromise(tx.objectStore(STORE_SNAPSHOTS).get(snapshotId));
    return (result as SnapshotRecord | undefined) ?? null;
  }

  /** Devuelve todos los archivos de un snapshot (ordenados por path). */
  async getSnapshotFiles(snapshotId: string): Promise<SnapshotFileRecord[]> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_FILES], "readonly");
    const fileStore = tx.objectStore(STORE_FILES);
    const index = fileStore.index("snapshotId");
    const result = await reqToPromise(index.getAll(snapshotId));
    return (result as SnapshotFileRecord[]).sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Devuelve un Map<path, content> listo para restaurar.
   * Decodifica los blobs a texto en una sola pasada.
   */
  async getSnapshotFileContents(snapshotId: string): Promise<Map<string, string>> {
    const files = await this.getSnapshotFiles(snapshotId);
    const entries = await Promise.all(
      files.map(async (f) => [f.path, await f.content.text()] as const)
    );
    return new Map(entries);
  }

  /** Lista snapshots, opcionalmente filtrados por contextPath. */
  async listSnapshots(contextPath?: string): Promise<SnapshotRecord[]> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS], "readonly");
    const store = tx.objectStore(STORE_SNAPSHOTS);

    let records: SnapshotRecord[];
    if (contextPath) {
      const index = store.index("contextPath");
      records = (await reqToPromise(index.getAll(contextPath))) as SnapshotRecord[];
    } else {
      records = (await reqToPromise(store.getAll())) as SnapshotRecord[];
    }
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ── Borrado ──────────────────────────────────────────────────────────────

  /**
   * Borra un snapshot y todos sus archivos asociados.
   * Atómico: ambos stores en la misma transacción.
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_FILES], "readwrite");
    const snapStore = tx.objectStore(STORE_SNAPSHOTS);
    const fileStore = tx.objectStore(STORE_FILES);

    snapStore.delete(snapshotId);

    const fileIndex = fileStore.index("snapshotId");
    const fileKeys = await reqToPromise(fileIndex.getAllKeys(snapshotId));
    for (const key of fileKeys) {
      fileStore.delete(key);
    }

    await txToPromise(tx);
  }

  /** Borra todos los snapshots de un contexto. */
  async deleteByContext(contextPath: string): Promise<number> {
    const records = await this.listSnapshots(contextPath);
    for (const r of records) {
      await this.deleteSnapshot(r.id);
    }
    return records.length;
  }

  /** Vacía por completo la base (para reset en tests o por el usuario). */
  async clear(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS, STORE_FILES], "readwrite");
    tx.objectStore(STORE_SNAPSHOTS).clear();
    tx.objectStore(STORE_FILES).clear();
    await txToPromise(tx);
  }

  // ── Estadísticas ─────────────────────────────────────────────────────────

  /** Número total de snapshots. */
  async count(): Promise<number> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_SNAPSHOTS], "readonly");
    return await reqToPromise(tx.objectStore(STORE_SNAPSHOTS).count());
  }

  /** Tamaño total estimado en bytes (suma de blobs + overhead fijo por record). */
  async totalSize(): Promise<number> {
    const db = await this.getDB();
    const tx = db.transaction([STORE_FILES], "readonly");
    const files = (await reqToPromise(tx.objectStore(STORE_FILES).getAll())) as SnapshotFileRecord[];
    return files.reduce((acc, f) => acc + (f.size ?? 0), 0);
  }
}

export const snapshotStore = new SnapshotStore();
