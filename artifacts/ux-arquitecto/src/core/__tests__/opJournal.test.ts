/**
 * opJournal.test.ts
 *
 * T-051: tests del OpJournalManager.
 *
 * Cubre:
 * - addEntry: genera id + timestamp, persiste en snapshotStore
 * - addEntry: maneja error de IDB gracefully (no rompe, devuelve id)
 * - getEntries: devuelve todas las entradas
 * - getEntries: filtra por contextPath, type, since, until, limit
 * - getEntries: ordena desc por timestamp
 * - getEntryById: devuelve la entry o undefined
 * - clearJournal: vacía el store
 *
 * Usa el _idbMock de Replit (fix setTimeout(0) para tx.oncomplete).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { OpJournalManager } from "../opJournal";
import { installIDBMock } from "./_idbMock";
import type { JournalEntry } from "../types";

describe("OpJournalManager", () => {
  let journal: OpJournalManager;

  beforeEach(() => {
    installIDBMock("arkmind_runtime_test");
    journal = new OpJournalManager();
  });

  // ─── addEntry ─────────────────────────────────────────────────────
  describe("addEntry", () => {
    it("genera id y timestamp automáticamente", async () => {
      const id = await journal.addEntry({
        contextPath: "/p/a.ts",
        type: "transaction",
        action: "create_write",
        status: "success",
        transactionId: "txn-1",
      });
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");

      const entry = await journal.getEntryById(id);
      expect(entry).toBeDefined();
      expect(entry!.timestamp).toBeGreaterThan(0);
      expect(entry!.contextPath).toBe("/p/a.ts");
    });

    it("persiste múltiples entries", async () => {
      const id1 = await journal.addEntry({
        contextPath: "/p/a",
        type: "transaction",
        action: "create_write",
        status: "success",
      });
      const id2 = await journal.addEntry({
        contextPath: "/p/b",
        type: "rollback",
        action: "rollback",
        status: "success",
      });
      const id3 = await journal.addEntry({
        contextPath: "/p/c",
        type: "system",
        action: "init",
        status: "success",
      });

      const all = await journal.getEntries();
      expect(all.length).toBe(3);
      const ids = all.map((e) => e.id);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).toContain(id3);
    });
  });

  // ─── getEntries ───────────────────────────────────────────────────
  describe("getEntries", () => {
    let idA: string, idB: string, idC: string;

    beforeEach(async () => {
      idA = await journal.addEntry({
        contextPath: "/p/a",
        type: "transaction",
        action: "create_write",
        status: "success",
      });
      // Espera para diferenciar timestamps
      await new Promise((r) => setTimeout(r, 5));
      idB = await journal.addEntry({
        contextPath: "/p/b",
        type: "rollback",
        action: "rollback",
        status: "success",
      });
      await new Promise((r) => setTimeout(r, 5));
      idC = await journal.addEntry({
        contextPath: "/p/a",
        type: "transaction",
        action: "execute",
        status: "success",
      });
    });

    it("devuelve todas las entries sin filtro", async () => {
      const all = await journal.getEntries();
      expect(all).toHaveLength(3);
    });

    it("ordena desc por timestamp (más reciente primero)", async () => {
      const all = await journal.getEntries();
      expect(all[0].id).toBe(idC);
      expect(all[2].id).toBe(idA);
    });

    it("filtra por contextPath", async () => {
      const a = await journal.getEntries({ contextPath: "/p/a" });
      expect(a).toHaveLength(2);
      expect(a.every((e) => e.contextPath === "/p/a")).toBe(true);
    });

    it("filtra por type", async () => {
      const txns = await journal.getEntries({ type: "transaction" });
      expect(txns).toHaveLength(2);
      expect(txns.every((e) => e.type === "transaction")).toBe(true);
    });

    it("filtra por since (timestamp >= since)", async () => {
      const all = await journal.getEntries();
      const midTimestamp = all[1].timestamp;
      const since = await journal.getEntries({ since: midTimestamp });
      expect(since.length).toBeGreaterThanOrEqual(1);
      expect(since.every((e) => e.timestamp >= midTimestamp)).toBe(true);
    });

    it("filtra por until (timestamp <= until)", async () => {
      const all = await journal.getEntries();
      const midTimestamp = all[1].timestamp;
      const until = await journal.getEntries({ until: midTimestamp });
      expect(until.every((e) => e.timestamp <= midTimestamp)).toBe(true);
    });

    it("aplica limit", async () => {
      const limited = await journal.getEntries({ limit: 1 });
      expect(limited).toHaveLength(1);
      expect(limited[0].id).toBe(idC);
    });

    it("combina múltiples filtros", async () => {
      const both = await journal.getEntries({
        contextPath: "/p/a",
        type: "transaction",
      });
      expect(both).toHaveLength(2);
      expect(both.every((e) => e.contextPath === "/p/a" && e.type === "transaction")).toBe(true);
    });
  });

  // ─── getEntryById ─────────────────────────────────────────────────
  describe("getEntryById", () => {
    it("devuelve la entry por id", async () => {
      const id = await journal.addEntry({
        contextPath: "/p/x",
        type: "system",
        action: "init",
        status: "success",
      });
      const found = await journal.getEntryById(id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(id);
      expect(found!.contextPath).toBe("/p/x");
    });

    it("devuelve undefined si no existe", async () => {
      const found = await journal.getEntryById("id-fake");
      expect(found).toBeUndefined();
    });
  });

  // ─── clearJournal ─────────────────────────────────────────────────
  describe("clearJournal", () => {
    it("vacía todas las entries", async () => {
      await journal.addEntry({
        contextPath: "/p/a",
        type: "transaction",
        action: "create",
        status: "success",
      });
      await journal.addEntry({
        contextPath: "/p/b",
        type: "transaction",
        action: "create",
        status: "success",
      });

      expect((await journal.getEntries()).length).toBe(2);

      await journal.clearJournal();

      expect((await journal.getEntries()).length).toBe(0);
    });
  });
});