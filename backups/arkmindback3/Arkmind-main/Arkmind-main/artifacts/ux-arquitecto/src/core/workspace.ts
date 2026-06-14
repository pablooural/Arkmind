/**
 * Workspace Manager
 * Gestión del workspace y contextos
 * 
 * CAMBIOS CAPA 1:
 * - Panel → WorkspacePanel
 * - WorkspaceContext eliminado (ahora manejado por CognitiveContextManager)
 * - Workspace.panels: Panel[] → WorkspacePanel[]
 * - Workspace.openSessions: Map<string, AIContextSession> agregado
 * - Nuevos métodos: attachSession, getSession
 */

import { Workspace, WorkspacePanel, AIContextSession } from "./types";

export class WorkspaceManager {
  private workspace: Workspace | null = null;
  private contextChangeListeners: Array<(path: string) => void> = [];

  /**
   * Inicializar workspace
   */
  initializeWorkspace(id: string, name: string, rootPath: string): Workspace {
    this.workspace = {
      id,
      name,
      rootPath,
      activeContextPath: rootPath,
      panels: [],
      openSessions: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.workspace;
  }

  /**
   * Obtener workspace actual
   */
  getWorkspace(): Workspace | null {
    return this.workspace;
  }

  /**
   * Cambiar contexto raíz (long-press en explorer)
   */
  setActiveContext(contextPath: string): boolean {
    if (!this.workspace) return false;

    this.workspace.activeContextPath = contextPath;
    this.workspace.updatedAt = Date.now();

    // Notificar listeners
    this.contextChangeListeners.forEach((listener) => listener(contextPath));

    return true;
  }

  /**
   * Obtener contexto activo
   */
  getActiveContextPath(): string | null {
    if (!this.workspace) return null;
    return this.workspace.activeContextPath;
  }

  /**
   * Agregar listener para cambios de contexto
   */
  onContextChange(listener: (path: string) => void): () => void {
    this.contextChangeListeners.push(listener);
    // Retornar función para desuscribirse
    return () => {
      const index = this.contextChangeListeners.indexOf(listener);
      if (index > -1) {
        this.contextChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Agregar panel
   */
  addPanel(panel: WorkspacePanel): void {
    if (!this.workspace) return;
    this.workspace.panels.push(panel);
    this.workspace.updatedAt = Date.now();
  }

  /**
   * Remover panel
   */
  removePanel(panelId: string): boolean {
    if (!this.workspace) return false;

    const index = this.workspace.panels.findIndex((p) => p.id === panelId);
    if (index === -1) return false;

    this.workspace.panels.splice(index, 1);
    this.workspace.updatedAt = Date.now();
    return true;
  }

  /**
   * Obtener panel
   */
  getPanel(panelId: string): WorkspacePanel | undefined {
    if (!this.workspace) return undefined;
    return this.workspace.panels.find((p) => p.id === panelId);
  }

  /**
   * Actualizar panel
   */
  updatePanel(panelId: string, updates: Partial<WorkspacePanel>): boolean {
    const panel = this.getPanel(panelId);
    if (!panel) return false;

    Object.assign(panel, updates);
    if (this.workspace) {
      this.workspace.updatedAt = Date.now();
    }

    return true;
  }

  /**
   * Obtener paneles por tipo
   */
  getPanelsByType(type: WorkspacePanel["type"]): WorkspacePanel[] {
    if (!this.workspace) return [];
    return this.workspace.panels.filter((p) => p.type === type);
  }

  /**
   * Obtener paneles por contexto
   */
  getPanelsByContext(contextPath: string): WorkspacePanel[] {
    if (!this.workspace) return [];
    return this.workspace.panels.filter((p) => p.contextPath === contextPath);
  }

  /**
   * Adjuntar sesión a panel
   * NUEVO: Gestión de sesiones
   */
  attachSession(panelId: string, session: AIContextSession): boolean {
    if (!this.workspace) return false;

    const panel = this.getPanel(panelId);
    if (!panel) return false;

    panel.sessionId = session.id;
    this.workspace.openSessions.set(panelId, session);
    this.workspace.updatedAt = Date.now();

    return true;
  }

  /**
   * Obtener sesión de panel
   */
  getSession(panelId: string): AIContextSession | undefined {
    if (!this.workspace) return undefined;
    return this.workspace.openSessions.get(panelId);
  }

  /**
   * Obtener todas las sesiones abiertas
   */
  getAllSessions(): AIContextSession[] {
    if (!this.workspace) return [];
    const sessions: AIContextSession[] = [];
    this.workspace.openSessions.forEach((session) => {
      sessions.push(session);
    });
    return sessions;
  }

  /**
   * Detener sesión de panel
   */
  detachSession(panelId: string): boolean {
    if (!this.workspace) return false;

    const panel = this.getPanel(panelId);
    if (!panel) return false;

    panel.sessionId = undefined;
    this.workspace.openSessions.delete(panelId);
    this.workspace.updatedAt = Date.now();

    return true;
  }
}

export const workspaceManager = new WorkspaceManager();
