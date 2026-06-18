# 📋 Tarjetas — `file-input` (subir / crear archivos en el chat) — 2026-06-17

> **Origen:** Pablo pidió poder subir archivos (.zip e imágenes) y crear
> archivos nuevos desde un botón `+` en el chat. Después de charlar el
> alcance, quedaron 3 tarjetas autocontenidas con scope explícito.

---

## 🗺️ Resumen

| ID | Qué | Tamaño | Dep |
|---|---|---|---|
| **T-037** | Botón `+` con menú dropdown (base UI) | chico | — |
| **T-038** | Subir archivo local (.zip + imágenes) → enchufa al chat + abre en editor | mediano | T-037 |
| **T-039** | Crear archivo nuevo (deshabilitado hasta filesystem montado) | mediano | T-037 |

**Nota:** T-038 y T-039 son **independientes entre sí** (tocan partes
distintas del código). Pero como ambas modifican `ChatPanel.tsx`, mejor
que las tome **una sola IA en secuencia** (T-038 primero, después T-039).
Así no hay pisadas entre tarjetas.

---

## 🧭 Reglas comunes (aplican a las 3)

1. **Posición del botón `+`:** a la **izquierda** del input del chat.
   **Enviar** sigue a la **derecha** del input. Cada uno en su extremo.
2. **Estilo visual:** coherente con los botones existentes (mismo tamaño,
   mismo `theme.accent` como color base, mismo `opacity 0.7` en hover).
3. **Sin tocar `core/*`** salvo T-038/T-039 si necesitan un helper
   específico (en ese caso, abrir ADR o nota en el PR).
4. **Sin tocar `types.ts`** salvo que aparezca un nuevo tipo de
   `StructuredMessage` estrictamente necesario. Si aparece, abrir ADR.
   Por ahora, **usar tipo `text` con metadata inline** (JSON en el
   `content`) para no contaminar `types.ts`.
5. **Strings de UI en español**, estilos inline con `style={{ }}`.
6. **Verificación:** `pnpm --filter @workspace/ux-arquitecto run typecheck`
   + test manual del flujo.

---

## T-037 — Botón `+` con menú dropdown (base UI)

**TAREA:** agregar un botón `+` a la izquierda del input del chat, que al
click abra un dropdown con 2 opciones deshabilitadas ("Subir archivo",
"Crear archivo"). Las opciones no hacen nada en esta tarjeta — solo
muestran el lugar. Las próximas tarjetas (T-038, T-039) las activan.

**MÓDULO ASIGNADO:** UI

**DEPENDENCIA:** ninguna.

**LECTURA OBLIGATORIA:**
- `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` (especialmente
  el bloque del input/textarea — líneas cerca de 789)
- `artifacts/ux-arquitecto/src/components/ConfigMenu.tsx` o similar
  para ver el patrón de dropdown existente (si hay)
- `.arkmind/LEARNINGS.md` para convenciones de estilo

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*`
❌ `types.ts`
❌ Otros componentes UI
❌ `EditorPanel.tsx` (la integración con el editor es T-038/T-039)

**ACCIONES:**
1. Agregar state local:
   ```ts
   const [plusMenuOpen, setPlusMenuOpen] = useState(false);
   ```
2. Agregar el botón `+` a la izquierda del `<textarea>`. Estilo coherente
   con los otros botones del chat. `aria-label="Adjuntar archivo"`.
3. Al click del botón: toggle `setPlusMenuOpen(true)`.
4. Renderizar un dropdown cuando `plusMenuOpen === true`:
   - Posición: absoluto, debajo del botón `+`, alineado a la izquierda.
   - 2 opciones:
     - "📎 Subir archivo" — `disabled`, `opacity 0.5`, mensaje tooltip
       "Próximamente: T-038"
     - "📄 Crear archivo" — `disabled`, `opacity 0.5`, mensaje tooltip
       "Próximamente: T-039"
5. Click fuera del menú: `setPlusMenuOpen(false)` (listener global en
   `useEffect`, mismo patrón que T-011).
6. Cierre con `Escape`.

**ENTREGABLE:**
- Rama: `ia/<handle>/t-037-plus-button`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
- `pnpm --filter @workspace/ux-arquitecto run typecheck` → 0 errores
- Manual: abrir chat → ver botón `+` a la izquierda del input → click
  → ver dropdown con 2 opciones deshabilitadas → click fuera o Escape
  → se cierra.

**PRESUPUESTO:** 30-45 min.

**NOTAS:**
- **El tooltip con "Próximamente: T-038/T-039" es aceptable** — cuando
  esas tarjetas se hagan, se reemplazan las opciones deshabilitadas
  por handlers reales. Pero **NO dejar el tooltip permanente** —
  cambiarlo por una versión final del label.
- Si ves que el dropdown necesita posicionarse fixed vs absolute, usar
  el que sea más consistente con ConfigMenu u otros dropdowns
  existentes.

---

## T-038 — Subir archivo local (.zip + imágenes) → enchufa al chat + abre en editor

**TAREA:** activar la opción "Subir archivo" del menú de T-037.
- Acepta archivos `.zip` e imágenes (`.jpg`, `.png`, `.gif`, `.webp`,
  `.svg`).
- Al subir, **se enchufa al chat** (queda como mensaje visible con
  preview) **Y se abre en el EditorPanel** (el archivo queda activo
  para editar).

**MÓDULO ASIGNADO:** UI

**DEPENDENCIA:** T-037 mergeada.

**LECTURA OBLIGATORIA (adicional a T-037):**
- `artifacts/ux-arquitecto/src/components/EditorPanel.tsx` — para ver
  cómo se le pasa el archivo activo (probablemente `resource: ResourceNode`
  como prop, o un callback desde el padre)
- `artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts` — `writeFile`
  para persistir el archivo subido al filesystem montado (si está listo)
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — para crear un
  snapshot automático antes de cualquier upload (rollback seguro)

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*` (todo el manejo de archivos va via `webFilesystemProvider`)
❌ `types.ts` (usar `StructuredMessage` tipo `text` con metadata inline)
❌ `EditorPanel.tsx` (la integración es por callback o por cambio de
   prop en el padre — eso lo maneja el padre, no el editor)

**ACCIONES:**
1. Reemplazar la opción deshabilitada "Subir archivo" por un botón real.
2. Al click, abrir el picker:
   ```html
   <input
     type="file"
     accept=".zip,image/*"
     style={{ display: "none" }}
     ref={fileInputRef}
     onChange={handleFileSelected}
   />
   ```
3. Handler `handleFileSelected(e)`:
   - Leer el archivo con `FileReader`:
     - Si es imagen: `readAsDataURL(file)` → preview inline `<img>`
     - Si es .zip: `readAsArrayBuffer(file)` → mensaje "📦 zip subido:
       nombre.zip (X MB)"
     - Otro: ignorar (no entra en el scope de esta tarjeta)
   - Calcular tamaño formateado (KB / MB).
4. Si `webFilesystemProvider.isReady()`:
   - Llamar a `writeFile(path, content)` para persistir (solo para
     archivos no-zip; los zips quedan como blob en IDB en otra tarjeta).
   - Crear un snapshot automático antes (vía `snapshotManager.createSnapshot`).
   - **Notificar al padre para que el EditorPanel se abra** en ese
     archivo. Si el padre pasa `onResourceChange` o similar como prop,
     usarlo. Si no, abrir nota en el PR y dejar T-040 para después.
5. Si NO está listo el filesystem:
   - Mostrar mensaje inline (no alert): "💡 Archivo leído en memoria.
     Abrí una carpeta para guardarlo en disco."
   - El archivo queda visible en el chat pero no se persiste.
6. Cerrar el menú `+` después del upload exitoso.

**ENTREGABLE:**
- Rama: `ia/<handle>/t-038-upload-files`
- 1 feat commit (puede ser 2 si conviene separar upload de zip vs imagen)
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
- `pnpm --filter @workspace/ux-arquitecto run typecheck` → 0 errores
- Manual:
  - Subir un .jpg → ver preview inline en el chat
  - Subir un .zip → ver mensaje "zip subido: X MB"
  - Con filesystem montado → el archivo aparece en `webFilesystemProvider`
  - Sin filesystem → mensaje "leído en memoria"

**PRESUPUESTO:** 1.5-2 horas (incluye integración con EditorPanel).

**NOTAS:**
- **No abrir T-040 antes de mergear T-038.** Si la integración con
  EditorPanel requiere cambios en el padre (DualPanelLayout), **esa
  parte es T-040** y va en otra tarjeta. T-038 deja la integración
  lista (callback, prop, o lo que sea) y T-040 la conecta.
- **No persistir .zip al filesystem** en esta tarjeta. Los zips se
  manejan distinto (quedarían como blob en IDB). Eso es otra tarjeta
  futura.
- Si el `accept=".zip,image/*"` no funciona en todos los browsers
  (Firefox es picky con `image/*`), usar una lista explícita:
  `.zip,.jpg,.jpeg,.png,.gif,.webp,.svg`.

---

## T-039 — Crear archivo nuevo (deshabilitado hasta filesystem montado)

**TAREA:** activar la opción "Crear archivo" del menú de T-037.
- Solo se habilita cuando `webFilesystemProvider.isReady()` devuelve
  `true`.
- Si no está montado, la opción se muestra **deshabilitada** (opacity
  baja, sin handler) con un tooltip explicativo.
- Al click (cuando está habilitado): mini-form inline con nombre +
  tipo → crea el archivo en el filesystem → abre en el EditorPanel.

**MÓDULO ASIGNADO:** UI

**DEPENDENCIA:** T-037 mergeada.

**LECTURA OBLIGATORIA (adicional a T-037):**
- `artifacts/ux-arquitecto/src/components/EditorPanel.tsx` — cómo se
  activa un archivo nuevo
- `artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts` — `writeFile`
- `artifacts/ux-arquitecto/src/core/snapshots.ts` — para crear snapshot
  antes de crear archivo (rollback seguro)

**ARCHIVOS A TOCAR (exclusivos):**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*`
❌ `types.ts`
❌ `EditorPanel.tsx`
❌ Padre (DualPanelLayout) — la integración con editor va en T-040
❌ `webFilesystemProvider` — solo se invoca `isReady()` y `writeFile()`

**ACCIONES:**
1. Importar `webFilesystemProvider` desde `@/core`.
2. Computar `const fsReady = webFilesystemProvider.isReady()` — esto se
   puede llamar al render (es síncrono, devuelve boolean).
3. Reemplazar la opción deshabilitada estática por una opción dinámica:
   ```ts
   <button
     disabled={!fsReady}
     title={fsReady ? "Crear archivo en el workspace" : "Abrí una carpeta primero (botón Explorar)"}
     style={{ opacity: fsReady ? 1 : 0.5, cursor: fsReady ? "pointer" : "not-allowed" }}
     onClick={fsReady ? handleStartCreate : undefined}
   >
     📄 Crear archivo
   </button>
   ```
4. Handler `handleStartCreate()`:
   - Reemplaza el dropdown por un mini-form inline:
     - Input de nombre (con auto-extensión si el usuario escribe sin punto).
     - Selector de tipo (texto / imagen) o se infiere de la extensión.
     - Botón "Crear" + botón "Cancelar".
   - Validación mínima: nombre no vacío, sin caracteres raros (`/`, `\`,
     `..`, etc.).
5. Al confirmar el form:
   - Llamar `webFilesystemProvider.writeFile(path, "")` (archivo vacío).
   - Llamar `snapshotManager.createSnapshot(...)` antes, para rollback
     seguro.
   - **Notificar al padre** para que EditorPanel se abra (mismo
     mecanismo que T-038 — si no está listo, abrir nota en PR).
   - Cerrar el form.
6. Si el filesystem se desmonta durante el form: mostrar mensaje
   "filesystem perdido, intentá de nuevo".

**ENTREGABLE:**
- Rama: `ia/<handle>/t-039-create-file`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**VERIFICACIÓN:**
- `pnpm --filter @workspace/ux-arquitecto run typecheck` → 0 errores
- Manual:
  - Sin filesystem: la opción está deshabilitada, tooltip claro.
  - Con filesystem: opción habilitada → click → form → escribir nombre
    → "Crear" → archivo aparece en el filesystem → EditorPanel se abre
    (o queda pendiente para T-040).

**PRESUPUESTO:** 1-1.5 horas.

**NOTAS:**
- **El form debe ser inline** (no modal), para coherencia con el estilo
  del chat (mensajes inline, dropdown inline).
- **No crear directorios intermedios.** Si el usuario escribe `src/utils/foo.ts`
  y la carpeta `src/utils/` no existe, mostrar error claro. Crear
  directorios es otra tarjeta.
- **Auto-extensión**: si el usuario escribe `App` (sin `.tsx`), agregar
  `.tsx` por default. Si escribe `algo.xyz`, respetar como está.

---

## Resumen de zonas (para no pisarse)

| Tarjeta | Toca | NO toca |
|---|---|---|
| T-037 | ChatPanel.tsx (solo el bloque del input + nuevo botón `+`) | todo lo demás |
| T-038 | ChatPanel.tsx (handler de upload + render de preview) | core/*, types.ts, EditorPanel.tsx |
| T-039 | ChatPanel.tsx (handler de create + form + integración con fsReady) | core/*, types.ts, EditorPanel.tsx |

**T-038 y T-039 ambas tocan `ChatPanel.tsx`** pero en partes distintas.
**Recomendación: una sola IA las toma en secuencia** (T-038 primero,
después T-039) o se hace un rebase prolijo entre las dos.

---

*Tarjetas redactadas por Mavis@cloud el 2026-06-17, basadas en la conversación con Pablo del mismo día. Cada tarjeta es autocontenida.*
