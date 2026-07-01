/**
 * ia-context-bridge.test.ts
 *
 * T-054: tests del ContextEnricher (orquestador del contexto activo).
 *
 * Cubre:
 * - captureActiveContext: devuelve ActiveContext con los 4 campos
 * - captureActiveContext: maneja workspace sin paneles activos
 * - captureActiveContext: maneja contexto activo vs contexto inactivo
 * - captura el activeResource desde visual state
 * - captura la sesión desde el panel activo
 *
 * Mockeamos workspaceManager, visualManager, cognitiveManager, sessionManager
 * usando vi.spyOn para no depender del state real.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ContextEnricher } from "../ia-context-bridge";
import { workspaceManager } from "../workspace";
import { visualManager } from "../visual";
import { cognitiveManager } from "../cognitive";
import { sessionManager } from "../session";

describe("ContextEnricher", () => {
  let enricher: ContextEnricher;

  beforeEach(() => {
    enricher = new ContextEnricher();
    vi.restoreAllMocks();
  });

  // ─── captureActiveContext ────────────────────────────────────────
  describe("captureActiveContext", () => {
    it("devuelve ActiveContext con los 4 campos", () => {
      // Setup
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/main/path");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([
        { id: "panel-chat", isActive: true },
      ] as any);
      vi.spyOn(visualManager, "getPersistentState").mockReturnValue({
        activeResource: "/file.ts",
      } as any);
      vi.spyOn(sessionManager, "getSessionByPanel").mockReturnValue({
        id: "sess-1",
        panelId: "panel-chat",
        contextPath: "/main/path",
        messages: [],
        proposals: [],
        state: "active",
        createdAt: 0,
      } as any);
      vi.spyOn(cognitiveManager, "getContext").mockReturnValue({
        contextPath: "/main/path",
        purpose: "purpose",
        insights: [],
        questions: [],
        relevantResources: [],
        keyDecisions: [],
        constraints: [],
        visualReferences: [],
        lastUpdated: 0,
      } as any);

      const ctx = enricher.captureActiveContext();

      expect(ctx.activeContextPath).toBe("/main/path");
      expect(ctx.activeResource).toBe("/file.ts");
      expect(ctx.cognitiveContext).toBeDefined();
      expect(ctx.cognitiveContext?.purpose).toBe("purpose");
      expect(ctx.activeSession).toBeDefined();
      expect(ctx.activeSession?.id).toBe("sess-1");
    });

    it("devuelve activeContextPath null si no hay contexto activo", () => {
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue(null);
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([]);

      const ctx = enricher.captureActiveContext();

      expect(ctx.activeContextPath).toBeNull();
      expect(ctx.cognitiveContext).toBeUndefined();
    });

    it("si no hay paneles de conversación, devuelve sin resource/session", () => {
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/p");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([]);

      const ctx = enricher.captureActiveContext();

      expect(ctx.activeContextPath).toBe("/p");
      expect(ctx.activeResource).toBeUndefined();
      expect(ctx.activeSession).toBeUndefined();
    });

    it("si hay múltiples paneles, toma el activo", () => {
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/p");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([
        { id: "p1", isActive: false },
        { id: "p2", isActive: true },
      ] as any);
      vi.spyOn(visualManager, "getPersistentState").mockImplementation((panelId: string) => {
        return panelId === "p2" ? ({ activeResource: "/active-file.ts" } as any) : undefined;
      });
      vi.spyOn(sessionManager, "getSessionByPanel").mockReturnValue({
        id: "s2",
        panelId: "p2",
        contextPath: "/p",
        messages: [],
        proposals: [],
        state: "active",
        createdAt: 0,
      } as any);

      const ctx = enricher.captureActiveContext();

      expect(ctx.activeResource).toBe("/active-file.ts");
      expect(ctx.activeSession?.id).toBe("s2");
    });

    it("si no hay panel activo pero hay paneles, toma el primero como fallback", () => {
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/p");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([
        { id: "first", isActive: false },
      ] as any);
      vi.spyOn(visualManager, "getPersistentState").mockReturnValue(undefined);
      vi.spyOn(sessionManager, "getSessionByPanel").mockReturnValue(undefined);

      const ctx = enricher.captureActiveContext();

      // No encontró panel activo → activeResource y activeSession quedan undefined
      expect(ctx.activeResource).toBeUndefined();
      expect(ctx.activeSession).toBeUndefined();
    });

    it("captura cognitive context solo si hay activeContextPath", () => {
      const spy = vi.spyOn(cognitiveManager, "getContext").mockReturnValue(undefined as any);

      // Sin activeContextPath, no debe llamar a cognitiveManager.getContext
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue(null);
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([]);

      const ctx = enricher.captureActiveContext();
      expect(ctx.cognitiveContext).toBeUndefined();
      // Verificar que no se llamó a getContext (no había contexto activo)
      expect(spy).not.toHaveBeenCalled();
    });

    it("captura cognitive context cuando activeContextPath está definido", () => {
      const spy = vi.spyOn(cognitiveManager, "getContext").mockReturnValue({
        contextPath: "/p",
        purpose: "test purpose",
        insights: [],
        questions: [],
        relevantResources: [],
        keyDecisions: [],
        constraints: [],
        visualReferences: [],
        lastUpdated: 0,
      } as any);

      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/p");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([]);

      const ctx = enricher.captureActiveContext();
      expect(ctx.cognitiveContext).toBeDefined();
      expect(spy).toHaveBeenCalledWith("/p");
    });

    it("devuelve la sesión que matchea el panel activo", () => {
      vi.spyOn(workspaceManager, "getActiveContextPath").mockReturnValue("/p");
      vi.spyOn(workspaceManager, "getPanelsByType").mockReturnValue([
        { id: "panel-x", isActive: true },
      ] as any);
      vi.spyOn(visualManager, "getPersistentState").mockReturnValue(undefined);
      const sessionSpy = vi.spyOn(sessionManager, "getSessionByPanel").mockReturnValue({
        id: "sess-x",
        panelId: "panel-x",
        contextPath: "/p",
        messages: [],
        proposals: [],
        state: "active",
        createdAt: 0,
      } as any);

      enricher.captureActiveContext();
      expect(sessionSpy).toHaveBeenCalledWith("panel-x");
    });
  });
});