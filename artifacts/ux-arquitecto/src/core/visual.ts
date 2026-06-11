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
          const loaded = request.result as VisualContext[];
          loaded.forEach((vc) => this.contexts.set(vc.panelId, vc));
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to hydrate visual contexts:", error);
    }
  }

  private persist(context: VisualContext): void {
    snapshotStore.getRuntimeStore("visual_contexts", "readwrite").then(({ tx, store }) => {
      store.put(context);
      tx.oncomplete = () => {};
      tx.onerror = () => {
        console.error(`Failed to persist visual context ${context.panelId}:`, tx.error);
      };
    }).catch((error) => {
      console.error(`Failed to persist visual context ${context.panelId}:`, error);
    });
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
    return this.contexts.delete(panelId);
  }

  getAllContexts(): VisualContext[] {
    return Array.from(this.contexts.values());
  }
}

export const visualManager = new VisualContextManager();
