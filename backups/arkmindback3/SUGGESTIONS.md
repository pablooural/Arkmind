# 📋 Mensaje estándar para IAs nuevas — copy-paste
> **v a1.0** · 2026-06-07 · bumpear al tocar.
> **v a1.1** · 2026-06-08 · bumpear: aclarar que SUGGESTIONS no es para todas las IAs.

> **Cómo usar:** Cuando Pablo le pida a una IA nueva que se presente, copiar
> el bloque de abajo y pegarlo en el chat como primer mensaje. La IA va a
> leer todo, hacer su checkpoint de presentación, y esperar la asignación.

---

## ✂️ DESDE ACÁ — copiar y pegar

```
¡Hola! Bienvenida al equipo de Arkmind 🎯

Antes de que arranques, necesito que hagas un **checkpoint de lectura** y
luego una **presentación en PROGRESS.md**. Sin eso, no toques nada.

## Tu checkpoint de lectura (en este orden, sin saltarte pasos)

1. `.arkmind/AXIOMS.md` — reglas duras, no se debaten
2. `.arkmind/NO-GO-ZONES.md` — qué no tocar
3. `.arkmind/STATE.json` — estado actual del proyecto
4. `.arkmind/CONVENTIONS.md` — cómo operar (claim, commit, release)
5. `.arkmind/modules/_REGISTRY.md` — mapa de módulos
6. `PROGRESS.md` — últimas 2 entradas para ver qué pasó
7. El SPEC + CONTRACT del módulo que te voy a asignar (te lo paso abajo)
8. `.arkmind/WELCOME.md` — resumen de bienvenida
9. ~~`.arkmind/SUGGESTIONS.md` — buzón de ideas~~ **SUGGESTIONS solo lo leen @pablo y @mavis-cloud por default.** Si te llega algo relevante por tarjeta de tarea, lo ves ahí. No implementes nada de ahí sin que se acepte antes.

## Tu presentación en PROGRESS.md

Cuando termines de leer, agrega al final de `PROGRESS.md` (NO committees
todavía, esperá mi OK):

```
## Presentación — <tu-nombre> — <fecha>

**Versión / modelo:** <lo que sepas>
**Sesión ID:** <si lo tenés>
**Idiomas:** <los que hablás>
**Limitaciones que conozco:**
- <ej. "no tengo acceso directo al repo, necesito que me peguen el código">
- <ej. "no puedo ejecutar tests en runtime, solo typecheck">

**Voy a trabajar en:** <módulo> | "esperando tu asignación"
**Primera observación del estado:** <1-2 frases de qué notaste al leer>
```

## Reglas importantes

- El orden de lectura NO es opcional. Saltarse pasos = romper algo.
- `STATE.json` gana sobre el markdown si hay contradicciones.
- Si tenés ideas de mejora al sistema, agregalas a `SUGGESTIONS.md` con
  un ID nuevo (`S008`, `S009`, …). **NO las implementes directamente.**
- Toda mutación destructiva del código requiere `ACEPTAR` humano. Vos
  proponés, Pablo decide.
- Si dudás, preguntá antes de tocar.

## Tu módulo asignado

<ACÁ PABLO PONE EL NOMBRE DEL MÓDULO Y LOS ARCHIVOS RELEVANTES>

---

Una vez que tengas la presentación lista en PROGRESS.md, avísame y arrancamos.
```

## ✂️ HASTA ACÁ — fin del copy-paste

---

## 📝 Notas para Pablo

- Pegá tal cual. Reemplazá solo `<tu-nombre>`, `<fecha>` y la sección
  "Tu módulo asignado" con los datos concretos.
- Si la IA no tiene acceso al repo, tenés que pegarle el contenido de los
  archivos en el chat. Es rollo pero es lo que hay.
- Si la IA intenta implementar cosas de `SUGGESTIONS.md` sin que se
  acepten, parála. La regla es: "el buzón NO es backlog automático".
- Si la IA propone un cambio que no es del módulo asignado, derivá al
  buzón: "anotá esa idea en `SUGGESTIONS.md` con un ID nuevo, no la
  metas en este módulo".
