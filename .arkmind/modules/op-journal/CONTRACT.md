# Contract: op-journal

**Versión:** 1.0
**Fecha:** 2026-06-02

---

## Consumes

| Module | Method | Signature | Notes |
|---|---|---|---|
| `snapshotStore` | `db` | `IDBDatabase` | Acceso directo para operaciones de journal |

---

## Exposes

### On `OpJournal` (`opJournal.ts`)

```typescript
log(entry: Omit<JournalEntry, "id" | "timestamp">): Promise<string>
list(filter?: { path?: string; type?: string }): Promise<JournalEntry[]>
```

### Invariants

- Las entradas son inmutables: una vez escritas, no se pueden editar ni borrar individualmente.
- El ID de la entrada debe ser determinista o secuencial para facilitar el ordenamiento.
- Cada entrada de tipo `write` o `delete` DEBE tener un `snapshotId` asociado.

---

## What this module does NOT do

- No realiza los snapshots (los consume).
- No ejecuta las transacciones (las registra).
- No limpia automáticamente el historial (requiere política de retención externa).
