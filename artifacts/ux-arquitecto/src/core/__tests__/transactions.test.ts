/**
 * transactions.test.ts
 *
 * T-050: tests del TransactionManager.
 *
 * Cubre:
 * - attachOperation: adjuntar y rechazar si no existe la tx
 * - createTransaction: crea tx + snapshot + journal entry
 * - validateTransaction: por tipo (read/write/create/delete/move)
 * - simulateTransaction: devuelve SimulationResult
 * - executeTransaction: ejecuta op real vía webFilesystemProvider
 * - executeTransaction: rollback si la op falla
 * - confirmTransaction: solo si está executed
 * - rollbackTransaction: status "rolled_back" / "rollback_failed"
 * - permisos: grant, has, revoke, expiración
 *
 * Mockeamos webFilesystemProvider, snapshotManager, opJournal con vi.spyOn
 * para no depender de filesystem real ni IDB en estos tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionManager } from "../transactions";
import { webFilesystemProvider } from "../WebFilesystemProvider";
import { snapshotManager } from "../snapshots";
import { opJournal } from "../opJournal";

describe("TransactionManager", () => {
  let txm: TransactionManager;

  // Stubs
  const stubFs = {
    isReady: vi.fn(() => true),
    writeFile: vi.fn(async () => ({ success: true })),
    deleteFile: vi.fn(async () => ({ success: true })),
  };

  const stubSnap = {
    createSnapshot: vi.fn(async (_path: string, _files: string[], _reason: string, _label: string) => ({
      id: "snap-test",
    })),
    rollback: vi.fn(async (_id: string) => ({ success: true, restored: [] })),
  };

  const stubJournal = {
    addEntry: vi.fn(),
  };

  beforeEach(() => {
    txm = new TransactionManager();
    vi.restoreAllMocks();
    vi.spyOn(webFilesystemProvider, "isReady").mockImplementation(stubFs.isReady);
    vi.spyOn(webFilesystemProvider, "writeFile").mockImplementation(stubFs.writeFile);
    vi.spyOn(webFilesystemProvider, "deleteFile").mockImplementation(stubFs.deleteFile);
    vi.spyOn(snapshotManager, "createSnapshot").mockImplementation(stubSnap.createSnapshot);
    vi.spyOn(snapshotManager, "rollback").mockImplementation(stubSnap.rollback);
    vi.spyOn(opJournal, "addEntry").mockImplementation(stubJournal.addEntry);
    // reset stubs
    stubFs.isReady.mockReturnValue(true);
    stubFs.writeFile.mockResolvedValue({ success: true });
    stubFs.deleteFile.mockResolvedValue({ success: true });
    stubSnap.createSnapshot.mockResolvedValue({ id: "snap-test" });
    stubSnap.rollback.mockResolvedValue({ success: true, restored: [] });
    stubJournal.addEntry.mockReset();
  });

  // ─── attachOperation ──────────────────────────────────────────────
  describe("attachOperation", () => {
    it("adjunta op a una transacción existente", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      const ok = txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "x",
      });
      expect(ok).toBe(true);
    });

    it("rechaza si la transacción no existe", () => {
      const ok = txm.attachOperation("txn-fake", {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "x",
      });
      expect(ok).toBe(false);
    });
  });

  // ─── createTransaction ────────────────────────────────────────────
  describe("createTransaction", () => {
    it("crea transacción + snapshot + journal entry", async () => {
      const tx = await txm.createTransaction("write", "/p/file.ts");

      expect(tx.id).toMatch(/^txn_/);
      expect(tx.type).toBe("write");
      expect(tx.targetPath).toBe("/p/file.ts");
      expect(tx.snapshotId).toBe("snap-test");
      expect(tx.status).toBe("validated");
      expect(stubSnap.createSnapshot).toHaveBeenCalledWith(
        "/p/file.ts", [], "write", expect.stringContaining("Before write")
      );
      expect(stubJournal.addEntry).toHaveBeenCalled();
    });

    it("elige reason correcto según el type", async () => {
      await txm.createTransaction("delete", "/p/a.ts");
      expect(stubSnap.createSnapshot).toHaveBeenCalledWith(
        "/p/a.ts", [], "delete", expect.any(String)
      );

      await txm.createTransaction("move", "/p/b.ts");
      expect(stubSnap.createSnapshot).toHaveBeenLastCalledWith(
        "/p/b.ts", [], "refactor", expect.any(String)
      );
    });
  });

  // ─── validateTransaction ──────────────────────────────────────────
  describe("validateTransaction", () => {
    it("read falla si fs no está listo", async () => {
      stubFs.isReady.mockReturnValue(false);
      const tx = await txm.createTransaction("read", "/p/a.ts");
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(false);
      expect(txm.getTransaction(tx.id)!.status).toBe("failed");
    });

    it("read pasa si fs está listo", async () => {
      stubFs.isReady.mockReturnValue(true);
      const tx = await txm.createTransaction("read", "/p/a.ts");
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(true);
    });

    it("write sin content falla", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, { type: "write", sourcePath: "/p/a.ts" } as any);
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(false);
      expect(txm.getTransaction(tx.id)!.status).toBe("failed");
    });

    it("write con content y sourcePath pasa", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "data",
      });
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(true);
    });

    it("write con content vacío (string '') pasa", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "",
      });
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(true);
    });

    it("delete sin targetPath falla", async () => {
      const tx = await txm.createTransaction("delete", "");
      const valid = await txm.validateTransaction(tx.id);
      expect(valid).toBe(false);
    });
  });

  // ─── simulateTransaction ──────────────────────────────────────────
  describe("simulateTransaction", () => {
    it("devuelve SimulationResult con targetPath afectado", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      const sim = await txm.simulateTransaction(tx.id);
      expect(sim.success).toBe(true);
      expect(sim.affectedFiles).toContain("/p/a.ts");
    });

    it("devuelve error si la tx no existe", async () => {
      const sim = await txm.simulateTransaction("txn-fake");
      expect(sim.success).toBe(false);
      expect(sim.errors.length).toBeGreaterThan(0);
    });
  });

  // ─── executeTransaction ───────────────────────────────────────────
  describe("executeTransaction", () => {
    it("write ejecuta writeFile en el provider", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "x = 1",
      });
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(true);
      expect(stubFs.writeFile).toHaveBeenCalledWith("/p/a.ts", "x = 1");
      expect(txm.getTransaction(tx.id)!.status).toBe("executed");
    });

    it("create ejecuta writeFile", async () => {
      const tx = await txm.createTransaction("create", "/p/new.ts");
      txm.attachOperation(tx.id, {
        type: "create",
        sourcePath: "/p/new.ts",
        content: "",
      });
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(true);
      expect(stubFs.writeFile).toHaveBeenCalledWith("/p/new.ts", "");
    });

    it("delete ejecuta deleteFile", async () => {
      const tx = await txm.createTransaction("delete", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "delete",
        sourcePath: "/p/a.ts",
        targetPath: "/p/a.ts",
      });
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(true);
      expect(stubFs.deleteFile).toHaveBeenCalled();
    });

    it("read no toca el filesystem", async () => {
      const tx = await txm.createTransaction("read", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "read",
        sourcePath: "/p/a.ts",
      });
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(true);
      expect(stubFs.writeFile).not.toHaveBeenCalled();
      expect(stubFs.deleteFile).not.toHaveBeenCalled();
    });

    it("rechaza si la tx no está validated", async () => {
      const tx = await txm.createTransaction("read", "/p/a.ts");
      // Forzar status a "pending" para que NO esté validada
      txm.getTransaction(tx.id)!.status = "pending";
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(false);
    });

    it("rollback automático si la op fs falla", async () => {
      stubFs.writeFile.mockResolvedValue({ success: false, error: "perm denied" });
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "x",
      });
      const ok = await txm.executeTransaction(tx.id);
      expect(ok).toBe(false);
      expect(stubSnap.rollback).toHaveBeenCalled();
      expect(txm.getTransaction(tx.id)!.status).toBe("rolled_back");
    });
  });

  // ─── confirmTransaction ───────────────────────────────────────────
  describe("confirmTransaction", () => {
    it("confirma tx executed", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      txm.attachOperation(tx.id, {
        type: "write",
        sourcePath: "/p/a.ts",
        content: "x",
      });
      await txm.executeTransaction(tx.id);
      const ok = txm.confirmTransaction(tx.id);
      expect(ok).toBe(true);
      expect(txm.getTransaction(tx.id)!.status).toBe("confirmed");
    });

    it("rechaza si no está executed", async () => {
      const tx = await txm.createTransaction("read", "/p/a.ts");
      // status = "validated", no "executed"
      const ok = txm.confirmTransaction(tx.id);
      expect(ok).toBe(false);
    });
  });

  // ─── rollbackTransaction ──────────────────────────────────────────
  describe("rollbackTransaction", () => {
    it("status rolled_back si el rollback es exitoso", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      const ok = await txm.rollbackTransaction(tx.id);
      expect(ok).toBe(true);
      expect(txm.getTransaction(tx.id)!.status).toBe("rolled_back");
    });

    it("status rollback_failed si el rollback falla", async () => {
      stubSnap.rollback.mockResolvedValue({ success: false, restored: [], error: "fail" } as any);
      const tx = await txm.createTransaction("write", "/p/a.ts");
      const ok = await txm.rollbackTransaction(tx.id);
      expect(ok).toBe(false);
      expect(txm.getTransaction(tx.id)!.status).toBe("rollback_failed");
    });

    it("rechaza si la tx no tiene snapshotId", async () => {
      const tx = await txm.createTransaction("read", "/p/a.ts");
      txm.getTransaction(tx.id)!.snapshotId = undefined;
      const ok = await txm.rollbackTransaction(tx.id);
      expect(ok).toBe(false);
    });
  });

  // ─── Permisos ─────────────────────────────────────────────────────
  describe("permisos", () => {
    it("grantPermission crea un permiso", () => {
      const perm = txm.grantPermission("write", "/p/file.ts");
      expect(perm.type).toBe("write");
      expect(perm.resourcePath).toBe("/p/file.ts");
      expect(perm.temporary).toBe(false);
    });

    it("grantPermission con expiresIn es temporal", () => {
      const perm = txm.grantPermission("delete", "/p/x", 1000);
      expect(perm.temporary).toBe(true);
      expect(perm.expiresAt).toBeGreaterThan(Date.now());
    });

    it("hasPermission devuelve true si el permiso aplica", () => {
      txm.grantPermission("write", "/p/file.ts");
      expect(txm.hasPermission("write", "/p/file.ts")).toBe(true);
    });

    it("hasPermission devuelve false si el path no matchea", () => {
      txm.grantPermission("write", "/p/a.ts");
      expect(txm.hasPermission("write", "/p/b.ts")).toBe(false);
    });

    it("hasPermission con patrón /* prefijo", () => {
      txm.grantPermission("write", "/p/*");
      expect(txm.hasPermission("write", "/p/inside/file.ts")).toBe(true);
      expect(txm.hasPermission("write", "/other/file.ts")).toBe(false);
    });

    it("hasPermission con patrón * matchea todo", () => {
      txm.grantPermission("read", "*");
      expect(txm.hasPermission("read", "/anything/at/all.ts")).toBe(true);
    });

    it("revokePermission elimina el permiso", () => {
      const perm = txm.grantPermission("write", "/p/x");
      const ok = txm.revokePermission(perm.id);
      expect(ok).toBe(true);
      expect(txm.hasPermission("write", "/p/x")).toBe(false);
    });
  });

  // ─── getTransaction ───────────────────────────────────────────────
  describe("getTransaction", () => {
    it("devuelve la tx por id", async () => {
      const tx = await txm.createTransaction("write", "/p/a.ts");
      const found = txm.getTransaction(tx.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(tx.id);
    });

    it("devuelve undefined si no existe", () => {
      expect(txm.getTransaction("txn-fake")).toBeUndefined();
    });
  });
});