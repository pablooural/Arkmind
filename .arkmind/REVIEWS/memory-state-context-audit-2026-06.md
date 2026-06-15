# Memory / State / Context Audit — 2026-06-15

> **Origen:** T-015 (TASKS-MEMORY-ARCHITECTURE.md), primera tarjeta del
> memory-architecture-review. Diagnóstico que desbloquea T-016 a T-022.
>
> **IA:** Mavis · **Sesión:** 409651944558661 · **Stack auditado:** `core/*`
>
> **Alcance leído a fondo:** `core/memory.ts`, `core/ia-context-bridge.ts`,
> `core/session.ts`, `core/ai.ts`, `core/types.ts`, `decisions/0007-ia-context-bridge.md`,
> `STATE.json`, `PROGRESS.md` (últimas 8), `SUGGESTIONS.md`.
>
> **No leído a fondo en esta vuelta** (queda como tarea de "2da vuelta"):
> `core/cognitive.ts`, `core/visual.ts`, `core/workspace.ts`,
> `core/transactions.ts`, `core/snapshots.ts`, `core/snapshotStore.ts`,
> `core/snapshotPanel.tsx`. Mencionados en sección 6.

---

## 1. Mapa actual

| # | Capa | Implementación | Qué hace | Qué tan bien | Persiste en |
|---|---|---|---|---|---|
| 1 | Working Memory | `MemoryManager` (memory.ts, paso 1) | Estado cognitivo inmediato: focus, intent, recursos activos, constraints, insights, questions, notas temporales | OK en escritura; lectura depende de `hydrate()` | IDB store `memory` con prefijo `wkmem:` |
| 2 | Context Memory | `MemoryManager` (memory.ts, paso 2) | Memoria persistente por path, sobrevive entre sesiones, heredable | **Roto en lectura**: `hasContextMemory()` usa `localStorage` con `MEM_PREFIX` (no definido) | IDB store `memory` con prefijo `mem:` (escritura OK) |
| 3 | Hierarchical Memory | `MemoryManager` (memory.ts, paso 3) | Carga memoria de raíz → hoja con merge por precedencia local | **Roto en runtime**: depende de `hasContextMemory()` que siempre devuelve `false` | — (lee de IDB, pero nunca encuentra nada) |
| 4 | Cognitive Snapshots | `MemoryManager` (memory.ts, paso 4) | Snapshot del estado mental completo (WM + CM + recursos + trigger) | **Roto en listado/restauración**: 3 métodos iteran `localStorage` con `SNAP_PREFIX` (no definido) | IDB store `memory` con id directo (escritura OK) |
| 5 | CognitiveContext (paralelo) | `cognitiveManager` (cognitive.ts) | Estado cognitivo "vivo" por path: focusSummary, insights[], openQuestions[], constraints[] | OK, pero **no leído a fondo** | IDB store `cognitive_contexts` |
| 6 | VisualContext | `visualManager` (visual.ts) | Lo que el usuario ve/manipula: openResources, activeResource, viewMode, scroll, selection | OK, pero **no leído a fondo** | IDB store `visual_contexts` |
| 7 | AI Sessions | `SessionManager` (session.ts) | AIContextSession: panelId, mensajes, propuestas, fork, state machine (6 estados) | OK, pero `state: "summarized"` no tiene método que lo setee | IDB store `sessions` |
| 8 | AI Context Bridge | `ContextEnricher` (ia-context-bridge.ts) + `AIManager.propose()` | Captura `ActiveContext` (workspace + visual + cognitive + session) y lo inyecta en `AIRequest` | OK — ADR 0007 (accepted) | En memoria, vuelca en cada request |
| 9 | Memory Block (chat) | `MemoryManager.buildMemoryBlock()` | Bloque markdown con WM + jerárquica, inyectado en `AIRequest.memoryBlock` (chat) | OK, pero **duplica info con ContextEnricher** | Calculado en runtime |
| 10 | AI Provider (Mistral) | `MistralAIProvider` (ai.ts) | Llama a Mistral con system prompt enriquecido, fallback a stub estructurado | OK con stubs; llamada real solo para `kind: "chat"` | Stateless (cada call es nueva) |
| 11 | AI Proposals | `AIProposal` discriminated union | Lo que devuelve `propose()`: noop / suggestion / explanation / summary / insight_proposal | OK tipado; depende de caller que sepa qué hacer con cada `kind` | Stateless |
| 12 | Transactions | `transactions.ts` (no leído) | Lifecycle de operaciones FS: validate → execute → confirm/rollback | OK según PROGRESS | `core/opJournal` + `core/snapshots` |
| 13 | Snapshots (FS) | `snapshots.ts` + `snapshotStore.ts` (no leído) | Persistencia archivos en IDB, rollback con `RollbackResult` discriminado | OK según PROGRESS | IDB store `snapshots` |
| 14 | Coordination state | `.arkmind/STATE.json` | Estado del proyecto a nivel coordinación (no runtime) | **Desactualizado**: `currentFocus` dice "All core persistence implemented" pero hay 4+ PRs mergeados más | Archivo de coordinación, no runtime |
| 15 | Coordination log | `PROGRESS.md` (append-only) | Log narrativo de las sesiones, módulo-slim format | OK en estructura; única fuente de "¿qué pasó?" | Archivo de coordinación |

---

## 2. Solapamientos detectados

### S1 — `CognitiveContext` vs `WorkingMemory` (paralelos no sincronizados)
Dos implementaciones del mismo concepto, en managers distintos:

| Campo | `CognitiveContext` (cognitive) | `WorkingMemory` (memory) |
|---|---|---|
| Foco | `focusSummary: string` | `focus: string` |
| Intención | — | `intent: string` |
| Recursos activos | — | `activeResources: string[]` |
| Insights | `insights: Insight[]` (con id, importance, resolved) | `keyInsights: string[]` (sin metadata) |
| Preguntas | `openQuestions: Question[]` (con id, priority, answered) | `openQuestions: string[]` (sin metadata) |
| Restricciones | `constraints: string[]` | `constraints: string[]` |
| Notas | — | `temporaryNotes: string[]` |

**Consecuencia:** cuando la IA devuelve un `insight_proposal`, no hay un solo lugar donde guardarlo. Depende de quién consuma la propuesta, lo guarda en uno u otro manager. Las dos listas se desincronizan silenciosamente. Es un **bug latente** de modelo, no de código.

### S2 — Dos mecanismos para inyectar memoria en prompts de IA
- `ContextEnricher` → `AIRequest.activeContext` (tipado, consumido por `MistralAIProvider.propose()`)
- `MemoryManager.buildMemoryBlock()` → `AIRequest.memoryBlock` (markdown libre, consumido en `buildSystemPrompt()` cuando `kind === "chat"`)

El chat puede terminar recibiendo el mismo insight dos veces (una en `activeContext.cognitiveContext.insights[]` y otra en el bloque markdown). Hoy la única llamada que pasa ambos es `chat`, así que el solapamiento es real, no teórico.

### S3 — `SessionState: "forked"` puede divergir
`forkSession()` setea `metadata.forkOf` Y deja `state` como viene. El caller tiene que llamar aparte `setState(sessionId, "forked")`. Si no lo hace, el fork existe pero su `state` sigue siendo `"active"`. No hay invariante enforced.

### S4 — `SessionState: "summarized"` no tiene camino de seteo
El string existe en el type union pero `SessionManager` no tiene `summarizeSession()`. Estado aspiracional. Si un caller lo setea a mano, queda OK, pero no hay flujo canónico.

### S5 — Migración parcial localStorage → IDB
`memory.ts` está en estado híbrido:
- **Escritura** (working memory, context memory, cognitive snapshots): toda va a IDB vía `idbGet`/`idbSet`.
- **Lectura / listado** (hasContextMemory, getCognitiveSnapshot, listCognitiveSnapshots, restoreFromSnapshot, invalidateOldSnapshots, exportAll, clearAll): toda va a `localStorage` con constantes `MEM_PREFIX` / `SNAP_PREFIX` / `STORAGE_PREFIX` que **no están definidas en ningún archivo del codebase** (verificado con grep).
- **Header comment**: dice "Persistencia: localStorage con prefijos `uxarq:mem:` y `uxarq:snap:`", miente.

Consecuencias prácticas:
- `loadHierarchicalMemory()` siempre devuelve `chain: []` en runtime (porque `hasContextMemory()` devuelve `false` para todo), así que la "herencia" no existe funcionalmente.
- `listCognitiveSnapshots()` siempre devuelve `[]` en runtime (porque itera localStorage y nada está ahí).
- `restoreFromSnapshot()` siempre devuelve `null` por el mismo motivo.
- `exportAll()` siempre devuelve `{}`.
- `clearAll()` no borra nada.

**Esto es el hallazgo más concreto de este audit.** El sistema de memoria jerárquica y los snapshots cognitivos son código muerto en la práctica. La próxima sesión podría no detectarlo porque los métodos no throw — devuelven `[]` / `null` / `{}` silenciosamente.

### S6 — `STATE.json.currentFocus` desactualizado
`currentFocus: "runtime-persistence done (Manus@delta) · ADR 0005 accepted · All core persistence implemented"` no refleja la realidad: T-027 a T-036 están mergeados, mi presentación como Mavis ya está en main, y PR #16 de Mavis (ia-context-bridge) mergeó ADR 0007 hace 5 días. El campo `lastUpdated: "2026-06-02T11:30:00Z"` también miente.

---

## 3. Huecos (lo que falta)

| # | Hueco | Impacto | Tarjeta que lo ataca |
|---|---|---|---|
| H1 | **Estado vivo del proyecto** ("activo / detenido / esperando / bloqueado") | Sin esto, cada IA llega sin saber qué está pasando — tiene que leer TODO el repo. Caro en tokens. | T-019 |
| H2 | **Tareas activas (`active_tasks`)** | `STATE.json.currentFocus` es un string; no hay tracking estructurado. PROGRESS.md lo intenta narrativamente pero no es consultable. | T-020 |
| H3 | **Snapshot ejecutivo** | `buildMemoryBlock` mete TODO en cada prompt. Sin ejecutivo, los prompts se vuelven caros y la IA arrastra contexto viejo. | T-016 |
| H4 | **Snapshot detallado on-demand** | Par del ejecutivo. Si la IA necesita profundidad, tiene que ir a buscar al IDB sin mecanismo claro. | T-017 |
| H5 | **Conversaciones ramificadas (árbol con herencia)** | `SessionState: "forked"` existe, pero no hay lógica de árbol. Un fork no hereda el snapshot del padre. | T-018 |
| H6 | **Búsqueda/recuperación por tema/fecha/decisión** | Hoy solo se recupera por path. "¿Qué decidimos sobre la IA en junio?" → grep a mano. | T-021 |
| H7 | **Migración de schema de snapshots** (Q1) | Si cambia `Snapshot` o `ContextMemory`, los datos viejos se rompen. No hay `schemaVersion` ni `migrateSnapshot()`. | S007 |
| H8 | **Sync multi-device** (Q3) | Todo vive en local IDB. Dos dispositivos del mismo usuario divergen. | Q3 (sin tarjeta aún) |
| H9 | **Métricas de uso de IDB** | Sin visibilidad de cuota/tamaño, riesgo de llenar el storage. `getPersistedSize()` existe en snapshotStore pero no se expone. | S003 |
| H10 | **CI de convención de commits** | La convención `[ia:...] [module] tipo:` es solo humana. Las IAs se la saltean. | S004 |

---

## 4. Priorización

### P0 — crítico, bloquea uso real (1-2 sprints)

1. **Fix del híbrido localStorage/IDB en `core/memory.ts`** (solapamiento S5). 1 archivo, ~30 líneas netas. Restaurar `hasContextMemory`, `listCognitiveSnapshots`, `getCognitiveSnapshot`, `restoreFromSnapshot`, `invalidateOldSnapshots`, `exportAll`, `clearAll` para que lean de IDB. Sin esto, la mitad del memory system es código muerto. Tarjeta sugerida: **`t-023-fix-memory-localstorage-vs-idb`**.
2. **Resolver S1 (`CognitiveContext` vs `WorkingMemory`)**: decidir si se consolidan o se documenta el split. Necesita un ADR. Mientras esté sin resolver, cada IA nueva va a usar el equivocado.
3. **Actualizar `STATE.json`**: `currentFocus` y `lastUpdated`. Miente desde hace 2 semanas. Trivial, pero bloquea que el buzón de coordinación sea creíble.

### P1 — importante (2-3 sprints)

1. **Implementar T-016 (snapshot ejecutivo)**: reduce tokens en cada prompt, da una vista "always available". Desbloquea T-017, T-018, T-020.
2. **Implementar T-019 (estado vivo)**: pregunta "¿qué está pasando?" debe responderse en O(1).
3. **Implementar T-020 (active_tasks)**: tracking estructurado de qué hace cada IA.
4. **Migración de schema (S007)**: hacerlo proactivamente, bajo costo, alto valor.

### P2 — deseable / backlog

1. **T-021 (recuperación contextual)** con tags y búsqueda full-text (sin embeddings por ahora).
2. **S003 (métricas IDB)**: dashboard simple.
3. **S004 (CI de commits)**: enforcement.
4. **Q3 (sync multi-device)**: requiere decisión de infra.
5. **S005 (traducción a inglés)**: creciente fricción si entra una IA no-hispanohablante.
6. **S006 (IAs sin pasar por Pablo)**: creciente fricción a medida que el equipo crezca.

---

## 5. Recomendación

**La TAREA siguiente debería ser el fix del híbrido localStorage/IDB en `core/memory.ts`** (P0 #1), en una nueva tarjeta **`t-023-fix-memory-localstorage-vs-idb`**. Es:

- Concreta y scoped (1 archivo, ~30 líneas).
- Real, no inventado: hay 7 métodos que se llaman, no throw, y devuelven resultados vacíos silenciosamente.
- Verificable: un test rápido en browser (abrir un contexto, crear un cognitive snapshot, llamar a `listCognitiveSnapshots()`) demostraría el antes/después.
- Bajo riesgo: solo cambia **cómo se lee**, no cómo se escribe. Los datos en IDB están bien guardados, solo que no se pueden recuperar.
- Sin dependencias: no necesita ADR ni claim de módulo grande. `memory.ts` ya es código vivo, no NO-GO.

**Por qué no seguir con T-016 directo:** la cadena T-016 → T-017 → T-018 asume que el memory system base funciona. Construir un snapshot ejecutivo sobre una jerarquía rota es pintar sobre grietas.

**Orden sugerido post-fix:**
```
t-023 (P0 #1) → T-016 → T-019 → T-020 → T-017 → T-018 → T-021 → T-022
                └─ batch chico, alto impacto por línea ─┘
                                              └─ batch mediano, depende del anterior ─┘
                                                                └─ batch grande, integral ─┘
```

---

## 6. Notas para la siguiente IA

### 6.1 Lo que NO leí a fondo
`core/cognitive.ts`, `core/visual.ts`, `core/workspace.ts`,
`core/transactions.ts`, `core/snapshots.ts`, `core/snapshotStore.ts`.

Si querés una "2da vuelta" del audit antes de empezar a implementar, esos
6 archivos son la lista. Esperá encontrar:
- Más constantes "legacy" referenciadas desde código nuevo (patrón
  parecido a `MEM_PREFIX`).
- Probablemente la misma disonancia entre header comment y código real.
- Confirmar/refutar el solapamiento S1 leyendo `cognitiveManager` a fondo
  (hoy me baso en el type union + cómo se invoca desde `ContextEnricher`).

### 6.2 Preguntas abiertas que no bloquean pero conviene resolver

- **¿Las constantes `MEM_PREFIX` / `SNAP_PREFIX` / `STORAGE_PREFIX` existen en algún archivo del runtime que no esté en el codebase actual?** Hice grep recursivo en `artifacts/ux-arquitecto/src/` y no aparecen definidas. Es probable que sean legacy de pre-IDB que se borraron pero quedaron las referencias. Verificar de todos modos antes de hacer el fix de t-023.
- **¿El bug de `hasContextMemory` afecta a algún test automatizado?** No hay tests visibles para `memory.ts` en el repo (verifiqué: ningún `*.test.ts` cerca). Si la IA que tome t-023 quiere agregar un test que falle antes y pase después, es buena primera tarea.
- **¿Existe alguna UI que llame a `restoreFromSnapshot` o `listCognitiveSnapshots`?** Si no, el bug es invisible en UI pero igual está. Si sí, es UX-breaking. Verificar antes de fixear.

### 6.3 Si querés saltar el fix y arrancar T-016 igual
Posible pero **no recomendado**. T-016 asume que `loadHierarchicalMemory()` devuelve algo útil; sin el fix, devuelve `[]`. El ejecutivo quedaría basado en working memory únicamente (perdiendo el valor de la herencia).

### 6.4 Sobre el orden de las tarjetas T-016 a T-022
El TASKS-MEMORY-ARCHITECTURE.md sugiere
`T-015 → T-016 → T-019 → T-017 → T-020 → T-018 → T-021 → T-022`.
Mi sugerencia es la misma con `t-023` clavado entre T-015 y T-016.
T-021 (búsqueda) puede arrancar en paralelo con T-016/019/020 porque
su SPEC no depende de la implementación de los otros (solo necesita que
existan los stores).

---

*Audit producido por Mavis (sesión 409651944558661) el 2026-06-15.
Base de las 6 tarjetas siguientes del memory-architecture-review.*
