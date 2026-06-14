import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkspaceManager } from "../workspace";
import type { WorkspacePanel, AIContextSession, CognitiveContext, VisualContext } from "../types";

function makePanel(overrides: Partial<WorkspacePanel> = {}): WorkspacePanel {
  return {
    id: "panel-1",
    type: "editor",
    contextPath: "/project",
    isActive: true,
    visualContext: {
      panelId: "panel-1",
      contextPath: "/project",
      persistent: { openResources: [], viewMode: "code" },
      transient: { lastInteraction: Date.now() },
    },
    ...overrides,
  };
}

function makeSession(overrides: Partial<AIContextSession> = {}): AIContextSession {
  return {
    id: "session-1",
    panelId: "panel-1",
    contextPath: "/project",
    cognitiveContext: {
      contextPath: "/project",
      goal: "exploration",
      focusSummary: "",
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    },
    messages: [],
    proposals: [],
    state: "active",
    createdAt: Date.now(),
    lastActive: Date.now(),
    metadata: { version: 1 },
    ...overrides,
  };
}

describe("WorkspaceManager", () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
  });

  describe("initializeWorkspace", () => {
    it("creates a workspace with correct properties", () => {
      const ws = manager.initializeWorkspace("ws-1", "My Project", "/root");
      expect(ws.id).toBe("ws-1");
      expect(ws.name).toBe("My Project");
      expect(ws.rootPath).toBe("/root");
      expect(ws.activeContextPath).toBe("/root");
      expect(ws.panels).toEqual([]);
      expect(ws.createdAt).toBeGreaterThan(0);
    });
  });

  describe("getWorkspace", () => {
    it("returns null before initialization", () => {
      expect(manager.getWorkspace()).toBeNull();
    });

    it("returns the workspace after initialization", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      expect(manager.getWorkspace()).not.toBeNull();
    });
  });

  describe("setActiveContext", () => {
    it("changes the active context path", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      expect(manager.setActiveContext("/root/sub")).toBe(true);
      expect(manager.getActiveContextPath()).toBe("/root/sub");
    });

    it("notifies listeners on context change", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      const listener = vi.fn();
      manager.onContextChange(listener);
      manager.setActiveContext("/root/sub");
      expect(listener).toHaveBeenCalledWith("/root/sub");
    });

    it("returns false when no workspace initialized", () => {
      expect(manager.setActiveContext("/path")).toBe(false);
    });
  });

  describe("onContextChange", () => {
    it("returns an unsubscribe function", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      const listener = vi.fn();
      const unsubscribe = manager.onContextChange(listener);

      manager.setActiveContext("/a");
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.setActiveContext("/b");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("getActiveContextPath", () => {
    it("returns null when no workspace", () => {
      expect(manager.getActiveContextPath()).toBeNull();
    });
  });

  describe("addPanel / getPanel / removePanel", () => {
    it("adds and retrieves a panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      const panel = makePanel({ id: "p1" });
      manager.addPanel(panel);

      expect(manager.getPanel("p1")).toEqual(panel);
    });

    it("removes a panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1" }));

      expect(manager.removePanel("p1")).toBe(true);
      expect(manager.getPanel("p1")).toBeUndefined();
    });

    it("returns false when removing non-existent panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      expect(manager.removePanel("nonexistent")).toBe(false);
    });

    it("does nothing when no workspace", () => {
      manager.addPanel(makePanel());
      expect(manager.getPanel("panel-1")).toBeUndefined();
    });
  });

  describe("updatePanel", () => {
    it("partially updates a panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1", isActive: false }));

      expect(manager.updatePanel("p1", { isActive: true })).toBe(true);
      expect(manager.getPanel("p1")!.isActive).toBe(true);
    });

    it("returns false for non-existent panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      expect(manager.updatePanel("nonexistent", {})).toBe(false);
    });
  });

  describe("getPanelsByType", () => {
    it("filters panels by type", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1", type: "editor" }));
      manager.addPanel(makePanel({ id: "p2", type: "conversation" }));
      manager.addPanel(makePanel({ id: "p3", type: "editor" }));

      const editors = manager.getPanelsByType("editor");
      expect(editors).toHaveLength(2);
    });

    it("returns empty array when no workspace", () => {
      expect(manager.getPanelsByType("editor")).toEqual([]);
    });
  });

  describe("getPanelsByContext", () => {
    it("filters panels by context path", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1", contextPath: "/a" }));
      manager.addPanel(makePanel({ id: "p2", contextPath: "/b" }));
      manager.addPanel(makePanel({ id: "p3", contextPath: "/a" }));

      const panels = manager.getPanelsByContext("/a");
      expect(panels).toHaveLength(2);
    });

    it("returns empty array when no workspace", () => {
      expect(manager.getPanelsByContext("/any")).toEqual([]);
    });
  });

  describe("attachSession / getSession / detachSession", () => {
    it("attaches a session to a panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      const panel = makePanel({ id: "p1" });
      manager.addPanel(panel);

      const session = makeSession({ id: "s1" });
      expect(manager.attachSession("p1", session)).toBe(true);
      expect(manager.getSession("p1")).toEqual(session);
      expect(manager.getPanel("p1")!.sessionId).toBe("s1");
    });

    it("detaches a session from a panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1" }));
      manager.attachSession("p1", makeSession());
      expect(manager.detachSession("p1")).toBe(true);
      expect(manager.getSession("p1")).toBeUndefined();
      expect(manager.getPanel("p1")!.sessionId).toBeUndefined();
    });

    it("returns false for non-existent panel", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      expect(manager.attachSession("nonexistent", makeSession())).toBe(false);
      expect(manager.detachSession("nonexistent")).toBe(false);
    });

    it("returns undefined when no workspace", () => {
      expect(manager.getSession("p1")).toBeUndefined();
    });
  });

  describe("getAllSessions", () => {
    it("returns all attached sessions", () => {
      manager.initializeWorkspace("ws-1", "Proj", "/root");
      manager.addPanel(makePanel({ id: "p1" }));
      manager.addPanel(makePanel({ id: "p2" }));
      manager.attachSession("p1", makeSession({ id: "s1" }));
      manager.attachSession("p2", makeSession({ id: "s2" }));

      const sessions = manager.getAllSessions();
      expect(sessions).toHaveLength(2);
    });

    it("returns empty array when no workspace", () => {
      expect(manager.getAllSessions()).toEqual([]);
    });
  });
});
