# 0007. El state del runtime se inyecta en cada AIRequest vía un ActiveContext inmutable

**Fecha:** 2026-06-06
**Estado:** 🟡 proposed
**IA autora:** Aria
**Módulos afectados:** `ia-context-bridge` → `core/contextBridge.ts` (nuevo), `core/ai.ts` (extender), `core/index.ts` (re-export)

---

## Contexto

Pablo reportó en sesión:

> "La IA no tiene idea sobre en qué carpeta está parado el usuario."

El módulo `runtime-persistence` (ADR 0005, Manus@delta) ya persistió todo
el state del runtime en IndexedDB:
- `sessionManager` (sesiones con messages/proposals)
- `cognitiveManager` (contextos cognitivos por path)
- `visualManager` (estado visual por panel)
- `workspaceManager` (workspace con `activeContextPath`)

Pero el `AIRequest` (ADR 0003, definido en `core/ai.ts`) es un discriminated
union plano:

```ts
type AIRequest =
  | { kind: "structural_change"; context: string; diff?: string }
  | { kind: "explain"; target: string; question: string }
  | { kind: "summarize"; content: string };
```

No tiene un campo para el state del runtime. `MistralAIProvider.propose()` —
y cualquier provider futuro — recibe ese request sin saber:
- En qué archivo/carpeta está el usuario
- Qué insights acumuló el contexto cognitivo
- Qué proposals recientes hubo
- Cuál es la sesión activa

El método público actual para invocar a la IA es:

```ts
aiManager.getProvider().propose(request)
```

Esto bypasea al manager y llama directamente al provider. No hay un entry
point oficial que pase contexto.

## Decisión

Introducir un `ContextEnricher` que arma un `ActiveContext` inmutable leyendo
de los 4 managers, e inyectarlo en cada `AIRequest` antes de delegar al
provider.

### Estructura

1. **Nuevo archivo `core/contextBridge.ts`** con:
   - Tipos: `ActiveContext`, `CognitiveContextSnapshot`, `WorkingMemorySnapshot`
   - Clase: `ContextEnricher` con método `build(): ActiveContext` (síncrono, no lanza)
   - Singleton: `contextEnricher`
   - Constantes: `COGNITIVE_INSIGHTS_LIMIT = 5`, etc.

2. **`AIRequest` extendido** en `core/ai.ts`: cada variant del discriminated
   union gana un campo opcional `activeContext?: ActiveContext`. **No es
   breaking change** — los callers viejos siguen funcionando.

3. **Nuevo método `AIManager.propose(request)`** en `core/ai.ts`: llama al
   enricher, mergea el `activeContext`, delega al provider. Es el entry
   point oficial.

4. **`MistralAIProvider.propose()` actualizado**: usa el `activeContext` para
   mejorar el prompt (en el stub, lo loguea y lo incluye en la `rationale`).

5. **`core/index.ts` extendido**: re-exporta `contextEnricher`, los tipos,
   y agrega `coreEngine.context = contextEnricher` (sin reemplazar nada).

### `ActiveContext` shape

```ts
interface ActiveContext {
  workspaceContextPath: string | null;   // carpeta activa del workspace
  activeResourcePath: string | null;     // archivo activo en el panel
  activePanelId: string | null;          // panel con el foco
  cognitive: CognitiveContextSnapshot | null;  // goal, insights, questions, constraints
  workingMemory: WorkingMemorySnapshot | null; // mensajes y proposals recientes
  activeSessionId: string | null;       // sesión IA activa
  capturedAt: number;                    // timestamp del snapshot
}
```

Todos los campos pueden ser `null` — el snapshot es best-effort, nunca falla.

### Límites del snapshot

Para no inflar el `AIRequest` con todo el historial:
- `COGNITIVE_INSIGHTS_LIMIT = 5` (últimas 5 insights sin resolver)
- `WORKING_MEMORY_MESSAGES_LIMIT = 10` (últimos 10 mensajes)
- `WORKING_MEMORY_PROPOSALS_LIMIT = 10` (últimas 10 proposals)

Configurables desde el módulo.

### No se toca

- `types.ts` (NO-GO-ZONES; ADR no necesario porque las interfaces nuevas
  viven en `contextBridge.ts`, no en `types.ts`)
- Los managers (`session.ts`, `cognitive.ts`, etc.) — el enricher solo los lee
- La API pública existente — todo es aditivo

## Consecuencias

**Positivas:**
- Resuelve el gap reportado por Pablo: la IA ahora sabe en qué archivo/carpeta
  está, qué insights hay, qué proposals recientes hubo.
- El `ActiveContext` es inmutable y best-effort — no rompe si algo falla.
- El entry point oficial (`aiManager.propose(req)`) reemplaza al bypass
  `aiManager.getProvider().propose(req)` como forma recomendada de invocar.
- A3 (providers opcionales) y A4 (IA propone, no ejecuta) se respetan: el
  contexto se pasa al provider, pero el provider decide qué hacer con él.
- `NoopAIProvider` sigue siendo default y no cambia comportamiento.

**Negativas:**
- El snapshot tiene un costo de CPU cada vez que se llama `propose()`. Es
  despreciable (lectura de Maps en memoria), pero queda documentado.
- `MistralAIProvider.propose()` sigue siendo stub — la mejora del prompt
  usando `activeContext` queda como TODO dentro del stub.

**Riesgos:**
- Si un manager cambia su API interna, el enricher se rompe. Mitigación:
  el enricher hace try/catch y devuelve un `ActiveContext` con campos null.
  Smoke tests en STATUS.md para validar que no lanza.
- Si el caller hace `propose()` miles de veces por segundo, el costo de
  construir el snapshot se acumula. Mitigación futura: cachear el snapshot
  por N ms, o aceptar `activeContext` pre-calculado como argumento.
  Por ahora no urge.

## Estado

🟡 proposed — implementación en curso en este mismo módulo.
Pasará a ✅ accepted cuando el código esté commiteado y verificado.
