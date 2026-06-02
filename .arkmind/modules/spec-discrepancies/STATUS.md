# Status: spec-discrepancies

## Estado: 🔵 in_progress — Aria, rama `ia/aria/spec-discrepancies`

| Campo | Valor |
|---|---|
| IA asignada | Aria |
| Rama | `ia/aria/spec-discrepancies` |
| Último update | 2026-06-02T10:50:00Z |
| ADR relacionado | 0003 (IA opcional), 0004 (auth limpieza) — por abrir |
| Claimed at | 2026-06-02T10:50:00Z |

---

## Plan activo

1. ✅ Refinar SPEC + CONTRACT (este commit)
2. 🔜 Claim en STATE.json + REGISTRY (commit aparte)
3. 🔜 ADR 0003: IA opcional con `AIProvider` interface
4. 🔜 Refactor `ai.ts` → `NoopAIProvider` (default) + `MistralAIProvider` (opcional)
5. 🔜 ADR 0004: Auth como local, providers remotos opcionales
6. 🔜 Refactor `auth.ts` → renombrar campos, doc-comment
7. 🔜 Verificar typecheck sobre los archivos tocados
8. 🔜 Cerrar módulo: STATUS + PROGRESS + STATE + REGISTRY
9. 🔜 Push a `origin/ia/aria/spec-discrepancies` y abrir PR

---

## Handoff notes

*(complete when closing)*

---

## Historial

| Fecha | IA | Acción | Notas |
|---|---|---|---|
| 2026-06-02 | Mavis | Creación del spec inicial | 5 discrepancias identificadas, refactors anticipados |
| 2026-06-02 | Aria | Refinó SPEC y CONTRACT a v0.2; marcó in_progress; decidió alcance recortado (ADR 0003+0004 sí, 0005 fuera) | Razón: 0005 es grande, mejor en sesión propia con typecheck end-to-end |
