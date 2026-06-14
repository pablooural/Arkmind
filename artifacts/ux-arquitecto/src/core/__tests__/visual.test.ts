import { describe, it, expect, beforeEach } from "vitest";
import { VisualContextManager } from "../visual";

describe("VisualContextManager", () => {
  let manager: VisualContextManager;

  beforeEach(() => {
    manager = new VisualContextManager();
    // persist() is called internally but not yet implemented; stub it out
    (manager as any).persist = () => {};
  });

  describe("createContext", () => {
    it("creates a context with correct defaults", () => {
      const ctx = manager.createContext("panel-1", "/project");
      expect(ctx.panelId).toBe("panel-1");
      expect(ctx.contextPath).toBe("/project");
      expect(ctx.persistent.openResources).toEqual([]);
      expect(ctx.persistent.viewMode).toBe("code");
      expect(ctx.persistent.activeResource).toBeUndefined();
      expect(ctx.transient.lastInteraction).toBeGreaterThan(0);
    });

    it("stores the context for later retrieval", () => {
      manager.createContext("panel-1", "/project");
      const ctx = manager.getContext("panel-1");
      expect(ctx).toBeDefined();
      expect(ctx!.panelId).toBe("panel-1");
    });
  });

  describe("getContext", () => {
    it("returns undefined for unknown panel", () => {
      expect(manager.getContext("unknown")).toBeUndefined();
    });
  });

  describe("openResource", () => {
    it("adds a resource and sets it as active", () => {
      manager.createContext("panel-1", "/project");
      const result = manager.openResource("panel-1", "/project/file.ts");
      expect(result).toBe(true);

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.openResources).toContain("/project/file.ts");
      expect(ctx.persistent.activeResource).toBe("/project/file.ts");
    });

    it("does not duplicate already-open resources", () => {
      manager.createContext("panel-1", "/project");
      manager.openResource("panel-1", "/project/file.ts");
      manager.openResource("panel-1", "/project/file.ts");

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.openResources.filter((r) => r === "/project/file.ts")).toHaveLength(1);
    });

    it("returns false for unknown panel", () => {
      expect(manager.openResource("unknown", "/file")).toBe(false);
    });
  });

  describe("closeResource", () => {
    it("removes a resource from open list", () => {
      manager.createContext("panel-1", "/project");
      manager.openResource("panel-1", "/project/a.ts");
      manager.openResource("panel-1", "/project/b.ts");

      const result = manager.closeResource("panel-1", "/project/a.ts");
      expect(result).toBe(true);

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.openResources).not.toContain("/project/a.ts");
      expect(ctx.persistent.openResources).toContain("/project/b.ts");
    });

    it("updates active resource when closing the active one", () => {
      manager.createContext("panel-1", "/project");
      manager.openResource("panel-1", "/project/a.ts");
      manager.openResource("panel-1", "/project/b.ts");
      manager.setActiveResource("panel-1", "/project/a.ts");

      manager.closeResource("panel-1", "/project/a.ts");

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.activeResource).toBe("/project/b.ts");
    });

    it("returns false when resource not found", () => {
      manager.createContext("panel-1", "/project");
      expect(manager.closeResource("panel-1", "/nonexistent")).toBe(false);
    });

    it("returns false for unknown panel", () => {
      expect(manager.closeResource("unknown", "/file")).toBe(false);
    });
  });

  describe("setActiveResource", () => {
    it("sets the active resource and adds it if not open", () => {
      manager.createContext("panel-1", "/project");
      manager.setActiveResource("panel-1", "/project/new.ts");

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.activeResource).toBe("/project/new.ts");
      expect(ctx.persistent.openResources).toContain("/project/new.ts");
    });

    it("returns false for unknown panel", () => {
      expect(manager.setActiveResource("unknown", "/file")).toBe(false);
    });
  });

  describe("setViewMode", () => {
    it("changes the view mode", () => {
      manager.createContext("panel-1", "/project");
      manager.setViewMode("panel-1", "split");

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.viewMode).toBe("split");
    });

    it("returns false for unknown panel", () => {
      expect(manager.setViewMode("unknown", "code")).toBe(false);
    });
  });

  describe("setScrollPosition", () => {
    it("sets scroll position", () => {
      manager.createContext("panel-1", "/project");
      manager.setScrollPosition("panel-1", 10, 200);

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.transient.scrollPosition).toEqual({ x: 10, y: 200 });
    });

    it("returns false for unknown panel", () => {
      expect(manager.setScrollPosition("unknown", 0, 0)).toBe(false);
    });
  });

  describe("setSelection", () => {
    it("sets selection range", () => {
      manager.createContext("panel-1", "/project");
      manager.setSelection("panel-1", "/project/file.ts", 5, 10);

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.transient.selection).toEqual({
        resource: "/project/file.ts",
        startLine: 5,
        endLine: 10,
      });
    });

    it("returns false for unknown panel", () => {
      expect(manager.setSelection("unknown", "/file", 1, 2)).toBe(false);
    });
  });

  describe("getPersistentState / getTransientState", () => {
    it("returns persistent state for existing panel", () => {
      manager.createContext("panel-1", "/project");
      const state = manager.getPersistentState("panel-1");
      expect(state).toBeDefined();
      expect(state!.viewMode).toBe("code");
    });

    it("returns undefined for unknown panel", () => {
      expect(manager.getPersistentState("unknown")).toBeUndefined();
      expect(manager.getTransientState("unknown")).toBeUndefined();
    });
  });

  describe("restorePersistentState", () => {
    it("replaces persistent state entirely", () => {
      manager.createContext("panel-1", "/project");
      const newState = {
        openResources: ["/a", "/b"],
        activeResource: "/a",
        viewMode: "preview" as const,
      };
      manager.restorePersistentState("panel-1", newState);

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.openResources).toEqual(["/a", "/b"]);
      expect(ctx.persistent.activeResource).toBe("/a");
      expect(ctx.persistent.viewMode).toBe("preview");
    });

    it("returns false for unknown panel", () => {
      expect(
        manager.restorePersistentState("unknown", {
          openResources: [],
          viewMode: "code",
        }),
      ).toBe(false);
    });
  });

  describe("clearContext", () => {
    it("removes the context", () => {
      manager.createContext("panel-1", "/project");
      expect(manager.clearContext("panel-1")).toBe(true);
      expect(manager.getContext("panel-1")).toBeUndefined();
    });

    it("returns false for unknown panel", () => {
      expect(manager.clearContext("unknown")).toBe(false);
    });
  });

  describe("getAllContexts", () => {
    it("returns all contexts", () => {
      manager.createContext("panel-1", "/a");
      manager.createContext("panel-2", "/b");
      const all = manager.getAllContexts();
      expect(all).toHaveLength(2);
    });

    it("returns empty array when no contexts", () => {
      expect(manager.getAllContexts()).toEqual([]);
    });
  });

  describe("updatePersistent / updateTransient", () => {
    it("partially updates persistent state", () => {
      manager.createContext("panel-1", "/project");
      manager.updatePersistent("panel-1", { viewMode: "diff" });

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.persistent.viewMode).toBe("diff");
      expect(ctx.persistent.openResources).toEqual([]);
    });

    it("partially updates transient state", () => {
      manager.createContext("panel-1", "/project");
      manager.updateTransient("panel-1", { scrollPosition: { x: 5, y: 50 } });

      const ctx = manager.getContext("panel-1")!;
      expect(ctx.transient.scrollPosition).toEqual({ x: 5, y: 50 });
    });

    it("returns false for unknown panel", () => {
      expect(manager.updatePersistent("unknown", {})).toBe(false);
      expect(manager.updateTransient("unknown", {})).toBe(false);
    });
  });
});
