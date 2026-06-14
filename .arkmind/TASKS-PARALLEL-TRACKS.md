# 📋 Plan paralelo en tarjetas — `parallel-tracks` — 2026-06-14

> **Origen:** Pablo redactó un plan con 8 tracks (A-H) para trabajar en
> paralelo sin pisarse. Este archivo convierte cada track en una
> **tarjeta autocontenida** con scope explícito, para que una IA la
> tome y la ejecute sin tener que leer todo el plan.
>
> **Regla de paralelismo:** cada tarjeta declara sus **archivos exclusivos**
> (los que toca) y sus **archivos prohibidos** (los que NO toca, aunque
> estén en su track). Si una tarjeta necesita tocar un archivo prohibido,
> se reabre el plan, no se improvisa.

---

## 🗺️ Mapa de tracks → tarjetas

| ID | Qué | Prioridad | Depende de | Zona | Ronda |
|---|---|---|---|---|---|
| **T-026** | Pre-track: re-leer el repo y verificar ambiente | bloqueante | — | meta | 0 |
| **T-027** | Track A: fix de errores de TypeScript pre-existentes | ALTA | T-026 | frontend cleanup | 1 |
| **T-028** | Track B: ColorWheel HSV interactiva | MEDIA | T-026 | UI | 1 |
| **T-029** | Track C: Transaction.validate / execute reales | ALTA | T-026 | core | 1 |
| **T-030** | Track D: inyectar fileContent en respuestas IA (backend) | ALTA | T-026 | backend | 1 |
| **T-031** | Track E: SnapshotPanel UI + integración en DualPanelLayout | MEDIA | T-026 | UI | 2 |
| **T-032** | Track F: propuestas IA aceptar/rechazar (con transaccción real) | ALTA | T-029 | UI + core | 3 |
| **T-033** | Track G: AI streaming SSE (Mistral token por token) | BAJA | T-030 | backend + frontend | 3 |

**Notas:**
- **Track D del plan original era "contenido demo en EditorPanel" → DESCATADO.**
  Pablo confirmó que el demo se va. No se reemplaza por otro demo: si el
  filesystem real no está montado, EditorPanel no muestra contenido (o
  muestra un mensaje claro). No hay tarjeta T para el demo.
- Track E (SnapshotPanel) es **nuevo en este plan** y vale la pena hacerlo
  — es el panel que faltaba para visualizar y restaurar snapshots.
- Track G y Track H (que en el plan original se llamaban ambos) **se
  fusionaron en T-030**: el fix de inyectar fileContent (H) y el
  streaming SSE (G) van en tarjetas separadas pero relacionadas, con
  **T-030 antes que T-033** (T-030 es el fix del bug, T-033 es la mejora
  de UX que depende de T-030 mergeado).

---

## 🧭 Reglas generales (aplican a TODAS las tarjetas)

1. **Scope estricto.** Si tu tarjeta dice "toco A.tsx", no tocás B.tsx
   aunque sea del mismo feature. Si lo necesitás, **anotá en el PR** y
   avisá, no toques.
2. **No se tocan archivos raíz del monorepo** (`pnpm-workspace.yaml`,
   `tsconfig.base.json`, `package.json` raíz) salvo T-026 (pre-track) que
   puede verificar.
3. **Convenciones del codebase** (ver `CONVENTIONS.md` + este repo):
   - Strings de UI en español
   - Logging en backend con `req.log` (pino) — nunca `console.log`
   - Imports con `@/` dentro de `ux-arquitecto`
   - Estilos inline con `style={{ }}` — no Tailwind classes
   - Tipos explícitos, no `any` sin justificación
   - Archivos nuevos con header de comentario
4. **Verificación estándar al cerrar cada tarjeta:**
   ```bash
   pnpm --filter @workspace/ux-arquitecto run typecheck
   # o
   pnpm --filter @workspace/api-server run typecheck
   ```
   0 errores esperados en el scope tocado.
5. **Commit message:** `[ia:<handle>] [t-XXX] <tipo>: <descripción corta>`.
6. **Si te bloqueas:** wip commit, avisar. No improvisar.

---

## 🗓️ Orden de ejecución (rondas)

### Ronda 0 (una sola IA, antes de todo)
- **T-026** — pre-track (re-leer + verificar ambiente)

### Ronda 1 (cuatro IAs en paralelo)
- **T-027** Track A — fix TS (frontend)
- **T-028** Track B — ColorWheel (UI)
- **T-029** Track C — Transaction real (core)
- **T-030** Track D — fileContent injection (backend)

### Ronda 2 (después de R1 mergeada)
- **T-031** Track E — SnapshotPanel (UI)

### Ronda 3 (después de R2 mergeada)
- **T-032** Track F — propuestas IA (requiere T-029 mergeado)
- **T-033** Track G — streaming SSE (requiere T-030 mergeado)

---

## T-026 — Pre-track: re-leer el repo y verificar ambiente

**TAREA:** antes de empezar cualquier track, **verificar el estado del repo** y
asegurarse de que el ambiente (`pnpm install`, typecheck, dev server) corre.
Esta tarjeta NO produce código. Produce un **informe corto de "estamos
listos"** o "estos son los bloqueos".

**MÓDULO ASIGNADO:** meta

**LECTURA OBLIGATORIA (en este orden):**
1. `.arkmind/AXIOMS.md` *(v a1.1)*
2. `.arkmind/CONVENTIONS.md` *(v a4.1)*
3. `.arkmind/NO-GO-ZONES.md` *(v a1.0)*
4. `.arkmind/STATE.json`
5. `artifacts/ux-arquitecto/src/core/types.ts` (chequear modelo)
6. `artifacts/ux-arquitecto/src/core/snapshots.ts`
7. `artifacts/ux-arquitecto/src/core/transactions.ts`
8. `artifacts/ux-arquitecto/src/core/filesystem.ts`
9. `artifacts/ux-arquitecto/src/utils/colorConversion.ts`
10. `artifacts/api-server/src/routes/ai.ts` (si vas a tocar backend)
11. `artifacts/ux-arquitecto/src/lib/aiApi.ts`

**ACCIONES:**
1. `git fetch --all --prune` y `git status` — ¿hay cambios sin commitear?
2. `pnpm install` (con el lockfile actual).
3. `pnpm --filter @workspace/ux-arquitecto run typecheck` → ¿cuántos errores
   hay **hoy**? Anotalo. Si ya hay errores pre-existentes, T-027 los va a
   reducir (no a 0 necesariamente, hay un plan).
4. `pnpm --filter @workspace/api-server run typecheck` → idem.
5. Levantar el dev server brevemente: `pnpm --filter ux-arquitecto dev`.
   ¿Arranca? ¿Hay warnings críticos en consola?
6. Releer cada uno de los archivos exclusivos del track que vas a tomar.
   Si encontrás algo que el plan da por hecho pero no es así (ej: un
   import roto, un helper que no existe), **anotalo como "ajuste al plan"**
   en el PR.

**ENTREGABLE:**
- Un comentario en este archivo (o en `PROGRESS.md`) con el informe:
  - Estado de `pnpm install`: ✅/❌
  - Errores TS en ux-arquitecto: N
  - Errores TS en api-server: M
  - Dev server arranca: ✅/❌
  - Ajustes al plan encontrados: lista o "ninguno"

**PRESUPUESTO:** 20-30 min. Si te trabás más, avisá.

**NOTAS:**
- Esta tarjeta **no commitea nada al runtime** — solo deja el diagnóstico
  en PROGRESS o como comentario. No abrá un PR.
- Si los errores TS pre-existentes son MUCHOS (>20), T-027 puede ser
  más grande de lo esperado. Ajustar la tarjeta en el momento.

---

## T-027 — Track A: fix de errores TypeScript pre-existentes

**TAREA:** eliminar los errores TS pre-existentes listados en el plan
original:
- `ConversationNode.tsx` y `ConversationsDropdown.tsx` con circular imports
- `artifacts/ux-arquitecto/src/lib/ai.ts` que importa `express` (archivo
  backend en el frontend)

**MÓDULO ASIGNADO:** frontend cleanup

**DEPENDENCIA:** T-026 cerrada (saber el estado base).

**LECTURA OBLIGATORIA (adicional a T-026):**
- El informe de T-026 (cuántos errores TS hay hoy, cuáles)
- `grep -r "ConversationNode" artifacts/ux-arquitecto/src` — para ver quién
  lo importa
- `grep -r "ConversationsDropdown" artifacts/ux-arquitecto/src` — ídem
- `grep -r "from \"@/lib/ai\"" artifacts/ux-arquitecto/src` — para ver
  quién importa `lib/ai.ts` (probablemente nada, hay que eliminarlo)

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ConversationNode.tsx`
✅ `artifacts/ux-arquitecto/src/components/ConversationsDropdown.tsx`
✅ `artifacts/ux-arquitecto/src/lib/ai.ts`

**ARCHIVOS QUE NO SE TOCAN (incluso si parecen relacionados):**
❌ `artifacts/ux-arquitecto/src/lib/aiApi.ts` (NO se fusiona con `lib/ai.ts` —
   son archivos distintos, este está bien)
❌ `artifacts/api-server/src/routes/ai.ts` (backend)
❌ Cualquier manager en `core/`
❌ `types.ts`

**ACCIONES:**
1. Para `ConversationNode.tsx` y `ConversationsDropdown.tsx`:
   - Releer el archivo completo.
   - Si el componente real existe en otro path, corregir el re-export al
     path correcto.
   - Si NO existe, crear un componente mínimo (un wrapper que devuelva
     `null` con un `console.warn` para detectar uso).
   - Si el archivo solo se importa de sí mismo y nadie más lo usa,
     eliminar el archivo (mejor que tener un stub silencioso).
2. Para `artifacts/ux-arquitecto/src/lib/ai.ts`:
   - `grep -r "from.*lib/ai" artifacts/ux-arquitecto/src` para ver si
     alguien lo importa.
   - Si nadie lo importa: **eliminar el archivo** (es código muerto).
   - Si alguien lo importa: reemplazar el import con el equivalente
     de `@/lib/aiApi` (o el helper correcto que exista).

**ENTREGABLE:**
- Rama: `ia/<handle>/t-027-fix-ts`
- 1 chore commit (puede ser 2 si conviene separar "fix components" de
  "remove dead file")
- Push + PR
- Entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
```
Esperado: 0 errores relacionados a los 3 archivos. (El total puede no
ser 0 absoluto — pueden quedar otros errores de T-027 o de otros
tracks que aún no se tocaron.)

**PRESUPUESTO:** 30 min. Si los componentes no existen y hay que
crearlos, se puede extender a 1 hora. No más.

**NOTAS:**
- **No se rehacen los componentes desde cero.** Si existen en otro lado,
  se apunta el re-export. Si no existen, se hace un stub mínimo.
- Si T-026 reportó errores distintos a los 3 del plan, **NO los arregles
  en esta tarjeta** (sería scope creep). Anotalos y avisá para que se
  cree otra tarjeta o se extienda T-027.

---

## T-028 — Track B: ColorWheel HSV interactiva

**TAREA:** implementar el ColorWheel HSV completo (rueda + slider de brillo)
en `ColorWheel.tsx`. Hoy está esqueleto (canvas + slider renderizados pero
sin lógica).

**MÓDULO ASIGNADO:** UI

**DEPENDENCIA:** T-026 cerrada.

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/ux-arquitecto/src/utils/colorConversion.ts` — qué funciones
  exporta (hexToHsv, hsvToHex). Si no existen, **abrir sugerencia en
  SUGGESTIONS.md y no implementar esta tarjeta** (es bloqueante).
- `artifacts/ux-arquitecto/src/types/theme.ts` — tipo Theme, qué prop
  recibe ColorWheel.
- `artifacts/ux-arquitecto/src/components/ConfigMenu.tsx` — para entender
  cómo se usa ColorWheel hoy y qué prop `color` / `onChange` espera.

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ColorWheel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `artifacts/ux-arquitecto/src/utils/colorConversion.ts` (solo se importa)
❌ `ConfigMenu.tsx` (la integración queda para otra tarjeta si hace falta)
❌ `types/theme.ts`
❌ `core/*`

**ACCIONES (resumen — el detalle en el plan original):**
1. Rueda HSV en canvas (160×160): dibujar con `useEffect`, algoritmo
   HSV→RGB, capa de oscurecimiento con `value`, dot selector.
2. Interacción: `onMouseDown` / `onTouchStart` en el canvas, listeners
   globales en `window` para drag, clampear distancia al radio.
3. Slider de brillo: gradiente negro→color HSV puro, click en X → V.
4. Estado interno: `const [hsv, setHsv] = useState(...)` con sync al prop.
5. Input hex editable: `<input type="text">` con blur/enter → HSV.
6. Usar `hexToHsv` y `hsvToHex` de `utils/colorConversion.ts`.

**ENTREGABLE:**
- Rama: `ia/<handle>/t-028-colorwheel`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
```
Manual: abrir ConfigMenu → ColorWheel muestra rueda coloreada, drag
funciona, slider cambia brillo, input hex editable.

**PRESUPUESTO:** 1.5-2 horas. Si ya hay experiencia con canvases, 1 hora.

**NOTAS:**
- Si `colorConversion.ts` no tiene las funciones necesarias, **abrir
  SUGGESTIONS.md** y frenar la tarjeta. No implementar a mano las
  conversiones (sería scope creep + bug magnet).
- **Mobile first**: el plan menciona `onTouchStart`. Asegurarse de
  que el `useCallback` + listeners globales funcione en mobile.

---

## T-029 — Track C: Transaction.validate / execute reales

**TAREA:** hacer que `TransactionManager` realmente valide y ejecute
operaciones, no que siempre devuelva `true`.

**MÓDULO ASIGNADO:** core

**DEPENDENCIA:** T-026 cerrada.

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/ux-arquitecto/src/core/filesystem.ts` — para entender
  `filesystemManager.isReady()` y `writeFile()`.
- `artifacts/ux-arquitecto/src/core/opJournal.ts` — para entender cómo
  se loguea una operación.
- `artifacts/ux-arquitecto/src/components/EditorPanel.tsx` — para
  entender cómo se invoca el flujo de transacciones desde la UI.
- `artifacts/ux-arquitecto/src/core/types.ts` — `FileSystemOperation`.

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/core/transactions.ts`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/filesystem.ts` (solo se importa)
❌ `core/opJournal.ts` (solo se invoca)
❌ `core/snapshots.ts` (el rollback se invoca, no se modifica)
❌ `core/types.ts` (NO-GO general)
❌ `EditorPanel.tsx` (la integración ya está)
❌ Cualquier UI

**ACCIONES (resumen — el detalle en el plan original):**
1. Importar `filesystemManager`.
2. Agregar `pendingOperations: Map<string, FileSystemOperation>` privado.
3. Agregar método `attachOperation(transactionId, op)`.
4. Implementar `validateTransaction()`:
   - `read` → chequear `filesystemManager.isReady()`
   - `write`/`create` → chequear que hay op con `content`
   - `delete` → chequear que `targetPath` no sea vacío
   - Actualizar `status = "validated"` o `"failed"`
5. Implementar `executeTransaction()`:
   - Buscar op pendiente
   - Si write/create: `filesystemManager.writeFile(op.sourcePath, op.content)`
   - Si delete: `console.warn` (filesystemManager no tiene `deleteFile`
     todavía — eso es otra tarjeta, no se implementa acá)
   - Si éxito: `status = "executed"`, `executedAt = Date.now()`,
     log en opJournal
   - Si falla: `await this.rollbackTransaction(transactionId)`

**ENTREGABLE:**
- Rama: `ia/<handle>/t-029-tx-real`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
```
Manual: abrir un archivo real con EditorPanel → editar → save → el archivo
en disco cambió. Si la IA está configurada y la edición pasa por ahí,
verificar que la transacción se ejecutó (no solo quedó "executed" sin
escribir nada).

**PRESUPUESTO:** 1-1.5 horas.

**NOTAS:**
- **No agregar `deleteFile` a filesystemManager en esta tarjeta.** Si no
  existe, se loguea warning y se sigue. Otra tarjeta (futura) lo
  implementará.
- **No tocar el `addMessage` / `addProposal` / `fork` que ya existen.**
  Esta tarjeta es SOLO validate + execute.

---

## T-030 — Track D: inyectar fileContent en respuestas IA (backend)

**TAREA:** hacer que el backend de IA (`/api/ai/message`) incluya el
`fileContent` del `resourceContext` en el prompt del sistema, para que la
IA "vea" el archivo activo.

**MÓDULO ASIGNADO:** backend

**DEPENDENCIA:** T-026 cerrada. **Esta tarjeta debe mergear ANTES que T-033**
(streaming) porque T-033 parte del código de T-030.

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/api-server/src/routes/ai.ts` completo (especialmente el
  bloque `if (resourceContext && resourceContext.name)`).
- `artifacts/ux-arquitecto/src/lib/aiApi.ts` — para entender qué se
  manda en el body de la request (`SendMessageParams`).
- `artifacts/api-server/src/app.ts` — cómo se monta la ruta.

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/api-server/src/routes/ai.ts`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `artifacts/ux-arquitecto/src/lib/aiApi.ts` (frontend)
❌ `artifacts/ux-arquitecto/src/lib/ai.ts` (ese es backend-copia-en-frontend,
   tema de T-027)
❌ Otros routers
❌ `app.ts`

**ACCIONES:**
1. Dentro del bloque `if (resourceContext && resourceContext.name)`,
   **después** de inyectar el mensaje de contexto de recurso, agregar:
   ```ts
   if (resourceContext.fileContent && typeof resourceContext.fileContent === "string" &&
       resourceContext.fileContent.trim().length > 0) {
     const MAX_FILE_CONTENT_CHARS = 12000;
     const content = resourceContext.fileContent.length > MAX_FILE_CONTENT_CHARS
       ? resourceContext.fileContent.slice(0, MAX_FILE_CONTENT_CHARS) +
         `\n\n[... contenido truncado — el archivo tiene ${resourceContext.fileContent.length} caracteres en total]`
       : resourceContext.fileContent;
     systemMessages.push({
       role: "system",
       content: `Contenido actual del archivo "${resourceContext.name}":\n\`\`\`\n${content}\n\`\`\`\nUsá este contenido como referencia directa cuando el usuario haga preguntas o pida cambios sobre él.`,
     });
   }
   ```
2. **Truncar a 12000 caracteres** con el mensaje "contenido truncado".

**ENTREGABLE:**
- Rama: `ia/<handle>/t-030-filecontent-injection`
- 1 fix commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/api-server run typecheck
```
Manual: abrir un archivo real → preguntar a la IA "¿qué hace este
archivo?" → la IA debe responder con información específica del contenido.

**PRESUPUESTO:** 30 min - 1 hora. Es un fix puntual.

**NOTAS:**
- **T-033 (streaming) usa este mismo archivo.** Si T-033 arranca
  mientras T-030 está mergeada pero no incorporada, hay conflicto.
  Solución: T-030 se mergea primero, T-033 parte de la nueva versión.
- El `MAX_FILE_CONTENT_CHARS = 12000` es arbitrario. Si Pablo quiere
  otro valor, ajustar antes.

---

## T-031 — Track E: SnapshotPanel UI

**TAREA:** crear `SnapshotPanel.tsx` y agregarlo como overlay en
`DualPanelLayout.tsx`. El panel muestra el historial de snapshots del
contexto actual con botón "Restaurar" por cada uno.

**MÓDULO ASIGNADO:** UI

**DEPENDENCIA:** T-026 cerrada. (Ronda 2 — independiente de T-027 a T-030.)

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — para entender
  `snapshotManager.listSnapshots(contextPath)` y
  `snapshotManager.rollback(snapshotId)`.
- `artifacts/ux-arquitecto/src/pages/DualPanelLayout.tsx` — para ver
  dónde insertar el botón del topbar y el overlay.
- `artifacts/ux-arquitecto/src/types/theme.ts` — tipo Theme.

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/SnapshotPanel.tsx` *(nuevo)*
✅ `artifacts/ux-arquitecto/src/pages/DualPanelLayout.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/snapshots.ts` (se invoca, no se modifica)
❌ `core/types.ts`
❌ Otros componentes UI

**ACCIONES (resumen — el detalle en el plan original):**
1. Crear `SnapshotPanel.tsx`:
   - Props: `{ theme, contextPath, onClose }`
   - Estado: `snapshots: Snapshot[]` cargado vía `useEffect`
   - Header con botón cerrar (×)
   - Lista de snapshots: label, timestamp formateado,
     `metadata.resourceCount`, `metadata.totalSize` en KB
   - Botón "Restaurar" por snapshot → `snapshotManager.rollback(id)` →
     mostrar resultado (success/error)
   - Si lista vacía: "No hay snapshots para este contexto"
   - Auto-refresh: `setInterval` cada 10s (o lo que Pablo prefiera)
2. Modificar `DualPanelLayout.tsx`:
   - Estado `const [showSnapshots, setShowSnapshots] = useState(false)`
   - Botón "⏱" en el topbar (junto a los otros)
   - Overlay (`position: absolute, zIndex: 50`) cuando `showSnapshots`
   - Pasar `contextPath={selectedResource?.path ?? "/"}` y
     `onClose={() => setShowSnapshots(false)}`

**ENTREGABLE:**
- Rama: `ia/<handle>/t-031-snapshot-panel`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
```
Manual: botón ⏱ en topbar → abrir panel → ver lista (puede estar vacía)
→ crear un snapshot (con el flujo que ya exista) → reabrir panel →
el snapshot aparece → click "Restaurar" → el archivo vuelve al estado.

**PRESUPUESTO:** 1.5-2 horas. Componente nuevo + integración.

**NOTAS:**
- El plan original decía "setInterval cada 10 segundos". Si Pablo
  prefiere event-driven (escuchar cambios en `snapshotStore`), se puede
  hacer, pero requiere hook nuevo — dejar para otra tarjeta.
- El `contextPath` que se pasa al panel debería ser el del **contexto
  activo del workspace** (no el del resource). Si `selectedResource`
  tiene `path`, derivar `contextPath` desde ahí. Si no, usar `"/"`.

---

## T-032 — Track F: propuestas IA aceptar/rechazar

**TAREA:** los botones "Aceptar" / "Rechazar" en propuestas IA hoy solo
hacen `console.log`. Conectarlos al flujo de transacciones real.

**MÓDULO ASIGNADO:** UI + core

**DEPENDENCIA:** **T-029 mergeada** (necesita `attachOperation` y el
`executeTransaction` real para que la propuesta realmente persista).

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/ux-arquitecto/src/components/ConversationPanel.tsx` — para
  ver dónde están los botones y qué handler tienen hoy.
- `artifacts/ux-arquitecto/src/core/transactions.ts` (versión post T-029)
  — para usar `attachOperation` y `executeTransaction`.

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ConversationPanel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/transactions.ts` (versión post T-029, no se vuelve a tocar)
❌ `core/types.ts`
❌ `ChatPanel.tsx`, `EditorPanel.tsx`, otros componentes

**ACCIONES (resumen — el detalle en el plan original):**
1. Importar `transactionManager`.
2. Implementar `handleAcceptProposal(msg)`:
   - Extraer contenido propuesto de `msg.proposal?.content` o `msg.content`
   - `transactionManager.createTransaction("write", activeResource.path)`
   - `transactionManager.attachOperation(txn.id, { type: "write", sourcePath, content })`
   - `transactionManager.executeTransaction(txn.id)` y `confirmTransaction`
   - Mensaje al chat de "✓ Propuesta aplicada" o "✗ No se pudo aplicar"
3. Implementar `handleRejectProposal(msg)`:
   - Mensaje al chat de "Propuesta rechazada"
4. Conectar ambos handlers a los botones (reemplazar el `console.log`).

**ENTREGABLE:**
- Rama: `ia/<handle>/t-032-proposal-actions`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
```
Manual: pedir a la IA "proponé un cambio al archivo activo" → aparece
propuesta con botones → click Aceptar → archivo actualizado en disco
(o mensaje de "modo demo" si no hay filesystem real) + mensaje de
confirmación en el chat.

**PRESUPUESTO:** 1-1.5 horas.

**NOTAS:**
- Si T-029 NO está mergeada cuando T-032 arranca, **frenar**. No
  improvisar con un fallback temporal (queda deuda).
- `sendSessionMessage` es del hook `useSession`. Si la firma es
  distinta, ajustar — pero está en el plan.

---

## T-033 — Track G: AI streaming SSE

**TAREA:** convertir el endpoint `/api/ai/message` a Server-Sent Events
para que las respuestas de Mistral lleguen token por token.

**MÓDULO ASIGNADO:** backend + frontend

**DEPENDENCIA:** **T-030 mergeada** (esta tarjeta parte del código de
T-030 en `ai.ts`).

**LECTURA OBLIGATORIA (adicional a T-026):**
- `artifacts/api-server/src/routes/ai.ts` (versión post T-030)
- `artifacts/ux-arquitecto/src/lib/aiApi.ts` — para agregar la nueva
  función `streamMessageFromAI`
- `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` — para ver
  dónde se llama `sendMessageToAI` y reemplazarlo

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/api-server/src/routes/ai.ts`
✅ `artifacts/ux-arquitecto/src/lib/aiApi.ts`
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `artifacts/api-server/src/app.ts`
❌ `core/*`
❌ `ConversationPanel.tsx`
❌ Otros componentes

**ACCIONES (resumen — el detalle en el plan original):**
1. Backend `ai.ts`: agregar ruta `POST /api/ai/stream` con headers SSE,
   `stream: true` en el body a Mistral, pipe del reader al response.
2. Frontend `aiApi.ts`: agregar `streamMessageFromAI(params, onToken, onDone, onError)`.
3. Frontend `ChatPanel.tsx`: importar `streamMessageFromAI`, agregar
   estado `streamingContent`, mostrar bubble que se va actualizando,
   commitear mensaje final al historial al recibir `[DONE]`.

**ENTREGABLE:**
- Rama: `ia/<handle>/t-033-sse-streaming`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
```bash
pnpm --filter @workspace/ux-arquitecto run typecheck
pnpm --filter @workspace/api-server run typecheck
```
Manual: enviar mensaje → texto de la IA aparece letra por letra →
indicador "Procesando" desaparece apenas llega el primer token →
respuesta final guardada en el historial.

**PRESUPUESTO:** 2-3 horas. SSE bien hecho no es trivial.

**NOTAS:**
- T-030 ya modificó `ai.ts`. **Hacer rebase** al arrancar para tener la
  versión con `fileContent` antes de agregar `/stream`.
- **Mantener la ruta original `/api/ai/message`** (no se elimina). La
  nueva `/stream` es adicional, no reemplazo.

---

## Resumen de zonas (para no pisarse)

| Tarjeta | Archivos exclusivos | Archivos prohibidos (en su scope) |
|---|---|---|
| T-026 | (ninguno, solo lectura) | todos |
| T-027 | ConversationNode, ConversationsDropdown, lib/ai | lib/aiApi, api-server |
| T-028 | ColorWheel.tsx | colorConversion.ts, ConfigMenu |
| T-029 | transactions.ts | filesystem, opJournal, snapshots, types |
| T-030 | api-server/src/routes/ai.ts | api-server/src/app.ts, lib/aiApi |
| T-031 | SnapshotPanel, DualPanelLayout | snapshots.ts, types/theme, otros UI |
| T-032 | ConversationPanel | transactions.ts, types |
| T-033 | api-server/src/routes/ai.ts, lib/aiApi, ChatPanel | app.ts, ConversationPanel |

**Conflictos conocidos:** T-030 y T-033 tocan el mismo archivo
(`ai.ts`). Solución: T-030 se mergea primero, T-033 arranca con
`git pull` + rebase.

---

*Tarjetas redactadas por Mavis@cloud el 2026-06-14, basadas en el plan paralelo de Pablo del mismo día. Demo descartado por indicación explícita. Cada tarjeta es autocontenida y puede ser tomada por una IA distinta en paralelo.*
