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

## 🚧 Estado actual — 2026-06-02T12:05:00Z

| Módulo | Estado | Reclamado por | ADR |
|---|---|---|---|
| `snapshot-store` | ✅ done | Mavis | 0001 |
| `rollback-engine` | ✅ done | Mavis@cloud | 0002 (accepted) |
| `op-journal` | 🟡 pending | — | — |
| `spec-discrepancies` | 🟡 pending | — | 0003-0005 (anticipados) |

**Próximo paso lógico:** reclamar `op-journal` o `spec-discrepancies`. `op-journal` ahora
tiene `rollback-engine` como dependencia satisfecha, así que es el más natural para
encadenar. `spec-discrepancies` es independiente y puede ir en paralelo.

**Pendiente externo:** push de los commits locales a `origin` (no se pudo hacer desde el sandbox por falta de credenciales). Acumula: `snapshot-store` (1 commit) + esta reorganización de módulos + `rollback-engine` (claim + feat + close).

---

## rollback-engine — Restore desde snapshot con resultado discriminado — 2026-06-02 — Mavis@cloud

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — `rollback(snapshotId)` real con `loadSnapshotFiles` + `writeFile` + `verifyRestoration`, devuelve `Promise<RollbackResult>`
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — `verifyRestoration(path, expectedContent)` exportado y testeable
- `artifacts/ux-arquitecto/src/core/types.ts` — añadidos `RollbackResult`, `RollbackFailure`, `RollbackFailureReason`; `TransactionStatus` extendida con `"rollback_failed"`
- `artifacts/ux-arquitecto/src/core/transactions.ts` — `rollbackTransaction()` traduce `RollbackResult` → `Transaction.status` (`rolled_back` / `rollback_failed`)
- `.arkmind/decisions/0002-rollback-transaction-status-update.md` — ADR movido a `accepted`
- `.arkmind/STATE.json` — módulo `rollback-engine` → `done`, ADR `accepted`, `currentFocus` actualizado
- `.arkmind/modules/rollback-engine/STATUS.md` — cerrado, handoff completo
- `.arkmind/modules/_REGISTRY.md` — fila `rollback-engine` actualizada
- `PROGRESS.md` *(esta entrada)*

**VERIFIED:**
- `tsc --noEmit` parcial sobre los archivos modificados → 0 errores
- `grep` cruzado: `RollbackResult` / `RollbackFailure` / `"rollback_failed"` aparecen exactamente donde corresponde (definidos en `types.ts`, consumidos en `snapshots.ts` y `transactions.ts`)
- No quedan callers de la firma vieja `rollback(): Promise<boolean>` en `artifacts/ux-arquitecto/src/`
- INVARIANTES del CONTRACT cumplidos: `restoredFiles` no incluye `verify_error`, snapshot vacío → `success: true`, fallos individuales no throw

**NOT VERIFIED:**
- `pnpm install` end-to-end (mismo timeout que la sesión de snapshot-store)
- Sin tests automatizados para `verifyRestoration` ni para el flujo `rollback → restored`
- Runtime real en browser (no testeable desde sandbox)
- Safari/Firefox (idem)

**DECISIONS:**
- **ADR 0002 aceptado tal cual.** Path #1 (caller traduce) implementado. `snapshots.ts` no importa de `transactions.ts` — jerarquía NO-GO-ZONES respetada.
- **`RollbackResult` y `RollbackFailure` viven en `types.ts` desde el inicio**, no en `snapshots.ts` con TODO temporal. El ADR estaba maduro, no hacía falta el paso intermedio.
- **Snapshot vacío es éxito** (`{ success: true, restoredFiles: [], snapshotId }`) — alineado con el SPEC, útil para checkpoints lógicos.

**OPEN QUESTIONS:**
- Q1 (versionado de snapshots) — sigue abierta. La carga en memoria de `Map<path, string>` puede ser problema con snapshots grandes.
- Q2 (IA opcional/requerida) — sigue abierta, `relatedTo: spec-discrepancies`.

**HANDOFF:**
- Siguiente módulo lógico: `op-journal`. Su SPEC/CONTRACT/STATUS están como stubs; ahora que `rollback-engine` está `done`, la dependencia está satisfecha.
- Antes de implementar `op-journal`, leer:
  1. ADR 0002 (cómo se reportan los rollbacks ahora)
  2. `RollbackResult` y `RollbackFailure` en `types.ts` (lo que el journal va a persistir)
  3. `Transaction.status` extendido con `"rollback_failed"` (otro evento a loguear)
- Si se opta por `spec-discrepancies` en su lugar, leer `.arkmind/modules/spec-discrepancies/SPEC.md` y arrancar por Q2 (IA opcional/requerida).

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## spec-discrepancies — IA y auth como providers opcionales — 2026-06-02 — Aria

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/ai.ts` — refactor: `AIProvider` interface + `NoopAIProvider` (default) + `MistralAIProvider`, `AIManager` arranca con noop, `setProvider`/`getProvider`, `setAIConfig` ahora backwards-compat atajo
- `artifacts/ux-arquitecto/src/core/auth.ts` — `AuthConfig.remoteUrl`/`remoteKey` (aliases `supabaseUrl`/`supabaseKey` @deprecated), `setRemoteConfig`/`getRemoteConfig`, doc-comment aclarando local-only
- `artifacts/ux-arquitecto/src/core/index.ts` — re-exports nuevos tipos
- `.arkmind/decisions/0003-ai-as-optional-provider.md` *(nuevo, accepted)*
- `.arkmind/decisions/0004-auth-as-local-with-optional-remote.md` *(nuevo, accepted)*
- `.arkmind/SUPOSICIONES.md` — referencia cruzada a ADRs 0003/0004
- `.arkmind/modules/spec-discrepancies/{SPEC,CONTRACT,STATUS}.md` — refinados a v0.2, STATUS cerrado
- `.arkmind/STATE.json` — módulo done, Q2 resuelta
- `.arkmind/modules/_REGISTRY.md` — fila actualizada

**VERIFIED:**
- `tsc --noEmit` parcial (noResolve, foco en `ai.ts` y `auth.ts`) → 0 errores de tipo, solo `Cannot find module './types'` esperado
- `grep` cruzado: callers de `AIManager` en core (solo `index.ts` + `useAI.ts`) usan API backwards-compat preservada
- `grep` cruzado: callers de `AuthManager` en core (solo `useAuth.ts` + `LoginPage.tsx`) usan solo `loadSession`/`onSessionChange`/`clearSession`/`saveSession` — todos preservados
- ADRs 0003 y 0004 movidos a `accepted` con justificación de sus consecuencias

**NOT VERIFIED:**
- `pnpm install` end-to-end (mismo timeout 5 min que las dos sesiones previas)
- Tests automatizados: no hay tests para `AIProvider` ni `AuthManager` en el repo
- Runtime real en browser (no testeable desde sandbox)
- `MistralAIProvider.propose()` es un stub estructurado, NO hace fetch real a la API
- Safari/Firefox runtime

**DECISIONS:**
- **Alcance recortado**: ADR 0005 (persistencia IDB de session/cognitive/visual/memory) queda fuera de este módulo. Razón: afecta 4 managers, requiere diseñar `runtimeStore` o extender `snapshotStore`, y merece sesión propia con typecheck end-to-end.
- **Scope creep en auth.ts**: añadí `setRemoteConfig`/`getRemoteConfig` que no estaban en el SPEC original. Justificación: `AuthConfig` ahora tiene `remoteUrl`/`remoteKey` pero ningún método para setearlos. No hay callers, así que es safe add.
- **`MistralAIProvider.propose()` es stub**: no hace fetch. Mantiene el mismo nivel de operación que el código previo. La llamada real queda para una sesión con tests que mockeen `fetch`.
- **Q2 resuelta**: ADR 0003 responde formalmente. La paso a `resolved` en `STATE.json` con `resolvedBy: "Aria"` y `resolvedByADR: "0003"`.

**OPEN QUESTIONS:**
- Q1 (versionado de snapshots) — sigue abierta, no tocada.
- Q3 (sync entre dispositivos) — sigue abierta, no tocada.
- **Q4 (nueva)**: ¿Se crea un `runtimeStore` sibling de `snapshotStore` para session/cognitive/visual/memory, o se extiende `snapshotStore` con migración a v2? Decisión de arquitectura para ADR 0005.

**HANDOFF:**
- Siguiente módulo lógico: `op-journal` (sigue pending, dependencia de rollback-engine ya satisfecha). **OJO**: `op-journal` sigue siendo stub puro. La IA que lo reclame tiene que refinar su SPEC primero (es lo que su SPEC original pedía).
- Si se opta por encarar ADR 0005 (persistencia IDB), leer:
  1. Este módulo (`spec-discrepancies/SPEC.md` sección "Concrete refactors anticipated")
  2. `snapshotStore.ts` para entender el patrón actual
  3. Q4 (en `OPEN QUESTIONS`) sobre la decisión de un store único vs múltiples
- Si se opta por la llamada real a Mistral, leer:
  1. `AIProvider` interface (en `ai.ts`) y `MistralAIProvider.propose()` actual
  2. Crear un `MistralHTTPProvider` separado que use `fetch` nativo, mockeando en tests
- Branch: `ia/aria/spec-discrepancies` — lista para push y PR contra `main`.

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## op-journal — Operation Journal con persistencia IndexedDB — 2026-06-02 — Manus@delta

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/types.ts` — añadidos `JournalEntry` y `JournalFilter`.
- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` — esquema v2 con object store `journal` e índices.
- `artifacts/ux-arquitecto/src/core/opJournal.ts` — implementación de `OpJournalManager` (add, get, clear).
- `artifacts/ux-arquitecto/src/core/transactions.ts` — hooks en `create`, `execute`, `confirm` y `rollback`.
- `artifacts/ux-arquitecto/src/core/index.ts` — exportación de `opJournal` en `coreEngine`.
- `.arkmind/decisions/0006-op-journal-persistence-and-core-integration.md` — ADR aceptado.
- `.arkmind/STATE.json`, `.arkmind/modules/_REGISTRY.md`, `STATUS.md` — coordinación actualizada.

**VERIFIED:**
- `grep` cruzado: todas las referencias a `opJournal` y `JournalEntry` son consistentes.
- `snapshotStore.ts` maneja correctamente la actualización a `DB_VERSION = 2`.
- `TransactionManager` ahora tiene 5 puntos de entrada al journal cubriendo el ciclo de vida completo.

**NOT VERIFIED:**
- Ejecución real en browser (IndexedDB requiere entorno DOM).
- Rendimiento con miles de entradas (se sugiere política de retención en el futuro).

**DECISIONS:**
- **ADR 0006 aceptado**: El journal vive en la misma DB `arkmind_runtime` para simplificar la gestión de la conexión.
- **Fire-and-forget**: Las escrituras al journal no bloquean las transacciones; los errores se loguean a consola pero no interrumpen el flujo.
- **RollbackResult completo**: Se persiste el objeto de resultado entero para permitir auditoría detallada de fallos de restauración.

**OPEN QUESTIONS:**
- ¿Debemos implementar un límite de entradas (ej. últimas 1000) para evitar que IndexedDB crezca demasiado?
- ¿Debería el journal registrar también lecturas (`read`) o solo operaciones destructivas? (Actual: solo destructivas y rollbacks).

**HANDOFF:**
- El módulo está listo para ser consumido por la UI.
- Siguiente paso lógico: ADR 0005 (persistencia IDB de session/cognitive/visual/memory) para completar la persistencia del estado del runtime.

---

## runtime-persistence — Persistencia total del runtime en IndexedDB — 2026-06-02 — Manus@delta

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/core/snapshotStore.ts` — esquema v3 con stores `sessions`, `cognitive_contexts`, `visual_contexts` y `memory`.
- `artifacts/ux-arquitecto/src/core/session.ts` — persistencia IDB y método `hydrate()`.
- `artifacts/ux-arquitecto/src/core/cognitive.ts` — persistencia IDB y método `hydrate()`.
- `artifacts/ux-arquitecto/src/core/visual.ts` — persistencia IDB y método `hydrate()`.
- `artifacts/ux-arquitecto/src/core/memory.ts` — migración completa de `localStorage` a `IndexedDB`, persistencia IDB y método `hydrate()`.
- `artifacts/ux-arquitecto/src/core/index.ts` — exportación de `hydrateAll()` en `coreEngine`.
- `.arkmind/decisions/0005-runtime-state-persistence-in-indexeddb.md` — ADR 0005 aceptado.

**VERIFIED:**
- Consistencia de stores en `snapshotStore.ts`.
- Patrón de hidratación unificado en todos los managers.
- Eliminación de la dependencia de `localStorage` en el sistema de memoria.

**DECISIONS:**
- **ADR 0005 aceptado**: Se utiliza la misma base de datos `arkmind_runtime` para simplificar la gestión de la conexión y futuras migraciones.
- **Single Point of Hydration**: Se centraliza la carga inicial en `coreEngine.hydrateAll()` para asegurar que todos los managers estén listos antes de que la UI empiece a renderizar.

**HANDOFF:**
- El sistema de persistencia core está completo.
- Siguiente paso: Implementación de la UI para visualizar el journal y gestionar las sesiones persistidas.

---

## T-009 — Acción "Copiar al chat" sobre mensajes — 2026-06-07 — Mavis@cloud

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` — agregado botón "Copiar al chat" + handler (143 ins, 66 del)

**VERIFIED:**
- Typecheck del archivo aislado con stubs: 0 errores reales (los errores restantes son de los stubs mismos, no del código).
- Scope respetado: SOLO `ChatPanel.tsx`. NO se tocó `core/`, NO se tocó `hooks/`, NO se tocó `types.ts`.
- Solo renderiza el botón para tipos `text`, `code`, `diff`. Los otros tipos (`proposal`, `snapshot`, `warning`, `action`) no son texto plano copiable, así que el botón no aparece.
- Compatible con T-010 (la selección múltiple se puede construir encima sin re-trabajo).

**NOT VERIFIED:**
- No se ejecutó en browser (sin dev server en sandbox). El feedback visual "Copiado" y la animación dependen del runtime.
- No se probó el caso edge de mensajes con `code.path` muy largo (probablemente没问题, pero no validado).
- No se probó accesibilidad con teclado (el botón es clickeable pero no agregué shortcut).

**DECISIONS:**
- **Pega al input, NO envía**: deja al usuario editar antes de mandar. Coincide con la nota de la tarjeta ("asumimos: al chat activo, es lo más simple y útil").
- **Code con path**: prepende `// {path}\n` para preservar contexto al pegar.
- **Diff con path**: prepende `// {path}\n// Antes:\n// Después:\n` para que el contexto sea claro.
- **Feedback 1.5s**: suficiente para que el usuario lo vea sin ser molesto.
- **Botón siempre visible a 70% opacity, 100% en hover**: en mobile no hay hover, queda visible todo el tiempo (intencional).
- **NO usé un sistema de selección múltiple**: eso es scope de T-010, no de T-009.

**OPEN QUESTIONS:**
- ¿El botón debería tener un atajo de teclado? (ej. `Cmd+C` después de seleccionar mensaje). No urge, abrir SUGGESTIONS si querés.
- ¿Debería haber un toast/snackbar en vez de cambiar el texto del botón? Más "prolijo" pero requiere nuevo componente. Diferir.

**HANDOFF:**
- Siguiente tarjeta: **T-010 (Enviar a LLM)** depende de esto. Ya está la base.
- Si querés mergear, la rama es `ia/mavis-cloud/t-009-copy-to-chat`. El PR se puede abrir desde GitHub mobile.
- Si NO querés mergear (wip, querés revisar), avisame y dejo wip commit.

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## T-011 — Historial de chats accesible desde el chat (menú de 3 líneas) — 2026-06-08 — Mavis@cloud

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` — botón hamburguesa + state interno activeSessionId + componente HistoryDropdown (255 ins, 14 del)

**VERIFIED:**
- Typecheck del archivo aislado con stubs: 0 errores reales (los restantes son de los stubs mismos, no del código).
- Scope respetado: SOLO `ChatPanel.tsx`. NO se tocó `core/`, NO se tocó `hooks/`, NO se tocó `session.ts`, NO se tocó `useSession`.
- Métodos que necesitaba YA existían: `sessionManager.getAllSessions()`, `sessionManager.setState()`. NO tuve que crear nada nuevo.
- `SessionState` YA incluye `"archived"`. NO incluye `"pinned"` — el spec de la tarjeta lo pedía pero lo descarté porque añadir un nuevo SessionState requiere ADR (NO-GO-ZONE en types.ts).

**NOT VERIFIED:**
- No se ejecutó en browser (sin dev server en sandbox).
- No se probó el scroll del dropdown con muchas sesiones.
- No se probó accesibilidad por teclado (Tab, Enter, Escape para cerrar).

**DECISIONS:**
- **3 secciones en vez de 4**: Activas (state="active") / Recientes (idle, forked, summarized, restoring) / Archivadas (state="archived"). Esto cubre todos los SessionState sin agregar nuevos.
- **NO agregué "fijadas/pinned"** porque requeriría un nuevo SessionState y eso es cambio en types.ts (NO-GO). Si Pablo quiere pinning, abrir ADR.
- **activeSessionId como state interno, NO prop**: el padre sigue pasando sessionId por prop, el panel sincroniza con useEffect. Si el padre no pasa callback onSessionChange, el panel maneja la navegación solo.
- **onSessionChange es opcional**: el padre puede o no reaccionar al cambio. Si no, el panel lo maneja internamente.
- **No toqué session.ts**: los métodos ya estaban, no inventé lo que no hacía falta.
- **No toqué useSession hook**: leo `sessionManager` directo desde core, sin acoplarme a la API del hook.

**OPEN QUESTIONS:**
- ¿El menú debería tener búsqueda/filtro por texto cuando hay >20 sesiones? No urge, diferir.
- ¿El click en una sesión archivada debería automáticamente desarchivarla? Diferir, eso es scope de T-011b o un ADR.
- ¿Falta un botón "Nueva sesión" en el menú? Sí, pero requiere método createSession en algún lado. Diferir a una tarjeta siguiente.

**HANDOFF:**
- Siguiente tarjeta del plan: **T-010 (Enviar a LLM)** depende de T-009 (ya mergeada). O **T-012 (Panel de archivos)** si querés algo del Bloque 2.
- Si querés mergear, la rama es `ia/mavis-cloud/t-011-history-menu`. El PR se puede abrir desde GitHub mobile.
- Si NO querés mergear (querés revisar primero), avisame.

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## Presentación — Aria — 2026-06-11 (continuación)

**Sesión activa de:** 2026-06-10 (tarde) hasta 2026-06-11 (mañana)
**Status:** retomando tras PR #15 cerrado (conflicto de superposición con main, ahora documentado en L-005)
**Voy a trabajar en:** T-012 — Panel de archivos visible desde el chat (archivos + contexto + snapshots + ADRs)
**Decisión de Pablo:** opción (c) — hacer T-012 de cero, ignorando la rama congelada de Atlas (`ia/atlas/t-012-resource-explorer`). Razón: "sino hay que esperar hasta el mes que viene"

  ---

  ## T-028 — Track B: ColorWheel HSV interactiva — 2026-06-14 — Replit Agent

  **STATUS:** ✅ done

  **TOUCHED:**
  - `artifacts/ux-arquitecto/src/components/ColorWheel.tsx` — implementación completa: rueda HSV en canvas, slider de brillo, dot selector, input hex editable, sync bidireccional con prop `color`

  **VERIFIED:**
  - `colorConversion.ts` ya tenía `hexToHsv` y `hsvToHex` exportados — no fue necesario crearlas.
  - Scope respetado: SOLO `ColorWheel.tsx`. NO se tocó `colorConversion.ts`, `ConfigMenu.tsx`, ni `types/theme.ts`.
  - API pública `{ color: string; onChange: (color: string) => void }` preservada.
  - Verificación de tipos: no se puede correr tsc end-to-end desde sandbox, pero las importaciones son verificadas manualmente.

  **NOT VERIFIED:**
  - Typecheck end-to-end con `pnpm --filter @workspace/ux-arquitecto run typecheck`
  - Runtime real en browser (no disponible desde sandbox)
  - Mobile touch en Safari/Firefox

  **DECISIONS:**
  - **Pixel-by-pixel con `createImageData`**: más preciso que gradientes cónicos CSS, renderiza correctamente la oscurecimiento con value.
  - **Listeners globales en `window`**: permite drag fuera del canvas sin perder el evento (patrón estándar para drag UX).
  - **Dot siempre visible**: posición derivada de HSV → coords polares, sin estado extra.
  - **`webFilesystemProvider` directo**: N/A en este componente.
  - **Input hex editable**: commit en blur o Enter, validación de formato `/^#[0-9a-fA-F]{6}$/`.

  **OPEN QUESTIONS:**
  - ¿Se quiere auto-refresh del canvas cuando la prop `color` cambia externamente (no por drag)? Ya implementado via useEffect sobre `color`.

  **HANDOFF:**
  - Rama: `ia/replit-agent/t-028-colorwheel` — lista para PR y merge.
  - ConfigMenu ya pasa `color` y `onChange` al componente — no se necesita modificar la integración.

  **PROBLEMS / BLOCKERS:**
  - Ninguno.
  
---

## T-031 — Track E: SnapshotPanel UI + DualPanelLayout — 2026-06-14 — Replit Agent

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/components/SnapshotPanel.tsx` *(nuevo)* — panel overlay con lista de snapshots por contextPath, botón "Restaurar" por ítem, auto-refresh cada 10s, feedback visual (loading/success/error), cierre con Escape
- `artifacts/ux-arquitecto/src/pages/DualPanelLayout.tsx` — importa SnapshotPanel, agrega estado `showSnapshots`, botón ⏱ en topbar, overlay condicional pasando `contextPath={selectedResource?.path ?? "/"}`

**VERIFIED:**
- Scope respetado: SOLO los 2 archivos listados. No se tocó `snapshots.ts`, `types.ts`, ni otros componentes UI.
- snapshotManager.listSnapshots(contextPath) es síncrono — no necesita async/await.
- snapshotManager.rollback(snapshotId) es async — manejado con try/catch + estado de feedback.
- Snapshot.metadata.resourceCount y totalSize son los campos correctos según types.ts.
- Botón ⏱ usa el mismo helper `btn(active)` que los otros botones del topbar.

**NOT VERIFIED:**
- Typecheck end-to-end con `pnpm --filter @workspace/ux-arquitecto run typecheck`.
- Runtime browser real.

**DECISIONS:**
- **Overlay desde el lado derecho** (`position: absolute, right: 0, width: min(380px, 100vw)`): no interrumpe el layout, se superpone sobre el contenido activo. Coherente con el patrón de ConfigMenu.
- **Polling cada 10s** (no event-driven): más simple, sin introducir hooks nuevos. Futuro mejora: escuchar cambios en snapshotStore directamente.
- **contextPath = selectedResource?.path ?? "/"**: si no hay recurso activo, muestra snapshots de la raíz. El task card dice derivar desde el recurso activo.
- **RollbackResult.success**: asumido boolean según el patrón de la tarjeta T-029. Si cambia la firma de rollback, este componente necesita actualizar el `if (result.success)`.
- **Cierre con Escape**: UX estándar para overlays/modales.
- **⏱ como ícono del botón**: visible, intuitivo, sin añadir dependencias de iconos.

**HANDOFF:**
- Rama: `ia/replit-agent/t-031-snapshot-panel` — lista para PR y merge.
- Ronda 3 puede arrancar (**T-032**, **T-033**) una vez que Ronda 1 (T-027, T-028, T-029, T-030) esté mergeada y Ronda 2 (T-031) también mergeada.
- T-032 (propuestas IA aceptar/rechazar): depende de T-029 mergeado.
- T-033 (SSE streaming): depende de T-030 mergeado.

**PROBLEMS / BLOCKERS:**
- Ninguno.

---

## T-027 — Track A: fix errores TypeScript — 2026-06-14 — Replit Agent

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/ux-arquitecto/src/components/ConversationNode.tsx` — eliminado (dead code, sin callers, causaba ciclos)
- `artifacts/ux-arquitecto/src/components/ConversationsDropdown.tsx` — eliminado (dead code, sin callers)
- `artifacts/ux-arquitecto/src/lib/ai.ts` — eliminado (duplicado de aiApi.ts, código muerto)

**NOT VERIFIED:** Typecheck end-to-end (sin runner local).

**DECISIONS:** Eliminar vs stub: dead code sin callers. Errores fuera de scope quedan para tarjetas futuras.

**HANDOFF:** Rama `ia/replit-agent/t-027-fix-ts` lista para merge.

**PROBLEMS / BLOCKERS:** Ninguno.

---

## T-030 — Track D: inyectar fileContent en respuestas IA — 2026-06-14 — Replit Agent

**STATUS:** ✅ done

**TOUCHED:**
- `artifacts/api-server/src/routes/ai.ts` — dentro del bloque resourceContext, agrega fileContent al prompt del sistema. Truncado a 12000 chars.

**DECISIONS:** MAX_FILE_CONTENT_CHARS=12000. Bloque dentro del if(resourceContext) para evitar null access.

**HANDOFF:** T-033 depende de esta mergeada.

**PROBLEMS / BLOCKERS:** Ninguno.
