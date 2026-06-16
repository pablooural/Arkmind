/**
 * Memory Manager — Paso 5: Sistema de Memoria Central
 *
 * Implementa los 5 pasos del sistema de memoria:
 *   1. Working Memory   — estado cognitivo inmediato (in-memory + IDB)
 *   2. Context Memory   — memoria persistente por contexto (IDB)
 *   3. Hierarchical     — herencia de memoria por árbol de paths
 *   4. Cognitive Snapshots — snapshots del estado mental/contextual
 *   5. Memory Manager   — carga, herencia, compactación, persistencia
 *
 * Persistencia: IndexedDB store `memory` (DB `arkmind_runtime`).
 * Sin vector DB, sin embeddings — memoria contextual viva y jerárquica.
 *
 * Migración: las versiones tempranas usaban `localStorage` con prefijos
 * `uxarq:mem:` / `uxarq:snap:`. Esa ruta quedó obsoleta tras ADR 0005
 * (runtime-persistence, Manus@delta, 2026-06-02). Los métodos que
 * iteraban `localStorage` se reformularon en t-023 para leer/escribir
 * desde el store `memory` de IDB vía `idbGet` / `idbSet` / `idbGetAll`.
 */

import { WorkingMemory, ContextMemory, CognitiveSnapshot } from "./types";
import { snapshotStore } from "./snapshotStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── IndexedDB Persistence Helpers ──────────────────────────────────────────

async function idbGet<T>(id: string): Promise<T | null> {
  try {
    const { store } = await snapshotStore.getRuntimeStore("memory", "readonly");
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`Failed to read memory ${id} from IndexedDB:`, error);
    return null;
  }
}

async function idbSet(id: string, value: unknown): Promise<void> {
  try {
    const { tx, store } = await snapshotStore.getRuntimeStore("memory", "readwrite");
    store.put({ ...(value as object), id });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error(`Failed to persist memory ${id}:`, error);
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
    console.warn(`Failed to remove memory ${id} from IndexedDB:`, error);
  }
}

/** Leer todos los registros del store `memory`. */
async function idbGetAll<T>(): Promise<T[]> {
  try {
    const { store } = await snapshotStore.getRuntimeStore("memory", "readonly");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Failed to read all memory records from IndexedDB:", error);
    return [];
  }
}

/** Vaciar el store `memory` por completo. */
async function idbClear(): Promise<void> {
  try {
    const { tx, store } = await snapshotStore.getRuntimeStore("memory", "readwrite");
    store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to clear memory store in IndexedDB:", error);
  }
}

/** Devuelve todos los segmentos de un path, de raíz a hoja. */
function getPathAncestors(contextPath: string): string[] {
  const parts = contextPath.replace(/\/$/, "").split("/").filter(Boolean);
  const ancestors: string[] = ["/"];
  let current = "";
  for (const part of parts) {
    current += "/" + part;
    ancestors.push(current);
  }
  return ancestors;
}

// ─── Default factories ────────────────────────────────────────────────────────

function emptyWorkingMemory(): WorkingMemory {
  return {
    focus: "",
    intent: "",
    activeResources: [],
    constraints: [],
    keyInsights: [],
    openQuestions: [],
    temporaryNotes: [],
    lastUpdated: Date.now(),
  };
}

function emptyContextMemory(contextPath: string): ContextMemory {
  return {
    contextPath,
    purpose: "",
    currentFocus: "",
    keyDecisions: [],
    constraints: [],
    relevantResources: [],
    openQuestions: [],
    summary: "",
    lastUpdated: Date.now(),
    version: 1,
  };
}

// ─── MemoryManager ────────────────────────────────────────────────────────────

export class MemoryManager {
  /** Working Memory vive en RAM durante la sesión, indexada por sessionId */
  private workingMemories: Map<string, WorkingMemory> = new Map();

  /** Cognitive Snapshots en RAM (los recientes); los más viejos se persisten en IDB */
  private cognitiveSnapshots: Map<string, CognitiveSnapshot> = new Map();

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1 — Working Memory
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cargar todas las memorias desde IndexedDB */
  async hydrate(): Promise<void> {
    try {
      const { store } = await snapshotStore.getRuntimeStore("memory", "readonly");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const records = request.result as any[];
          records.forEach((r) => {
            if (r.id.startsWith("wkmem:")) {
              this.workingMemories.set(r.id.replace("wkmem:", ""), r);
            } else if (r.id.startsWith("cogsnap:")) {
              this.cognitiveSnapshots.set(r.id, r);
            }
          });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate memory:", error);
    }
  }

  /** Obtener o crear Working Memory para una sesión */
  getWorkingMemory(sessionId: string): WorkingMemory {
    if (this.workingMemories.has(sessionId)) {
      return this.workingMemories.get(sessionId)!;
    }

    const fresh = emptyWorkingMemory();
    this.workingMemories.set(sessionId, fresh);
    return fresh;
  }

  /** Actualizar Working Memory (merge parcial) */
  updateWorkingMemory(sessionId: string, updates: Partial<WorkingMemory>): WorkingMemory {
    const current = this.getWorkingMemory(sessionId);
    const updated: WorkingMemory = {
      ...current,
      ...updates,
      lastUpdated: Date.now(),
    };
    this.workingMemories.set(sessionId, updated);
    idbSet(`wkmem:${sessionId}`, updated);
    return updated;
  }

  /** Agregar un insight a la Working Memory */
  addInsightToWorking(sessionId: string, insight: string): void {
    const wm = this.getWorkingMemory(sessionId);
    if (!wm.keyInsights.includes(insight)) {
      this.updateWorkingMemory(sessionId, {
        keyInsights: [...wm.keyInsights.slice(-9), insight],
      });
    }
  }

  /** Agregar un recurso activo */
  addActiveResource(sessionId: string, resourcePath: string): void {
    const wm = this.getWorkingMemory(sessionId);
    if (!wm.activeResources.includes(resourcePath)) {
      this.updateWorkingMemory(sessionId, {
        activeResources: [...wm.activeResources.slice(-4), resourcePath],
      });
    }
  }

  /** Limpiar Working Memory de sesión (al archivar) */
  clearWorkingMemory(sessionId: string): void {
    this.workingMemories.delete(sessionId);
    idbRemove(`wkmem:${sessionId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2 — Context Memory
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cargar Context Memory para una ruta (ahora asíncrono para IDB) */
  async getContextMemory(contextPath: string): Promise<ContextMemory> {
    const stored = await idbGet<ContextMemory>(`mem:${contextPath}`);
    return stored ?? emptyContextMemory(contextPath);
  }

  /** Guardar Context Memory */
  async saveContextMemory(memory: ContextMemory): Promise<void> {
    const updated: ContextMemory = {
      ...memory,
      lastUpdated: Date.now(),
      version: (memory.version ?? 0) + 1,
    };
    await idbSet(`mem:${memory.contextPath}`, updated);
  }

  /** Actualizar campos de Context Memory (merge parcial) */
  async updateContextMemory(contextPath: string, updates: Partial<ContextMemory>): Promise<ContextMemory> {
    const current = await this.getContextMemory(contextPath);
    const updated: ContextMemory = {
      ...current,
      ...updates,
      contextPath,
      lastUpdated: Date.now(),
      version: current.version + 1,
    };
    await idbSet(`mem:${contextPath}`, updated);
    return updated;
  }

  /** Verificar si un contexto tiene memoria guardada en IDB */
  async hasContextMemory(contextPath: string): Promise<boolean> {
    const stored = await idbGet<ContextMemory>(`mem:${contextPath}`);
    return stored !== null;
  }

  /** Eliminar Context Memory */
  clearContextMemory(contextPath: string): void {
    idbRemove(`mem:${contextPath}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3 — Hierarchical Memory
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cargar memoria jerárquica completa para un path.
   * Hereda desde raíz hacia el path actual, fusionando con precedencia local.
   *
   * Ejemplo: /proyecto/novela/cap-01
   *   carga: / → /proyecto → /proyecto/novela → /proyecto/novela/cap-01
   */
  async loadHierarchicalMemory(contextPath: string): Promise<HierarchicalMemoryResult> {
    const ancestors = getPathAncestors(contextPath);
    const chain: ContextMemory[] = [];

    for (const ancestor of ancestors) {
      if (await this.hasContextMemory(ancestor)) {
        chain.push(await this.getContextMemory(ancestor));
      }
    }

    // La memoria más local tiene precedencia
    const merged = this.mergeContextChain(chain, contextPath);

    return {
      contextPath,
      chain,
      merged,
      depth: chain.length,
    };
  }

  /** Fusionar cadena de memorias: más cercana tiene precedencia */
  private mergeContextChain(chain: ContextMemory[], targetPath: string): ContextMemory {
    if (chain.length === 0) return emptyContextMemory(targetPath);

    const base = emptyContextMemory(targetPath);

    // Acumular de raíz a hoja (la hoja sobreescribe)
    const allDecisions = new Set<string>();
    const allConstraints = new Set<string>();
    const allResources = new Set<string>();
    const allQuestions = new Set<string>();

    for (const mem of chain) {
      mem.keyDecisions.forEach((d) => allDecisions.add(d));
      mem.constraints.forEach((c) => allConstraints.add(c));
      mem.relevantResources.forEach((r) => allResources.add(r));
      mem.openQuestions.forEach((q) => allQuestions.add(q));
    }

    const local = chain[chain.length - 1];

    return {
      ...base,
      contextPath: targetPath,
      purpose: local.purpose || chain.find((m) => m.purpose)?.purpose || "",
      currentFocus: local.currentFocus,
      summary: local.summary,
      keyDecisions: [...allDecisions],
      constraints: [...allConstraints],
      relevantResources: [...allResources],
      openQuestions: [...allQuestions],
      lastUpdated: local.lastUpdated,
      version: local.version,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4 — Cognitive Snapshots
  // ═══════════════════════════════════════════════════════════════════════════

  /** Crear un Cognitive Snapshot del estado actual */
  async createCognitiveSnapshot(
    contextPath: string,
    sessionId: string,
    label: string,
    trigger: CognitiveSnapshot["trigger"] = "manual",
    summary = ""
  ): Promise<CognitiveSnapshot> {
    const id = generateId("cogsnap");
    const wm = this.getWorkingMemory(sessionId);
    const cm = (await this.hasContextMemory(contextPath))
      ? await this.getContextMemory(contextPath)
      : undefined;

    const snapshot: CognitiveSnapshot = {
      id,
      contextPath,
      label,
      summary: summary || wm.focus || `Snapshot: ${label}`,
      workingMemory: { ...wm },
      contextMemory: cm ? { ...cm } : undefined,
      relatedResources: [...wm.activeResources],
      trigger,
      createdAt: Date.now(),
    };

    this.cognitiveSnapshots.set(id, snapshot);
    this.persistCognitiveSnapshot(snapshot);

    return snapshot;
  }

  /** Obtener snapshot cognitivo por ID (IDB) */
  async getCognitiveSnapshot(id: string): Promise<CognitiveSnapshot | undefined> {
    if (this.cognitiveSnapshots.has(id)) {
      return this.cognitiveSnapshots.get(id);
    }
    return (await idbGet<CognitiveSnapshot>(id)) ?? undefined;
  }

  /** Listar snapshots cognitivos de un contexto (IDB) */
  async listCognitiveSnapshots(contextPath: string): Promise<CognitiveSnapshot[]> {
    const all = await idbGetAll<{ id: string } & CognitiveSnapshot>();
    return all
      .filter((r) => r.id.startsWith("cogsnap_"))
      .map((r) => r as CognitiveSnapshot)
      .filter((snap) => contextPath === "" || snap.contextPath === contextPath)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Restaurar Working Memory desde un Cognitive Snapshot (IDB) */
  async restoreFromSnapshot(snapshotId: string, sessionId: string): Promise<WorkingMemory | null> {
    const snap = await this.getCognitiveSnapshot(snapshotId);
    if (!snap) return null;

    const restored: WorkingMemory = {
      ...snap.workingMemory,
      lastUpdated: Date.now(),
    };

    this.workingMemories.set(sessionId, restored);
    await idbSet(`wkmem:${sessionId}`, restored);

    return restored;
  }

  /** Eliminar snapshot cognitivo */
  deleteCognitiveSnapshot(id: string): void {
    this.cognitiveSnapshots.delete(id);
    idbRemove(id);
  }

  private persistCognitiveSnapshot(snap: CognitiveSnapshot): void {
    idbSet(snap.id, snap);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5 — Memory Manager: compactación, resumen, invalidación
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Construir el bloque de memoria para el system prompt de la IA.
   * Carga memoria jerárquica + working memory de la sesión y los formatea
   * como texto compacto para inyectar en el contexto del modelo.
   */
  async buildMemoryBlock(contextPath: string, sessionId: string): Promise<string> {
    const { merged, chain } = await this.loadHierarchicalMemory(contextPath);
    const wm = this.getWorkingMemory(sessionId);

    const lines: string[] = [];

    lines.push("## Memoria del Runtime");
    lines.push("");

    // Working Memory
    if (wm.focus || wm.intent) {
      lines.push("### Estado Actual");
      if (wm.focus)  lines.push(`- **Foco:** ${wm.focus}`);
      if (wm.intent) lines.push(`- **Intención:** ${wm.intent}`);
      if (wm.activeResources.length > 0)
        lines.push(`- **Recursos activos:** ${wm.activeResources.join(", ")}`);
      if (wm.constraints.length > 0)
        lines.push(`- **Restricciones:** ${wm.constraints.join("; ")}`);
      if (wm.keyInsights.length > 0) {
        lines.push("- **Insights clave:**");
        wm.keyInsights.slice(-5).forEach((i) => lines.push(`  - ${i}`));
      }
      if (wm.openQuestions.length > 0) {
        lines.push("- **Preguntas abiertas:**");
        wm.openQuestions.slice(-3).forEach((q) => lines.push(`  - ${q}`));
      }
      lines.push("");
    }

    // Context Memory (jerárquica)
    if (chain.length > 0) {
      lines.push("### Memoria de Contexto");
      if (merged.purpose)      lines.push(`- **Propósito:** ${merged.purpose}`);
      if (merged.currentFocus) lines.push(`- **Foco del contexto:** ${merged.currentFocus}`);
      if (merged.summary)      lines.push(`- **Resumen:** ${merged.summary}`);
      if (merged.keyDecisions.length > 0) {
        lines.push("- **Decisiones:**");
        merged.keyDecisions.slice(-6).forEach((d) => lines.push(`  - ${d}`));
      }
      if (merged.constraints.length > 0) {
        lines.push("- **Restricciones heredadas:**");
        merged.constraints.slice(-4).forEach((c) => lines.push(`  - ${c}`));
      }
      if (merged.openQuestions.length > 0) {
        lines.push("- **Preguntas del contexto:**");
        merged.openQuestions.slice(-3).forEach((q) => lines.push(`  - ${q}`));
      }
      if (chain.length > 1) {
        lines.push(`- **Herencia:** ${chain.map((m) => m.contextPath).join(" → ")}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Compactar Context Memory de un path:
   * Fusiona todo el conocimiento jerárquico en la memoria local del path.
   * Elimina duplicados. Recorta listas largas.
   */
  async compactContextMemory(contextPath: string): Promise<ContextMemory> {
    const { merged } = await this.loadHierarchicalMemory(contextPath);

    const compacted: ContextMemory = {
      ...merged,
      contextPath,
      keyDecisions:      [...new Set(merged.keyDecisions)].slice(-20),
      constraints:       [...new Set(merged.constraints)].slice(-10),
      relevantResources: [...new Set(merged.relevantResources)].slice(-15),
      openQuestions:     [...new Set(merged.openQuestions)].slice(-10),
      lastUpdated:       Date.now(),
      version:           merged.version + 1,
    };

    this.saveContextMemory(compacted);
    return compacted;
  }

  /**
   * Invalidar snapshots cognitivos obsoletos (> N días) del store IDB.
   * Respeta el snapshot más reciente.
   */
  async invalidateOldSnapshots(daysOld = 30): Promise<number> {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const all = await idbGetAll<{ id: string; createdAt: number } & CognitiveSnapshot>();
    const toDelete = all
      .filter((r) => r.id.startsWith("cogsnap_") && r.createdAt < cutoff)
      .map((r) => r.id);

    await Promise.all(toDelete.map((id) => idbRemove(id)));
    toDelete.forEach((id) => this.cognitiveSnapshots.delete(id));
    return toDelete.length;
  }

  /**
   * Actualizar Context Memory con lo que la IA extrajo de la conversación.
   * Llamar cuando la IA devuelve insights, decisiones o preguntas relevantes.
   */
  async integrateAIResponse(
    contextPath: string,
    sessionId: string,
    aiText: string,
    options: {
      addInsight?: string;
      addDecision?: string;
      addQuestion?: string;
      updateFocus?: string;
    } = {}
  ): Promise<void> {
    const { addInsight, addDecision, addQuestion, updateFocus } = options;

    if (addInsight) {
      this.addInsightToWorking(sessionId, addInsight);
    }

    if (addDecision || addQuestion || updateFocus) {
      const cm = await this.getContextMemory(contextPath);
      const updates: Partial<ContextMemory> = {};

      if (addDecision)
        updates.keyDecisions = [...cm.keyDecisions, addDecision];
      if (addQuestion)
        updates.openQuestions = [...cm.openQuestions, addQuestion];
      if (updateFocus)
        updates.currentFocus = updateFocus;

      await this.updateContextMemory(contextPath, updates);
    }

    void aiText; // disponible para análisis futuro
  }

  /**
   * Exportar toda la memoria del workspace como objeto JSON.
   * Útil para debugging y backup. Lee de IDB.
   */
  async exportAll(): Promise<Record<string, unknown>> {
    const all = await idbGetAll<{ id: string }>();
    const result: Record<string, unknown> = {};
    all.forEach((r) => {
      result[r.id] = r;
    });
    return result;
  }

  /**
   * Limpiar toda la memoria del workspace (IDB + caches en RAM).
   */
  async clearAll(): Promise<void> {
    await idbClear();
    this.workingMemories.clear();
    this.cognitiveSnapshots.clear();
  }
}

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

export interface HierarchicalMemoryResult {
  contextPath: string;
  chain: ContextMemory[];
  merged: ContextMemory;
  depth: number;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const memoryManager = new MemoryManager();
