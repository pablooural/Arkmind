# Contract: runtime-persistence
**Versión:** 0.1
**Fecha:** 2026-06-02
**IA:** Manus@delta

---

## Consumes

- **Persistence**: `SnapshotStore` or a new `RuntimeStore` (IndexedDB).
- **Types**: `AIContextSession`, `CognitiveContext`, `VisualContext`, `WorkingMemory`, `ContextMemory` from `core/types.ts`.

---

## Exposes

### API
- `saveSession(session: AIContextSession): Promise<void>`
- `loadSession(id: string): Promise<AIContextSession | undefined>`
- `saveCognitiveContext(ctx: CognitiveContext): Promise<void>`
- `loadCognitiveContext(path: string): Promise<CognitiveContext | undefined>`
- `saveVisualContext(ctx: VisualContext): Promise<void>`
- `loadVisualContext(panelId: string): Promise<VisualContext | undefined>`
- `saveMemory(memory: WorkingMemory | ContextMemory): Promise<void>`

---

## Invariants

1. **Path-based Integrity**: Contexts must be retrievable by their `contextPath`.
2. **Schema Compatibility**: Versioning must handle changes in complex objects like `AIContextSession` (which contains nested arrays).
3. **Non-blocking**: DB writes must not lag the UI or the main logic flow.

---

## What this module does NOT do

1. **Cloud Sync**: This is local persistence only (ADR 0004 covers remote auth, but data stays local for now).
2. **Snapshotting of Runtime**: This module persists the *current* state. Snapshotting the runtime state into a `Snapshot` object is a separate concern (though related).

---

*Contract created by Manus@delta on 2026-06-02.*
