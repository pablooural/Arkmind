# 🚫 NO-GO-ZONES

> **Consultar SIEMPRE antes de modificar.** Estas son las líneas rojas del proyecto.
> Si crees que hay que tocar algo de aquí, abre primero un ADR en `.arkmind/decisions/`
> y consénsualo con la siguiente IA en la handoff.

---

## ❌ No modificar sin ADR previo

### Modelo de dominio
- `artifacts/ux-arquitecto/src/core/types.ts` — fuente de verdad del modelo de datos
  (ResourceNode, CognitiveContext, VisualContext, AIContextSession, Snapshot,
  Transaction, etc.). Cualquier cambio aquí obliga a sincronizar todos los
  managers. **Decisión arquitectural mayor → ADR obligatorio.**

### Config del monorepo
- `pnpm-workspace.yaml` — packages, catalog, overrides
- `tsconfig.base.json` y `tsconfig.json` raíz
- `.npmrc` y `pnpm-lock.yaml` (a menos que sea un `pnpm install` legítimo)

### Documentos de coordinación nivel 1-3
- `.arkmind/AXIOMS.md` — solo si cambia la arquitectura fundamental
- `.arkmind/STATE.json` — schema versionado, cambios requieren acuerdo
- `.arkmind/NO-GO-ZONES.md` y `.arkmind/SUPOSICIONES.md` — los modificas tú
  mismo solo si la siguiente IA consiente

### API pública del core
- El objeto `coreEngine` exportado en `artifacts/ux-arquitecto/src/core/index.ts`
  es la superficie pública. **No eliminar managers**, solo añadir. Si hay que
  deprecar uno, mantenerlo exportado con `@deprecated` durante al menos 1 módulo.

### Áreas independientes del runtime
- `artifacts/api-server/` — Express backend, no relacionado con el core
- `artifacts/mockup-sandbox/` — solo catálogo UI, no tocar salvo para añadir componentes
- `lib/db/`, `lib/api-spec/`, `lib/api-client-react/`, `lib/api-zod/` — capa de
  datos y contratos API, son otra historia
- `scripts/` — solo añadir, no refactorizar lo existente

### Módulos de otros IAs (claim activo)
- Si un módulo está `status: "in_progress"` en STATE.json, **no tocar sus archivos**
  aunque técnicamente puedas. Habla con la IA que lo claimó.

---

## ⚠️ No romper (contratos en uso activo)

### Contratos del `snapshot-store` module
- `SnapshotManager.createSnapshot` signature: `(contextPath, filePaths: string[], reason, label?)`
- `Snapshot` type shape (en `types.ts`)
- `SnapshotRecord` y `SnapshotFileRecord` shapes (en `snapshotStore.ts`)
- `ProviderResult` shape (en `WebFilesystemProvider.ts`) — la consumen filesystem.ts y callers

### Contratos del `rollback-engine` module (al implementarse)
- `RollbackResult` discriminated union (en `CONTRACT.md`)
- `rollback()` signature: `(snapshotId: string) → Promise<RollbackResult>`

### Contratos del `op-journal` module (cuando se implemente)
- TBD

### Compatibilidad hacia atrás
- Si cambias la firma de un método público del core, **mantén un wrapper
  deprecado** durante 1 módulo. Ejemplo: cuando `createSnapshot` pasó de
  `FileNode[]` a `string[]`, se añadió `createSnapshotFromNodes` para no
  romper callers.

### Cycles
- `snapshots.ts` puede importar de `WebFilesystemProvider.ts` y `snapshotStore.ts`
- `transactions.ts` puede importar de `snapshots.ts`
- `snapshots.ts` **NO debe importar de `transactions.ts`** (caller, no peer)

---

## 🔍 Antes de tocar un archivo

1. ¿Está en NO-GO-ZONES? → ADR primero.
2. ¿Lo está usando otro manager? → `grep "<nombre>" artifacts/ux-arquitecto/src/`
3. ¿Cambia la forma de un tipo compartido? → sincronizar todos los managers que lo usen.
4. ¿Es una API pública del core? → wrapper deprecado, no romper.
5. ¿Es de un módulo con `status: "in_progress"`? → habla con la IA que lo claimó.

---

## 📋 Cómo se actualiza este archivo

Solo si:
- Se cierra un ADR que invalida una zona
- Se identifica una nueva zona prohibida por incidente
- Cambia la arquitectura fundamental del proyecto

Formato: commit con explicación + consenso de la siguiente IA.
