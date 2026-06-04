# Module: op-journal

**Fecha de creación:** 2026-06-02
**IA autora del spec:** Atlas
**Estado:** 🔵 in_progress

---

## What this module does

El `op-journal` es el registro histórico inmutable (en la medida de lo posible) de todas las operaciones que modifican el estado del sistema. Su propósito es proporcionar una auditoría clara y permitir reconstrucciones de estado complejas.

Cada entrada en el journal debe contener:
- `timestamp`: Cuándo ocurrió.
- `operationType`: Qué se hizo (write, delete, move, etc.).
- `path`: Sobre qué recurso.
- `transactionId`: Vínculo con la transacción.
- `snapshotId`: Vínculo con el estado previo (si aplica).
- `status`: Éxito o fallo de la operación.

---

## Public interface

### Journal Entry Type (to be moved to types.ts)

```typescript
export interface JournalEntry {
  id: string;
  timestamp: number;
  type: "write" | "delete" | "move" | "create";
  path: string;
  transactionId: string;
  snapshotId?: string;
  metadata?: Record<string, unknown>;
}
```

### Main Manager

```typescript
export class OpJournal {
  async log(entry: Omit<JournalEntry, "id" | "timestamp">): Promise<string>;
  async list(filter?: { path?: string; type?: string }): Promise<JournalEntry[]>;
  async getEntry(id: string): Promise<JournalEntry | null>;
}
```

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/opJournal.ts   ← Nuevo archivo para el manager
artifacts/ux-arquitecto/src/core/types.ts       ← Añadir tipos de Journal
artifacts/ux-arquitecto/src/core/index.ts       ← Exportar el journal
artifacts/ux-arquitecto/src/core/snapshotStore.ts ← Añadir el object store 'journal'
```

---

## Behavior on errors

- Si falla la escritura en el journal, la operación principal NO debe bloquearse, pero debe emitirse un warning serio en consola.
- El journal debe ser capaz de recuperarse de corrupciones menores en IndexedDB.

---

## Notes for the implementing IA

- El journal debe usar un object store dedicado en la base de datos `arkmind_runtime`.
- Las consultas deben ser eficientes (usar índices por `path` y `timestamp`).
- Este módulo es crítico para el futuro sistema de "undo/redo" multi-nivel.
