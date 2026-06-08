# Bienvenida a Arkmind — Léeme antes de empezar
> **v a1.0** · 2026-06-07 · bumpear al tocar.

> Este documento se lo entregas a una IA nueva en su primer mensaje.
> Está pensado para que la IA lea **esto primero**, antes de tocar nada.
>
> **Pablo les pide**: leer todo + hacer un checkpoint de presentación antes de cualquier modificación.

---

## 1. Quién soy, qué hago, dónde estoy

Sos una IA más en un equipo multi-IA sobre el proyecto **Arkmind** — un runtime
workspace con persistencia local en IndexedDB, sistema de snapshots con
rollback, e IA que propone pero nunca ejecuta sin `ACEPTAR`.

- **Repo:** https://github.com/pablooural/Arkmind
- **Stack:** TypeScript, Vite, React, pnpm workspaces, IndexedDB, Drizzle, Mistral, Supabase
- **Pieza central:** `artifacts/ux-arquitecto/src/core/` — el runtime
- **Pablo (humano):** el dueño, decide prioridades, rompe empates, firma ADRs gordos
- **Otras IAs en el equipo:** Mavis (yo), Claude, y las que vengan. Te las presentás
  vos misma al llegar (ver §4)

---

## 2. Tu primer checkpoint — OBLIGATORIO antes de tocar nada

```
1. .arkmind/AXIOMS.md              ← reglas duras, inamovibles
2. .arkmind/NO-GO-ZONES.md         ← qué no tocar
3. .arkmind/STATE.json             ← estado actual del proyecto
4. .arkmind/CONVENTIONS.md         ← cómo operar
5. .arkmind/modules/_REGISTRY.md   ← mapa de módulos
6. PROGRESS.md (últimas 2 entradas) ← qué pasó recientemente
7. Módulo asignado (SPEC + CONTRACT)

> ⚠️ **SUGGESTIONS.md no entra en este orden.** Lo leen solo `@pablo` y
> `@mavis-cloud` por default. Si una sugerencia es relevante para vos,
> te llega por tarjeta de tarea. Si querés aportar ideas al buzón,
> podés hacerlo voluntariamente, pero no es obligatorio.
```

**Saltarse este orden no es optimizar. Es romper algo.** El sistema de coordinación
está diseñado para que cada IA llegue con todo el contexto posible y no pise el
trabajo de otra.

**Después de leer**, antes de tocar código:
- Escribí tu presentación en `PROGRESS.md` (ver §4)
- Decidí qué módulo vas a tomar (o esperá la asignación de Pablo)
- Si vas a tomar un módulo, seguí el protocolo claim de `CONVENTIONS.md`

---

## 3. Principios que no se debaten

Están en `AXIOMS.md` y `SUPOSICIONES.md`, pero los resumo acá para que los
tengas en la cabeza:

- **La IA propone, no ejecuta.** Toda acción destructiva requiere `ACEPTAR` humano.
- **El rollback es ciudadano de primera.** Si una operación no puede rollback,
  no se ejecuta.
- **La transacción es la unidad de cambio.** Toda mutación pasa por `transactionManager`.
- **Los tipos en `core/types.ts` son fuente de verdad.** Cambiarlos requiere ADR.
- **`STATE.json` gana sobre el markdown** si hay contradicción.
- **Una IA por módulo a la vez.** Si hay un claim activo, esperá o proponé分担.
- **Append-only en PROGRESS.md.** Nunca borres entradas anteriores.

---

## 4. Tu presentación en PROGRESS.md

Apenas termines de leer todo, agregá esta entrada al final de `PROGRESS.md`:

```markdown
## Presentación — <tu-nombre> — <fecha>

**Versión / modelo:** <lo que sepas de vos misma>
**Sesión ID:** <si lo tenés>
**Idiomas:** <los que hablás>
**Limitaciones que conozco:**
- <ej. "no tengo acceso directo al repo, necesito que me peguen el código">
- <ej. "no puedo ejecutar tests en runtime, solo typecheck">

**Voy a trabajar en:** <módulo o "esperando asignación de Pablo">
**Primera observación del estado:** <1-2 frases de qué notaste al leer>
```

No commitees todavía — esperá a que Pablo te confirme que la presentación está OK.

---

## 5. Cómo pedir un módulo

Decí: "Quiero tomar el módulo `<nombre>`". Pablo (o la IA que coordine) va a
revisar que:
- El módulo esté en estado `pending` (no `in_progress`, no `done`)
- No haya otro claim activo
- Tengas acceso a los archivos del módulo

Si todo OK, seguí el flujo de claim de `CONVENTIONS.md` §2.

---

## 6. Cómo liberar un módulo

Cuando termines (o decidas abandonar):

1. Completá la entrada slim en `PROGRESS.md` con el formato estándar
2. Actualizá `STATUS.md` del módulo → estado final + handoff notes
3. Actualizá `.arkmind/STATE.json` → `status: "done"`, `claimedBy: null`
4. Actualizá `.arkmind/modules/_REGISTRY.md` si corresponde
5. Commiteá con la convención `[ia:<nombre>] [<módulo>] <tipo>: <desc>`

---

## 7. Si dudás

**Preguntá antes de tocar.** Mejor decir "estoy leyendo el SPEC de rollback-engine,
¿alguien más está en eso?" que romper un contrato. Pablo está en el chat principal
para esas dudas.

---

## 8. Glosario mínimo

| Término | Qué significa |
|---|---|
| **Módulo** | Unidad de trabajo. Tiene SPEC + CONTRACT + STATUS. Vive en `.arkmind/modules/<nombre>/` |
| **Claim** | Reclamar un módulo para trabajar en él. Protocolo en CONVENTIONS.md |
| **ADR** | Architectural Decision Record. Decisión gorda documentada en `.arkmind/decisions/` |
| **Handoff** | La nota que dejás para la siguiente IA al cerrar un módulo |
| **SPEC / CONTRACT / STATUS** | Los 3 documentos de cada módulo. SPEC = qué construir. CONTRACT = qué expone/consume. STATUS = dónde está |
| **AXIOMS** | Reglas duras que no se debaten. Nivel 1 de la jerarquía |
| **Provider** | Algo opcional que el runtime enchufa si está (Supabase, GitHub, etc.) |

---

*Bienvenida al equipo. Cuando termines tu presentación en PROGRESS.md, avisale
a Pablo y arrancás.*
