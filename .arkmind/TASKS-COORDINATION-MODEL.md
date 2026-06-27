# 📋 Modelo de coordinación — Arkmind — 2026-06-26

> **Origen:** Pablo detectó que el sistema multi-IA necesita un **coordinador**
> que reparta trabajo entre las IAs ejecutoras, en vez de que Pablo tenga
> que diseñar cada plan. Este archivo documenta el modelo.

---

## Roles

| Rol | Quién | Qué hace |
|---|---|---|
| **Director** | `@pablo` | Define la visión en 1 línea. Decide prioridades. Mergea PRs. Prueba la UI. |
| **Coordinador** | `@mavis-cloud` (default; rotativo si se queda sin tokens) | Recibe la visión de Pablo, arma tarjetas, asigna a ejecutores, verifica integración. |
| **Ejecutor** | `@mavis`, `@mavis-cloud`, `@replit-agent`, etc. | Toma 1 tarjeta, ejecuta, mergea, avisa al coordinador. |

**El coordinador NO ejecuta código.** Solo diseña y reparte.

---

## Formato de tarjeta

Cada tarjeta tiene 4 secciones obligatorias:

```
1. ALCANCE
   - Archivos exclusivos (solo esta tarjeta los toca)
   - Archivos dependientes (se importan pero no se modifican)
   - Archivos prohibidos (si los necesitás, abrir ADR)

2. EJECUTOR
   - Qué IA toma esta tarjeta
   - Por qué (afinidad por lo que ya hizo antes)

3. DEPENDENCIAS
   - Qué tarjetas/hitos mergeados son prerequisito
   - Si no hay, "ninguna"

4. ENTREGABLE
   - 1 rama con commits siguiendo la convención
   - Push + PR
   - Entrada slim en PROGRESS
```

---

## Estrategia de asignación

**A (default): afinidad por handle.**

| Handle | Especialidad | Tarjetas típicas |
|---|---|---|
| `@mavis-cloud` | UI chat, docs, bridges, core-bridge | T-009, T-010, T-037, T-038, T-040, T-043, T-044, T-046 |
| `@mavis` | Memory, audit, core, observaciones | T-015, T-022, T-023, refactors de memory.ts |
| `@replit-agent` | Backend, tests, snapshots, build fixes | T-027, T-028, T-029, T-033, fixes de typecheck |

**B (fallback): self-claim.** Si la IA asignada no responde en N tiempo, el coordinador republica la tarjeta para que cualquier IA la tome.

**C (emergencia): round-robin.** Si hay más tarjetas que IAs activas, round-robin para no saturar.

---

## Flujo completo

```
PABLO:     "Quiero que la IA pueda ver el archivo activo en el chat"
                                ↓
COORDINADOR:
  1. Lee el código necesario UNA vez (1 sesión chica).
  2. Diseña las tarjetas: cuántas, qué alcance, qué ejecutor.
  3. Pasa las tarjetas al director para OK (opcional, si la visión es clara).
  4. Publica las tarjetas en `.arkmind/TASKS-*.md` con handle asignado.
                                ↓
EJECUTORES (en paralelo):
  Cada uno toma su tarjeta, ejecuta, mergea, avisa al coordinador.
                                ↓
COORDINADOR verifica:
  - ¿Se rompió algo entre IAs?
  - ¿Las convenciones se respetaron?
  - ¿El STATE.json / REGISTRY / PROGRESS están sincronizados?
                                ↓
PABLO mergea los PRs resultantes cuando quiere.
```

---

## activeAgents (en STATE.json)

Para que el coordinador sepa **quiénes están activas**:

```json
"activeAgents": [
  { "handle": "@mavis-cloud", "specialties": ["ui-chat", "docs", "core-bridge"], "lastSeen": "2026-06-26" },
  { "handle": "@mavis", "specialties": ["memory", "audit", "core"], "lastSeen": "2026-06-26" },
  { "handle": "@replit-agent", "specialties": ["backend", "tests", "snapshots"], "lastSeen": "2026-06-26" }
]
```

- Cada IA actualiza `lastSeen` al arrancar su sesión.
- El coordinador lee esto para repartir.
- Si una IA no aparece hace >3 días, se asume inactiva.

---

## Reglas del coordinador

1. **No ejecuta código.** Si tiene que tocar un archivo para probar, abre una tarjeta para sí mismo con su handle.
2. **No se auto-asigna.** Siempre reparte.
3. **Tarjetas chicas en serie, grandes en paralelo.** Una IA haciendo 4 tarjetas de 30 min cada una es mejor que una sola IA haciendo una de 2 horas (menos tokens gastados, más checkpoints).
4. **Verifica después de merge.** Si algo se rompió, abre una tarjeta de fix.
5. **Documenta el cierre.** Actualiza STATE.json + REGISTRY + PROGRESS al final de cada tanda.

---

## Reglas del ejecutor

1. **Lee SOLO su tarjeta.** No relee PROGRESS, REGISTRY, STATE a menos que la tarjeta lo pida.
2. **Scope estricto.** Si toca un archivo fuera del alcance, frena y avisa al coordinador.
3. **Commit message con convención** (`[ia:<handle>] [<scope>] <tipo>: <desc>`).
4. **Wip commit si se acaban los tokens.** No dejar trabajo a medias sin commit.
5. **Avisa al coordinador cuando mergea.**

---

## Plantilla de tarjeta (la que ya usamos, ahora obligatoria)

```markdown
## T-XXX — <título corto, <70 chars>

**TAREA:** <qué se hace, 1 línea>
**EJECUTOR:** <handle> (default: afinidad, justificada si es otra cosa)
**DEPENDENCIA:** <qué se necesita mergeado antes> | "ninguna"

**LECTURA OBLIGATORIA:** (solo estos archivos, en este orden)

**ALCANCE — archivos exclusivos:**
✅ ...

**ALCANCE — archivos dependientes (no se tocan):**
○ ...

**ALCANCE — archivos prohibidos:**
❌ ...

**ACCIONES:** (1-2 frases por paso)

**ENTREGABLE:**
- Rama: `ia/<handle>/t-XXX-<slug>`
- Mensaje: `[ia:<handle>] [t-XXX] <tipo>: <desc>`
- 1+ commits (idealmente 1)
- Push + PR + entrada slim en PROGRESS

**PRESUPUESTO:** <estimado> (si te pasás, wip + avisar)
```

---

*Documento redactado por Mavis@cloud el 2026-06-26, basado en la conversación con Pablo del mismo día.*