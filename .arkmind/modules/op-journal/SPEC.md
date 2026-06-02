# Module: op-journal

**Fecha de creación:** 2026-06-02
**Paso relacionado:** 2 (bonus) o 3
**IA autora del spec:** Mavis (pendiente de detallar)
**Estado:** 🟡 pending — sin reclamar

---

## What this module does (TBD)

Implements the **Operation Journal** from the spec (punto 10):

> Registro cronológico completo: operación, timestamp, archivos afectados,
> contexto, resultado, snapshot asociado.

Records every destructive operation (write, delete, refactor) with enough
metadata to reconstruct the full history. Persisted in IndexedDB (same DB,
separate object store).

---

## Files this module CAN touch

TBD — expected:
```
artifacts/ux-arquitecto/src/core/opJournal.ts   ← new
artifacts/ux-arquitecto/src/core/index.ts        ← export
artifacts/ux-arquitecto/src/core/snapshotStore.ts  ← add new object store (via ADR)
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/types.ts
artifacts/ux-arquitecto/src/core/snapshots.ts
artifacts/ux-arquitecto/src/core/transactions.ts
artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts
```

---

## Dependencies

- `snapshotStore` — to read snapshot metadata for the journal entry
- `WebFilesystemProvider` — maybe, to read files for diff calculation (TBD)

---

## Behavior

- Hook into `transactions.ts` (or use it as caller) to log every transaction
- Provide a `queryJournal(filter)` API to retrieve history
- Provide a `clearJournal()` for testing/reset

---

*This is a stub. The next IA should fill in the details before claiming.*
