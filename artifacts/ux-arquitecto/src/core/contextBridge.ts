/**
 * IA Context Bridge — ContextEnricher
 *
 * ADR 0007 (proposed): el state del runtime (archivo activo, contexto cognitivo,
 * memoria de trabajo, sesión activa) fluye hacia el AIProvider a través de un
 * snapshot inmutable que se le pasa en cada AIRequest.
 *
 * Alcance de esta versión (v0.1):
 *   - Expone ContextEnricher + tipos ActiveContext
 *   - Lee de los managers locales (session/cognitive/visual/workspace)
 *   - NO toca ai.ts ni coreEngine (eso queda para v0.2)
 *
 * El módulo es self-contained: importar contextBridge.ts y usar
 * `contextEnricher.build()` desde donde se necesite (próximo paso: un
 * caller en la UI o un wrapper de AIManager).
 *
 * Spec A4: la IA propone, no ejecuta. Este módulo le da MÁS contexto para
 * proponer mejor, pero NO cambia la regla de "la IA nunca ejecuta sin ACEPTAR".
 * Spec A3: providers externos opcionales. Este módulo es 100% local.
 */

import {
  CognitiveContext,
  CognitiveGoal,
  Insight,
  Question,
  AIContextSession,
  StructuredMessage,
  OperationProposal,
  Workspace,
  WorkspacePanel,
} from "./types";
import { sessionManager } from "./session";
import { cognitiveManager } from "./cognitive";
import { visualManager } from "./visual";
import { workspaceManager } from "./workspace";

// ─── Límites del snapshot (best-effort, no inflar el request) ───────────────

export const COGNITIVE_INSIGHTS_LIMIT = 5;
export const WORKING_MEMORY_MESSAGES_LIMIT = 10;
export const WORKING_MEMORY_PROPOSALS_LIMIT = 10;

// ─── Tipos públicos ─────────────────────────────────────────────────────────

/**
 * Snapshot inmutable del state activo del runtime. Se le pasa a la IA en
 * cada llamada a `propose()`. Todos los campos pueden ser `null`: el
 * snapshot es best-effort, nunca falla.
 */
export interface ActiveContext {
  /** Path del contexto activo del workspace (la carpeta raíz activa), o null si no hay workspace. */
  workspaceContextPath: string | null;
  /** Path del archivo activo (recurso abierto y activo en un panel), o null. */
  activeResourcePath: string | null;
  /** ID del panel que tiene el recurso activo, o null. */
  activePanelId: string | null;
  /** Snapshot del contexto cognitivo del path activo, o null si no existe. */
  cognitive: CognitiveContextSnapshot | null;
  /** Snapshot de la memoria de trabajo de la sesión activa, o null. */
  workingMemory: WorkingMemorySnapshot | null;
  /** ID de la sesión activa (la más reciente con state === "active"), o null. */
  activeSessionId: string | null;
  /** Timestamp de cuándo se armó este snapshot (Date.now()). */
  capturedAt: number;
}

export interface CognitiveContextSnapshot {
  contextPath: string;
  goal: CognitiveGoal;
  focusSummary: string;
  /** Últimas N insights SIN resolver, ordenadas de más reciente a más vieja. */
  recentInsights: Insight[];
  /** Preguntas sin responder. */
  openQuestions: Question[];
  /** Restricciones declaradas por el usuario. */
  constraints: string[];
}

export interface WorkingMemorySnapshot {
  sessionId: string;
  /** Últimos N mensajes de la sesión. */
  recentMessages: StructuredMessage[];
  /** Últimas N proposals de la sesión (cualquier status). */
  recentProposals: OperationProposal[];
}

// ─── Implementación ────────────────────────────────────────────────────────

export class ContextEnricher {
  /**
   * Construye un `ActiveContext` leyendo de los 4 managers locales.
   *
   * **Nunca lanza.** Si algo falla (manager no inicializado, sin workspace,
   * etc.), devuelve un `ActiveContext` con todos los campos null y loguea
   * el error a consola.
   *
   * **Safe de llamar antes de `coreEngine.hydrateAll()`** — devuelve
   * contexto vacío (todos los campos null).
   */
  build(): ActiveContext {
    try {
      const workspace = workspaceManager.getWorkspace();
      const workspaceContextPath = workspace?.activeContextPath ?? null;

      // Encontrar el panel activo: prioridad al que tiene activeResource.
      const activePanel = this.findActivePanel(workspace);
      const activeResourcePath = activePanel
        ? visualManager.getPersistentState(activePanel.id)?.activeResource ?? null
        : null;

      // Contexto cognitivo del path activo
      const cognitive = workspaceContextPath
        ? this.snapshotCognitive(cognitiveManager.getContext(workspaceContextPath))
        : null;

      // Sesión activa y su memoria de trabajo
      const activeSession = this.findActiveSession();
      const workingMemory = activeSession
        ? this.snapshotWorkingMemory(activeSession)
        : null;

      return {
        workspaceContextPath,
        activeResourcePath,
        activePanelId: activePanel?.id ?? null,
        cognitive,
        workingMemory,
        activeSessionId: activeSession?.id ?? null,
        capturedAt: Date.now(),
      };
    } catch (error) {
      // Best-effort: nunca cortar el flujo del caller.
      console.error("ContextEnricher.build() failed:", error);
      return {
        workspaceContextPath: null,
        activeResourcePath: null,
        activePanelId: null,
        cognitive: null,
        workingMemory: null,
        activeSessionId: null,
        capturedAt: Date.now(),
      };
    }
  }

  // ─── Helpers privados ───────────────────────────────────────────────────

  private findActivePanel(workspace: Workspace | null): WorkspacePanel | undefined {
    if (!workspace || workspace.panels.length === 0) return undefined;
    // Prioridad: panel con activeResource seteado
    const withActive = workspace.panels.find((p) => {
      const v = visualManager.getPersistentState(p.id);
      return v?.activeResource !== undefined && v.activeResource !== null;
    });
    return withActive ?? workspace.panels[0];
  }

  private findActiveSession(): AIContextSession | undefined {
    // Primero buscar en el workspace (sesiones abiertas)
    const inWorkspace = workspaceManager
      .getAllSessions()
      .filter((s) => s.state === "active")
      .sort((a, b) => b.lastActive - a.lastActive)[0];
    if (inWorkspace) return inWorkspace;

    // Fallback: buscar en sessionManager directamente
    return sessionManager
      .getAllSessions()
      .filter((s) => s.state === "active")
      .sort((a, b) => b.lastActive - a.lastActive)[0];
  }

  private snapshotCognitive(
    ctx: CognitiveContext | undefined
  ): CognitiveContextSnapshot | null {
    if (!ctx) return null;
    return {
      contextPath: ctx.contextPath,
      goal: ctx.goal,
      focusSummary: ctx.focusSummary,
      recentInsights: ctx.insights
        .filter((i) => !i.resolved)
        .slice(-COGNITIVE_INSIGHTS_LIMIT)
        .reverse(),
      openQuestions: ctx.openQuestions.filter((q) => !q.answered),
      constraints: ctx.constraints,
    };
  }

  private snapshotWorkingMemory(s: AIContextSession): WorkingMemorySnapshot {
    return {
      sessionId: s.id,
      recentMessages: s.messages.slice(-WORKING_MEMORY_MESSAGES_LIMIT),
      recentProposals: s.proposals.slice(-WORKING_MEMORY_PROPOSALS_LIMIT),
    };
  }
}

// Singleton
export const contextEnricher = new ContextEnricher();
