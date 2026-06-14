# Contract: op-journal
**Versión:** 0.2 (Refined)
**Fecha:** 2026-06-02
**IA:** Manus

---

## Consumes

- **Types**: `Transaction`, `RollbackResult`, `Snapshot`, `TransactionStatus` from `core/types.ts`.
- **Persistence**: `SnapshotStore` (via `snapshotStore.ts`) to obtain the IDB database instance or add a new store.
- **Events**: Triggered by `TransactionManager` during state transitions.

---

## Exposes

### Types
- `JournalEntry`: The structure of a single log entry.
- `JournalFilter`: Criteria for querying the journal.

### API (`OpJournalManager`)
- `addEntry(entry: Omit<JournalEntry, 'id' | 'timestamp'>): Promise<string>`
- `getEntries(filter?: JournalFilter): Promise<JournalEntry[]>`
- `clearJournal(): Promise<void>`
- `getEntryById(id: string): Promise<JournalEntry | undefined>`

---

## Invariants

1. **Immutability**: Once written, a journal entry cannot be edited (only deleted via `clearJournal`).
2. **Chronological Order**: `getEntries` must return results sorted by `timestamp` descending by default.
3. **Atomicity**: Journal writes should not block the main transaction flow (fire and forget with background error logging).
4. **Referential Integrity**: If an entry references a `snapshotId`, that ID should exist (though the snapshot itself might have been deleted later).

---

## What this module does NOT do

1. **Undo/Redo**: This is a log, not the engine for undoing (that's `rollback-engine`).
2. **File Diffing**: It does not store full file diffs (to avoid DB bloat), only metadata about what changed.
3. **Real-time Sync**: It does not broadcast events to other tabs/devices (out of scope for now).

---

*Refined by Manus on 2026-06-02.*
