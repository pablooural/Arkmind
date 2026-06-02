# Module: spec-discrepancies

**Fecha de creación:** 2026-06-02
**Refinado por:** Aria — 2026-06-02 (antes del claim)
**Paso relacionado:** 3
**IA autora del spec:** Mavis
**Estado:** 🔵 in_progress — Aria, rama `ia/aria/spec-discrepancies`

---

## What this module does

Resuelve las discrepancias entre la spec oficial (`info_20arki.txt`) y el código
actual en `artifacts/ux-arquitecto/`, alineando el core con las suposiciones A1-A15
y abriendo los ADRs correspondientes.

Las 5 discrepancias que Mavis identificó en el spec original, ordenadas por
complejidad y dependencias:

| # | Discrepancia | ADR | Alcance de esta sesión |
|---|---|---|---|
| 1 | IA hard-coded a Mistral vs "IA operativa pero propone" (A4) | 0003 | ✅ sí |
| 2 | Auth acoplado a Supabase implícito vs "providers externos opcionales" (A3) | 0004 | ✅ sí (limpieza) |
| 3 | Sessions / cognitive / visual / memory solo en memoria vs "IndexedDB only" (A2) | 0005 | ❌ fuera de alcance |
| 4 | `api-server` con rutas a Mistral/Supabase | — (otro artefacto) | ❌ fuera de alcance |
| 5 | GitHub como provider opcional | — | ❌ fuera de alcance |

### Razón del alcance recortado

- **ADR 0005** (persistencia de session/cognitive/visual/memory en IDB) es un
  refactor grande: afecta 4 managers, requiere definir un `runtimeStore` sibling
  del `snapshotStore`, posiblemente migrar el `snapshotStore` para soportar
  múltiples object stores en una sola migración. Mejor en una sesión propia
  con `pnpm install` que complete.
- **API-server** vive en otro artefacto y NO está en `artifacts/ux-arquitecto/`.
  Cualquier cambio ahí requiere coordinación con quien mantiene ese artefacto.
- **GitHub provider** ya está conceptualmente alineado: el repo ES el código,
  el FS del usuario es su contenido. No hay código que migrar.

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/ai.ts            ← refactor: AIProvider interface + NoopAIProvider
artifacts/ux-arquitecto/src/core/auth.ts          ← refactor: rename Supabase fields, document local-only
artifacts/ux-arquitecto/src/core/index.ts         ← re-export nuevos tipos
.arkmind/decisions/0003-*.md                      ← nuevo
.arkmind/decisions/0004-*.md                      ← nuevo
.arkmind/SUPOSICIONES.md                          ← añadir nota sobre IA opcional (post-ADR)
.arkmind/NO-GO-ZONES.md                           ← no debería necesitar cambios
.arkmind/modules/spec-discrepancies/{SPEC,CONTRACT,STATUS}.md  ← cerrar al final
.arkmind/STATE.json                               ← reflejar status + claimedBy
.arkmind/modules/_REGISTRY.md                     ← reflejar status
PROGRESS.md                                       ← entrada slim al cerrar
```

## Files this module CANNOT touch

```
artifacts/ux-arquitecto/src/core/types.ts
artifacts/ux-arquitecto/src/core/snapshotStore.ts
artifacts/ux-arquitecto/src/core/snapshots.ts
artifacts/ux-arquitecto/src/core/transactions.ts
artifacts/ux-arquitecto/src/core/WebFilesystemProvider.ts
artifacts/ux-arquitecto/src/core/session.ts
artifacts/ux-arquitecto/src/core/cognitive.ts
artifacts/ux-arquitecto/src/core/visual.ts
artifacts/ux-arquitecto/src/core/memory.ts
artifacts/ux-arquitecto/src/core/workspace.ts
artifacts/ux-arquitecto/src/core/filesystem.ts
artifacts/api-server/**                            ← otro artefacto
```

`types.ts` se evita para no obligar a sincronizar todos los managers; lo que se
añada que sea interfaz nueva en el propio archivo del módulo (`ai.ts`).

---

## Behavior esperado

### Después de este módulo

1. **`ai.ts` con `AIProvider` interface**:
   - `interface AIProvider { id, propose(request): Promise<Proposal>, isAvailable(): boolean }`
   - `class NoopAIProvider implements AIProvider` — no llama a nada externo, `propose()`
     devuelve `{ kind: "noop", summary: "IA no configurada" }` y `isAvailable()` es `false`.
   - `class MistralAIProvider implements AIProvider` — encapsula la lógica Mistral actual
     (config, model, apiKey) detrás de la interfaz. Si no hay `apiKey`, `isAvailable()` es `false`.
   - `AIManager` arranca con `NoopAIProvider` por default. `setProvider(provider)` permite
     inyectar otro. `setAIConfig({ provider: "mistral", ... })` se mantiene como atajo
     que internamente construye un `MistralAIProvider`. **Backwards-compat preservado.**
2. **`auth.ts` limpio**:
   - Renombrar `AuthConfig.supabaseUrl` → `AuthConfig.remoteUrl`, `AuthConfig.supabaseKey`
     → `AuthConfig.remoteKey`. Marcar los viejos como `@deprecated` (re-export).
   - Añadir doc-comment al manager: "este manager es el estado LOCAL de la sesión
     (localStorage). La integración con el auth provider vive en `api-server`."
3. **`index.ts` re-exporta** los nuevos tipos `AIProvider`, `NoopAIProvider`,
   `MistralAIProvider`, `Proposal`.

### Invariantes que NO se rompen

- `AIManager.isConfigured()` sigue funcionando (devuelve `true` si el provider activo
  reporta `isAvailable() === true`).
- `authManager.isAuthenticated()` sigue funcionando idéntico.
- El singleton `aiManager` y `authManager` siguen siendo el mismo objeto (no se renombran).
- `coreEngine.ai` y `coreEngine.auth` siguen existiendo.

---

*Refinado por Aria antes de implementar, como pedía el stub original.*
