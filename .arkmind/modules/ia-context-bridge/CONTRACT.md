# Contract: ia-context-bridge
**Versión:** 0.1 (achicada) — 2026-06-06
**Fecha:** 2026-06-06

> **Nota v0.1 vs v0.2:** el SPEC original proponía tocar `ai.ts` y
> `coreEngine`. Eso se difiere a v0.2 (OTRO módulo). Esta v0.1 solo añade
> el `ContextEnricher` aislado + re-exports top-level. Cero cambios a
> contratos existentes.

---

## Consumes

- **Lectura (no muta):** `sessionManager`, `cognitiveManager`, `visualManager`,
  `workspaceManager` de `artifacts/ux-arquitecto/src/core/`.
- **Tipos:** `Workspace`, `WorkspacePanel`, `CognitiveContext`, `AIContextSession`,
  `Insight`, `Question`, `StructuredMessage`, `OperationProposal` desde `./types`.
- **A4, A3 de SUPOSICIONES.md** (IA operativa pero propone; providers externos opcionales).

## Exposes (v0.1)

### Desde `core/contextBridge.ts` (re-exportado por `core/index.ts`)

```ts
// Tipos
export interface ActiveContext {
  workspaceContextPath: string | null;
  activeResourcePath: string | null;
  activePanelId: string | null;
  cognitive: CognitiveContextSnapshot | null;
  workingMemory: WorkingMemorySnapshot | null;
  activeSessionId: string | null;
  capturedAt: number;
}

export interface CognitiveContextSnapshot {
  contextPath: string;
  goal: CognitiveGoal;
  focusSummary: string;
  recentInsights: Insight[];
  openQuestions: Question[];
  constraints: string[];
}

export interface WorkingMemorySnapshot {
  sessionId: string;
  recentMessages: StructuredMessage[];
  recentProposals: OperationProposal[];
}

// Constantes de límites
export const COGNITIVE_INSIGHTS_LIMIT = 5;
export const WORKING_MEMORY_MESSAGES_LIMIT = 10;
export const WORKING_MEMORY_PROPOSALS_LIMIT = 10;

// Clase y singleton
export class ContextEnricher {
  build(): ActiveContext;
}
export const contextEnricher: ContextEnricher;
```

### Extensión a `core/index.ts` (v0.1, aditiva)

```ts
// 4 líneas nuevas en index.ts, no rompen nada:
export { contextEnricher, ContextEnricher } from "./contextBridge";
export type { ActiveContext, CognitiveContextSnapshot, WorkingMemorySnapshot } from "./contextBridge";
export { COGNITIVE_INSIGHTS_LIMIT, WORKING_MEMORY_MESSAGES_LIMIT, WORKING_MEMORY_PROPOSALS_LIMIT } from "./contextBridge";
```

**No se toca `coreEngine` en v0.1.** El agregado `coreEngine.context =
contextEnricher` queda para v0.2.

## Invariants (v0.1)

1. **`contextEnricher.build()` nunca lanza.** Try/catch interno, devuelve
   `ActiveContext` con todos los campos null si algo falla.
2. **No introduce async nuevo.** El `build()` es síncrono (lectura de Maps
   en memoria). Cumple con la regla de `isConfigured()` síncrono del core.
3. **No introduce dependencias externas.** Solo importa de `./types`,
   `./session`, `./cognitive`, `./visual`, `./workspace`.
4. **No muta estado.** El enricher es un lector puro. Los métodos que llama
   (`workspaceManager.getWorkspace()`, `getAllSessions()`, `visualManager.getPersistentState(...)`,
   `cognitiveManager.getContext(...)`, `sessionManager.getAllSessions()`) son
   todos de lectura. El `Date.now()` que setea `capturedAt` no muta nada
   del runtime.
5. **`index.ts` no rompe nada existente.** Los 4 exports nuevos se añaden
   sin tocar los existentes.

## What this module does NOT do (v0.1)

- **No implementa la llamada HTTP real a Mistral.** Queda para v0.2 o
  para otro módulo.
- **No añade persistencia nueva.** Solo lee de los managers (que ya están
  en IDB por `runtime-persistence`).
- **No modifica la API pública existente.** Solo añade.
- **No lee del filesystem.** Solo de los managers en memoria.
- **No toca la API de `sessionManager`/`cognitiveManager`/etc.** Solo los lee.
- **No toca `ai.ts`.** Eso es v0.2.
- **No toca `coreEngine`.** Eso es v0.2.
- **No decide qué IA usar.** Eso es responsabilidad del caller.

## Plan para v0.2 (otro módulo, otra rama)

1. Extender `AIRequest` con campo opcional `activeContext?: ActiveContext`
   en CADA variant del discriminated union.
2. Añadir `AIManager.propose(request): Promise<AIProposal>` que llama al
   enricher, mergea el `activeContext`, delega al provider.
3. Actualizar `MistralAIProvider.propose()` para usar el contexto en el
   prompt (cuando se implemente la llamada HTTP real).
4. Agregar `coreEngine.context = contextEnricher` al `coreEngine`.
5. Mover ADR 0007 a `accepted`.

El contexto ya estará listo (este módulo) y el wiring será un cambio
quirúrgico.
