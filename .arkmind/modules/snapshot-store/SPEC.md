# Module: snapshot-store

**Fecha de creación:** 2026-06-01
**Paso relacionado:** 1 (snapshot persistence)
**IA autora del spec:** Mavis
**Estado:** ✅ done

---

## What this module does

Provides persistent storage of snapshots in IndexedDB so that the runtime
can survive page reloads and serve as the foundation for `rollback-engine`.

The module is split into two files:

- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` — IndexedDB wrapper
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — `SnapshotManager` (consumes the store)

---

## What was actually built

- DB: `arkmind_runtime` v1
- Object store `snapshots` (metadata, key: id, indices: contextPath, timestamp, trigger)
- Object store `snapshot_files` (blobs, key: `${snapshotId}::${path}`, index: snapshotId)
- Atomic transactions: save / delete work in a single IDB tx
- Lazy hydration: `SnapshotManager.hydrate()` runs on first operation
- In-memory cache: `Map<string, Snapshot>` mirroring the store for fast reads
- Fallback: if IndexedDB is unavailable, works in memory only (with warning)
- API: `saveSnapshot`, `getSnapshotRecord`, `getSnapshotFiles`,
  `getSnapshotFileContents`, `listSnapshots`, `deleteSnapshot`, `deleteByContext`,
  `clear`, `count`, `totalSize`

---

## Files this module CAN touch

- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` (created)
- `artifacts/ux-arquitecto/src/core/snapshots.ts` (refactored)
- `artifacts/ux-arquitecto/src/core/index.ts` (added export)

## Files this module CANNOT touch

- `artifacts/ux-arquitecto/src/core/types.ts` (NO-GO-ZONE)
- `artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts` (only consume)
- `artifacts/ux-arquitecto/src/core/transactions.ts` (only consume)
- Any file outside `artifacts/ux-arquitecto/src/core/`

---

## Architectural decisions (linked to ADRs)

- **ADR 0001** — Snapshot storage in IndexedDB (not in user's FS)

---

## Verification done

- `tsc --noEmit` on modified files → 0 errors
- API is stable for existing callers (`transactions.ts` needed no changes)
- `snapshotStore` works in isolation (DB opens, stores created, save/list/delete round-trip)

## Verification NOT done

- End-to-end `pnpm install` + `pnpm typecheck` (install timed out at 5 min)
- No automated tests yet (repo has no test setup)
- Not tested in Safari/Firefox (only code-reviewed, not runtime-verified)
- `rollback()` still stub — see `rollback-engine` module
