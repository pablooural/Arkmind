# Module: ia-context-bridge

**Fecha de creación:** 2026-06-06
**Refinado por:** Aria — 2026-06-06
**IA autora del spec:** Aria
**Estado:** ✅ done — Aria, rama `ia/aria/ia-context-bridge`

---

## Alcance (v0.1, esta entrega)

Pablo pidió el módulo con el alcance original (ContextEnricher + extender
`AIManager.propose()` + `coreEngine.context`). Pero durante la sesión,
expresó frustración con que los PRs se traban y se solapan. Decidí achicar
el alcance a **lo mínimo merge-able** que no rompe nada existente:

| v0.1 (esta entrega) | v0.2 (futuro, OTRO módulo) |
|---|---|
| `core/contextBridge.ts` (NUEVO, aislado) | Tocar `AIRequest` (cambia discriminated union) |
| `ContextEnricher.build()` lee de los 4 managers | `AIManager.propose(req)` que use el enricher |
| Re-export top-level desde `index.ts` | `coreEngine.context = contextEnricher` |
| ADR 0007 (proposed) | Mover ADR 0007 a accepted |
| Smoke tests documentados | Smoke tests reales en CI |

**Por qué achicar:** la queja de Pablo fue "lo que no se mergea es porque
se unió a otra cosa que se había superpuesto". Este PR toca **un solo
archivo nuevo** y **un archivo existente solo para añadir 4 exports
top-level**. No cambia comportamiento observable. Riesgo de superposición:
cero. Merge-able de una.

---

## What this module does (v0.1)

Define cómo el state del runtime (archivo activo, contexto cognitivo, memoria
de trabajo, sesión activa) puede fluir hacia el `AIProvider`. Resuelve el
gap que Pablo reportó:

> "La IA no tiene idea sobre en qué carpeta está parado el usuario."

El módulo `runtime-persistence` (ADR 0005) ya persiste todo en IndexedDB.
Lo que faltaba era una **función que lea de esos managers y arme un
snapshot consumible por la IA**. Eso es `ContextEnricher`.

### Lo que entrega v0.1

1. **`ContextEnricher` (nuevo, en `core/contextBridge.ts`)** — lee de los 4
   managers locales y arma un `ActiveContext` inmutable con:
   - `workspaceContextPath` (carpeta activa del workspace)
   - `activeResourcePath` (archivo activo en el panel)
   - `activePanelId` (panel con el foco)
   - `cognitive` (snapshot del `CognitiveContext` del path activo: goal,
     focusSummary, últimas 5 insights sin resolver, preguntas abiertas,
     constraints)
   - `workingMemory` (snapshot de la sesión activa: últimos 10 mensajes,
     últimas 10 proposals)
   - `activeSessionId` (ID de la sesión más reciente con `state === "active"`)
   - `capturedAt` (timestamp)

2. **Límites del snapshot (constantes exportadas)** —
   `COGNITIVE_INSIGHTS_LIMIT = 5`, `WORKING_MEMORY_MESSAGES_LIMIT = 10`,
   `WORKING_MEMORY_PROPOSALS_LIMIT = 10`.

3. **Re-exports top-level desde `index.ts`** — `contextEnricher`,
   `ContextEnricher`, los tipos `ActiveContext` / `CognitiveContextSnapshot`
   / `WorkingMemorySnapshot`, y las constantes. **No se toca `coreEngine`**;
   eso queda para v0.2.

### Lo que NO hace v0.1 (queda para v0.2)

- No toca `ai.ts` (no extiende `AIRequest`, no añade método a `AIManager`)
- No toca `coreEngine` (no agrega `coreEngine.context`)
- No llama a Mistral/Supabase (sigue siendo stub)
- No decide qué IA usar (sigue siendo responsabilidad del caller)

### Cómo se usa v0.1 (desde código)

```ts
import { contextEnricher, ActiveContext } from "@/core";

// 1. Obtener el snapshot del estado actual
const ctx: ActiveContext = contextEnricher.build();

// 2. Pasar el ctx a lo que sea (futuro: aiManager.propose en v0.2)
// 3. O inspeccionarlo desde un panel de debug
```

---

## Files this module touches (v0.1)

```
artifacts/ux-arquitecto/src/core/contextBridge.ts  ← NUEVO (único archivo nuevo de código)
artifacts/ux-arquitecto/src/core/index.ts          ← +4 re-exports top-level (no toca coreEngine)
.arkmind/modules/ia-context-bridge/{SPEC,CONTRACT,STATUS}.md
.arkmind/decisions/0007-ia-context-bridge.md       ← propuesto
.arkmind/STATE.json                                ← status: done al cerrar
.arkmind/modules/_REGISTRY.md                      ← fila
PROGRESS.md                                        ← entrada slim al cerrar
```

## Files this module does NOT touch

```
artifacts/ux-arquitecto/src/core/types.ts            ← NO-GO
artifacts/ux-arquitecto/src/core/ai.ts               ← queda para v0.2
artifacts/ux-arquitecto/src/core/{snapshots,opJournal,snapshotStore,transactions}.ts  ← done, otros autores
artifacts/ux-arquitecto/src/core/{session,cognitive,visual,memory,workspace,filesystem}.ts  ← done, solo se leen
artifacts/api-server/**                              ← otro artefacto
```

---

## Smoke tests (safe to call) — L-004 format

- `contextEnricher.build()` — devuelve `ActiveContext` con `workspaceContextPath`
  del workspace activo, o todos los campos `null` si no hay workspace. **Nunca lanza.**
- `contextEnricher.build()` antes de `coreEngine.hydrateAll()` — devuelve
  `ActiveContext` con todos los campos `null` (safe, no asume hydration).
- `contextEnricher.build()` con managers que tiran excepción — el try/catch
  interno captura el error, loguea a `console.error`, y devuelve `ActiveContext`
  con todos los campos `null`. **Nunca corta el flujo del caller.**
- `import { contextEnricher } from "@/core"` — funciona; es un re-export
  top-level añadido en `index.ts`.

---

*Achicado a v0.1 en sesión con Pablo, en respuesta a su frustración con
PRs que se solapan y quedan sin mergear.*
