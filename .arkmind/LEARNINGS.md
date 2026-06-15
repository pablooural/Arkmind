# 📚 Aprendizados del equipo — Arkmind
> **v a1.0** · 2026-06-07 · bumpear al tocar. (L-001..L-003 son los seeds, no cuentan como bump).

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

## L-004 — Sección "Smoke tests" opcional en STATUS.md de módulos done — 2026-06-04 — Aria

**Categoría:** coordinación

**Qué pasó:** Al llegar a un módulo `done` (ej. `runtime-persistence`), el STATUS.md tiene una sección VERIFIED con cosas como "consistencia de stores" o "patrón de hidratación unificado". Esas son verificaciones del **implementador**, no de la **próxima IA**. Cuando quiero usar un módulo ya hecho, no tengo forma rápida de saber: "¿qué métodos puedo llamar sin romper nada?", "¿esto es idempotente?", "¿qué pasa si lo llamo antes de que exista IDB?".

**Aprendizaje:** Cada módulo `done` puede incluir (opcional) una mini-sección `## Smoke tests (safe to call)` con 1-3 ejemplos de uso concreto que la siguiente IA puede correr sin pensar. Es distinto de VERIFIED:

- **VERIFIED** = lo que el autor **probó** (pasado, del que cerró el módulo).
- **Smoke tests** = lo que la próxima IA **puede correr** (futuro, para quien llega).

**Qué hacer:** Al cerrar un módulo, agregar al final de STATUS.md (opcional, no obligatorio):

```markdown
## Smoke tests (safe to call)

- `<método o llamada>` — qué hace en 1 línea y por qué es safe
- `<método o llamada>` — caveat si tiene alguno (ej. "idempotente, pero requiere `hydrate()` primero")
- ...
```

Ejemplo concreto para `runtime-persistence`:

```markdown
## Smoke tests (safe to call)

- `await coreEngine.hydrateAll()` — al inicio de la app; idempotente
- `coreEngine.sessions.list()` — devuelve array; vacío si no hay sesiones; nunca falla
- `coreEngine.visual.getActive()` — puede devolver `null` si no hay panel activo (safe)
- `coreEngine.opJournal.add(entry)` — fire-and-forget; errores van a `console.error`, no cortan el flujo
```

**Por qué importa:** Acelera la siguiente sesión. Sin esto, la siguiente IA pierde 5-10 minutos en ensayo/error sobre "qué se rompe si llamo a esto?". Con 1-3 ejemplos seguros, arranca directo. No reemplaza VERIFIED — lo complementa desde el otro lado (autor vs lector).

**Nota:** esto NO va a CONVENTIONS.md como sección obligatoria. Es una sugerencia operativa. Si el equipo lo adopta masivamente, se puede formalizar después.

---

## L-005 — `STATE.json` local puede estar desactualizado vs `origin/main` — 2026-06-10 — Aria

**Categoría:** git

**Qué pasó:** Reclamé el módulo `ia-context-bridge` basándome en `STATE.json` local y en `git log --oneline -15` local. El módulo estaba `pending` en mi visión local. Pero mientras yo trabajaba, main recibió un PR mergeado (PR #16, Mavis@cloud) que implementaba exactamente lo mismo: `ia-context-bridge.ts` con `ContextEnricher.captureActiveContext()`, `AIRequest` extendido, `AIManager.propose()` añadido, ADR 0007 a `accepted`. Mi rama terminó 18 commits atrás con `add/add` conflicts. El PR #15 quedó sin mergear.

**Aprendizaje:** `STATE.json` y el `git log` local reflejan `main` **en el momento del último `git fetch`**, no el estado real del repo en GitHub en este instante. Si otra IA mergea entre tu último fetch y tu claim, vos no lo ves. El pre-claim check de CONVENTIONS §1.5 dice "verificar rama actual + PRs abiertos", pero la verificación tiene que ser **contra `origin/main`**, no contra `main` local.

**Qué hacer:** Antes de reclamar un módulo, hacer siempre:

```bash
git fetch origin
git log --oneline origin/main -20        # ver los últimos 20 commits REALES de main
gh pr list --state open                  # ver PRs abiertos (o vía API)
```

Y si en los últimos 20 commits ves algo del dominio de tu módulo (otro `ia-context-bridge` mergeado, otro ADR aceptado sobre el mismo gap, etc.), **pará y avisale a Pablo** antes de reclamar. Es preferible "che, esto ya está hecho" que duplicar trabajo.

**Por qué importa:** El `STATE.json` y el `git log` local son snapshots desactualizados. Confiar ciegamente te lleva a hacer trabajo que otra IA ya hizo. Y el peor resultado no es "trabajo duplicado en abstracto" — es "PR que no se puede mergear por `add/add` conflict con archivos que ya existen en main". Eso es lo que más duele: tu trabajo queda como rama zombie, y cerrar el PR requiere explanation comment para no contaminar el log.

---

## L-006 — Auditar el estado del repo en 5 comandos (para Pablo y para IAs) — 2026-06-15 — Aria

**Categoría:** coordinación

**Qué pasó:** Pablo admitió "no sé demasiado de ese tema de los merges, etc... a veces no sé ni cómo estoy haciendo esto". El sistema multi-IA funciona, pero auditar el estado del repo (qué hay mergeado, qué PRs abiertos, qué hay en mi local) requiere saber 5-6 comandos git + un par de API calls. Lo bajo a un único bloque copy-paste.

**Aprendizaje:** un "snapshot de auditoría" reproducible en 30 segundos le da a Pablo (o a una IA que llega sin contexto) la foto del repo sin tener que recordar comandos. No es automatización (no es un cron), es **un procedimiento documentado**.

**Qué hacer — copiar y pegar en bash:**

```bash
cd /ruta/al/repo
echo "=== 1. Estado local ==="
git status --short
git branch --show-current
echo ""
echo "=== 2. ¿Main local al día? ==="
git fetch origin 2>&1 | tail -3
git rev-list --left-right --count main...origin/main
echo "(0 0 = al día; 0 N = N commits atrás)"
echo ""
echo "=== 3. PRs abiertos ==="
gh pr list --state open 2>/dev/null || \
  curl -s -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/pablooural/Arkmind/pulls | \
    python3 -c "import sys, json; [print('#{} [{}]  {} -> {}'.format(p['number'], p['state'], p['head']['ref'], p['base']['ref'])) for p in json.load(sys.stdin)]"
echo ""
echo "=== 4. Últimos 10 commits en main ==="
git log origin/main --oneline -10
echo ""
echo "=== 5. Mis commits sin pushear ==="
git log origin/HEAD..HEAD --oneline 2>/dev/null | head -5 || \
  echo "(verificar con git status)"
```

**Por qué importa:** Pablo puede correr ese bloque cuando dude, y la siguiente IA puede correrlo al llegar. Es la "puerta de entrada" al repo. Mucho más rápido que recordar 6 comandos separados, y produce un output uniforme que se puede compartir por chat o pegar en un issue.

**Limitación conocida:** `gh pr list` requiere el CLI de GitHub autenticado. Si no está, el bloque usa curl + API (más lento pero funciona con solo el token).

**Nota:** esto NO va a CONVENTIONS.md como sección obligatoria. Es un script de ayuda. Si el equipo lo usa mucho, se puede formalizar en `.arkmind/scripts/audit.sh`.
