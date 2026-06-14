# ADR 0007: IA Context Bridge

## Contexto y Problema

El runtime de Arkitectgr ya expone información rica sobre el estado del usuario a través de varios managers:
- `workspaceManager.getActiveContextPath()`: Carpeta activa.
- `visualManager.getPersistentState(panelId).activeResource`: Archivo activo.
- `cognitiveManager.getContext(path)`: Insights, preguntas, restricciones.
- `sessionManager.getSessionByPanel()`: Sesión activa.

Toda esta información se hidrata en IndexedDB tras `coreEngine.hydrateAll()`. Sin embargo, existía una brecha: ninguno de estos datos se pasaba a `AIProvider.propose()` cuando se llamaba. La IA recibía un objeto `{kind, payload}` plano, sin contexto del entorno en el que se encontraba el usuario.

## Decisión

Se ha implementado el módulo `ia-context-bridge` para cerrar esta brecha, con los siguientes componentes:

1. **Nuevos Tipos de Contexto**:
   - `ActiveContext`: Combina la ruta activa, el recurso activo, el contexto cognitivo y la sesión activa.
   - `CognitiveContextSnapshot`: Alias de `CognitiveContext` para representar un snapshot del estado cognitivo.
   - `WorkingMemorySnapshot`: Alias de `WorkingMemory` para representar un snapshot de la memoria de trabajo.

2. **ContextEnricher**:
   - Una nueva clase `ContextEnricher` en `ia-context-bridge.ts` que se encarga de recolectar y consolidar el contexto de los diferentes managers (`workspaceManager`, `visualManager`, `cognitiveManager`, `sessionManager`).

3. **Extensión de AIRequest**:
   - Se ha extendido el tipo `AIRequest` en `ai.ts` para incluir un campo opcional `activeContext` de tipo `ActiveContext`. Esto mantiene la compatibilidad hacia atrás (discriminated union intacta).

4. **Nuevo Método `AIManager.propose()`**:
   - Se ha añadido el método `propose(request: AIRequest)` a la clase `AIManager`. Este método enriquece automáticamente la petición con el contexto activo usando `ContextEnricher` antes de delegarla al provider activo.

5. **Actualización de Providers**:
   - `MistralAIProvider` ha sido actualizado para loguear el contexto recibido y utilizarlo en la generación de sus respuestas stub (añadiendo referencias al recurso activo).
   - `NoopAIProvider` ignora el contexto por diseño, ya que no realiza operaciones reales.

## Consecuencias

- **Positivas**:
  - Las peticiones a la IA ahora pueden ser enriquecidas automáticamente con el contexto completo del runtime, mejorando la relevancia y precisión de las propuestas.
  - El diseño es no intrusivo y mantiene la compatibilidad hacia atrás. Los callers existentes no se rompen.
  - Se centraliza la recolección de contexto en `ContextEnricher`, evitando duplicación de código en los callers.

- **Negativas**:
  - Añade una ligera sobrecarga en la recolección de contexto antes de cada llamada a `propose()`, aunque al ser síncrona y basada en memoria, el impacto es mínimo.

## Estado
Aceptado.
