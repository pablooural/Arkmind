# T-014 — Cierre por cobertura previa

**Fecha:** 2026-06-18
**IA:** Aria
**Tarea:** T-014 — Visualización de carpetas en árbol navegable (workspace real)
**Módulo objetivo:** `ResourceExplorer` (extender el actual)
**Estado final:** ✅ **Done by T-012** (no requiere código)

---

## Resumen

T-014 pedía que el panel de archivos mostrara carpetas, subcarpetas y archivos
en árbol navegable. Ese árbol ya existe y está mergeado en `main` desde T-012
(PR #24, Aria, 2026-06-08) como parte de la tab "Archivos" de
`ResourceExplorer.tsx`. No hay código nuevo que escribir.

## Evidencia

### 1. Componente recursivo ya implementado

`ResourceRow` en `artifacts/ux-arquitecto/src/components/ResourceExplorer.tsx:125`
es recursivo — renderiza sus hijos con `depth + 1`. Implementa:
- Chevron derecho que rota 90° cuando expandido (visual cue)
- Lazy loading de hijos vía `loadedChildren[node.path] ?? node.children`
- Padding izquierdo progresivo por depth (`0.9 + depth * 1.1` rem)
- Selección con highlight (`isSelected` → border-left + background accent)
- Long-press para cambiar contexto

### 2. Estado ya implementado

En `ResourceExplorer.tsx:232-233`:
```ts
const [expanded, setExpanded]               = useState<Set<string>>(new Set());
const [loadedChildren, setLoadedChildren]   = useState<Record<string, ResourceNode[]>>({});
```

`handleToggle` (línea 267) llama a `filesystemManager.listDirectory(path)` cuando
se expande una carpeta sin hijos cargados. Lazy load, no eager (a diferencia
de `getDirectoryTree` que trae todo de una hasta `maxDepth=4`).

### 3. Breadcrumb cliqueable ya implementado

Líneas 488-528: breadcrumb funcional con click a cada segmento, reseteo de
`expanded` cuando se navega a la raíz.

### 4. Renderizado activo en la app

`DualPanelLayout.tsx:18` importa `ResourceExplorer`, que se renderiza en
`DualPanelLayout.tsx:75` como Panel B.

## Decisión

Cerrar T-014 como **done by T-012**. No hacer código nuevo — el alcance
ya está cumplido. El componente `ResourceRow` con recursión + lazy load
+ breadcrumb cumple el criterio de "árbol navegable como workspace real".

## Nota sobre T-013 (dependencia)

T-013 (botón Explorar, también mergeada por Aria en PR #39) ya está
conectada como siempre-visible en el footer de la tab Archivos. El árbol
solo se hidrata después de que el usuario hace click en "explorar" y la
File System Access API concede acceso. Si el browser no soporta la API
(Firefox/Safari), se muestra un banner explicativo en vez de fallar
silencioso (lo que también pidió T-014 en su checklist).

## Cleanup pendiente (NO incluido en este PR)

`artifacts/ux-arquitecto/src/components/FileExplorer.tsx` (483 líneas) es
código legacy pre-T-012. NO se importa en ningún archivo activo
(verificado con `grep -rn "FileExplorer" artifacts/ux-arquitecto/src/`).
Solo se referencia en un comentario de `useFilesystemAccess.ts:129`.

Recomendación para próxima sesión: PR de cleanup borrando `FileExplorer.tsx`
y limpiando el comentario huérfano. Sigue el patrón de
L-006 + cleanup-basura (PR #41).

## Conexión con otros archivos

- L-005 (verificar contra origin/main antes de reclamar): aplicada — `git log
  origin/main` confirma que T-012 ya mergeó el árbol
- L-006 (auditoría en 5 comandos): aplicada en este review
- L-007 (consistencia de prefijos generateId/startsWith): aplicada en este
  audit (es el bug del `cogsnap:` que arreglé en PR #44 antes de este)

## Cierre

T-014 cerrada. No se abre PR de código. Próxima tarea visible:
cleanup de `FileExplorer.tsx` legacy.
