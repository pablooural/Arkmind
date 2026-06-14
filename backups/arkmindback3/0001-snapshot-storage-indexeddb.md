# 📋 Tarjetas — `memory-architecture-review` — 2026-06-07
> **v a1.0** · 2026-06-07 · bumpear al tocar.

> **Origen:** Pablo detectó un problema de fondo probando Arkmind en Replit:
> las capas de **memoria persistente / estado actual / contexto activo /
> conversación** se mezclan, lo que produce información desactualizada,
> arrastre de contexto innecesario, y dificultad para retomar trabajo.
>
> **Esta es la diagnosis (línea 1 del plan de Pablo) + 6 diseños.**
> Cada tarjeta tiene scope explícito. **Empezar por T-015, el diagnóstico,
> antes de tocar diseño.** Sin diagnóstico, los diseños se hacen a ciegas.

---

## T-015 — Diagnóstico del sistema actual de memoria/estado/contexto

**TAREA:** producir un **mapa explícito** de qué hace hoy cada capa en
Arkmind, dónde se solapan, y dónde están los huecos. NO es código, es
**análisis + propuesta priorizada**.

**MÓDULO ASIGNADO:** ninguno (es docs)

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `.arkmind/STATE.json`
3. `.arkmind/NO-GO-ZONES.md`
4. `artifacts/ux-arquitecto/src/core/memory.ts` (los 5 pasos)
5. `artifacts/ux-arquitecto/src/core/ia-context-bridge.ts` (ContextEnricher)
6. `artifacts/ux-arquitecto/src/core/session.ts` (SessionState)
7. `artifacts/ux-arquitecto/src/core/ai.ts` (cómo se llama propose hoy)
8. `.arkmind/decisions/0007-ia-context-bridge.md`
9. `PROGRESS.md` (últimas 5 entradas)
10. `.arkmind/SUGGESTIONS.md` (las 7 sugerencias pueden dar pistas)

**ARCHIVOS A TOCAR:**
✅ Nuevo archivo: `.arkmind/REVIEWS/memory-state-context-audit-2026-06.md`
✅ `STATE.json` — si al auditar encontrás campos desactualizados, marcarlo
   (NO corregir en esta tarjeta; la corrección va en otra)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*` (cero código)
❌ Cualquier módulo `pending` o `done`
❌ Las 6 tarjetas siguientes (cada una su archivo)

**ENTREGABLE:**
- Rama: `ia/<handle>/t-015-diagnostico`
- 1 archivo nuevo (el audit)
- 1 chore commit
- Push + entrada slim en PROGRESS con bullets claros

**PRESUPUESTO:** estándar. Si el audit se hace largo, partir en 2 commits.

**FORMATO DEL AUDIT (plantilla):**
```markdown
# Memory/State/Context Audit — 2026-06-07

## 1. Mapa actual
Tabla con: capa (memoria/estado/contexto/...), qué la implementa, qué hace,
qué tan bien lo hace, dependencias.

## 2. Solapamientos detectados
- [Ej: "STATE.json currentFocus quedó desactualizado, dice 'All core
  persistence implemented' pero hay 4 PRs mergeados más"]

## 3. Huecos (lo que falta)
- [Ej: "no hay snapshot ejecutivo, cada sesión arranca leyendo todo"]

## 4. Priorización
- P0 (crítico, bloquea el uso): ...
- P1 (importante, arregla en 1-2 sprints): ...
- P2 (deseable, backlog): ...

## 5. Recomendación
Una sola sugerencia principal para empezar. No un plan enorme: la TAREA siguiente.
```

**NOTAS:**
- **No es un PR de código.** Es el mapa que necesitan las 6 tarjetas siguientes.
- Sin este diagnóstico, las otras se hacen adivinando.
- El audit debe ser **leíble en 5 minutos**. Si te pasás, estás escribiendo la
  solución adentro del diagnóstico, y eso es otra tarjeta.

---

## T-016 — Diseño del snapshot ejecutivo (liviano, siempre disponible)

**TAREA:** diseñar (SPEC + prototipo de datos) un **snapshot ejecutivo** que
contenga: objetivo actual, estado, próximo paso, riesgos, bloqueos. Pensado
para ser leído en cualquier momento, sin cargar contexto pesado.

**MÓDULO ASIGNADO:** `memory-executive-snapshot` (nuevo, propuesto)

**DEPENDENCIA:** T-015 cerrada (el diagnóstico dice qué entra y qué no).

**LECTURA OBLIGATORIA:**
1. El audit de T-015 (el archivo que produjo)
2. `.arkmind/AXIOMS.md`
3. `artifacts/ux-arquitecto/src/core/memory.ts` (cognitivos snapshots ya existen)
4. `artifacts/ux-arquitecto/src/core/snapshotStore.ts` (cómo se guardan)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/memory-executive-snapshot/SPEC.md`
✅ Nuevo: `.arkmind/modules/memory-executive-snapshot/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/memory-executive-snapshot/STATUS.md`
✅ `STATE.json` (entrada `pending` para el módulo nuevo)
✅ `_REGISTRY.md` (fila nueva)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*` (esta tarjeta es solo diseño, no implementación)
❌ `types.ts` (si hace falta, abrir ADR primero)
❌ Las 5 tarjetas siguientes

**ENTREGABLE:** estándar, rama `ia/<handle>/t-016-snapshot-ejecutivo`

**PRESUPUESTO:** estándar

**NOTAS:**
- "Ejecutivo" = el equivalente a un resumen de 1 página. NO un volcado.
- Pensar en formato texto (markdown) vs estructurado (JSON). Sugerencia:
  **markdown con frontmatter**, es lo más portable.
- El **trigger** para regenerarlo: ¿cada N operaciones? ¿manual? ¿al cerrar
  sesión? — esto se discute en el SPEC.

---

## T-017 — Diseño del snapshot detallado (cargado on-demand)

**TAREA:** diseñar el **complemento pesado** del ejecutivo. Contiene:
decisiones técnicas, referencias, archivos, historial ampliado. Se carga
**solo cuando se necesita** (explícitamente, o cuando el ejecutivo no
alcanza).

**MÓDULO ASIGNADO:** `memory-detailed-snapshot` (nuevo, propuesto)

**DEPENDENCIA:** T-016 (son pares, el detallado referencia al ejecutivo).

**LECTURA OBLIGATORIA:**
1. El SPEC que produjo T-016
2. El audit de T-015
3. `artifacts/ux-arquitecto/src/core/memory.ts` (cómo se hace hoy el detalle)
4. `PROGRESS.md` (entero, para entender qué entra en "detallado")

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/memory-detailed-snapshot/SPEC.md`
✅ Nuevo: `.arkmind/modules/memory-detailed-snapshot/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/memory-detailed-snapshot/STATUS.md`
✅ `STATE.json` + `_REGISTRY.md`

**ARCHIVOS QUE NO SE TOCAN:** mismos que T-016.

**ENTREGABLE:** estándar.

**NOTAS:**
- El detallado es lo que el ejecutivo **NO tiene**. Si todo entra en el
  ejecutivo, el detallado no hace falta.
- **"Cargado on-demand"** significa que hay una API explícita:
  `loadDetailedSnapshot(trigger: string)`. No se carga por defecto.
- El `trigger` queda logueado (auditoría: "esta IA cargó el detallado
  porque X").

---

## T-018 — Diseño de conversaciones ramificadas (árbol con herencia)

**TAREA:** diseñar el modelo de **conversaciones en árbol** con herencia
de snapshot del nodo padre. Ejemplo:
```
proyecto/
├── arquitectura/
├── memoria/
├── ui/
├── testing/
└── integraciones/
```
Cada rama hereda el snapshot del padre y no contamina a los hermanos.

**MÓDULO ASIGNADO:** `branched-conversations` (nuevo, propuesto)

**DEPENDENCIA:** T-016 (la rama necesita el snapshot ejecutivo del padre).

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/core/session.ts` (SessionState ya tiene "forked")
3. `artifacts/ux-arquitecto/src/core/types.ts` (AIContextSession)
4. `artifacts/ux-arquitecto/src/core/ia-context-bridge.ts` (cómo se enriquece hoy)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/branched-conversations/SPEC.md`
✅ Nuevo: `.arkmind/modules/branched-conversations/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/branched-conversations/STATUS.md`
✅ `STATE.json` + `_REGISTRY.md`

**ARCHIVOS QUE NO SE TOCAN:** mismos.

**ENTREGABLE:** estándar.

**NOTAS:**
- `SessionState: "forked"` ya existe como string, pero **no hay lógica de
  árbol**. El SPEC tiene que proponer cómo se modela ese árbol.
- "Herencia de snapshot" implica que cuando se forkea, el hijo arranca
  con el ejecutivo (T-016) del padre. ¿Y el detallado? Solo si lo pide.
- **Evitar contaminación entre temas no relacionados** es la promesa clave.
  El SPEC debe decir **cómo se evita** (no solo que se evita).

---

## T-019 — Diseño de estado vivo (capa "activo / detenido / esperando / bloqueado")

**TAREA:** diseñar la **capa explícita de estado actual** del proyecto.
Es lo que responde "¿qué está pasando ahora mismo?" sin leer todo el
repositorio.

**MÓDULO ASIGNADO:** `live-state` (nuevo, propuesto)

**DEPENDENCIA:** T-015 (el audit dice qué debe llevar).

**LECTURA OBLIGATORIA:**
1. El audit de T-015
2. `STATE.json` (estado actual, desactualizado)
3. `.arkmind/SUPOSICIONES.md`
4. `PROGRESS.md` (lo que se considera "vivo" hoy)
5. `.arkmind/SUGGESTIONS.md` (puede haber ideas vivas ahí)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/live-state/SPEC.md`
✅ Nuevo: `.arkmind/modules/live-state/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/live-state/STATUS.md`
✅ `STATE.json` + `_REGISTRY.md`

**ARCHIVOS QUE NO SE TOCAN:** mismos.

**ENTREGABLE:** estándar.

**NOTAS:**
- Las 4 categorías de Pablo son: **activo / detenido / esperando /
  bloqueado**. El SPEC tiene que decir quién decide en cuál está cada
  cosa (¿IA? ¿humano? ¿regla automática?).
- "Detenido" vs "bloqueado" son parecidos pero distintos. El SPEC debe
  aclarar la diferencia.
- "Esperando revisión" probablemente cabe en "esperando" o necesita una
  5ta categoría. Decidir en el SPEC.

---

## T-020 — Diseño de memoria de trabajo (`active_tasks`)

**TAREA:** diseñar la estructura `active_tasks` que responda:
- ¿Qué estaba haciendo?
- ¿Dónde quedó?
- ¿Qué falta?
- ¿Quién lo está trabajando?

**MÓDULO ASIGNADO:** `active-tasks` (nuevo, propuesto)

**DEPENDENCIA:** T-019 (las tareas activas son parte del "estado vivo").

**LECTURA OBLIGATORIA:**
1. El SPEC de T-019
2. El audit de T-015
3. `STATE.json` (cómo se trackean tareas hoy, mal)
4. `PROGRESS.md` (ejemplos de tareas reales)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/active-tasks/SPEC.md`
✅ Nuevo: `.arkmind/modules/active-tasks/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/active-tasks/STATUS.md`
✅ `STATE.json` + `_REGISTRY.md`

**ARCHIVOS QUE NO SE TOCAN:** mismos.

**ENTREGABLE:** estándar.

**NOTAS:**
- `active_tasks` debe ser **persistido en IDB** (no en localStorage, no
  en el chat). Forma: probablemente un store nuevo en `arkmind_runtime`.
- El **ciclo de vida** de una tarea: creada → en progreso → esperando →
  completada / abandonada. Decidir transiciones en el SPEC.
- Si una tarea queda "en progreso" más de X días sin update, marcar como
  `stale` automáticamente (alertas para Pablo).

---

## T-021 — Diseño de recuperación contextual (búsqueda por tema/proyecto/fecha)

**TAREA:** diseñar mecanismos de **búsqueda** para recuperar información
por: tema, proyecto, decisión, archivo, fecha, relación semántica. **No
depender solo de memoria cronológica.**

**MÓDULO ASIGNADO:** `contextual-recovery` (nuevo, propuesto)

**DEPENDENCIA:** T-015, T-019, T-020 (es la capa de "búsqueda" sobre el
resto).

**LECTURA OBLIGATORIA:**
1. El audit de T-015
2. Los SPECs de T-019, T-020
3. `grep` en el repo para ver qué se usa hoy (manual)
4. `PROGRESS.md` (¿es grepeable hoy?)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/modules/contextual-recovery/SPEC.md`
✅ Nuevo: `.arkmind/modules/contextual-recovery/CONTRACT.md`
✅ Nuevo: `.arkmind/modules/contextual-recovery/STATUS.md`
✅ `STATE.json` + `_REGISTRY.md`

**ARCHIVOS QUE NO SE TOCAN:** mismos.

**ENTREGABLE:** estándar.

**NOTAS:**
- "Relación semántica" implica **embeddings** o tags. Probablemente **fuera
  de scope** por ahora (no hay vector DB, no hay embeddings en el stack).
  El SPEC debe decir qué hacer **mientras tanto**: tags manuales, índices
  por path, búsqueda full-text en PROGRESS.
- "Por fecha" es lo más fácil. "Por tema" requiere que los archivos estén
  taggeados. "Por decisión" requiere un índice de ADRs.
- El SPEC debe ser honesto: **qué se puede hacer con grep + frontmatter**,
  y qué requiere infraestructura nueva.

---

## T-022 — Evaluación de impacto (rendimiento + consumo de contexto)

**TAREA:** una vez que T-016 a T-021 tengan SPECs, **evaluar el costo**:
- ¿Cuánto tarda cada snapshot a generar?
- ¿Cuánto ocupa en IDB?
- ¿Cuánto consume en tokens cuando se carga?
- ¿Cómo escala a 100 / 1000 / 10000 sesiones?

**MÓDULO ASIGNADO:** ninguno (es análisis).

**DEPENDENCIA:** T-016, T-017, T-018, T-019, T-020, T-021 todas cerradas
(sino, estás evaluando diseños incompletos).

**LECTURA OBLIGATORIA:**
1. Los 6 SPECs producidos
2. `artifacts/ux-arquitecto/src/core/snapshotStore.ts` (métricas de tamaño)
3. `artifacts/ux-arquitecto/src/core/memory.ts` (métricas de cache)

**ARCHIVOS A TOCAR:**
✅ Nuevo: `.arkmind/REVIEWS/memory-architecture-impact-2026-06.md`
✅ `SUGGESTIONS.md` — si encontrás métricas que valga la pena trackear
   (ej: "alertar si el ejecutivo supera X bytes")

**ARCHIVOS QUE NO SE TOCAN:** mismos.

**ENTREGABLE:** estándar.

**NOTAS:**
- Esta tarjeta es **la última** a propósito. Sin las 6 anteriores, no hay
  qué evaluar.
- Si el costo es prohibitivo, **la recomendación puede ser "no
  implementar X, es demasiado caro"**. Eso es válido. Mejor saberlo
  antes que después.
- Si todo es barato, el SPEC de T-021 puede ser más ambicioso (ej:
  incluir embeddings).

---

## Resumen de las 8 tarjetas

| ID | Qué | Tipo | Tamaño | Dep |
|---|---|---|---|---|
| T-015 | Diagnóstico | análisis | mediano | — |
| T-016 | Snapshot ejecutivo | spec | mediano | T-015 |
| T-017 | Snapshot detallado | spec | mediano | T-016 |
| T-018 | Conversaciones ramificadas | spec | grande | T-016 |
| T-019 | Estado vivo | spec | mediano | T-015 |
| T-020 | Memoria de trabajo | spec | grande | T-019 |
| T-021 | Recuperación contextual | spec | grande | T-015..T-020 |
| T-022 | Evaluación de impacto | análisis | mediano | T-016..T-021 |

**Orden sugerido:** T-015 → T-016 → T-019 → T-017 → T-020 → T-018 → T-021 → T-022

(Diagnóstico primero, después los pares liviano+pesado, después la integración, evaluación al final.)

---

*Tarjetas redactadas por Mavis@cloud el 2026-06-07. Listas para que Pablo asigne cuando quiera.*
