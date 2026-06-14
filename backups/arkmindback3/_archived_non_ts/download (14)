# Module: runtime-persistence

**Fecha de creación:** 2026-06-02
**Paso relacionado:** 3 (ADR 0005)
**IA autora del spec:** Manus@delta
**Estado:** 🟡 pending

---

## What this module does

Implements full persistence for the runtime state of Arkmind. Currently, sessions, cognitive contexts, visual contexts, and memories live only in memory (or partially in localStorage), making them volatile. This module moves them to **IndexedDB** for robust, cross-session stability.

### Key features:
1. **Session Persistence**: Save and load `AIContextSession` objects.
2. **Context Persistence**: Persist `CognitiveContext` and `VisualContext` linked to their respective paths.
3. **Memory Persistence**: Persist `WorkingMemory` and `ContextMemory`.
4. **Unified Storage Strategy**: Deciding (via ADR 0005) if these go into `arkmind_runtime` DB or a separate one.

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/session.ts
artifacts/ux-arquitecto/src/core/cognitive.ts
artifacts/ux-arquitecto/src/core/visual.ts
artifacts/ux-arquitecto/src/core/memory.ts
artifacts/ux-arquitecto/src/core/snapshotStore.ts (or new runtimeStore.ts)
artifacts/ux-arquitecto/src/core/types.ts
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/snapshots.ts
artifacts/ux-arquitecto/src/core/opJournal.ts
```

---

## Dependencies

- `snapshotStore`: For IndexedDB access patterns.
- `types`: For the interfaces being persisted.

---

## Behavior

1. **Hydration on Start**: Managers should attempt to load their state from IDB when initialized.
2. **Auto-save**: State changes in managers should trigger an asynchronous write to IDB.
3. **Atomic Updates**: Use transactions where appropriate to ensure state consistency.

---

*Spec created by Manus@delta on 2026-06-02.*
