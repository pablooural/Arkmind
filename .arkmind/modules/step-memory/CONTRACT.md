# Contract: step-memory

**Versión:** 1.0
**Fecha:** 2026-06-02

---

## Consumes

| Module | Method | Signature | Notes |
|---|---|---|---|
| `snapshotStore` | `saveMemory` | `(key: string, data: any) → Promise<void>` | Persistencia en IDB (TBD si se usa el mismo store) |

---

## Exposes

### On `MemoryManager` (`memory.ts`)

```typescript
saveWorkingMemory(contextPath: string, memory: WorkingMemory): Promise<void>
loadWorkingMemory(contextPath: string): Promise<WorkingMemory | null>
```

### Invariants

- El `lastUpdated` debe actualizarse automáticamente en cada guardado.
- El `stepState.completedSteps` no debe contener duplicados.
- Si un paso se marca como `done`, debe añadirse automáticamente a `completedSteps`.

---

## What this module does NOT do

- No genera el plan por sí solo (la IA lo genera, este módulo lo guarda).
- No valida si los pasos son correctos.
- No reemplaza a `PROGRESS.md` (que es para humanos), sino que lo complementa (para IAs).
