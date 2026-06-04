import { JournalEntry } from "./types";
import { snapshotStore } from "./snapshotStore";

const STORE_JOURNAL = "journal";

export class OpJournal {
  /**
   * Registra una operación en el diario.
   */
  async log(
    entry: Omit<JournalEntry, "id" | "timestamp">
  ): Promise<JournalEntry> {
    const fullEntry: JournalEntry = {
      ...entry,
      id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    if (snapshotStore.isSupported()) {
      try {
        const db = await (snapshotStore as any).getDB();
        const tx = db.transaction([STORE_JOURNAL], "readwrite");
        const store = tx.objectStore(STORE_JOURNAL);
        store.put(fullEntry);
        // No esperamos al oncomplete para no bloquear la ejecución principal
        // pero registramos el error si ocurre
        tx.onerror = () =>
          console.warn("[OpJournal] Error guardando entrada:", tx.error);
      } catch (error) {
        console.warn("[OpJournal] Error accediendo a la DB:", error);
      }
    }

    return fullEntry;
  }

  /**
   * Lista entradas del diario con filtros opcionales.
   */
  async list(filter?: {
    path?: string;
    type?: string;
    limit?: number;
  }): Promise<JournalEntry[]> {
    if (!snapshotStore.isSupported()) return [];

    try {
      const db = await (snapshotStore as any).getDB();
      const tx = db.transaction([STORE_JOURNAL], "readonly");
      const store = tx.objectStore(STORE_JOURNAL);
      let request: IDBRequest<JournalEntry[]>;

      if (filter?.path) {
        request = store.index("path").getAll(filter.path);
      } else if (filter?.type) {
        request = store.index("type").getAll(filter.type);
      } else {
        request = store.getAll();
      }

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let results = request.result.sort((a, b) => b.timestamp - a.timestamp);
          if (filter?.limit) {
            results = results.slice(0, filter.limit);
          }
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[OpJournal] Error listando entradas:", error);
      return [];
    }
  }

  /**
   * Obtiene el historial de un archivo específico.
   */
  async getFileHistory(path: string): Promise<JournalEntry[]> {
    return this.list({ path });
  }
}

export const opJournal = new OpJournal();
