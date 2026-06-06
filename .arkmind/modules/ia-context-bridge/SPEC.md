# Module: ia-context-bridge

**Fecha de creación:** 2026-06-06
**Refinado por:** Aria — 2026-06-06 (antes del claim)
**IA autora del spec:** Aria
**Estado:** 🔵 in_progress — Aria, rama `ia/aria/ia-context-bridge`

---

## What this module does

Define cómo el state del runtime (archivo activo, contexto cognitivo, memoria
de trabajo, sesión activa) fluye hacia el `AIProvider` en cada llamada a
`propose()`. Resuelve el gap concreto que Pablo reportó:

> "La IA no tiene idea sobre en qué carpeta está parado el usuario."

### El gap

El runtime ya persiste todo en IndexedDB (módulo `runtime-persistence`,
ADR 0005):
- `sessionManager` → sesiones IA con messages, proposals
- `cognitiveManager` → contextos cognitivos por path (goal, insights, questions, constraints)
- `visualManager` → estado visual por panel (activeResource, openResources, viewMode)
- `workspaceManager` → workspace con `activeContextPath`

Pero `AIRequest` (definido en `ai.ts`, ADR 0003) es un discriminated union
plano: `{ kind: "structural_change", context, diff? }` etc. No tiene campo
para el state del runtime. `MistralAIProvider.propose()` recibe ese request
y no sabe nada del workspace.

**`ia-context-bridge` cierra ese gap**: arma un snapshot inmutable
(`ActiveContext`) leyéndolo de los managers, y lo inyecta en cada request
antes de delegar al provider.

### Lo que entrega

1. **`ContextEnricher` (nuevo, en `contextBridge.ts`)** — lee de los 4 managers
   y arma un `ActiveContext` inmutable con:
   - `workspaceContextPath` (carpeta activa del workspace)
   - `activeResourcePath` (archivo activo en el panel)
   - `activePanelId` (panel que tiene el foco)
   - `cognitive` (snapshot del `CognitiveContext` del path activo: goal,
     focusSummary, últimas N insights sin resolver, preguntas abiertas,
     constraints)
   - `workingMemory` (snapshot de la sesión activa: últimos N mensajes,
     últimas N proposals)
   - `activeSessionId` (ID de la sesión más reciente con `state === "active"`)
   - `capturedAt` (timestamp)

2. **`AIRequest` extendido** — cada variant del discriminated union gana un
   campo opcional `activeContext?: ActiveContext`. **Backwards-compat**: los
   callers que ya construyen `AIRequest` sin `activeContext` siguen
   funcionando; el provider lo recibe como undefined si nadie lo inyecta.

3. **`AIManager.propose(request)` (nuevo método público)** — el entry point
   oficial para que la IA reciba contexto. Llama al enricher, mergea el
   `activeContext` al request, y delega al provider activo. `NoopAIProvider`
   ignora el contexto. `MistralAIProvider` lo usa para construir el prompt
   (en el stub, lo loguea y lo incluye en la `rationale`).

4. **Límites para no inflar el snapshot** — `COGNITIVE_INSIGHTS_LIMIT = 5`,
   `WORKING_MEMORY_MESSAGES_LIMIT = 10`, `WORKING_MEMORY_PROPOSALS_LIMIT = 10`.
   Configurables desde el módulo.

5. **API pública estable** — el singleton `contextEnricher` se re-exporta
   desde `coreEngine` como `coreEngine.context`.

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/contextBridge.ts  ← nuevo
artifacts/ux-arquitecto/src/core/ai.ts             ← extender AIRequest + añadir AIManager.propose()
artifacts/ux-arquitecto/src/core/index.ts          ← re-export contextEnricher
.arkmind/modules/ia-context-bridge/{SPEC,CONTRACT,STATUS}.md
.arkmind/decisions/0007-ia-context-bridge.md       ← nuevo
.arkmind/STATE.json                                ← reflejar status
.arkmind/modules/_REGISTRY.md                      ← reflejar status
PROGRESS.md                                        ← entrada slim al cerrar
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/types.ts            ← NO-GO, salvo ADR
artifacts/ux-arquitecto/src/core/snapshots.ts        ← módulo done, otro autor
artifacts/ux-arquitecto/src/core/opJournal.ts        ← módulo done, otro autor
artifacts/ux-arquitecto/src/core/snapshotStore.ts    ← módulo done, otro autor
artifacts/ux-arquitecto/src/core/transactions.ts     ← módulo done, otro autor
artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts  ← NO-GO
artifacts/ux-arquitecto/src/core/session.ts          ← runtime-persistence, done
artifacts/ux-arquitecto/src/core/cognitive.ts        ← runtime-persistence, done
artifacts/ux-arquitecto/src/core/visual.ts           ← runtime-persistence, done
artifacts/ux-arquitecto/src/core/memory.ts           ← runtime-persistence, done
artifacts/ux-arquitecto/src/core/workspace.ts        ← NO se modifica (solo se lee)
artifacts/ux-arquitecto/src/core/filesystem.ts       ← NO se modifica
artifacts/api-server/**                              ← otro artefacto
```

---

## Behavior esperado

### `ActiveContext` shape

```ts
interface ActiveContext {
  workspaceContextPath: string | null;
  activeResourcePath: string | null;
  activePanelId: string | null;
  cognitive: CognitiveContextSnapshot | null;
  workingMemory: WorkingMemorySnapshot | null;
  activeSessionId: string | null;
  capturedAt: number;
}
```

Todos los campos pueden ser `null` (no romper si no hay workspace/sesión/cognitivo).

### `AIManager.propose(request)` flow

```
caller → aiManager.propose(request)
  ↓
  enricher.build()  →  ActiveContext (o null-safe)
  ↓
  enrichedRequest = { ...request, activeContext }
  ↓
  provider.propose(enrichedRequest)
  ↓
  AIProposal
```

### Invariantes

1. **Backwards-compat preservado**: `AIRequest` con campos viejos (sin
   `activeContext`) sigue siendo válido en TypeScript. El provider recibe
   `activeContext: undefined` si el caller no lo setea.
2. **`AIManager` no se renombra ni se elimina**: el singleton `aiManager`
   sigue existiendo. Solo se AÑADE el método `propose()`.
3. **`NoopAIProvider` ignora el contexto**: el default provider no cambia su
   comportamiento observable — sigue devolviendo `kind: "noop"`.
4. **`contextEnricher.build()` nunca lanza**: si un manager falla, devuelve
   un `ActiveContext` con campos null. Los errores se loguean a consola.
5. **No introduce I/O nuevo**: el enricher solo lee de memoria. No hace
   fetch, no toca IDB, no toca filesystem. Es síncrono.
6. **No introduce dependencias nuevas en `package.json`**.

---

## Smoke tests (safe to call)

Para acelerar la próxima IA (formato L-004):

- `contextEnricher.build()` — devuelve `ActiveContext` con `workspaceContextPath`
  del workspace activo, o todos los campos `null` si no hay workspace. Nunca lanza.
- `contextEnricher.build()` antes de `await coreEngine.hydrateAll()` — devuelve
  `ActiveContext` con todos los campos null (safe, no asume hydration).
- `aiManager.propose({ kind: "explain", target: "x", question: "y" })` —
  delega al provider activo con `activeContext` populated. Devuelve `AIProposal`.
- `coreEngine.context.build()` (alias) — equivalente a `contextEnricher.build()`.

---

*Refinado por Aria antes de implementar, en línea con la convención del equipo.*
