/**
 * snapshotStore.test.ts
 *
 * T-048: tests del SnapshotStore (capa de persistencia de snapshots en IDB).
 *
 * Cubre:
 * - saveSnapshot → persiste metadata + archivos atómicamente
 * - getSnapshotRecord → devuelve registro o null
 * - getSnapshotFiles → devuelve archivos ordenados por path
 * - getSnapshotFileContents → devuelve Map<path, string> decodificado
 * - listSnapshots → ordenado desc por timestamp, con filtro opcional
 * - deleteSnapshot → borra metadata + archivos atómicamente
 * - deleteByContext → borra todos los snapshots del contexto
 * - clear → vacía la base
 * - count → total de snapshots
 * - totalSize → suma de tamaños de blobs
 *
 * Nota: usamos un mock liviano de IndexedDB (_idbMock) que soporta
 * createObjectStore con keyPath, createIndex, getAll, getAllKeys, etc.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SnapshotStore, SnapshotRecord, SnapshotFileInput } from "../snapshotStore";
import { installIDBMock } from "./_idbMock";

function makeSnapshot(overrides: Partial<SnapshotRecord> = {}): SnapshotRecord {
  return {
    id: "snap-" + Math.random().toString(36).slice(2, 8),
    timestamp: Date.now(),
    label: "test-snap",
    description: "Snapshot de prueba",
    contextPath: "/project/test",
    trigger: "manual",
    metadata: {
      resourceCount: 2,
      changedResources: ["/project/test/a.ts", "/project/test/b.ts"],
      totalSize: 100,
    },
    fileCount: 2,
    filePaths: ["/project/test/a.ts", "/project/test/b.ts"],
    storePath: "snapshots/snap-xxx",
    ...overrides,
  };
}

function makeFiles(): SnapshotFileInput[] {
  return [
    { path: "/project/test/a.ts", content: "export const a = 1;" },
    { path: "/project/test/b.ts", content: "export const b = 2;" },
  ];
}

describe("SnapshotStore", () => {
  let store: SnapshotStore;

  beforeEach(() => {
    installIDBMock("arkmind_runtime_test");
    store = new SnapshotStore();
  });

  describe("saveSnapshot", () => {
    it("persiste metadata y archivos", async () => {
      const snap = makeSnapshot({ id: "snap-1" });
      await store.saveSnapshot(snap, makeFiles());

      const loaded = await store.getSnapshotRecord("snap-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe("snap-1");
      expect(loaded!.contextPath).toBe("/project/test");
      expect(loaded!.fileCount).toBe(2);
    });

    it("persiste archivos como blobs", async () => {
      const snap = makeSnapshot({ id: "snap-2" });
      await store.saveSnapshot(snap, makeFiles());

      const files = await store.getSnapshotFiles("snap-2");
      expect(files).toHaveLength(2);
      expect(files.map((f) => f.path).sort()).toEqual([
        "/project/test/a.ts",
        "/project/test/b.ts",
      ]);
    });

    it("sobrescribe si ya existía un snapshot con el mismo id", async () => {
      const snap1 = makeSnapshot({ id: "snap-3", label: "v1" });
      const snap2 = makeSnapshot({ id: "snap-3", label: "v2" });

      await store.saveSnapshot(snap1, makeFiles());
      await store.saveSnapshot(snap2, makeFiles());

      const loaded = await store.getSnapshotRecord("snap-3");
      expect(loaded!.label).toBe("v2");
      const all = await store.listSnapshots();
      const matching = all.filter((s) => s.id === "snap-3");
      expect(matching).toHaveLength(1);
    });
  });

  describe("getSnapshotFileContents", () => {
    it("decodifica blobs a string en un Map", async () => {
      const snap = makeSnapshot({ id: "snap-4" });
      await store.saveSnapshot(snap, makeFiles());

      const contents = await store.getSnapshotFileContents("snap-4");
      expect(contents.size).toBe(2);
      expect(contents.get("/project/test/a.ts")).toBe("export const a = 1;");
      expect(contents.get("/project/test/b.ts")).toBe("export const b = 2;");
    });

    it("devuelve Map vacío si el snapshot no tiene archivos", async () => {
      const snap = makeSnapshot({ id: "snap-5", fileCount: 0, filePaths: [] });
      await store.saveSnapshot(snap, []);

      const contents = await store.getSnapshotFileContents("snap-5");
      expect(contents.size).toBe(0);
    });
  });

  describe("listSnapshots", () => {
    it("devuelve snapshots ordenados desc por timestamp", async () => {
      const t1 = Date.now() - 3000;
      const t2 = Date.now() - 2000;
      const t3 = Date.now() - 1000;
      await store.saveSnapshot(makeSnapshot({ id: "old",   timestamp: t1 }), []);
      await store.saveSnapshot(makeSnapshot({ id: "mid",   timestamp: t2 }), []);
      await store.saveSnapshot(makeSnapshot({ id: "newer", timestamp: t3 }), []);

      const all = await store.listSnapshots();
      expect(all.map((s) => s.id)).toEqual(["newer", "mid", "old"]);
    });

    it("filtra por contextPath cuando se pasa", async () => {
      await store.saveSnapshot(makeSnapshot({ id: "p1", contextPath: "/project/a" }), []);
      await store.saveSnapshot(makeSnapshot({ id: "p2", contextPath: "/project/b" }), []);

      const onlyA = await store.listSnapshots("/project/a");
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].id).toBe("p1");
    });
  });

  describe("deleteSnapshot", () => {
    it("borra metadata y archivos asociados", async () => {
      const snap = makeSnapshot({ id: "to-delete" });
      await store.saveSnapshot(snap, makeFiles());

      await store.deleteSnapshot("to-delete");

      const loaded = await store.getSnapshotRecord("to-delete");
      expect(loaded).toBeNull();
      const files = await store.getSnapshotFiles("to-delete");
      expect(files).toHaveLength(0);
    });

    it("no falla si el snapshot no existe", async () => {
      await expect(store.deleteSnapshot("nope")).resolves.toBeUndefined();
    });
  });

  describe("deleteByContext", () => {
    it("borra todos los snapshots del contexto y devuelve la cantidad", async () => {
      await store.saveSnapshot(makeSnapshot({ id: "c1", contextPath: "/p/x" }), []);
      await store.saveSnapshot(makeSnapshot({ id: "c2", contextPath: "/p/x" }), []);
      await store.saveSnapshot(makeSnapshot({ id: "c3", contextPath: "/p/y" }), []);

      const deleted = await store.deleteByContext("/p/x");
      expect(deleted).toBe(2);

      const remaining = await store.listSnapshots();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("c3");
    });
  });

  describe("clear", () => {
    it("vacía todos los snapshots", async () => {
      await store.saveSnapshot(makeSnapshot({ id: "s1" }), makeFiles());
      await store.saveSnapshot(makeSnapshot({ id: "s2" }), makeFiles());

      await store.clear();

      expect(await store.count()).toBe(0);
    });
  });

  describe("count y totalSize", () => {
    it("count devuelve el total de snapshots", async () => {
      await store.saveSnapshot(makeSnapshot({ id: "s1" }), []);
      await store.saveSnapshot(makeSnapshot({ id: "s2" }), []);
      expect(await store.count()).toBe(2);
    });

    it("totalSize suma los tamaños de los blobs", async () => {
      const snap = makeSnapshot({ id: "big" });
      const big = "x".repeat(1000);
      await store.saveSnapshot(snap, [
        { path: "/p/big.ts", content: big },
      ]);
      expect(await store.totalSize()).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("isSupported", () => {
    it("devuelve true cuando indexedDB existe", () => {
      expect(store.isSupported()).toBe(true);
    });
  });
});