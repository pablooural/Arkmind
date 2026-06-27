/**
 * SessionSummary — Manual summaries for chat sessions
 *
 * Persiste resúmenes manuales (~15 palabras) que el usuario escribe
 * sobre el tema principal de cada conversación. Vive en el store IDB
 * `memory` con prefijo `msum:` (mismo patrón que `wkmem:`, `mem:`,
 * `cogsnap_`).
 *
 * Por qué reusar el store `memory`:
 *   - No requiere bumpear DB_VERSION ni tocar snapshotStore.ts
 *   - Sigue el patrón existente del módulo (memory.ts)
 *   - Cero impacto en tests de T-048 (snapshotStore)
 *   - Hydration simple: getAll() + filter por prefijo
 *
 * Diseño:
 *   - Cache en RAM: Map<sessionId, summary>
 *   - IDB: `{ id: "msum:<sessionId>", text: string, updatedAt: number }`
 *   - Sin versioning: el resumen es un string plano, se pisa al editar
 */

import { snapshotStore } from "./snapshotStore";

const PREFIX = "msum:";
const MAX_WORDS_DEFAULT = 15;

// ─── Helpers IDB ───────────────────────────────────────────────────────────

async function idbGet(id: string): Promise<{ text: string; updatedAt: number } | null> {
  try {
    const { store } = await snapshotStore.getRuntimeStore("memory", "readonly");
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as any) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`Failed to read summary ${id} from IndexedDB:`, error);
    return null;
  }
}

async function idbSet(id: string, text: string): Promise<void> {
  try {
    const { tx, store } = await snapshotStore.getRuntimeStore("memory", "readwrite");
    store.put({ id, text, updatedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error(`Failed to persist summary ${id}:`, error);
  }
}

async function idbRemove(id: string): Promise<void> {
  try {
    const { tx, store } = await snapshotStore.getRuntimeStore("memory", "readwrite");
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`Failed to remove summary ${id} from IndexedDB:`, error);
  }
}

// ─── Manager ────────────────────────────────────────────────────────────────

export class SessionSummaryStore {
  /** Cache en RAM: sessionId → summary */
  private cache: Map<string, string> = new Map();

  /**
   * Cargar todos los resúmenes manuales desde IDB al iniciar el runtime.
   * Llamar una vez en bootstrap (análogo a MemoryManager.hydrate).
   */
  async hydrate(): Promise<void> {
    try {
      const { store } = await snapshotStore.getRuntimeStore("memory", "readonly");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const records = request.result as any[];
          records.forEach((r) => {
            if (r.id && typeof r.id === "string" && r.id.startsWith(PREFIX)) {
              const sessionId = r.id.replace(PREFIX, "");
              const text = typeof r.text === "string" ? r.text : "";
              this.cache.set(sessionId, text);
            }
          });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate session summaries:", error);
    }
  }

  /** Obtener el resumen manual de una sesión (o null si no hay). */
  get(sessionId: string): string | null {
    return this.cache.get(sessionId) ?? null;
  }

  /** Guardar (o sobrescribir) el resumen manual. */
  async set(sessionId: string, summary: string): Promise<void> {
    const trimmed = summary.trim();
    if (trimmed === "") {
      await this.delete(sessionId);
      return;
    }
    this.cache.set(sessionId, trimmed);
    await idbSet(`${PREFIX}${sessionId}`, trimmed);
  }

  /** Eliminar el resumen manual. */
  async delete(sessionId: string): Promise<void> {
    this.cache.delete(sessionId);
    await idbRemove(`${PREFIX}${sessionId}`);
  }

  /** Contar palabras de un texto (split por whitespace, filter truthy). */
  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /** Límite por defecto de palabras. */
  get maxWords(): number {
    return MAX_WORDS_DEFAULT;
  }

  /** Listar todos los resúmenes (para debug/export). */
  list(): Array<{ sessionId: string; summary: string }> {
    return Array.from(this.cache.entries()).map(([sessionId, summary]) => ({
      sessionId,
      summary,
    }));
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const sessionSummaryStore = new SessionSummaryStore();