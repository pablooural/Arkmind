# 📋 Tarjetas de tarea — `plan-de-trabajo-hoy` — 2026-06-06

> **Origen:** plan de Pablo, sesión 2026-06-06. 6 funcionalidades divididas
> en 6 tarjetas. Cada una tiene scope explícito para que se pueda ejecutar
> en una sola sesión sin pisarse con las otras.
>
> **Regla:** se ejecutan una por sesión (o menos), respetando el orden de
> dependencias. Pablo o quien coordine asigna, la IA ejecuta, wip si se
> acaban los tokens.

---

## T-009 — Acción "Copiar al chat" sobre mensajes

**BLOQUE:** 1 (CHAT) — Funcionalidad 1

**TAREA:** agregar acción "Copiar al chat" sobre mensajes seleccionados del chat. Resultado: copia el contenido al chat actual, sin abrir nada nuevo.

**MÓDULO ASIGNADO:** nuevo — sugerir nombre `chat-actions` o agregar a `ConversationPanel`

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`
3. `artifacts/ux-arquitecto/src/components/ConversationPanel.tsx`
4. `.arkmind/decisions/0007-ia-context-bridge.md` (para entender cómo se renderizan mensajes hoy)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` (agregar botón + handler)
✅ `artifacts/ux-arquitecto/src/components/ui/...` (si hace falta un componente Menu/Dropdown nuevo)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `artifacts/ux-arquitecto/src/core/*` (no tocar nada de lógica)
❌ `types.ts`
❌ Cualquier cosa en `lib/`, `hooks/` que no sea el hook del ChatPanel
❌ Las 5 funcionalidades siguientes (cada una su tarjeta)

**ENTREGABLE:**
- Rama: `ia/<handle>/t-009-copy-to-chat`
- 1 feat commit
- Push a origin
- Entrada slim en PROGRESS

**PRESUPUESTO:**
- Si llego al 80% de tokens: cierro wip, no termino
- Si el SPEC necesita cambios: NO los hago, los anoto en SUGGESTIONS

**NOTAS:**
- "Copiar al chat" es ambiguo: ¿copia al chat activo? ¿abre un chat nuevo con el contenido? Asumimos: **al chat activo** (es lo más simple y lo más útil). Si Pablo quiere otra cosa, ajustar antes.
- Necesita un mecanismo de selección de mensajes. Si ya existe (checkbox, ctrl+click), reusar. Si no, agregarlo.

---

## T-010 — Acción "Enviar a LLM" (delegar contenido a nueva conversación)

**BLOQUE:** 1 (CHAT) — Funcionalidad 2

**TAREA:** agregar acción "Enviar a LLM" sobre contenido seleccionado. Crea nueva conversación, la abre, e inserta el contenido automáticamente.

**MÓDULO ASIGNADO:** nuevo — `chat-delegation` o `llm-delegation`

**DEPENDENCIA:** T-009 (comparten UX de selección de mensajes). Si T-009 no está mergeada, esperar.

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`
3. `artifacts/ux-arquitecto/src/core/session.ts` (para entender `createSession`)
4. `artifacts/ux-arquitecto/src/core/ia-context-bridge.ts` (para que el nuevo chat herede el contexto)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` (botón "Enviar a LLM")
✅ `artifacts/ux-arquitecto/src/core/session.ts` (solo si hace falta exponer un helper)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `types.ts`
❌ `ia-context-bridge.ts` (no cambiar contrato)
❌ Providers (`ai.ts`, `auth.ts`)
❌ Las otras 4 funcionalidades (su tarjeta)

**ENTREGABLE:**
- Rama: `ia/<handle>/t-010-send-to-llm`
- 1 feat commit
- Push + PR + entrada slim en PROGRESS

**PRESUPUESTO:** igual que T-009

**NOTAS:**
- "Crear nueva conversación" probablemente reuse `sessionManager.createSession()` que ya existe.
- "Abrir nueva ventana/chat" = navegación a la nueva sesión. Ver cómo se navega hoy en `DualPanelLayout.tsx`.
- "Insertar automáticamente el contenido" = el contenido seleccionado se vuelve el primer `StructuredMessage` de la nueva sesión, con `role: "user"`.

---

## T-011 — Historial de chats accesible desde el chat (menú de 3 líneas)

**BLOQUE:** 1 (CHAT) — Funcionalidad 3

**TAREA:** agregar menú hamburguesa en el chat. Contenido: conversaciones recientes, fijadas, archivadas.

**MÓDULO ASIGNADO:** nuevo — `chat-history-menu`

**DEPENDENCIA:** ninguna (independiente de T-009 y T-010).

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/components/ChatPanel.tsx`
3. `artifacts/ux-arquitecto/src/core/session.ts` (métodos `listSessions`, `pinSession`, `archiveSession`)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ChatPanel.tsx` (menú hamburguesa + dropdown)
✅ `artifacts/ux-arquitecto/src/components/ui/...` (componente Menu si no existe)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/session.ts` (asumimos que los métodos ya existen; si no, abrir ADR)
❌ `types.ts`
❌ Providers
❌ Las otras funcionalidades

**ENTREGABLE:** estándar

**PRESUPUESTO:** estándar

**NOTAS:**
- "Fijadas" y "archivadas" son **estados de la sesión**. Hay que verificar si `SessionState` ya incluye esos. Si no, abrir sugerencia y NO implementar.
- Si los métodos no existen, esta tarjeta se bloquea. Avisar a Pablo.

---

## T-012 — Panel de archivos visible desde el chat (archivos + contexto + snapshots + ADRs)

**BLOQUE:** 2 (ARCHIVOS) — Funcionalidad 4

**TAREA:** hacer visible un panel de archivos dentro de la vista de chat. Debe mostrar: archivos del chat, documentos del contexto, snapshots, contratos, ADRs. Sin salir del chat.

**MÓDULO ASIGNADO:** `resource-explorer` (ya existe `ResourceExplorer.tsx`)

**DEPENDENCIA:** ninguna (aunque se beneficia de T-013 para explorar).

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx`
3. `artifacts/ux-arquitecto/src/components/FileExplorer.tsx`
4. `artifacts/ux-arquitecto/src/components/EditorPanel.tsx` (para ver cómo se relacionan)
5. `artifacts/ux-arquitecto/src/pages/DualPanelLayout.tsx` (para ver dónde se inserta el panel)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx` (extender con tabs: Archivos / Contexto / Snapshots / Contratos / ADRs)
✅ `artifacts/ux-arquitecto/src/pages/DualPanelLayout.tsx` (insertar el panel en el layout de chat)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/snapshotStore.ts`, `core/snapshots.ts`
❌ `core/types.ts`
❌ `WebFilesystemProvider.ts`
❌ ADRs y SPECs (solo leer, no modificar)

**ENTREGABLE:** estándar

**PRESUPUESTO:** ⚠️ **tarjeta pesada** — probablemente la más larga de las 6. Dividir en sub-tarjetas T-012a (tabs internos del explorer) y T-012b (integración en DualPanelLayout) si hace falta.

**NOTAS:**
- "Contratos" = archivos `CONTRACT.md` de los módulos.
- "ADRs" = archivos `.arkmind/decisions/*.md`.
- "Snapshots" = la lista que expone `snapshotStore.listSnapshots()`.
- Es esperable que la UI no pueda mostrar **todo** simultáneamente. Probablemente un sistema de tabs.

---

## T-013 — Botón "Explorar" que abre carpetas externas dentro del panel

**BLOQUE:** 2 (ARCHIVOS) — Funcionalidad 5

**TAREA:** botón "Explorar" en el panel de archivos. Abre el picker de carpetas del sistema (File System Access API), pero el contenido se muestra **dentro** del panel, no en ventana separada.

**MÓDULO ASIGNADO:** integración con `WebFilesystemProvider` (que ya tiene `requestRootAccess()`)

**DEPENDENCIA:** T-012 (el botón "Explorar" vive en el panel de archivos).

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts` (especialmente `requestRootAccess()`)
3. `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx`
4. `.arkmind/SUPOSICIONES.md` o `.arkmind/NO-GO-ZONES.md` (ver si el FS provider es NO-GO)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx` (botón + handler)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/WebFilesystemProvider.ts` (NO-GO probable — no modificar)
❌ `core/*`
❌ `types.ts`

**ENTREGABLE:** estándar

**PRESUPUESTO:** estándar

**NOTAS:**
- `webFilesystemProvider.requestRootAccess()` ya existe y devuelve `boolean`. Solo hay que conectarlo al botón.
- **Si el botón no funciona en Firefox/Safari** (File System Access API no disponible), mostrar mensaje explicativo en vez de fallar silencioso.

---

## T-014 — Visualización de carpetas en árbol navegable (workspace real)

**BLOQUE:** 2 (ARCHIVOS) — Funcionalidad 6

**TAREA:** el panel de archivos debe mostrar carpetas, subcarpetas y archivos en árbol navegable. Como un workspace real.

**MÓDULO ASIGNADO:** `ResourceExplorer` (extender el actual)

**DEPENDENCIA:** T-012 (tabs) y T-013 (explorar). Empezar por acá bloquea hasta que T-012 esté mergeada.

**LECTURA OBLIGATORIA:**
1. `.arkmind/AXIOMS.md`
2. `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx` (estado actual)
3. `artifacts/ux-arquitecto/src/components/FileExplorer.tsx` (puede tener lógica reutilizable)
4. `artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts` (`getDirectoryTree` y `listDirectory` ya existen)

**ARCHIVOS A TOCAR:**
✅ `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx` (árbol navegable)
✅ `artifacts/ux-arquitecto/src/components/ui/...` (componente Tree si no existe)

**ARCHIVOS QUE NO SE TOCAN:**
❌ `core/*`
❌ `types.ts`

**ENTREGABLE:** estándar

**PRESUPUESTO:** ⚠️ **tarjeta mediana** — la lógica del árbol puede ser 100-200 líneas.

**NOTAS:**
- `webFilesystemProvider.getDirectoryTree(path, maxDepth)` ya devuelve un árbol. Reusar.
- Si la performance es mala con muchos archivos (>1000), abrir sugerencia y no optimizar proactivamente.

---

## Resumen de las 6 tarjetas

| ID | Funcionalidad | Bloque | Dep | Tamaño | Notas |
|---|---|---|---|---|---|
| T-009 | Copiar al chat | 1 | — | chico | base para T-010 |
| T-010 | Enviar a LLM | 1 | T-009 | mediano | crea nueva sesión |
| T-011 | Menú historial | 1 | — | mediano | depende de session.ts |
| T-012 | Panel de archivos | 2 | — | grande | dividir si hace falta |
| T-013 | Botón Explorar | 2 | T-012 | chico | solo conectar |
| T-014 | Árbol navegable | 2 | T-012, T-013 | mediano | reusar getDirectoryTree |

**Orden sugerido de ejecución:** T-009 → T-011 → T-010 → T-012 → T-013 → T-014

(Bloque 1 entero antes de pasar al 2, porque comparten UX de selección y contexto del chat.)

**BLOQUE 3 y 4 (Contexto + Cierre) del plan de Pablo** son **transversales** — aplican a todas las tarjetas:
- T-012 ya cubre gran parte de BLOQUE 3 (mostrar contexto del chat).
- BLOQUE 4 (versión, changelog, snapshot, documentación) es **regla de cierre** que ya está en CONVENTIONS.md paso 4. Solo aplicarla.

---

*Tarjetas redactadas por Mavis@cloud el 2026-06-06. Listas para que Pablo asigne mañana con la cabeza fresca.*
