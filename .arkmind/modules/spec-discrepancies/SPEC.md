# Module: spec-discrepancies

**Fecha de creación:** 2026-06-02
**Paso relacionado:** 3
**IA autora del spec:** Mavis
**Estado:** 🟡 pending — sin reclamar

---

## What this module does

Resolves the discrepancies between the official spec (`info_20arki.txt`) and the
current code in `artifacts/ux-arquitecto/`. The big tensions identified in the
initial review:

1. **GitHub is optional** (spec) vs **project lives in GitHub** (code) — compatible
   if treated as a provider, not a dependency
2. **Offline-first / no cloud** (spec) vs **Supabase + Replit deps** (code) —
   the cloud bits must be modeled as `optional providers`
3. **IA proposes, never executes** (spec) vs **hard-coded `ai.ts` with Mistral**
   (code) — the IA dependency should be pluggable
4. **No external services** (spec) vs **routes call Mistral/Supabase in
   `artifacts/api-server`** — this server is OUTSIDE the core, less critical
5. **IndexedDB only** (spec, point 11) vs **no local persistence yet** (code) —
   we fixed part of this with `snapshot-store` module, but sessions/context
   still in memory

---

## What needs to be done (concrete)

For each tension, the next IA should:

1. Open an ADR describing the decision
2. Implement the refactor (if any) that makes the code spec-compliant
3. Update `NO-GO-ZONES.md` and `SUPOSICIONES.md` accordingly
4. Add tests if applicable

### Concrete refactors anticipated

- **`ai.ts`** — make AI calls pluggable behind an `AIProvider` interface,
  with a `NoopAIProvider` as default (does nothing, just proposes structural
  changes locally)
- **`auth.ts`** — make it optional. If no auth configured, the runtime works
  in single-user mode without auth
- **`supabase.ts`** — clarify it's an external sync provider, not a core dep
- **`session.ts`, `cognitive.ts`, `visual.ts`, `memory.ts`** — these still
  live in memory. Add IndexedDB persistence behind the same `snapshotStore`
  pattern (or a sibling `runtimeStore`)

---

## Files this module CAN touch

Most files in `artifacts/ux-arquitecto/src/core/` are fair game, **except**:
- `types.ts` — requires ADR for any change
- The atomic `Snapshot` / `Transaction` contracts already established

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/snapshotStore.ts
artifacts/ux-arquitecto/src/core/snapshots.ts                 ← snapshot-store module
artifacts/ux-arquitecto/src/core/transactions.ts              ← consumed by rollback-engine
```

---

## ADR outputs expected

- ADR 0003 — IA as optional provider
- ADR 0004 — Auth as optional
- ADR 0005 — Sessions/context persistence in IndexedDB
- (Others as identified)

---

*Stub. The next IA should refine the SPEC before claiming.*
