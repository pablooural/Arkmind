/**
 * Session Manager
 * Gestión de sesiones IA contextuales
 * 
 * NUEVO en Arkitectgr:
 * - Crea AIContextSession para paneles
 * - Gestiona mensajes estructurados (StructuredMessage)
 * - Maneja propuestas de operaciones
 * - Permite fork, summarize, restore de sesiones
 */

import {
  AIContextSession,
  StructuredMessage,
  OperationProposal,
  SessionState,
  CognitiveGoal,
  CognitiveContext,
  VisualContext,
} from "./types";
import { snapshotStore } from "./snapshotStore";

export class SessionManager {
  private sessions: Map<string, AIContextSession> = new Map();

  /**
   * Cargar sesiones desde IndexedDB
   */
  async hydrate(): Promise<void> {
    try {
      const { store } = await snapshotStore.getRuntimeStore("sessions", "readonly");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const loadedSessions = request.result as AIContextSession[];
          loadedSessions.forEach((s) => this.sessions.set(s.id, s));
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate sessions:", error);
    }
  }

  /**
   * Persistir sesión en IndexedDB
   */
  private async persist(session: AIContextSession): Promise<void> {
    try {
      const { tx, store } = await snapshotStore.getRuntimeStore("sessions", "readwrite");
      store.put(session);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(`Failed to persist session ${session.id}:`, error);
    }
  }

  /**
   * Crear sesión IA para un panel
   */
  createSession(
    panelId: string,
    contextPath: string,
    cognitiveContext: CognitiveContext,
    visualContext: VisualContext
  ): AIContextSession {
    const id = this.generateSessionId();

    const session: AIContextSession = {
      id,
      panelId,
      contextPath,
      cognitiveContext,
      visualContextId: visualContext.panelId,
      messages: [],
      proposals: [],
      state: "active",
      createdAt: Date.now(),
      lastActive: Date.now(),
      metadata: {
        version: 1,
      },
    };

    this.sessions.set(id, session);
    this.persist(session);
    return session;
  }

  /**
   * Obtener sesión por ID
   */
  getSession(sessionId: string): AIContextSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Obtener sesión por panel ID
   */
  getSessionByPanel(panelId: string): AIContextSession | undefined {
    let found: AIContextSession | undefined;
    this.sessions.forEach((session) => {
      if (session.panelId === panelId) {
        found = session;
      }
    });
    return found;
  }

  /**
   * Agregar mensaje a sesión
   */
  addMessage(sessionId: string, message: StructuredMessage): StructuredMessage | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.lastActive = Date.now();
    this.persist(session);

    return message;
  }

  /**
   * Obtener mensajes de sesión
   */
  getMessages(sessionId: string): StructuredMessage[] {
    const session = this.getSession(sessionId);
    return session?.messages || [];
  }

  /**
   * Agregar propuesta a sesión
   */
  addProposal(sessionId: string, proposal: OperationProposal): OperationProposal | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.proposals.push(proposal);
    session.lastActive = Date.now();
    this.persist(session);

    return proposal;
  }

  /**
   * Actualizar estado de propuesta
   */
  updateProposalStatus(
    sessionId: string,
    proposalId: string,
    status: OperationProposal["status"]
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    const proposal = session.proposals.find((p) => p.id === proposalId);
    if (!proposal) return false;

    proposal.status = status;
    session.lastActive = Date.now();
    this.persist(session);

    return true;
  }

  /**
   * Cambiar estado de sesión
   */
  setState(sessionId: string, state: SessionState): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.state = state;
    session.lastActive = Date.now();
    this.persist(session);

    return true;
  }

  /**
   * Fork sesión (crear copia) con opciones.
   * - Opcionalmente permite cortar el historial hasta fromMessageIndex.
   * - Realiza deep-clone de mensajes y propuestas para evitar referencias compartidas.
   */
  forkSession(
    sessionId: string,
    options?: { fromMessageIndex?: number; title?: string }
  ): AIContextSession | null {
    const original = this.getSession(sessionId);
    if (!original) return null;

    const forkedId = this.generateSessionId();

    const fromIndex = typeof options?.fromMessageIndex === "number"
      ? Math.max(0, Math.min(options!.fromMessageIndex!, original.messages.length - 1))
      : original.messages.length - 1;

    const messagesToCopy = original.messages.slice(0, fromIndex + 1);
    const proposalsToKeep = original.proposals.slice();

    // Deep clone para evitar referencias compartidas
    let clonedMessages: StructuredMessage[];
    let clonedProposals: OperationProposal[];

    try {
      clonedMessages = JSON.parse(JSON.stringify(messagesToCopy));
      clonedProposals = JSON.parse(JSON.stringify(proposalsToKeep));
    } catch (e) {
      console.error("Deep clone fallback used", e);
      clonedMessages = structuredClone(messagesToCopy);
      clonedProposals = structuredClone(proposalsToKeep);
    }

    const forked: AIContextSession = {
      ...original,
      id: forkedId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      messages: clonedMessages,
      proposals: clonedProposals,
      metadata: {
        ...original.metadata,
        forkOf: sessionId,
        forkedAt: Date.now(),
        forkedFromMessageIndex: options?.fromMessageIndex,
      },
      title: options?.title || `${original.title || "Conversation"} (fork)`,
    };

    this.sessions.set(forkedId, forked);
    this.persist(forked);

    return forked;
  }

  /**
   * Listar todas las sesiones
   */
  listSessions(includeArchived = false): AIContextSession[] {
    const sessions = Array.from(this.sessions.values());
    if (!includeArchived) {
      return sessions.filter((s) => s.state !== "archived");
    }
    return sessions.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
  }

  /**
   * Obtener resumen de sesión
   */
  getSummary(sessionId: string): string {
    const session = this.getSession(sessionId);
    if (!session) return "";
    return session.cognitiveContext?.focusSummary || "";
  }

  /**
   * Generar ID único
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const sessionManager = new SessionManager();
