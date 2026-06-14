# Module: op-journal

**Fecha de creación:** 2026-06-02
**Paso relacionado:** 3
**IA autora del spec:** Manus (refinando stub de Mavis)
**Estado:** 🔵 in_progress

---

## What this module does

Implements the **Operation Journal**: a chronological, persistent record of all significant operations performed within the Arkmind workspace. It provides the "black box" audit trail necessary for debugging, state reconstruction, and user visibility into AI-driven changes.

### Key features:
1. **Audit Trail**: Logs every transaction (write, delete, create, move) and its outcome.
2. **Rollback Logging**: Specifically records rollback attempts and their detailed results (success/failure per file).
3. **Contextual Metadata**: Associates each entry with a `contextPath`, `snapshotId`, and optional user/AI intent.
4. **Persistence**: Stores data in IndexedDB (`arkmind_runtime` DB) to survive page reloads.

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/opJournal.ts   ← new implementation
artifacts/ux-arquitecto/src/core/index.ts       ← export opJournal and types
artifacts/ux-arquitecto/src/core/snapshotStore.ts ← add 'journal' object store (via ADR)
artifacts/ux-arquitecto/src/core/transactions.ts ← hook into lifecycle
artifacts/ux-arquitecto/src/core/types.ts        ← add JournalEntry types
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/snapshots.ts
artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts
```

---

## Dependencies

- `snapshotStore`: For low-level IndexedDB access and schema management.
- `transactions`: The primary source of journalable events.
- `types`: Source of truth for Transaction and Rollback types.

---

## Behavior

1. **Auto-Logging**: Every time a transaction changes status (validated -> executed -> confirmed/rolled_back), a journal entry is created.
2. **Persistence**: Entries are written to a dedicated `journal` store in IndexedDB.
3. **Querying**: Supports filtering by `contextPath`, `type`, and time range.
4. **Rollback Integration**: When a rollback occurs, the journal entry includes the full `RollbackResult` (including `failedFiles` if any).

---

## Data Shape (JournalEntry)

```typescript
export interface JournalEntry {
  id: string;           // UUID
  timestamp: number;    // epoch
  contextPath: string;
  type: "transaction" | "rollback" | "system";
  action: string;       // e.g., "write", "create_snapshot", "rollback"
  status: "success" | "error" | "partial";
  
  // References
  transactionId?: string;
  snapshotId?: string;
  
  // Payload
  details: {
    targetPath?: string;
    description?: string;
    error?: string;
    result?: any;       // e.g., RollbackResult
  };
}
```

---

*Refined by Manus on 2026-06-02. Ready for implementation after CONTRACT and ADR approval.*
