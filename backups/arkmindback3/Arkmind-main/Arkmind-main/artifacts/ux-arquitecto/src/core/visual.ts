/**
 * Visual Context Manager
 * Gestión de contextos visuales por panel
 *
 * PersistentVisualState: openResources, activeResource, viewMode
 * TransientVisualState: scrollPosition, selection (solo en memoria)
 */

import { VisualContext, PersistentVisualState, TransientVisualState } from "./types";
import { snapshotStore } from "./snapshotStore";

export class VisualContextManager {
  private contexts: Map<string, VisualContext> = new Map();

  async hydrate(): Promise<void> {
    try {
      const { store } = await snapshotStore.getRuntimeStore("visual_contexts", "readonly");
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const loadedContexts = request.result as VisualContext[];
          loadedContexts.forEach((c) => this.contexts.set(c.panelId, c));
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate visual contexts:", error);
    }
  }

  private async persist(context: VisualContext): Promise<void> {
    try {
      const { tx, store } = await snapshotStore.getRuntimeStore("visual_contexts", "readwrite");
      store.put(context);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error(`Failed to persist visual context ${context.panelId}:`, error);
    }
  }

  createContext(panelId: string, contextPath: string): VisualContext {
    const context: VisualContext = {
      panelId,
      contextPath,
      persistent: {
        openResources: [],
        viewMode: "code",
      },
      transient: {
        lastInteraction: Date.now(),
      },
    };
    this.contexts.set(panelId, context);
    this.persist(context);
    return context;
  }

  getContext(panelId: string): VisualContext | undefined {
    return this.contexts.get(panelId);
  }

  updatePersistent(panelId: string, updates: Partial<PersistentVisualState>): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    Object.assign(context.persistent, updates);
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  updateTransient(panelId: string, updates: Partial<TransientVisualState>): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    Object.assign(context.transient, updates);
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  openResource(panelId: string, resourcePath: string): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;

    if (!context.persistent.openResources.includes(resourcePath)) {
      context.persistent.openResources.push(resourcePath);
    }
    context.persistent.activeResource = resourcePath;
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  closeResource(panelId: string, resourcePath: string): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;

    const index = context.persistent.openResources.indexOf(resourcePath);
    if (index === -1) return false;

    context.persistent.openResources.splice(index, 1);

    if (context.persistent.activeResource === resourcePath) {
      context.persistent.activeResource = context.persistent.openResources[0];
    }
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  setActiveResource(panelId: string, resourcePath: string): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;

    if (!context.persistent.openResources.includes(resourcePath)) {
      context.persistent.openResources.push(resourcePath);
    }
    context.persistent.activeResource = resourcePath;
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  setViewMode(panelId: string, mode: PersistentVisualState["viewMode"]): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    context.persistent.viewMode = mode;
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  setScrollPosition(panelId: string, x: number, y: number): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    context.transient.scrollPosition = { x, y };
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  setSelection(panelId: string, resource: string, startLine: number, endLine: number): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    context.transient.selection = { resource, startLine, endLine };
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  getPersistentState(panelId: string): PersistentVisualState | undefined {
    return this.getContext(panelId)?.persistent;
  }

  getTransientState(panelId: string): TransientVisualState | undefined {
    return this.getContext(panelId)?.transient;
  }

  restorePersistentState(panelId: string, state: PersistentVisualState): boolean {
    const context = this.getContext(panelId);
    if (!context) return false;
    context.persistent = { ...state };
    context.transient.lastInteraction = Date.now();
    this.persist(context);
    return true;
  }

  clearContext(panelId: string): boolean {
    const deleted = this.contexts.delete(panelId);
    if (deleted) {
      snapshotStore.getRuntimeStore("visual_contexts", "readwrite").then(({ store }) => {
        store.delete(panelId);
      });
    }
    return deleted;
  }

  getAllContexts(): VisualContext[] {
    return Array.from(this.contexts.values());
  }
}

export const visualManager = new VisualContextManager();
