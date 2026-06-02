# Contract: snapshot-store
**Versión:** 1.0
**Fecha:** 2026-06-01

---

## Consumes

| Module | Method | Signature | Notes |
|---|---|---|---|
| `WebFilesystemProvider` | `readFile` | `(path: string) → Promise<ProviderResult>` | To capture file content at snapshot time |

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

### `SnapshotStore` (low-level IndexedDB wrapper)

```typescript
class SnapshotStore {
  isSupported(): boolean
  saveSnapshot(snapshot: SnapshotRecord, files: SnapshotFileInput[]): Promise<void>
  getSnapshotRecord(snapshotId: string): Promise<SnapshotRecord | null>
  getSnapshotFiles(snapshotId: string): Promise<SnapshotFileRecord[]>
  getSnapshotFileContents(snapshotId: string): Promise<Map<string, string>>
  listSnapshots(contextPath?: string): Promise<SnapshotRecord[]>
  deleteSnapshot(snapshotId: string): Promise<void>
  deleteByContext(contextPath: string): Promise<number>
  clear(): Promise<void>
  count(): Promise<number>
  totalSize(): Promise<number>
}
```

### `SnapshotManager` (domain model)

```typescript
class SnapshotManager {
  hydrate(): Promise<void>
  createSnapshot(
    contextPath: string,
    filePaths: string[],
    reason: "write" | "delete" | "refactor" | "auto" | "manual",
    label?: string
  ): Promise<Snapshot>
  getSnapshot(snapshotId: string): Snapshot | undefined
  listSnapshots(contextPath: string): Snapshot[]
  rollback(snapshotId: string): Promise<boolean>   // STUB — see rollback-engine
  deleteSnapshot(snapshotId: string): Promise<boolean>
  cleanOldSnapshots(daysOld?: number): Promise<number>
  getPersistedSize(): Promise<number>
  getPersistedCount(): Promise<number>
  loadSnapshotFiles(snapshotId: string): Promise<Map<string, string>>
}
```

### Domain types (defined in `types.ts`, do not modify without ADR)

```typescript
interface Snapshot {
  id: string
  timestamp: number
  label?: string
  description?: string
  contextPath: string
  metadata: {
    resourceCount: number
    changedResources: string[]
    totalSize?: number
  }
  storePath: string
}
```

---

## Invariants

- `createSnapshot` always reads files **before** writing to the store (atomic content capture).
- A snapshot in the store contains either **all** its files or **none** (atomic tx).
- `deleteSnapshot` removes both metadata and all file blobs in the same tx.
- `listSnapshots` returns snapshots sorted by `timestamp` DESC.
- `getSnapshotFileContents` returns an empty `Map` for a snapshot that has zero files.
- If IndexedDB is unavailable, `createSnapshot` and `deleteSnapshot` work in memory only
  and log a warning. `getPersistedSize`/`getPersistedCount` return 0 in that case.

---

## What this module does NOT do

- Does NOT touch the user's filesystem directly. Reads via `WebFilesystemProvider`.
- Does NOT manage transactions. That's `transactions.ts`.
- Does NOT implement rollback. That's `rollback-engine` (next module).
- Does NOT decide when to snapshot. Callers (`transactions.ts`) do.
- Does NOT do schema migration. If `Snapshot` shape changes, old records may fail to
  deserialize (see open question Q1 in STATE.json).

---

## Modules depending on this contract

| Module | How it uses it |
|---|---|
| `rollback-engine` | Calls `loadSnapshotFiles(snapshotId)` to get file contents to restore |
| `transactions.ts` | Calls `createSnapshot(path, paths, reason)` to capture pre-state |
| `op-journal` | Will call `listSnapshots(contextPath)` to query history (planned) |
