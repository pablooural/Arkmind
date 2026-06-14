# 0005. Runtime State Persistence in IndexedDB

**Fecha:** 2026-06-02
**Estado:** ✅ accepted

## Contexto

Actualmente, el estado dinámico del sistema (sesiones de chat, contextos cognitivos, estados visuales y memorias) reside principalmente en memoria volátil o en `localStorage` (de forma limitada). Esto provoca pérdida de contexto si la pestaña se refresca o si el sistema se reinicia. 

Necesitamos una solución de persistencia robusta que permita:
1. Rehidratar la sesión completa tras un reinicio.
2. Mantener múltiples sesiones en paralelo sin conflictos.
3. Escalar el almacenamiento (localStorage tiene un límite de ~5MB que es insuficiente para historiales largos de mensajes).

## Decisión

Utilizaremos la base de datos IndexedDB existente `arkmind_runtime` (actualmente en v2) y la actualizaremos a **v3** para incluir nuevos almacenes de objetos (object stores) dedicados al estado del runtime.

### 1. Nuevos Object Stores
Añadiremos los siguientes almacenes en `snapshotStore.ts`:
- `sessions`: Almacena `AIContextSession`. Key: `id`.
- `cognitive_contexts`: Almacena `CognitiveContext`. Key: `contextPath`.
- `visual_contexts`: Almacena `VisualContext`. Key: `panelId`.
- `memory`: Almacena `WorkingMemory` y `ContextMemory`. Key: `id` (o `contextPath` para memorias de contexto).

### 2. Estrategia de Persistencia
- **Single Source of Truth**: `snapshotStore.ts` seguirá siendo el único gestor de la conexión a IndexedDB para evitar conflictos de versiones y bloqueos de DB.
- **Lazy Loading**: Los managers (SessionManager, etc.) cargarán su estado desde IDB al inicializarse.
- **Auto-save**: Cada operación de escritura en los managers disparará un `put` asíncrono en IDB.

### 3. ¿Por qué no una DB separada?
Mantener una única base de datos `arkmind_runtime` simplifica:
- Las migraciones de esquema (un solo `onupgradeneeded`).
- La consistencia (posibilidad de transacciones que afecten a snapshots y sesiones, aunque no se usen de inmediato).
- La gestión del ciclo de vida de la conexión.

## Consecuencias

**Positivas:**
- Resiliencia total ante refrescos de página.
- Capacidad para manejar historiales de chat masivos.
- Estructura preparada para el "Cognitive Snapshot" (ADR futuro).

**Negativas:**
- Mayor complejidad en el código de los managers al tener que manejar estados asíncronos de carga inicial.

**Riesgos:**
- Posibles condiciones de carrera si dos componentes intentan escribir en el mismo store simultáneamente. *Mitigación*: IndexedDB gestiona el bloqueo por transacción de forma nativa.
