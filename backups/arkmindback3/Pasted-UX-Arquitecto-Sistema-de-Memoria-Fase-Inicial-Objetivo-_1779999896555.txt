/**
 * UX Arquitecto - Core Types
 *
 * Context Runtime / Resource Runtime
 * Un entorno universal de navegación, edición, bifurcación y conversación
 * contextual sobre recursos vivos. La programación es solo uno de los tipos
 * de contenido posibles dentro del sistema.
 */

// ─── Resource System ─────────────────────────────────────────────────────────

export type ResourceType =
  | "file"
  | "folder"
  | "conversation"
  | "story"
  | "chapter"
  | "snapshot"
  | "task"
  | "note"
  | "ai-node"
  | "branch"
  | "document";

/**
 * Unidad fundamental del sistema.
 * Representa cualquier recurso navegable: archivo, conversación, historia,
 * snapshot, tarea, nota, rama narrativa, etc.
 */
export interface ResourceNode {
  id: string;
  path: string;
  name: string;
  type: ResourceType;
  size?: number;
  modifiedAt?: number;
  children?: ResourceNode[];
  ext?: string;
  /** Metadatos específicos por tipo de recurso */
  meta?: Record<string, unknown>;
}

/** Compatibilidad: FileNode es un alias de ResourceNode */
export type FileNode = ResourceNode;

// ─── Cognitive Context ────────────────────────────────────────────────────────

export type CognitiveGoal =
  | "architecture"
  | "refactor"
  | "debug"
  | "exploration"
  | "generation"
  | "review"
  | "planning"
  | "optimization"
  | "narrative"
  | "research"
  | "design";

export interface Insight {
  id: string;
  content: string;
  relatedResources?: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  resolved?: boolean;
}

export interface Question {
  id: string;
  content: string;
  relatedResources?: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
  answered?: boolean;
}

/**
 * Lo que la IA entiende y considera importante:
 * foco actual, intención, recursos relevantes, restricciones, insights.
 */
export interface CognitiveContext {
  contextPath: string;
  goal: CognitiveGoal;
  focusSummary: string;
  insights: Insight[];
  openQuestions: Question[];
  constraints: string[];
  lastUpdated: number;
}

// ─── Visual Context ───────────────────────────────────────────────────────────

/** Estado visual persistente (restaurable en snapshots) */
export interface PersistentVisualState {
  openResources: string[];
  activeResource?: string;
  viewMode: "code" | "preview" | "split" | "diff" | "narrative";
}

/** Estado visual efímero (no se persiste en snapshots) */
export interface TransientVisualState {
  scrollPosition?: { x: number; y: number };
  selection?: {
    resource: string;
    startLine: number;
    endLine: number;
  };
  lastInteraction: number;
}

/**
 * Lo que el usuario está viendo/manipulando:
 * panel activo, recurso abierto, scroll, selección, layout, modo visual.
 */
export interface VisualContext {
  panelId: string;
  contextPath: string;
  persistent: PersistentVisualState;
  transient: TransientVisualState;
}

// ─── Message System ───────────────────────────────────────────────────────────

export type MessageType =
  | "text"
  | "code"
  | "diff"
  | "action"
  | "snapshot"
  | "proposal"
  | "warning";

export interface BaseMessage {
  id: string;
  role: "user" | "assistant" | "system";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type StructuredMessage =
  | (BaseMessage & { type: "text"; content: string })
  | (BaseMessage & { type: "code"; language: string; content: string; path?: string })
  | (BaseMessage & { type: "diff"; before: string; after: string; path: string })
  | (BaseMessage & { type: "action"; action: string; payload: unknown })
  | (BaseMessage & { type: "snapshot"; snapshotId: string; description: string })
  | (BaseMessage & { type: "proposal"; proposalId: string; summary: string })
  | (BaseMessage & { type: "warning"; content: string; severity: "low" | "medium" | "high" });

// ─── Operation System ─────────────────────────────────────────────────────────

export interface OperationProposal {
  id: string;
  type: "edit" | "create" | "delete" | "refactor" | "move" | "branch" | "merge";
  targetPath: string;
  description: string;
  changes?: unknown[];
  status: "proposed" | "approved" | "rejected" | "executed";
  createdAt: number;
}

// ─── AI Context Session ───────────────────────────────────────────────────────

export type SessionState =
  | "active"
  | "idle"
  | "archived"
  | "forked"
  | "summarized"
  | "restoring";

/**
 * Contenedor que une: conversación, memoria contextual,
 * snapshots, estado cognitivo y referencias visuales.
 */
export interface AIContextSession {
  id: string;
  panelId: string;
  contextPath: string;

  cognitiveContext: CognitiveContext;
  visualContextId?: string;

  messages: StructuredMessage[];
  proposals: OperationProposal[];

  lastSnapshotId?: string;
  state: SessionState;

  createdAt: number;
  lastActive: number;

  metadata: {
    forkOf?: string;
    version: number;
  };
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface WorkspacePanel {
  id: string;
  type: "explorer" | "conversation" | "editor" | "preview";
  contextPath: string;
  isActive: boolean;
  visualContext: VisualContext;
  sessionId?: string;
}

/** Snapshot del estado del sistema en un momento dado */
export interface Snapshot {
  id: string;
  timestamp: number;
  label?: string;
  description?: string;
  contextPath: string;
  metadata: {
    resourceCount: number;
    changedResources: string[];
    totalSize?: number;
  };
  storePath: string;
}

/** Transacción atómica sobre recursos — siempre en sandbox primero */
export interface Transaction {
  id: string;
  type: "read" | "write" | "delete" | "move" | "create" | "branch";
  targetPath: string;
  snapshotId?: string;
  status: "pending" | "validated" | "executed" | "confirmed" | "rolled_back" | "rollback_failed";
  createdAt: number;
  executedAt?: number;
}

// ─── Operation Journal ────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  timestamp: number;
  contextPath: string;
  type: "transaction" | "rollback" | "system";
  action: string;
  status: "success" | "error" | "partial";
  transactionId?: string;
  snapshotId?: string;
  details: {
    targetPath?: string;
    description?: string;
    error?: string;
    result?: any;
  };
}

export interface JournalFilter {
  contextPath?: string;
  type?: "transaction" | "rollback" | "system";
  since?: number;
  until?: number;
  limit?: number;
}

// ─── Rollback Result (rollback-engine) ───────────────────────────────────────

/** Razón por la que un archivo falló al restaurar desde snapshot. */
export type RollbackFailureReason = "write_error" | "verify_error" | "not_found";

/** Detalle de un fallo individual durante un rollback. */
export interface RollbackFailure {
  path: string;
  reason: RollbackFailureReason;
  error?: unknown;
}

/**
 * Resultado de un rollback. Discriminated union por `success`:
 * - `true`  → todos los archivos se restauraron y verificaron correctamente
 * - `false` → al menos un archivo falló; ver `failedFiles`
 *
 * Decisión arquitectural: ADR 0002 (accepted 2026-06-02 por Mavis@cloud).
 * El módulo `rollback-engine` devuelve este tipo; el caller
 * (`transactions.ts`) es quien traduce a `Transaction.status`.
 */
export type RollbackResult =
  | { success: true;  restoredFiles: string[]; snapshotId: string }
  | { success: false; restoredFiles: string[]; failedFiles: RollbackFailure[]; snapshotId: string };

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  activeContextPath: string;
  panels: WorkspacePanel[];
  openSessions: Map<string, AIContextSession>;
  createdAt: number;
  updatedAt: number;
}

// ─── Memory System ────────────────────────────────────────────────────────────

/**
 * Paso 1: Working Memory
 * Estado cognitivo inmediato — qué está pensando, haciendo, y considerando ahora.
 * Vive en memoria durante la sesión y se persiste en localStorage.
 */
export interface WorkingMemory {
  focus: string;
  intent: string;
  activeResources: string[];
  constraints: string[];
  keyInsights: string[];
  openQuestions: string[];
  temporaryNotes: string[];
  lastUpdated: number;
}

/**
 * Paso 2: Context Memory
 * Memoria persistente por ruta/contexto.
 * Sobrevive entre sesiones y se hereda jerárquicamente.
 */
export interface ContextMemory {
  contextPath: string;
  purpose: string;
  currentFocus: string;
  keyDecisions: string[];
  constraints: string[];
  relevantResources: string[];
  openQuestions: string[];
  summary: string;
  lastUpdated: number;
  version: number;
}

/**
 * Paso 4: Cognitive Snapshot
 * Snapshot del estado mental/contextual — no solo de archivos.
 * Se crea antes de cambios importantes para poder restaurar el flujo cognitivo.
 */
export interface CognitiveSnapshot {
  id: string;
  contextPath: string;
  label: string;
  summary: string;
  workingMemory: WorkingMemory;
  contextMemory?: ContextMemory;
  relatedResources: string[];
  trigger: "manual" | "refactor" | "generation" | "structural" | "merge" | "auto";
  createdAt: number;
}

// ─── Utility Types ────────────────────────────────────────────────────────────

export type ContextRelationship = {
  type: "parent" | "child" | "fork" | "reference" | "dependsOn";
  from: string;
  to: string;
  metadata?: Record<string, unknown>;
};

export interface WorkspaceEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  source?: string;
}

/** Resultado de operación sobre el filesystem / sandbox */
export interface FileSystemResult {
  success: boolean;
  path: string;
  content?: string;
  error?: string;
}
