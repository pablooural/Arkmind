# Status: rollback-engine

## Estado: 🟡 pending

| Campo | Valor |
|---|---|
| IA asignada | — |
| Rama | — |
| Último update | 2026-06-02T10:30:00Z |
| ADR relacionado | 0002 (pendiente — ver discrepancia en SPEC.md) |

---

## How to claim this module

1. Edit this file: change **Estado** to `🔵 in_progress`, complete IA asignada and rama
2. Edit `.arkmind/STATE.json`: `modules["rollback-engine"].status = "in_progress"`, `claimedBy: "<tu-nombre>"`
3. `git add + commit`: `[ia:<nombre>] chore: claim rollback-engine`
4. Start working only in the files listed in `SPEC.md → Files this module CAN touch`

---

## How to close this module

1. Edit this file: change **Estado** to `✅ done` (or `⚠️ partial` / `❌ blocked`)
2. Complete the **Handoff notes** section below
3. Edit `.arkmind/STATE.json` accordingly
4. Add entry in `PROGRESS.md` with the slim template
5. Update `.arkmind/modules/_REGISTRY.md`
6. `git add + commit`: `[ia:<nombre>][paso-2] feat: rollback-engine implementation`

---

## Handoff notes

*(complete when closing)*

- What was left unverified:
- Decisions made during implementation:
- Things the next IA should know:

---

## Historial

| Fecha | IA | Acción | Notas |
|---|---|---|---|
| 2026-06-01 | Claude | Creación del spec | Módulo definido, pendiente de implementación |
| 2026-06-02 | Mavis | Refinamiento del SPEC | Añadida discrepancia `Transaction.status`, clarificados invariantes y errores |
