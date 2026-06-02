/**
 * Operation Journal Manager
 * ────────────────────────────────────────────────────────────────────────────
 * Registro cronológico de todas las operaciones del sistema.
 * Persiste en IndexedDB a través de SnapshotStore.
 */

import { snapshotStore } from "./snapshotStore";
import { JournalEntry, JournalFilter } from "./types";

/** Promisifica un IDBRequest (helper local para evitar duplicación) */
function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class OpJournalManager {
  /**
   * Añade una entrada al journal.
   * Genera ID y timestamp automáticamente.
   */
  async addEntry(entry: Omit<JournalEntry, "id" | "timestamp">): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const fullEntry: JournalEntry = { ...entry, id, timestamp };

    try {
      const { tx, store } = await snapshotStore.getJournalStore("readwrite");
      store.put(fullEntry);
      
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error("Failed to add journal entry:", error);
      // No bloqueamos el flujo principal si el journal falla
      return id;
    }
  }

  /**
   * Recupera entradas del journal con filtrado opcional.
   */
  async getEntries(filter: JournalFilter = {}): Promise<JournalEntry[]> {
    try {
      const { store } = await snapshotStore.getJournalStore("readonly");
      let request: IDBRequest<JournalEntry[]>;

      if (filter.contextPath) {
        const index = store.index("contextPath");
        request = index.getAll(filter.contextPath);
      } else {
        request = store.getAll();
      }

      let entries = await reqToPromise(request);

      // Filtrado post-recuperación para campos sin índice complejo
      if (filter.type) {
        entries = entries.filter((e) => e.type === filter.type);
      }
      if (filter.since) {
        entries = entries.filter((e) => e.timestamp >= filter.since!);
      }
      if (filter.until) {
        entries = entries.filter((e) => e.timestamp <= filter.until!);
      }

      // Orden cronológico inverso por defecto
      entries.sort((a, b) => b.timestamp - a.timestamp);

      if (filter.limit) {
        entries = entries.slice(0, filter.limit);
      }

      return entries;
    } catch (error) {
      console.error("Failed to get journal entries:", error);
      return [];
    }
  }

  /**
   * Busca una entrada específica por su ID.
   */
  async getEntryById(id: string): Promise<JournalEntry | undefined> {
    try {
      const { store } = await snapshotStore.getJournalStore("readonly");
      const result = await reqToPromise(store.get(id));
      return result as JournalEntry | undefined;
    } catch (error) {
      console.error(`Failed to get journal entry ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Limpia el historial completo.
   */
  async clearJournal(): Promise<void> {
    try {
      const { tx, store } = await snapshotStore.getJournalStore("readwrite");
      store.clear();
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error("Failed to clear journal:", error);
    }
  }
}

export const opJournal = new OpJournalManager();
