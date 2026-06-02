/**
 * Cognitive Context Manager
 * Gestión de contextos cognitivos por ruta
 * 
 * NUEVO en Arkitectgr:
 * - Mantiene CognitiveContext por contextPath
 * - Gestiona insights, preguntas, constraints
 * - Permite cambiar goal y focus
 */

import { CognitiveContext, CognitiveGoal, Insight, Question } from "./types";
import { snapshotStore } from "./snapshotStore";

export class CognitiveContextManager {
  private contexts: Map<string, CognitiveContext> = new Map();

  /**
   * Cargar contextos desde IndexedDB
   */
  async hydrate(): Promise<void> {
    try {
      const { store } = await snapshotStore.getRuntimeStore("cognitive_contexts", "readonly");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const loadedContexts = request.result as CognitiveContext[];
          loadedContexts.forEach((c) => this.contexts.set(c.contextPath, c));
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate cognitive contexts:", error);
    }
  }

  /**
   * Persistir contexto en IndexedDB
   */
  private async persist(context: CognitiveContext): Promise<void> {
    try {
      const { tx, store } = await snapshotStore.getRuntimeStore("cognitive_contexts", "readwrite");
      store.put(context);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(`Failed to persist cognitive context ${context.contextPath}:`, error);
    }
  }

  /**
   * Crear contexto cognitivo para una ruta
   */
  createContext(contextPath: string, goal: CognitiveGoal): CognitiveContext {
    const context: CognitiveContext = {
      contextPath,
      goal,
      focusSummary: "",
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    };

    this.contexts.set(contextPath, context);
    this.persist(context);
    return context;
  }

  /**
   * Obtener contexto cognitivo
   */
  getContext(contextPath: string): CognitiveContext | undefined {
    return this.contexts.get(contextPath);
  }

  /**
   * Cambiar objetivo cognitivo
   */
  setGoal(contextPath: string, goal: CognitiveGoal): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

        context.goal = goal;
    context.lastUpdated = Date.now();
    this.persist(context);
    return true;
  }

  /**
   * Agregar insight
   */
  addInsight(
    contextPath: string,
    content: string,
    relatedResources?: string[],
    importance: 1 | 2 | 3 | 4 | 5 = 3
  ): Insight | null {
    const context = this.getContext(contextPath);
    if (!context) return null;

    const insight: Insight = {
      id: this.generateId("insight"),
      content,
      relatedResources,
      importance,
      createdAt: Date.now(),
      resolved: false,
    };

    context.insights.push(insight);
    context.lastUpdated = Date.now();
    this.persist(context);

    return insight;
  }

  /**
   * Resolver insight
   */
  resolveInsight(contextPath: string, insightId: string): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

    const insight = context.insights.find((i) => i.id === insightId);
    if (!insight) return false;

    insight.resolved = true;
    context.lastUpdated = Date.now();
    this.persist(context);

    return true;
  }

  /**
   * Agregar pregunta
   */
  addQuestion(
    contextPath: string,
    content: string,
    relatedResources?: string[],
    priority: 1 | 2 | 3 | 4 | 5 = 3
  ): Question | null {
    const context = this.getContext(contextPath);
    if (!context) return null;

    const question: Question = {
      id: this.generateId("question"),
      content,
      relatedResources,
      priority,
      createdAt: Date.now(),
      answered: false,
    };

    context.openQuestions.push(question);
    context.lastUpdated = Date.now();
    this.persist(context);

    return question;
  }

  /**
   * Responder pregunta
   */
  answerQuestion(contextPath: string, questionId: string): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

    const question = context.openQuestions.find((q) => q.id === questionId);
    if (!question) return false;

    question.answered = true;
    context.lastUpdated = Date.now();
    this.persist(context);

    return true;
  }

  /**
   * Actualizar resumen de enfoque
   */
  updateFocus(contextPath: string, summary: string): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

    context.focusSummary = summary;
    context.lastUpdated = Date.now();
    this.persist(context);

    return true;
  }

  /**
   * Agregar constraint
   */
  addConstraint(contextPath: string, constraint: string): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

    if (!context.constraints.includes(constraint)) {
      context.constraints.push(constraint);
      context.lastUpdated = Date.now();
      this.persist(context);
    }

    return true;
  }

  /**
   * Remover constraint
   */
  removeConstraint(contextPath: string, constraint: string): boolean {
    const context = this.getContext(contextPath);
    if (!context) return false;

    const index = context.constraints.indexOf(constraint);
    if (index === -1) return false;

    context.constraints.splice(index, 1);
    context.lastUpdated = Date.now();
    this.persist(context);

    return true;
  }

  /**
   * Obtener insights sin resolver
   */
  getUnresolvedInsights(contextPath: string): Insight[] {
    const context = this.getContext(contextPath);
    if (!context) return [];

    return context.insights.filter((i) => !i.resolved);
  }

  /**
   * Obtener preguntas sin responder
   */
  getOpenQuestions(contextPath: string): Question[] {
    const context = this.getContext(contextPath);
    if (!context) return [];

    return context.openQuestions.filter((q) => !q.answered);
  }

  /**
   * Limpiar contexto
   */
  clearContext(contextPath: string): boolean {
    const deleted = this.contexts.delete(contextPath);
    if (deleted) {
      snapshotStore.getRuntimeStore("cognitive_contexts", "readwrite").then(({ tx, store }) => {
        store.delete(contextPath);
      });
    }
    return deleted;
  }

  /**
   * Obtener todos los contextos
   */
  getAllContexts(): CognitiveContext[] {
    const contexts: CognitiveContext[] = [];
    this.contexts.forEach((context) => {
      contexts.push(context);
    });
    return contexts;
  }

  // ============ HELPERS ============

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const cognitiveManager = new CognitiveContextManager();
