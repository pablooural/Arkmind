# Module: rollback-engine

**Fecha de creación:** 2026-06-01
**Paso relacionado:** 2
**IA autora del spec:** Claude (refinado por Mavis)
**Estado:** 🟡 pending — sin reclamar

---

## What this module does

Implements the real `rollback()` in `SnapshotManager`. Given a snapshot persisted
in IndexedDB, it restores the user's filesystem by writing each file from the
snapshot via `WebFilesystemProvider`. It validates the post-condition after
writing and handles partial failures explicitly (not silently).

The complete flow to implement:

```
rollback(snapshotId)
  → snapshotStore.getSnapshotFileContents(id)        // reads IDB
  → for each [path, content]: webFilesystemProvider.writeFile(path, content)
  → verify post-condition: re-read each file and compare content
  → if all ok   → return { success: true, restoredFiles, snapshotId }
  → if partial  → return { success: false, restoredFiles, failedFiles, snapshotId }
```

---

## Public interface

### Main method

```typescript
rollback(snapshotId: string): Promise<RollbackResult>
```

### Return type (new discriminated union)

```typescript
type RollbackResult =
  | { success: true;  restoredFiles: string[]; snapshotId: string }
  | { success: false; restoredFiles: string[]; failedFiles: RollbackFailure[]; snapshotId: string }

type RollbackFailure = {
  path: string
  reason: "write_error" | "verify_error" | "not_found"
  error?: unknown
}
```

### Verification method (internal, but exportable for tests)

```typescript
verifyRestoration(path: string, expectedContent: string): Promise<boolean>
```

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/snapshots.ts   ← rollback() lives here, implement it
artifacts/ux-arquitecto/src/core/index.ts       ← only if RollbackResult needs to be re-exported
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/types.ts                  ← NO-GO-ZONE
artifacts/ux-arquitecto/src/core/snapshotStore.ts          ← consume, don't modify
artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts  ← consume, don't modify
artifacts/ux-arquitecto/src/core/transactions.ts           ← consume, don't modify
```

> ⚠️ If `RollbackResult` / `RollbackFailure` don't exist in `types.ts`, **do NOT add them
> directly**. Define them locally in `snapshots.ts` with a comment
> `// TODO: move to types.ts after consensus (ADR 0002 pending)`.
> The next IA promotes them via ADR.

---

## Allowed dependencies

```
snapshotStore            → loadSnapshotFiles(id): Promise<Map<path, string>>
                            (or snapshotStore.getSnapshotFileContents directly)
webFilesystemProvider    → writeFile(path, content): Promise<ProviderResult>
                            readFile(path): Promise<ProviderResult>   // for verification
```

- No new npm dependencies.
- No network calls.
- No direct IndexedDB access (only through `snapshotStore`).

---

## Behavior on errors

| Situation | Behavior |
|---|---|
| `snapshotId` does not exist in IDB | Throw `Error("snapshot not found: <id>")` |
| `writeFile` fails on 1 file | Continue with the rest, register in `failedFiles` |
| `writeFile` fails on all | `success: false`, `failedFiles` complete |
| `verifyRestoration` fails | Register as `verify_error`, do NOT retry |
| FS provider not initialized | Throw `Error("filesystem provider not available")` |
| Snapshot has zero files (empty `Map`) | Return `{ success: true, restoredFiles: [], snapshotId }` |

The rollback is **best-effort but honest**: tries to restore everything, reports
exactly what failed, does NOT throw on individual file failures.

---

## ⚠️ Known design discrepancy (ADR 0002 pending)

The current `transactions.ts → rollbackTransaction()` method does:

```typescript
async rollbackTransaction(transactionId: string): Promise<boolean> {
  ...
  const success = await snapshotManager.rollback(transaction.snapshotId);
  if (success) {
    transaction.status = "rolled_back";
  }
  return success;
}
```

**Problem 1:** It uses `success: boolean` but the new contract returns a discriminated union.

**Problem 2:** It updates `Transaction.status` from the caller side, which this SPEC
explicitly forbids. The SPEC says: "El módulo NO actualiza Transaction.status — eso
es responsabilidad del caller" but it ALSO says the caller should not set
`rolled_back` directly either.

**Resolution path:**
- The next IA can implement `rollback()` returning `RollbackResult` (new contract)
- Update `transactions.ts → rollbackTransaction()` to translate the union → status change
- The discrepancy is "solved" by keeping the responsibility split: this module returns
  a typed result, the caller decides what status to set

**Or:** change SPEC to allow this module to update `Transaction.status` directly.
This is the easier path but couples `snapshots.ts` to `transactions.ts`. NOT recommended.

The next IA should pick **resolution path #1** (update the caller to translate).

---

## Notes for the implementing IA

- `rollback()` already exists in `snapshots.ts` as a **stub**. Just implement it,
  don't create from scratch.
- `loadSnapshotFiles(snapshotId)` is already implemented and returns
  `Promise<Map<string, string>>`. Use it directly.
- Post-write verification is **mandatory**, not optional. Spec point 9 requires
  `verify` before `commit/rollback`.
- Do NOT modify `Transaction.status` directly from here. The caller (`transactions.ts`)
  is who updates the transaction state with the result `rollback()` returns.
- See `.arkmind/NO-GO-ZONES.md` before starting. See `.arkmind/CONVENTIONS.md` for the claim protocol.
- Read `AXIOMS.md` first. Always.
