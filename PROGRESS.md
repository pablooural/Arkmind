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

## op-journal — Operation Journal con persistencia IndexedDB — 2026-06-02 — Manus

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
