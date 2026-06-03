# 📚 Aprendizados del equipo — Arkmind

> **Archivo append-only. Cualquier IA puede agregar el suyo.**
>
> ¿Aprendiste algo operacional que le ahorraría 10 minutos a la próxima
> IA que trabaje acá? Agregalo. ¿Tuviste que descubrir algo a los golpes
> que era evitable? Mucho más.
>
> **No es un repositorio de quejas.** Es un registro de "cosas que
> aprendimos funcionando juntos". Sé específico: qué pasó, qué hacer
> distinto, por qué importa.
>
> **Cuándo agregar:**
> - Algo que descubriste sobre el sandbox, git, o el flujo de trabajo
> - Un error tuyo que te costó tiempo y que otra IA repetiría
> - Un patrón que te funcionó y querés compartir
>
> **Cuándo NO agregar:**
> - Decisiones arquitecturales gordas → eso va a ADRs
> - Cambios en reglas del sistema → eso va a AXIOMS / CONVENTIONS
> - Estado actual del proyecto → eso va a STATE.json
>
> **Formato:** una entrada por aprendizaje, con fecha y firma.

---

## Categorías (sugeridas, no obligatorias)

- `sandbox` — comportamiento del entorno donde corre la IA
- `git` — particularidades de cómo este repo trabaja con git
- `protocolo` — gaps o aclaraciones del flujo claim/trabajo/cierre
- `coordinación` — cómo interactuar con STATE.json / PROGRESS.md / ADRs
- `runtime` — particularidades del código de Arkmind (snapshots, IDB, etc.)
- `humano` — cómo es trabajar con Pablo (sus preferencias, sus tiempos)

---

## L-001 — El `cd` no se hereda entre invocaciones de bash — 2026-06-02 — Mavis@cloud

**Categoría:** sandbox

**Qué pasó:** Quería correr `git push` en `/workspace/Arkmind` después de haber
hecho `cd /workspace/Arkmind` en una llamada anterior. La nueva invocación
arrancó en `/root` y `git` tiró "fatal: not a git repository".

**Aprendizaje:** Cada invocación del bash tool arranca en `/root`, no importa
lo que haya hecho la llamada anterior. El `cd` solo no se hereda.

**Qué hacer:** Encadenar el `cd` en la misma línea que el comando:
```bash
cd /workspace/Arkmind && git push
```
O usar `bash -c "cd /path && comando"`. El `cd` solo, en una llamada aparte,
no sirve.

**Por qué importa:** Te ahorra 5 minutos de "¿por qué no me encuentra el
repo?" cada vez que volvés a la sesión.

---

## L-002 — `git fetch` no actualiza el working tree — 2026-06-03 — Mavis@cloud

**Categoría:** git

**Qué pasó:** Después de hacer `git fetch`, vi en `git log` commits remotos
nuevos. Pero los archivos en disco seguían en la versión vieja. Concluí mal
que un módulo no existía, cuando en realidad mi working tree estaba desactualizado.

**Aprendizaje:** `git fetch` baja la información de los refs remotos pero NO
modifica los archivos en tu working tree. `git log` te muestra los commits
remotos igual, lo cual puede engañarte.

**Qué hacer:** Si querés ver el estado real de `main` después de un fetch:
```bash
git checkout main && git pull --ff-only
```
Y ahí sí, los archivos en disco reflejan la realidad.

**Por qué importa:** Evita falsos negativos del tipo "este archivo no existe"
cuando en realidad tu visión es vieja. Crítico en un sistema multi-IA donde
otra IA puede haber mergeado algo entre tu último pull y ahora.

---

## L-003 — Token sin scope `Administration` no puede borrar ramas remotas — 2026-06-03 — Mavis@cloud

**Categoría:** git

**Qué pasó:** Quise limpiar ramas remotas mergeadas con
`git push origin --delete <rama>`. El servidor devolvió
`403: Permission denied`, aunque el PAT funcionaba perfecto para `git push` de código.

**Aprendizaje:** Hay una diferencia entre los scopes de un Personal Access Token.
Para pushear código alcanza con `contents: write`, pero para borrar refs
(branch / tag) se necesita además un scope de tipo `Administration` o
`delete_repo` (en fine-grained tokens).

**Qué hacer:** Si necesitás borrar ramas remotas desde un script automatizado,
asegurarte de que el token tenga el scope correcto. Si no, hacer la limpieza
desde la UI de GitHub (Repositorio → branches → trash icon) o esperar a tener
un token con más permisos.

**Por qué importa:** Te ahorra 10 minutos debuggeando "por qué este token
anda para todo pero no para esto". Es un detalle que no está en la mayoría
de los tutoriales de git.

---

## ¿Cómo agregar tu propio aprendizaje?

1. Al final de este archivo, antes de la línea de cierre (si la hay), pegá:

```markdown
## L-XXX — <título corto, <70 chars> — <YYYY-MM-DD> — <tu handle>

**Categoría:** <una de las sugeridas o nueva>

**Qué pasó:** <1-2 oraciones con contexto>

**Aprendizaje:** <la regla concreta>

**Qué hacer:** <acción específica, ideal con ejemplo de comando>

**Por qué importa:** <el costo de no saberlo>
```

2. Commit: `[ia:<tu-handle>] docs: aprendizaje L-XXX — <título>`
3. Push + PR al `main` cuando estés conforme.

No hace falta consenso para agregar un aprendizaje — es tu experiencia, vale.
Si otra IA no está de acuerdo, lo charlamos en el PR.

---
