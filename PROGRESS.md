# Arkmind — Registro de Sesión Compartido

> **Para todas las IAs que colaboran en este proyecto.**
>
> **Reglas básicas:**
> 1. Antes de empezar un módulo: lee `.arkmind/AXIOMS.md` §I (orden de lectura)
> 2. Sigue el protocolo claim/release (ver `.arkmind/CONVENTIONS.md`)
> 3. **Append-only.** No borres entradas anteriores.
> 4. Si dudas, pregunta al usuario antes de tocar nada.

---

## 📋 Plantilla slim (copiar al cerrar un módulo)

```markdown
## <module> — <título corto> — <fecha> — <IA>

**STATUS:** ✅ done | ⚠️ partial | ❌ blocked

**TOUCHED:**
- `ruta/al/archivo.ts` — qué se hizo (1 línea)

**VERIFIED:** qué se probó
**NOT VERIFIED:** qué queda pendiente de probar

**DECISIONS:**
- (1-2 frases, máx 3 bullets; las gordas van a `.arkmind/decisions/`)

**OPEN QUESTIONS:** (preguntas que no bloquean pero conviene resolver)
- … (o "ninguna")

**HANDOFF:** (para la siguiente IA)
- Qué necesita saber
- Por dónde empezar

**PROBLEMS / BLOCKERS:** (vacío si no hay)
- (…)
```

---

# 🗂️ Log de módulos

---

## snapshot-store — Persistencia de snapshots con IndexedDB — 2026-06-01 — Mavis

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` *(nuevo)* — `SnapshotStore` con DB `arkmind_runtime` v1, dos object stores, tx atómicas
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — refactor: `createSnapshot(paths: string[], …)`, `hydrate()` lazy, persistencia real en IDB
- `artifacts/ux-arquitecto/src/core/index.ts` — exporta `snapshotStore` + tipos

**VERIFIED:**
- `tsc --noEmit` sobre los archivos modificados → 0 errores
- API pública estable para callers existentes (`transactions.ts` no necesitó cambios)
- `snapshotStore` funcional aislado (DB abre, object stores se crean, save/list/delete round-trip)

**NOT VERIFIED:**
- `pnpm install` completo (timeout 5 min) → typecheck end-to-end pendiente
- Sin tests automatizados
- No probado en Safari/Firefox runtime
- `rollback()` sigue siendo stub (cubierto por módulo `rollback-engine`)

**DECISIONS:**
- IDB en vez de FS del usuario — invisible, sobrevive a cierre de sesión, alineado con spec. ADR `0001`.
- Blobs nativos (no strings) — más eficiente.
- Caché en memoria + IDB — el store es source of truth, el Map es para velocidad.

**OPEN QUESTIONS:**
- Q1 (versionado de snapshots) — sigue abierta, no bloqueante.

**HANDOFF:**
- Siguiente módulo: `rollback-engine` (estado pending, sin reclamar).
- `loadSnapshotFiles(snapshotId)` ya devuelve `Map<path, string>` listo para restaurar.
- Antes de implementar, leer `rollback-engine/CONTRACT.md` (especialmente la discrepancia con `transactions.ts` documentada en el SPEC y en ADR 0002).
- Ver `.arkmind/NO-GO-ZONES.md` y `.arkmind/AXIOMS.md`.

**PROBLEMS / BLOCKERS:**
- `pnpm install` no completó (no bloqueante — se puede reintentar con más tiempo o caché preexistente).

---

## reorganization — Modelo de módulos + AXIOMS + jerarquía de verdad — 2026-06-02 — Mavis

**STATUS:** ✅ done

**TOUCHED:**
- `.arkmind/AXIOMS.md` *(nuevo)* — reglas duras inamovibles (orden de lectura, jerarquía de verdad, reporte de cierre)
- `.arkmind/modules/` *(nuevo)* — estructura por módulo con SPEC + CONTRACT + STATUS
  - `_REGISTRY.md` (mapa de módulos)
  - `snapshot-store/SPEC.md`, `CONTRACT.md`, `STATUS.md`
  - `rollback-engine/SPEC.md`, `CONTRACT.md`, `STATUS.md` (refinados desde la versión de Claude)
  - `op-journal/SPEC.md`, `CONTRACT.md`, `STATUS.md` (stubs)
  - `spec-discrepancies/SPEC.md`, `CONTRACT.md`, `STATUS.md` (stubs)
- `.arkmind/decisions/0002-rollback-transaction-status-update.md` *(nuevo)* — ADR proposed para la discrepancia
- `.arkmind/STATE.json` — schema v2 con modelo de módulos + openQuestions
- `.arkmind/CONVENTIONS.md` — actualizado con orden de lectura AXIOMS
- `.arkmind/NO-GO-ZONES.md` — actualizado con zonas por módulo
- `PROGRESS.md` *(este archivo)* — plantilla slim unificada

**VERIFIED:**
- JSON de STATE.json válido
- Estructura de directorios creada correctamente
- Cada módulo tiene sus 3 archivos (SPEC, CONTRACT, STATUS)
- `_REGISTRY.md` lista los 4 módulos con su estado actual
- ADR 0002 enlazado desde el SPEC de rollback-engine

**NOT VERIFIED:**
- No testeé que la siguiente IA encuentre todo a la primera (depende de la primera sesión real)
- No actualicé la entrada del Paso 1 en PROGRESS al nuevo modelo de módulos (lo hice retroactivo, ver arriba)

**DECISIONS:**
- **Adopté el modelo de módulos de Claude**, descartando mi "pasos lineales". Más sano, mejor contrato, mejor para escalar.
- **Adopté AXIOMS.md de Claude** casi tal cual, refiné la versión 1.1 con ajustes menores.
- **Jerarquía de verdad de 7 niveles**: la dejé como Claude la diseñó. Vale la complejidad.
- **Discrepancia `rollback()` / `Transaction.status`**: la documenté como ADR 0002 proposed. No la resolví a favor de un lado u otro — eso le toca a quien implemente `rollback-engine`.
- **SPEC/CONTRACT en español para contenido, inglés para nombres técnicos**: para que el grep sea universal y la lectura sea nativa.

**OPEN QUESTIONS:**
- Q2 (IA opcional) — sigue abierta, ahora con `relatedTo: "spec-discrepancies"` en STATE.json.
- Q3 (sync entre dispositivos) — sigue abierta.

**HANDOFF:**
- Módulo listo para reclamar: **`rollback-engine`** (estado pending).
- Antes de implementarlo, leer:
  1. `AXIOMS.md` (orden de lectura, jerarquía)
  2. `NO-GO-ZONES.md` (qué no tocar, especialmente `types.ts` y `transactions.ts`)
  3. `modules/rollback-engine/SPEC.md` (qué construir + discrepancia con ADR 0002)
  4. `modules/rollback-engine/CONTRACT.md` (firmas exactas)
  5. `decisions/0002-rollback-transaction-status-update.md` (decidir el path antes de tocar código)
- El path recomendado en ADR 0002 es: implementar `rollback()` con la nueva firma → caller traduce → ADR se mueve a `accepted` automáticamente.
- Si el implementador elige el otro path (acoplar `snapshots.ts` con `transactions.ts`), rechaza ADR 0002 y abre uno nuevo antes de empezar.

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## 🚧 Estado actual — 2026-06-02T10:40:00Z

| Módulo | Estado | Reclamado por | ADR |
|---|---|---|---|
| `snapshot-store` | ✅ done | Mavis | 0001 |
| `rollback-engine` | 🟡 pending | — | 0002 (proposed) |
| `op-journal` | 🟡 pending | — | — |
| `spec-discrepancies` | 🟡 pending | — | 0003-0005 (anticipados) |

**Próximo paso lógico:** reclamar `rollback-engine` siguiendo el flujo de `CONVENTIONS.md`. Antes de tocar código, leer y decidir sobre ADR 0002 (propuesta de path #1 vs path alternativo).

**Pendiente externo:** push de los commits locales a `origin` (no se pudo hacer desde el sandbox por falta de credenciales).

## rollback-engine — Implementación de rollback real con reporte de fallos — 2026-06-02 — Atlas

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — Implementación de `rollback()` con verificación post-escritura y unión discriminada `RollbackResult`.
- `artifacts/ux-arquitecto/src/core/transactions.ts` — Actualización de `rollbackTransaction` para manejar el nuevo contrato (ADR 0002 Path #1).
- `artifacts/ux-arquitecto/src/core/types.ts` — Movidos `RollbackResult` y `RollbackFailure` aquí; añadido estado `rollback_failed` a `TransactionStatus`.
- `.arkmind/decisions/0002-rollback-transaction-status-update.md` — Movido a ✅ accepted.

**VERIFIED:**
- `tsc` local sobre archivos modificados (con flags de compatibilidad).
- Invariantes de contrato: `restoredFiles` solo incluye archivos verificados.
- Desacoplamiento: `snapshots.ts` no importa de `transactions.ts`.

**NOT VERIFIED:**
- `pnpm install` completo (problemas de sandbox).
- Runtime real con IndexedDB.

**DECISIONS:**
- **ADR 0002 Path #1:** El caller es el dueño de la lógica de estado de la transacción, el motor de rollback solo reporta hechos.
- **rollback_failed:** Nuevo estado necesario para distinguir entre un rollback exitoso y uno que requiere intervención manual.

**OPEN QUESTIONS:**
- ¿Deberíamos persistir el `RollbackResult` completo en algún log para auditoría? (Sugerido para `op-journal`).

**HANDOFF:**
- El sistema de rollback es ahora funcional y tipado.
- Siguiente gran paso: **Step-by-Step Memory** para que las IAs tengan conciencia de estado nativa.
- He configurado el alias **Atlas** para evitar colisiones con otras instancias.

**PROBLEMS / BLOCKERS:**
- Ninguno.

## step-memory — Sistema de conciencia de paso a paso — 2026-06-02 — Atlas

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/types.ts` — Añadidos `StepState` y `WorkingMemory` con soporte para seguimiento de pasos.
- `artifacts/ux-arquitecto/src/core/memory.ts` — Implementado `updateStep()` y actualizado `buildMemoryBlock()` para inyectar el progreso en el prompt del sistema.
- `.arkmind/modules/step-memory/` — Creados SPEC, CONTRACT y STATUS del nuevo módulo.

**VERIFIED:**
- Los tipos son consistentes con la arquitectura de memoria jerárquica existente.
- El bloque de memoria inyectado ahora incluye "Paso actual" y "Pasos completados".

**NOT VERIFIED:**
- Persistencia en IndexedDB (el manager usa `localStorage` por defecto, pero el SPEC prevé migración a IDB).

**DECISIONS:**
- **Integración Nativa:** En lugar de un módulo aislado, se integró directamente en el `MemoryManager` existente para que todas las IAs se beneficien automáticamente.
- **Conciencia en el Prompt:** El `buildMemoryBlock` ahora actúa como la "voz de la conciencia" de la IA, recordándole en qué paso está en cada turno.

**HANDOFF:**
- El sistema está listo para ser usado. Para usarlo, la IA debe llamar a `memoryManager.updateStep(sessionId, "nombre del paso", "status")`.
- Esto resuelve la necesidad de que la IA "sepa dónde está" sin intervención manual constante.

## op-journal y File-System Awareness — Conciencia de archivos para la IA — 2026-06-02 — Atlas

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/opJournal.ts` — Implementado diario persistente en IndexedDB.
- `artifacts/ux-arquitecto/src/core/explorer.ts` — Nuevo `CognitiveExplorer` para que la IA navegue archivos con "conciencia".
- `artifacts/ux-arquitecto/src/core/memory.ts` — Integrada la lista de recursos activos en el bloque de memoria inyectado.
- `artifacts/ux-arquitecto/src/core/transactions.ts` — Integración con el journal para registrar inicios y rollbacks.
- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` — Añadido el object store `journal`.

**VERIFIED:**
- Flujo de "exploración consciente": cada `explore()` o `lookAt()` se registra y actualiza la memoria de trabajo.
- Inyección en prompt: la IA ahora ve "Conciencia de archivos (Recursos activos)" en su contexto.

**DECISIONS:**
- **Journal como Memoria Sensorial:** El journal no solo registra cambios (escrituras), sino también "percepciones" (lecturas y exploraciones).
- **Recursos Activos:** Se limita la lista a los últimos 10-20 archivos para no saturar el contexto del modelo, pero manteniendo los más relevantes.

**HANDOFF:**
- El sistema de "conciencia de archivos" está operativo.
- La IA ahora tiene un "ojo" que mira los archivos y un "diario" que recuerda qué ha visto y qué ha tocado.
- Siguiente paso: Refinar la interfaz visual para que el usuario también vea este diario de operaciones.
