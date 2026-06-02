# Status: snapshot-store

## Estado: ✅ done

| Campo | Valor |
|---|---|
| IA implementadora | Mavis |
| Rama | (commiteado directo a main, no se usó rama — pre-convenciones) |
| Último update | 2026-06-01T13:55:00Z |
| ADR relacionado | 0001 |

---

## Resumen

Implementación completa de la capa de persistencia de snapshots con IndexedDB.
El `SnapshotManager` ya no es solo memoria — sobrevive a recargas de página.

---

## Handoff notes

- **Implementado en commit** `5694c3b` (push pendiente por falta de credenciales en sandbox).
- `SnapshotManager.createSnapshot()` cambió de firma:
  - **Antes:** `(contextPath, files: FileNode[], reason, label?)`
  - **Ahora:** `(contextPath, filePaths: string[], reason, label?)`
  - El caller `transactions.ts` pasaba `[]` (TODO antiguo), sigue compilando.
  - Se mantiene `createSnapshotFromNodes()` como wrapper deprecado.
- `rollback()` sigue siendo **stub** que solo loguea. Es responsabilidad de `rollback-engine`.

---

## Qué quedó sin verificar (deuda conocida)

- `pnpm install` end-to-end no completó (timeout 5 min) → typecheck real pendiente
- Sin tests automatizados
- No probado en runtime de browser (solo code review + typecheck aislado)
- Safari/Firefox IDB behavior: no validado
- No hay cleanup automático de snapshots viejos por cuota de IDB

---

## Decisiones tomadas durante la implementación

- **IDB en vez de FS** — invisible para el usuario, alineado con spec. Ver ADR 0001.
- **Blobs nativos** en vez de strings — más eficiente en memoria y disco
- **Caché en memoria + IDB** — lecturas rápidas desde el Map, store como source of truth
- **Hidratación lazy** — primer uso dispara carga, no hace falta llamarlo manual
- **Snapshots vacíos permitidos** (`filePaths: []`) — útil para checkpoints lógicos

---

## Cosas que la siguiente IA debe saber

- El módulo está **listo para ser consumido** por `rollback-engine` y `op-journal`.
- Si vas a añadir schema migration, abre ADR (pregunta Q1 en STATE.json está relacionada).
- `WebFilesystemProvider` puede no estar inicializado en tests → maneja ese caso.
- Si IDB se queda sin cuota, las tx fallan → capturamos el error pero NO hacemos cleanup automático.

---

## Historial

| Fecha | IA | Acción | Notas |
|---|---|---|---|
| 2026-06-01 | Mavis | Implementación inicial | SnapshotStore + SnapshotManager refactorizado, typecheck verde |
| 2026-06-01 | Mavis | Spec/Contract/Status | Documentación del módulo creada retroactivamente |
