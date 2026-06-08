# Status: ia-context-bridge

## Estado: ✅ done — Aria, rama `ia/aria/ia-context-bridge`

| Campo | Valor |
|---|---|
| IA asignada | Aria |
| Rama | `ia/aria/ia-context-bridge` |
| Último update | 2026-06-06T15:55:00Z |
| ADR relacionado | 0007 (proposed; v0.2 lo moverá a accepted) |
| Claimed at | 2026-06-06T15:40:00Z |
| Completed at | 2026-06-06T15:55:00Z |
| Versión entregada | v0.1 (achicada) |

---

## Handoff notes

### Lo que quedó hecho (v0.1)

- `core/contextBridge.ts` (NUEVO, aislado): `ContextEnricher` + tipos
  `ActiveContext` / `CognitiveContextSnapshot` / `WorkingMemorySnapshot` +
  constantes de límites.
- `core/index.ts`: +4 re-exports top-level (no toca `coreEngine`).
- ADR 0007 propuesto (formato completo, en `decisions/0007-ia-context-bridge.md`).

### Lo que NO quedó hecho (queda para v0.2, otro módulo)

- Tocar `ai.ts`: extender `AIRequest` con `activeContext?` y añadir
  `AIManager.propose(request)`. Esto era el alcance original; lo difiero
  a v0.2 porque Pablo reportó que los PRs se solapan y traban.
- Agregar `coreEngine.context = contextEnricher` al `coreEngine`. v0.2.
- Mover ADR 0007 a `accepted`. v0.2.
- Llamada HTTP real a Mistral usando el `activeContext`. v0.2 o módulo
  aparte (mejor en módulo aparte porque es alcance distinto).

### Por qué achiqué el alcance

Pablo dijo en sesión:

> "Pero se complicó todo... a veces ya no sé dónde estoy parado... lo que
> no se mergea es muchas veces porque se unió a otra cosa que se había
> superpuesto."

El módulo original iba a tocar:
- `ai.ts` (cambia `AIRequest` discriminated union — riesgo de breaking change)
- `index.ts` (`coreEngine.context` — API pública)
- ADR 0007
- SPEC/CONTRACT/STATUS
- STATE.json + REGISTRY

**5 archivos de código + 4 de docs**. Alto riesgo de superposición con
trabajo de otras IAs en los mismos archivos.

Achicado a:
- `contextBridge.ts` (NUEVO, aislado, no choca con nada)
- `index.ts` (+4 exports, no toca nada existente)
- 4 archivos de docs/coord

**1 archivo nuevo + 1 archivo existente (solo aditivo) + docs**. Riesgo
de superposición: prácticamente cero. Merge-able en un solo commit sin
revisiones largas.

### Sugerencias para la siguiente IA

- **Si querés hacer v0.2** (tocar `ai.ts` y `coreEngine.context`):
  1. Releer este SPEC (la sección "Plan para v0.2")
  2. Releer `AIRequest` actual y `AIManager` actual
  3. Hacer un PR chiquito que solo toque `ai.ts` + `index.ts` (no docs)
- **Si querés implementar la llamada HTTP real a Mistral**: crear un
  módulo aparte `ai-mistral-http` o `ai-http-fetch`. NO tocar
  `MistralAIProvider` directamente. Usar el `activeContext` (cuando
  exista) para mejorar el prompt.
- **El `ContextEnricher` está listo** — se puede usar ya desde cualquier
  caller (UI panel de debug, próximo wrapper de `AIManager`, etc.) sin
  esperar v0.2.

### Smoke tests (L-004 format)

- `contextEnricher.build()` — devuelve `ActiveContext` con `workspaceContextPath`
  del workspace activo, o todos los campos `null` si no hay workspace. **Nunca lanza.**
- `contextEnricher.build()` antes de `coreEngine.hydrateAll()` — devuelve
  `ActiveContext` con todos los campos `null` (safe, no asume hydration).
- `contextEnricher.build()` con managers que tiran excepción — el try/catch
  interno captura, loguea a `console.error`, y devuelve `ActiveContext` con
  todos los campos `null`. **Nunca corta el flujo del caller.**

---

## Historial

| Fecha | IA | Acción | Notas |
|---|---|---|---|
| 2026-06-06 | Aria | Refinó SPEC y CONTRACT a v0.1; marcó in_progress; decidió alcance recortado | Pablo asignó el módulo en sesión anterior; queja sobre PRs trabados motivó el achique |
| 2026-06-06 | Aria | Implementó `contextBridge.ts` + 4 re-exports en `index.ts` | v0.1 mínima: solo el enricher aislado |
| 2026-06-06 | Aria | Validó con tsc focal (noResolve) — 0 errores de tipo propios | Los TS7006 desaparecen con imports reales |
| 2026-06-06 | Aria | Actualizó SPEC/CONTRACT/STATUS para reflejar v0.1 achicada; cerró módulo | v0.2 queda documentado en handoff |
