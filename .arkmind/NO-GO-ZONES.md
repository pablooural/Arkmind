# 🚫 NO-GO-ZONES

> **Consultar SIEMPRE antes de modificar.** Estas son las líneas rojas del proyecto.
> Si crees que hay que tocar algo de aquí, abre primero un ADR en `.arkmind/decisions/`
> y consénsualo con la siguiente IA en la handoff.

## ❌ No modificar sin consenso

### Modelo de dominio
- `artifacts/ux-arquitecto/src/core/types.ts` — fuente de verdad del modelo de datos
  (ResourceNode, CognitiveContext, VisualContext, AIContextSession, Snapshot,
  Transaction, etc.). Cualquier cambio aquí obliga a sincronizar todos los
  managers. **Decisión arquitectural mayor → ADR obligatorio.**

### Config del monorepo
- `pnpm-workspace.yaml` — packages, catalog, overrides
- `tsconfig.base.json` y `tsconfig.json` raíz
- `.npmrc` y `pnpm-lock.yaml` (a menos que sea un `pnpm install` legítimo)

### API pública del core
- El objeto `coreEngine` exportado en `artifacts/ux-arquitecto/src/core/index.ts`
  es la superficie pública. **No eliminar managers**, solo añadir. Si hay que
  deprecar uno, mantenerlo exportado con `@deprecated` durante al menos 1 paso.

### Áreas independientes del runtime
- `artifacts/api-server/` — Express backend, no relacionado con el core
- `artifacts/mockup-sandbox/` — solo catálogo UI, no tocar salvo para añadir componentes
- `lib/db/`, `lib/api-spec/`, `lib/api-client-react/`, `lib/api-zod/` — capa de
  datos y contratos API, son otra historia
- `scripts/` — solo añadir, no refactorizar lo existente

## ⚠️ No romper

### Contratos que ya están en uso
- `OperationProposal.status` — los 4 valores: `"proposed" | "approved" | "rejected" | "executed"`.
  Se consumen en plan de UI (Aceptar/Cancelar).
- `Transaction.status` — los 5 valores del ciclo de vida
- `Snapshot.storePath` — formato `${prefix}/${id}` (no romper parseos)
- `WebFilesystemProvider.ProviderResult` — la forma `{success, path, content?, size?, error?}`
  la consumen filesystem.ts y los callers

### Compatibilidad hacia atrás
- Si cambias la firma de un método público del core, **mantén un wrapper
  deprecado** durante 1 paso. Ejemplo: cuando `createSnapshot` pasó de
  `FileNode[]` a `string[]`, se añadió `createSnapshotFromNodes` para no
  romper callers.

## 🔍 Antes de tocar un archivo

1. ¿Está en NO-GO-ZONES? → ADR primero.
2. ¿Lo está usando otro manager? → `grep "<nombre>" artifacts/ux-arquitecto/src/`
3. ¿Cambia la forma de un tipo compartido? → sincronizar todos los managers que lo usen.
4. ¿Es una API pública del core? → wrapper deprecado, no romper.

## 📋 Cómo se actualiza este archivo

Solo si:
- Se cierra un ADR que invalida una zona
- Se identifica una nueva zona prohibida por incidente
- Cambia la arquitectura fundamental del proyecto

Formato: PR con explicación +共识 de la siguiente IA.
