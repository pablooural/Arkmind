import { CognitiveContext, WorkingMemory, AIContextSession, PersistentVisualState } from "./types";

/**
 * @interface ActiveContext
 * Representa el contexto activo actual del usuario, combinando información
 * del workspace, visual, cognitivo y de sesión.
 */
export interface ActiveContext {
  activeContextPath: string | null;
  activeResource: string | undefined;
  cognitiveContext: CognitiveContext | undefined;
  activeSession: AIContextSession | undefined;
}

/**
 * @interface CognitiveContextSnapshot
 * Un snapshot del estado cognitivo, incluyendo insights, preguntas y restricciones.
 * Basado en la interfaz `CognitiveContext` existente.
 */
export interface CognitiveContextSnapshot extends CognitiveContext {}

/**
 * @interface WorkingMemorySnapshot
 * Un snapshot de la memoria de trabajo, incluyendo foco, intención y recursos activos.
 * Basado en la interfaz `WorkingMemory` existente.
 */
export interface WorkingMemorySnapshot extends WorkingMemory {}

import { workspaceManager } from "./workspace";
import { visualManager } from "./visual";
import { cognitiveManager } from "./cognitive";
import { sessionManager } from "./session";

/**
 * @class ContextEnricher
 * Se encarga de recolectar y consolidar el contexto de los diferentes managers
 * para enriquecer las peticiones a la IA.
 */
export class ContextEnricher {
  /**
   * Captura el estado actual del runtime y lo devuelve como ActiveContext.
   */
  public captureActiveContext(): ActiveContext {
    const activeContextPath = workspaceManager.getActiveContextPath();
    
    // Intentamos obtener el panel de conversación activo para extraer la sesión
    const conversationPanels = workspaceManager.getPanelsByType("conversation");
    const activePanel = conversationPanels.find(p => p.isActive) || conversationPanels[0];
    
    let activeResource: string | undefined;
    let activeSession: AIContextSession | undefined;

    if (activePanel) {
      const visualState = visualManager.getPersistentState(activePanel.id);
      activeResource = visualState?.activeResource;
      activeSession = sessionManager.getSessionByPanel(activePanel.id);
    }

    const cognitiveContext = activeContextPath 
      ? cognitiveManager.getContext(activeContextPath)
      : undefined;

    return {
      activeContextPath,
      activeResource,
      cognitiveContext,
      activeSession,
    };
  }
}

export const contextEnricher = new ContextEnricher();
