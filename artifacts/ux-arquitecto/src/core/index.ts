/**
 * Core Engine
 * Workspace Engine desacoplado - punto de entrada único
 *
 * CAMBIOS CAPA 3:
 * - Agregados 3 managers nuevos: sessionManager, cognitiveManager, visualManager
 * - Ahora exporta 7 managers en total
 *
 * CAMBIOS (paso 1 — persistencia de snapshots):
 * - Se añade el `snapshotStore` (IndexedDB) y se re-exporta desde aquí.
 * - Los snapshots dejan de ser sólo en memoria; ver `snapshots.ts`.
 */

export * from "./types";
export { snapshotManager, SnapshotManager } from "./snapshots";
export { snapshotStore, SnapshotStore } from "./snapshotStore";
export type { SnapshotRecord, SnapshotFileRecord, SnapshotFileInput } from "./snapshotStore";
export { opJournal, OpJournalManager } from "./opJournal";
export { transactionManager, TransactionManager } from "./transactions";
export { workspaceManager, WorkspaceManager } from "./workspace";
export { filesystemManager, FilesystemManager } from "./filesystem";
export { sessionManager, SessionManager } from "./session";
export { cognitiveManager, CognitiveContextManager } from "./cognitive";
export { visualManager, VisualContextManager } from "./visual";
export { aiManager, AIManager } from "./ai";
export type { AIConfig, SupabaseConfig, AIMessage, MistralModel } from "./ai";
// ADR 0003 — AIProvider interface, NoopAIProvider (default), MistralAIProvider
export type { AIProvider, AIRequest, AIProposal } from "./ai";
export { NoopAIProvider, MistralAIProvider } from "./ai";
export { authManager, type User, type AuthSession, type AuthConfig } from "./auth";
// ADR 0004: AuthConfig ahora usa remoteUrl/remoteKey (aliases deprecated supabaseUrl/supabaseKey)
// ADR 0007 (v0.1): ContextEnricher para que la IA reciba el state del runtime
export { contextEnricher, ContextEnricher } from "./contextBridge";
export type { ActiveContext, CognitiveContextSnapshot, WorkingMemorySnapshot } from "./contextBridge";
export { COGNITIVE_INSIGHTS_LIMIT, WORKING_MEMORY_MESSAGES_LIMIT, WORKING_MEMORY_PROPOSALS_LIMIT } from "./contextBridge";
export { memoryManager, MemoryManager } from "./memory";
export type { HierarchicalMemoryResult } from "./memory";

// Re-export managers como singleton para uso global
import { snapshotManager } from "./snapshots";
import { transactionManager } from "./transactions";
import { workspaceManager } from "./workspace";
import { filesystemManager } from "./filesystem";
import { sessionManager } from "./session";
import { cognitiveManager } from "./cognitive";
import { visualManager } from "./visual";
import { aiManager } from "./ai";
import { authManager } from "./auth";
import { memoryManager } from "./memory";
import { opJournal } from "./opJournal";

export const coreEngine = {
  snapshots: snapshotManager,
  transactions: transactionManager,
  journal: opJournal,
  workspace: workspaceManager,
  filesystem: filesystemManager,
  sessions: sessionManager,
  cognitive: cognitiveManager,
  visual: visualManager,
  ai: aiManager,
  auth: authManager,
  memory: memoryManager,

  /**
   * Hidratar todos los managers desde persistencia (IDB)
   */
  async hydrateAll(): Promise<void> {
    await Promise.all([
      sessionManager.hydrate(),
      cognitiveManager.hydrate(),
      visualManager.hydrate(),
      memoryManager.hydrate(),
    ]);
  },
};
