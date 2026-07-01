/**
 * memory.test.ts
 *
 * T-053: tests del MemoryManager (5 pasos del sistema de memoria).
 *
 * Cubre:
 * - Working Memory (Paso 1): get, update, addInsight, addActiveResource, clear
 * - Context Memory (Paso 2): get, save, update, has, clear
 * - Hierarchical (Paso 3): loadHierarchicalMemory con herencia
 * - Cognitive Snapshots (Paso 4): create, get, list, restore, delete
 * - Manager (Paso 5): buildMemoryBlock, compactContextMemory, exportAll, clearAll
 *
 * Nota: usa el _idbMock. El `snapshotStore` real funciona con el mock
 * siempre que se llame desde un contexto donde `globalThis.indexedDB`
 * esté monkey-patched (lo hace `installIDBMock`).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryManager } from "../memory";
import { installIDBMock } from "./_idbMock";

describe("MemoryManager", () => {
  let mem: MemoryManager;

  beforeEach(() => {
    installIDBMock("arkmind_runtime_test_memory");
    mem = new MemoryManager();
  });

  // ─── Paso 1: Working Memory ────────────────────────────────────────
  describe("Working Memory (Paso 1)", () => {
    it("getWorkingMemory crea una working memory fresh si no existe", () => {
      const wm = mem.getWorkingMemory("session-1");
      expect(wm.focus).toBe("");
      expect(wm.intent).toBe("");
      expect(wm.activeResources).toEqual([]);
      expect(wm.keyInsights).toEqual([]);
      expect(wm.lastUpdated).toBeGreaterThan(0);
    });

    it("getWorkingMemory devuelve la misma instancia en la segunda llamada", () => {
      const wm1 = mem.getWorkingMemory("session-x");
      wm1.focus = "test focus";
      const wm2 = mem.getWorkingMemory("session-x");
      expect(wm2.focus).toBe("test focus");
    });

    it("updateWorkingMemory hace merge parcial", async () => {
      const wm = mem.updateWorkingMemory("session-update", {
        focus: "nuevo foco",
        intent: "nueva intención",
      });
      expect(wm.focus).toBe("nuevo foco");
      expect(wm.intent).toBe("nueva intención");
      expect(wm.lastUpdated).toBeGreaterThan(0);
    });

    it("addInsightToWorking agrega sin duplicar", () => {
      mem.addInsightToWorking("sess", "insight 1");
      mem.addInsightToWorking("sess", "insight 2");
      mem.addInsightToWorking("sess", "insight 1"); // dup
      const wm = mem.getWorkingMemory("sess");
      expect(wm.keyInsights).toHaveLength(2);
      expect(wm.keyInsights).toContain("insight 1");
    });

    it("addActiveResource agrega sin duplicar", () => {
      mem.addActiveResource("sess", "/p/a.ts");
      mem.addActiveResource("sess", "/p/b.ts");
      mem.addActiveResource("sess", "/p/a.ts"); // dup
      const wm = mem.getWorkingMemory("sess");
      expect(wm.activeResources).toHaveLength(2);
    });

    it("clearWorkingMemory elimina la working memory", () => {
      mem.getWorkingMemory("sess");
      mem.clearWorkingMemory("sess");
      // Después de clear, get crea una nueva fresh
      const wm = mem.getWorkingMemory("sess");
      expect(wm.focus).toBe("");
    });
  });

  // ─── Paso 2: Context Memory ────────────────────────────────────────
  describe("Context Memory (Paso 2)", () => {
    it("getContextMemory devuelve vacío si no hay nada persistido", async () => {
      const cm = await mem.getContextMemory("/nuevo/path");
      expect(cm.contextPath).toBe("/nuevo/path");
      expect(cm.purpose).toBe("");
      expect(cm.version).toBe(1);
    });

    it("saveContextMemory persiste y luego getContextMemory lo recupera", async () => {
      await mem.saveContextMemory({
        contextPath: "/p/a",
        purpose: "test",
        currentFocus: "foco",
        keyDecisions: ["d1"],
        constraints: ["c1"],
        relevantResources: ["/r1"],
        openQuestions: ["q1"],
        summary: "sum",
        lastUpdated: 0,
        version: 1,
      });

      const loaded = await mem.getContextMemory("/p/a");
      expect(loaded.purpose).toBe("test");
      expect(loaded.currentFocus).toBe("foco");
      expect(loaded.version).toBe(2); // saveContextMemory incrementa
    });

    it("updateContextMemory hace merge parcial e incrementa version", async () => {
      await mem.saveContextMemory({
        contextPath: "/p/u",
        purpose: "old purpose",
        currentFocus: "",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      const updated = await mem.updateContextMemory("/p/u", {
        purpose: "new purpose",
        currentFocus: "focus",
      });

      expect(updated.purpose).toBe("new purpose");
      expect(updated.currentFocus).toBe("focus");
      expect(updated.version).toBeGreaterThanOrEqual(2);
    });

    it("hasContextMemory distingue entre persistido y no", async () => {
      expect(await mem.hasContextMemory("/vacio")).toBe(false);

      await mem.saveContextMemory({
        contextPath: "/p/existe",
        purpose: "x",
        currentFocus: "",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      expect(await mem.hasContextMemory("/p/existe")).toBe(true);
    });
  });

  // ─── Paso 3: Hierarchical ─────────────────────────────────────────
  describe("Hierarchical (Paso 3)", () => {
    it("loadHierarchicalMemory devuelve chain vacío si no hay memorias", async () => {
      const result = await mem.loadHierarchicalMemory("/nuevo/path");
      expect(result.chain).toEqual([]);
      expect(result.depth).toBe(0);
      // El merged debe tener el path correcto
      expect(result.merged.contextPath).toBe("/nuevo/path");
    });

    it("loadHierarchicalMemory carga memorias ancestrales en orden", async () => {
      // Guardar memorias en /, /proyecto, /proyecto/app
      await mem.saveContextMemory({
        contextPath: "/",
        purpose: "root",
        currentFocus: "",
        keyDecisions: ["root decision"],
        constraints: ["root constraint"],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });
      await mem.saveContextMemory({
        contextPath: "/proyecto",
        purpose: "project",
        currentFocus: "",
        keyDecisions: ["project decision"],
        constraints: [],
        relevantResources: ["/shared.ts"],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      const result = await mem.loadHierarchicalMemory("/proyecto/app");
      expect(result.depth).toBeGreaterThanOrEqual(2);
      expect(result.chain.length).toBeGreaterThanOrEqual(2);

      // El merge debe contener decisiones de ambos niveles
      const merged = result.merged;
      expect(merged.keyDecisions).toContain("root decision");
      expect(merged.keyDecisions).toContain("project decision");
    });

    it("loadHierarchicalMemory tiene precedencia local", async () => {
      await mem.saveContextMemory({
        contextPath: "/",
        purpose: "root",
        currentFocus: "root focus",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "root summary",
        lastUpdated: 0,
        version: 1,
      });
      await mem.saveContextMemory({
        contextPath: "/local",
        purpose: "local",
        currentFocus: "local focus",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "local summary",
        lastUpdated: 0,
        version: 1,
      });

      const { merged } = await mem.loadHierarchicalMemory("/local");
      expect(merged.purpose).toBe("local");
      expect(merged.currentFocus).toBe("local focus");
      expect(merged.summary).toBe("local summary");
    });
  });

  // ─── Paso 4: Cognitive Snapshots ──────────────────────────────────
  describe("Cognitive Snapshots (Paso 4)", () => {
    it("createCognitiveSnapshot devuelve snapshot con wm + cm", async () => {
      mem.updateWorkingMemory("sess-snap", { focus: "test focus" });
      await mem.saveContextMemory({
        contextPath: "/p/s",
        purpose: "ctx purpose",
        currentFocus: "",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      const snap = await mem.createCognitiveSnapshot("/p/s", "sess-snap", "label test", "manual", "custom summary");
      expect(snap.id).toMatch(/^cogsnap_/);
      expect(snap.contextPath).toBe("/p/s");
      expect(snap.label).toBe("label test");
      expect(snap.workingMemory.focus).toBe("test focus");
      expect(snap.contextMemory?.purpose).toBe("ctx purpose");
      expect(snap.summary).toBe("custom summary");
    });

    it("getCognitiveSnapshot devuelve el snapshot por id (cache en RAM)", async () => {
      const snap = await mem.createCognitiveSnapshot("/p/x", "sess", "lbl", "manual");
      const found = await mem.getCognitiveSnapshot(snap.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(snap.id);
    });

    it("listCognitiveSnapshots filtra por contextPath", async () => {
      await mem.createCognitiveSnapshot("/path/a", "s", "l1", "manual");
      await mem.createCognitiveSnapshot("/path/b", "s", "l2", "manual");
      await mem.createCognitiveSnapshot("/path/a", "s", "l3", "auto");

      const all = await mem.listCognitiveSnapshots("");
      expect(all.length).toBeGreaterThanOrEqual(3);

      const justA = await mem.listCognitiveSnapshots("/path/a");
      expect(justA.length).toBe(2);
      expect(justA.every((s) => s.contextPath === "/path/a")).toBe(true);
    });

    it("restoreFromSnapshot restaura working memory en la sesión", async () => {
      mem.updateWorkingMemory("sess-restore", { focus: "before snapshot" });

      const snap = await mem.createCognitiveSnapshot("/p/r", "sess-restore", "test", "manual");
      mem.updateWorkingMemory("sess-restore", { focus: "after snapshot" });

      const restored = await mem.restoreFromSnapshot(snap.id, "sess-restore");
      expect(restored).not.toBeNull();
      expect(restored!.focus).toBe("before snapshot");
    });

    it("restoreFromSnapshot devuelve null si el snapshot no existe", async () => {
      const restored = await mem.restoreFromSnapshot("cogsnap_fake", "sess");
      expect(restored).toBeNull();
    });

    it("deleteCognitiveSnapshot elimina el snapshot", async () => {
      const snap = await mem.createCognitiveSnapshot("/p/d", "s", "lbl", "manual");
      mem.deleteCognitiveSnapshot(snap.id);
      const found = await mem.getCognitiveSnapshot(snap.id);
      // Después de delete, getCognitiveSnapshot puede devolver undefined (IDB clear también)
      expect(found === undefined || found.contextPath === "").toBe(true);
    });
  });

  // ─── Paso 5: Memory Manager ────────────────────────────────────────
  describe("Memory Manager (Paso 5)", () => {
    it("buildMemoryBlock devuelve string formateado", async () => {
      mem.updateWorkingMemory("sess-block", {
        focus: "foco de prueba",
        intent: "intención de prueba",
      });
      await mem.saveContextMemory({
        contextPath: "/p/b",
        purpose: "ctx purpose",
        currentFocus: "ctx focus",
        keyDecisions: ["d1"],
        constraints: ["c1"],
        relevantResources: [],
        openQuestions: ["q1"],
        summary: "ctx summary",
        lastUpdated: 0,
        version: 1,
      });

      const block = await mem.buildMemoryBlock("/p/b", "sess-block");
      expect(block).toContain("Memoria del Runtime");
      expect(block).toContain("foco de prueba");
      expect(block).toContain("ctx purpose");
    });

    it("buildMemoryBlock es tolerante a estado vacío", async () => {
      const block = await mem.buildMemoryBlock("/nada", "nadie");
      expect(block).toContain("Memoria del Runtime");
    });

    it("compactContextMemory elimina duplicados y aplica slice", async () => {
      await mem.saveContextMemory({
        contextPath: "/p/compact",
        purpose: "p",
        currentFocus: "",
        keyDecisions: ["d1", "d1", "d1"],
        constraints: ["c1"],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      const compacted = await mem.compactContextMemory("/p/compact");
      expect(compacted.keyDecisions).toHaveLength(1); // dedup
      expect(compacted.keyDecisions).toContain("d1");
    });

    it("exportAll devuelve un objeto con todos los records", async () => {
      await mem.saveContextMemory({
        contextPath: "/p/exp",
        purpose: "e",
        currentFocus: "",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });

      const all = await mem.exportAll();
      expect(typeof all).toBe("object");
      // Debe tener al menos el record de context memory + el save
      expect(Object.keys(all).length).toBeGreaterThan(0);
    });

    it("clearAll elimina todo", async () => {
      await mem.saveContextMemory({
        contextPath: "/p/clear",
        purpose: "x",
        currentFocus: "",
        keyDecisions: [],
        constraints: [],
        relevantResources: [],
        openQuestions: [],
        summary: "",
        lastUpdated: 0,
        version: 1,
      });
      mem.getWorkingMemory("sess-clear");

      await mem.clearAll();

      const cm = await mem.getContextMemory("/p/clear");
      // Después de clearAll, el context memory debe ser fresh
      expect(cm.version).toBe(1);
      expect(cm.purpose).toBe("");

      const wm = mem.getWorkingMemory("sess-clear");
      expect(wm.focus).toBe("");
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("hydrate() maneja IDB vacío sin crashear", async () => {
      const m = new MemoryManager();
      await expect(m.hydrate()).resolves.toBeUndefined();
    });

    it("integrateAIResponse aplica las opciones pasadas", async () => {
      await mem.integrateAIResponse("/p/int", "sess-int", "ai text", {
        addInsight: "nuevo insight",
        addDecision: "nueva decisión",
        addQuestion: "nueva pregunta",
        updateFocus: "foco actualizado",
      });

      const wm = mem.getWorkingMemory("sess-int");
      expect(wm.keyInsights).toContain("nuevo insight");

      const cm = await mem.getContextMemory("/p/int");
      expect(cm.keyDecisions).toContain("nueva decisión");
      expect(cm.openQuestions).toContain("nueva pregunta");
      expect(cm.currentFocus).toBe("foco actualizado");
    });

    it("invalidateOldSnapshots elimina snapshots viejos", async () => {
      const snap = await mem.createCognitiveSnapshot("/p/inv", "s", "test", "manual");
      // Forzar que el snapshot sea viejo (mutando el campo en el cache)
      const cached = (mem as any).cognitiveSnapshots.get(snap.id);
      cached.createdAt = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 días atrás

      const deleted = await mem.invalidateOldSnapshots(30);
      expect(deleted).toBeGreaterThanOrEqual(1);
    });
  });
});