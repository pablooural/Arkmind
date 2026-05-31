/**
 * Core Engine
 * Workspace Engine desacoplado - punto de entrada único
 * 
 * CAMBIOS CAPA 3:
 * - Agregados 3 managers nuevos: sessionManager, cognitiveManager, visualManager
 * - Ahora exporta 7 managers en total
 */

export * from "./types";
export { snapshotManager, SnapshotManager } from "./snapshots";
export { transactionManager, TransactionManager } from "./transactions";
export { workspaceManager, WorkspaceManager } from "./workspace";
export { filesystemManager, FilesystemManager } from "./filesystem";
export { sessionManager, SessionManager } from "./session";
export { cognitiveManager, CognitiveContextManager } from "./cognitive";
export { visualManager, VisualContextManager } from "./visual";
export { aiManager, AIManager } from "./ai";
export type { AIConfig, SupabaseConfig, AIMessage, MistralModel } from "./ai";
export { authManager, type User, type AuthSession, type AuthConfig } from "./auth";
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

export const coreEngine = {
  snapshots: snapshotManager,
  transactions: transactionManager,
  workspace: workspaceManager,
  filesystem: filesystemManager,
  sessions: sessionManager,
  cognitive: cognitiveManager,
  visual: visualManager,
  ai: aiManager,
  auth: authManager,
  memory: memoryManager,
};
