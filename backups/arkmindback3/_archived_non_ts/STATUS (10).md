# Contract: rollback-engine
**Versión:** 1.0
**Fecha:** 2026-06-01 (refinado 2026-06-02)

> **Read AXIOMS.md before this file.**

---

## Consumes

| Module | Method | Signature | Notes |
|---|---|---|---|
| `snapshotStore` | `getSnapshotFileContents` | `(id: string) → Promise<Map<string, string>>` | Reads from IDB |
| `webFilesystemProvider` | `writeFile` | `(path: string, content: string) → Promise<ProviderResult>` | Restores file |
| `webFilesystemProvider` | `readFile` | `(path: string) → Promise<ProviderResult>` | Post-write verification |

### Shape of ProviderResult (do not modify)

```typescript
{
  success: boolean
  path: string
  content?: string
  size?: number
  error?: string
}
```

---

## Exposes

### On `SnapshotManager` (`snapshots.ts`)

```typescript
rollback(snapshotId: string): Promise<RollbackResult>

// Internal but testable
verifyRestoration(path: string, expectedContent: string): Promise<boolean>
```

### Shape of RollbackResult (new)

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

> ⚠️ These types are defined **locally in `snapshots.ts`** until ADR 0002 is
> accepted. After that, they move to `types.ts`.

---

## Invariants

- `restoredFiles` only contains files that were written **and verified** successfully.
  Never includes files with `verify_error`.
- If `success: false`, `failedFiles` has at least one element.
- If `success: true`, `failedFiles` does NOT exist in the object (not `[]`, absent).
- `rollback()` never throws on individual file failure — only on broken pre-conditions
  (snapshot not found, FS not available).
- The module is **idempotent at file level**: calling `rollback()` twice with the
  same `snapshotId` produces the same state on disk.

---

## What this module does NOT do

- Does NOT update `Transaction.status` — that's the caller's job.
- Does NOT delete the snapshot from IDB after rollback — that's `TransactionManager`'s policy.
- Does NOT create new snapshots — that's `createSnapshot()` in the same `snapshots.ts`.
- Does NOT retry on failure — fail fast, report.

---

## Modules depending on this contract

| Module | How it uses it |
|---|---|
| `transactions.ts` | Calls `rollback(snapshotId)` and reads `RollbackResult.success` to update `Transaction.status` |

> If you change the shape of `RollbackResult`, notify whoever touches `transactions.ts`.
> It's a contract in active use (or about to be).
