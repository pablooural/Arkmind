# 0006. Operation Journal Persistence and Core Integration

**Fecha:** 2026-06-02
**Estado:** ✅ accepted

## Contexto

El sistema Arkmind realiza operaciones destructivas sobre el sandbox (escritura, borrado, movimiento) y procesos de recuperación (rollback). Actualmente, estas operaciones se gestionan mediante el `TransactionManager`, pero no existe un registro histórico persistente que permita auditar qué ocurrió, cuándo y con qué resultado.

Sin un "Journal", es difícil para el usuario (y para otras IAs) entender la secuencia de cambios si la sesión se recarga o si ocurre un fallo silencioso.

## Decisión

Implementaremos un `OpJournalManager` que persista cada evento significativo en IndexedDB.

### 1. Almacenamiento
Añadiremos un nuevo object store llamado `journal` a la base de datos IndexedDB existente `arkmind_runtime`. 
- **KeyPath**: `id` (UUID).
- **Índices**: `timestamp` (para ordenación), `contextPath` (para filtrado), `transactionId` (para trazabilidad).

### 2. Integración en el Core
Modificaremos `TransactionManager` para emitir entradas al journal en momentos clave:
- Al **ejecutar** una transacción exitosamente.
- Al **fallar** una transacción o un rollback.
- Al **confirmar** una transacción.

### 3. Tipos de Datos
Añadiremos `JournalEntry` a `core/types.ts` para que sea la fuente de verdad compartida entre el manager, el store y los consumidores de UI.

## Consecuencias

**Positivas:**
- Auditoría completa de cambios en el workspace.
- Facilidad para depurar fallos en rollbacks (se guardará el `RollbackResult` completo).
- Base para futuras funcionalidades de "Undo History" visual.

**Negativas:**
- Ligero incremento en el uso de almacenamiento en IndexedDB.
- Pequeña sobrecarga de CPU al realizar escrituras adicionales en cada transacción (mitigado por ser operaciones asíncronas "fire-and-forget").

**Riesgos:**
- El crecimiento indefinido del journal podría ralentizar la DB. *Mitigación*: En el futuro se podría implementar una política de retención (ej. borrar entradas de más de 30 días), pero queda fuera del alcance de este módulo.
