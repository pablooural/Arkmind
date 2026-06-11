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
   * T-010 (Mavis@cloud, 2026-06-10): crear una nueva sesión a partir de una
   * existente, copiando panelId / contextPath / cognitiveContext, y agregando
   * un mensaje inicial. Usado por "Enviar a LLM" para delegar contenido
   * desde otra conversación.
   *
   * El `visualContext` se pasa explícito (no se deriva del source) porque
   * es la representación completa, no solo el ID. El caller lo construye.
   *
   * @returns la nueva sesión, o null si sourceSessionId no existe.
   */
  createSessionWithInitialMessage(
    sourceSessionId: string,
    initialMessage: StructuredMessage,
    visualContext: VisualContext
  ): AIContextSession | null {
    const source = this.getSession(sourceSessionId);
    if (!source) return null;

    const newSession = this.createSession(
      source.panelId,
      source.contextPath,
      source.cognitiveContext,
      visualContext
    );

    this.addMessage(newSession.id, initialMessage);
    return newSession;
  }

  /**
   * Fork sesión (crear copia)
   */
  forkSession(sessionId: string): AIContextSession | null {
    const original = this.getSession(sessionId);
    if (!original) return null;

    const forkedId = this.generateSessionId();

    const forked: AIContextSession = {
      ...original,
      id: forkedId,
      state: "forked",
      messages: [...original.messages],
      proposals: [...original.proposals],
      createdAt: Date.now(),
      lastActive: Date.now(),
      metadata: {
        ...original.metadata,
        forkOf: sessionId,
        version: original.metadata.version + 1,
      },
    };

    this.sessions.set(forkedId, forked);
    this.persist(forked);
    return forked;
  }

  /**
   * Obtener resumen de sesión
   */
  getSummary(sessionId: string): string {
    const session = this.getSession(sessionId);
    if (!session) return "";

    const messageCount = session.messages.length;
    const proposalCount = session.proposals.length;
    const approvedCount = session.proposals.filter((p) => p.status === "approved").length;

    return `Session ${sessionId}: ${messageCount} messages, ${approvedCount}/${proposalCount} proposals approved`;
  }

  /**
   * Destruir sesión
   */
  destroySession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      snapshotStore.getRuntimeStore("sessions", "readwrite").then(({ tx, store }) => {
        store.delete(sessionId);
        tx.onerror = () => {
          console.error(`Failed to delete session ${sessionId} from IndexedDB:`, tx.error);
        };
      }).catch((error) => {
        console.error(`Failed to delete session ${sessionId} from IndexedDB:`, error);
      });
    }
    return deleted;
  }

  /**
   * Obtener todas las sesiones
   */
  getAllSessions(): AIContextSession[] {
    const sessions: AIContextSession[] = [];
    this.sessions.forEach((session) => {
      sessions.push(session);
    });
    return sessions;
  }

  /**
   * Limpiar sesiones archivadas
   */
  cleanArchivedSessions(): number {
    let deleted = 0;
    const idsToDelete: string[] = [];

    this.sessions.forEach((session, id) => {
      if (session.state === "archived") {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => {
      this.sessions.delete(id);
      deleted++;
    });

    return deleted;
  }

  // ============ HELPERS ============

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const sessionManager = new SessionManager();
