# 0001. Almacenamiento de snapshots en IndexedDB

**Fecha:** 2026-06-01
**Estado:** ✅ accepted
**IA autora:** Mavis
**Paso relacionado:** 1 (snapshot persistence)

## Contexto

El spec del Runtime Workspace (punto 11) dice: *"Persistencia obligatoria
local. Tecnología base: IndexedDB"*. El proyecto tiene `WebFilesystemProvider`
basado en la File System Access API del browser — pide al usuario una carpeta
raíz y opera sobre ella. Esto crea dos opciones de almacenamiento para los
snapshots: la carpeta del usuario (vía FS provider) o IndexedDB.

La persistencia de snapshots es CRÍTICA porque las transacciones (punto 9 del
spec) dependen de poder hacer rollback: `validate → snapshot → execute → verify
→ commit/rollback`. Sin snapshot persistente, un cierre de pestaña pierde la
capacidad de rollback.

## Decisión

Los snapshots se almacenan en **IndexedDB**, no en una carpeta del FS del
usuario. Concretamente:

- DB: `arkmind_runtime` v1
- Object store `snapshots`: metadatos (key: id, índices: contextPath, timestamp, trigger)
- Object store `snapshot_files`: blobs (key: `${snapshotId}::${path}`, índice: snapshotId)
- El `SnapshotManager` mantiene un caché en memoria (Map) espejo del store
  para lecturas rápidas
- Hidratación lazy: el primer uso dispara `loadAll()` desde IDB

## Consecuencias

**Positivas:**
- Invisibles para el usuario — no contamina su carpeta
- No dependen del handle del FS — sobreviven a cierres de sesión del browser
- Consultables estructuradamente (por contextPath, por timestamp, por trigger)
- Transaccionalmente atómicos (metadatos + blobs en la misma tx IDB)
- Coherente con el spec (que marca IndexedDB como "tecnología base")
- Permite offline-first de verdad: el runtime funciona sin que el usuario
  haya dado acceso a ninguna carpeta

**Negativas:**
- IndexedDB tiene cuota (~50% del disco en Chrome, variable en Safari)
- Hay que implementar cleanup de snapshots viejos para no llenarla
- No es "navegable" para el usuario desde su FS — pero no debería serlo

**Riesgos:**
- Safari/Firefox con modo privado pueden tener IDB limitada o evanescentes
  → mitigado: el código cae a "sólo memoria" si IDB no está disponible,
  con `console.warn` para que el usuario sepa
- Si la quota se llena, `tx.onerror` salta → capturado y logueado, la
  creación del snapshot falla limpio

## Notas

- NO confundir con el contenido del workspace del usuario. Eso sigue
  viviendo en su FS (vía `WebFilesystemProvider`).
- Cuando se implemente el rollback (Paso 2), el flujo será:
  1. `snapshotStore.getSnapshotFileContents(id)` → `Map<path, string>`
  2. Iterar y llamar `webFilesystemProvider.writeFile(path, content)`
  3. Validar post-condición
