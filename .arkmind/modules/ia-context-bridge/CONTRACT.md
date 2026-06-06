# Contract: ia-context-bridge
**Versión:** 0.1 — 2026-06-06
**Fecha:** 2026-06-06

---

## Consumes

- **Lectura (no muta):** `sessionManager`, `cognitiveManager`, `visualManager`,
  `workspaceManager` de `artifacts/ux-arquitecto/src/core/`.
- **Tipos:** `Workspace`, `WorkspacePanel`, `CognitiveContext`, `AIContextSession`,
  `Insight`, `Question`, `StructuredMessage`, `OperationProposal` desde `./types`.
- **A4, A3 de SUPOSICIONES.md** (IA operativa pero propone; providers externos opcionales).

## Exposes

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

// Constantes de límites (configurables)
export const COGNITIVE_INSIGHTS_LIMIT = 5;
export const WORKING_MEMORY_MESSAGES_LIMIT = 10;
export const WORKING_MEMORY_PROPOSALS_LIMIT = 10;

// Clase y singleton
export class ContextEnricher {
  build(): ActiveContext;
}
export const contextEnricher: ContextEnricher;
```

### Extensión a `core/ai.ts` (consumida por callers externos)

```ts
// AIRequest ahora tiene activeContext opcional (en CADA variant del discriminated union)
export type AIRequest =
  | { kind: "structural_change"; context: string; diff?: string; activeContext?: ActiveContext }
  | { kind: "explain"; target: string; question: string; activeContext?: ActiveContext }
  | { kind: "summarize"; content: string; activeContext?: ActiveContext };

// AIManager gana un método público
export class AIManager {
  // ... métodos existentes sin cambios ...
  async propose(request: AIRequest): Promise<AIProposal>;  // NUEVO
}
```

### Extensión a `core/index.ts`

```ts
// Nuevos exports
export { contextEnricher, ContextEnricher } from "./contextBridge";
export type { ActiveContext, CognitiveContextSnapshot, WorkingMemorySnapshot } from "./contextBridge";

// coreEngine.context añadido (no reemplaza nada)
export const coreEngine = {
  // ... managers existentes ...
  context: contextEnricher,  // NUEVO
  // ... hydrateAll sin cambios ...
};
```

## Invariants

1. **Backwards-compat**: `AIRequest` con campos viejos sigue siendo válido.
   `activeContext` es opcional en cada variant. No rompe callers existentes
   (los callers que pasen `AIRequest` sin `activeContext` siguen funcionando;
   el provider recibe `undefined`).
2. **No se renombra ni se elimina** nada de la API pública existente:
   `aiManager`, `AIManager`, `AIConfig`, `MistralModel`, `NoopAIProvider`,
   `MistralAIProvider`, `coreEngine` siguen exportados con la misma forma.
3. **`ContextEnricher.build()` nunca lanza** (try/catch interno, devuelve
   `ActiveContext` con campos null si algo falla).
4. **`AIManager.propose()` es el entry point oficial**: cualquier caller que
   quiera invocar a la IA con contexto debe usar `aiManager.propose(req)`,
   NO `aiManager.getProvider().propose(req)`. El método directo del provider
   queda para casos avanzados (testing, mocks) sin contexto.
5. **No introduce async nuevo en el enricher**: el `build()` es síncrono.
   `propose()` es async por la signature del provider, pero el enricher no
   agrega awaits.
6. **No introduce dependencias externas**: solo importa de `./session`,
   `./cognitive`, `./visual`, `./workspace`, `./types`, `./ai` (este último
   en `index.ts`, no en `contextBridge.ts`, para evitar ciclos).

## What this module does NOT do

- **No implementa la llamada HTTP real a Mistral.** `MistralAIProvider.propose()`
  sigue siendo un stub estructurado. El `activeContext` se loguea y se incluye
  en la `rationale` del stub, pero no se manda a la API.
- **No añade persistencia nueva.** El state que consume ya está en IDB por
  `runtime-persistence` (ADR 0005).
- **No modifica la API pública existente.** Solo añade.
- **No lee del filesystem.** Solo de los managers en memoria.
- **No toca la API de `sessionManager`/`cognitiveManager`/etc.** Solo los lee.
- **No decide qué IA usar** (eso es responsabilidad del caller — `setProvider`,
  `setAIConfig`).
