import {
  CognitiveContext,
  VisualContext,
  AIContextSession,
  WorkingMemory,
  JournalEntry,
} from "./types";
import { cognitiveManager } from "./cognitive";
import { visualManager } from "./visual";
import { sessionManager } from "./session";
import { memoryManager } from "./memory";
import { opJournal } from "./opJournal";

/**
 * UnifiedContextManager
 * El "Cerebro Central" de Arkmind.
 * Unifica las 4 dimensiones del contexto en un solo punto de verdad.
 */
export class UnifiedContextManager {
  /**
   * Obtiene el "Snapshot Cognitivo Total" para una sesión.
   * Este es el objeto que se usará para alimentar el prompt de la IA.
   */
  async getFullContext(sessionId: string) {
    const session = sessionManager.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const contextPath = session.contextPath;
    const panelId = session.panelId;

    // 1. Dimensión Cognitiva (Metas, Insights, Constraints)
    const cognitive = cognitiveManager.getContext(contextPath);

    // 2. Dimensión Visual (Archivos abiertos, scroll, selección)
    const visual = visualManager.getContext(panelId);

    // 3. Dimensión Operativa (Últimos pasos y operaciones)
    const workingMemory = memoryManager.getWorkingMemory(sessionId);
    const recentJournal = await opJournal.list({ limit: 5 });

    // 4. Dimensión Estructural (Jerarquía de memoria)
    const hierarchical = memoryManager.loadHierarchicalMemory(contextPath);

    return {
      sessionId,
      contextPath,
      cognitive,
      visual,
      workingMemory,
      recentJournal,
      hierarchical,
      timestamp: Date.now(),
    };
  }

  /**
   * Sincroniza el estado visual con el cognitivo.
   * Si la IA está analizando un archivo, el estado visual debe reflejarlo.
   */
  syncVisualWithCognitive(sessionId: string, resourcePath: string) {
    const session = sessionManager.getSession(sessionId);
    if (!session) return;

    // Abrir el recurso en el panel visual
    visualManager.openResource(session.panelId, resourcePath);
    
    // Actualizar el foco cognitivo
    cognitiveManager.updateFocus(session.contextPath, `Analizando ${resourcePath}`);
    
    // Registrar en memoria de trabajo
    memoryManager.updateWorkingMemory(sessionId, {
      focus: `Trabajando en ${resourcePath}`,
    });
  }

  /**
   * Genera el bloque de texto unificado para el prompt.
   */
  async buildUnifiedPromptBlock(sessionId: string): Promise<string> {
    const ctx = await this.getFullContext(sessionId);
    const lines: string[] = [];

    lines.push("=== ARKMIND UNIFIED CONTEXT ===");
    lines.push(`Context Path: ${ctx.contextPath}`);
    lines.push("");

    // Sección Cognitiva
    if (ctx.cognitive) {
      lines.push("## Objetivos y Reglas");
      lines.push(`- **Meta:** ${ctx.cognitive.goal.description}`);
      if (ctx.cognitive.constraints.length > 0) {
        lines.push(`- **Restricciones:** ${ctx.cognitive.constraints.join("; ")}`);
      }
      lines.push("");
    }

    // Sección de Estado Actual (Memoria + Visual)
    lines.push("## Estado de Ejecución");
    lines.push(`- **Paso actual:** ${ctx.workingMemory.stepState.currentStep} (${ctx.workingMemory.stepState.status})`);
    if (ctx.visual?.persistent.activeResource) {
      lines.push(`- **Archivo en pantalla:** ${ctx.visual.persistent.activeResource}`);
    }
    lines.push("");

    // Sección de Historia Reciente
    if (ctx.recentJournal.length > 0) {
      lines.push("## Últimas Acciones");
      ctx.recentJournal.forEach(entry => {
        lines.push(`- [${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.type}: ${entry.path}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  }
}

export const unifiedContextManager = new UnifiedContextManager();
