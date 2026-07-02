# 📚 Aprendizados del equipo — Arkmind
> **v a1.1** · 2026-07-02 · bumpear al tocar. (L-001..L-003 son los seeds, no cuentan como bump). L-008..L-010: aprendizados del plan de tests del core, sistema mutex, vi.spyOn para singletons.

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

## L-007 — Si `generateId` usa separador X, todos los `startsWith` deben usar X — 2026-06-18 — Aria

**Categoría:** runtime

**Qué pasó:** Auditando `memory.ts` (después de T-023 de Mavis que migró lectura a IDB), encontré un bug silencioso en `MemoryManager.hydrate()`. La función recorría los registros de IDB y discriminaba por prefijo del ID:

```ts
if (r.id.startsWith("wkmem:")) {           // ← OK
  this.workingMemories.set(...);
} else if (r.id.startsWith("cogsnap:")) {  // ← ❌ con dos puntos
  this.cognitiveSnapshots.set(...);
}
```

Pero `generateId("cogsnap")` retorna `` `${prefix}_${Date.now()}_${random}` `` — **con guion bajo**, no dos puntos. Las otras 2 ocurrencias del archivo (`listCognitiveSnapshots` y `invalidateOldSnapshots`) sí usaban `"cogsnap_"` correctamente. Solo `hydrate` quedó desfasado. Resultado: al iniciar el runtime, los cognitive snapshots quedaban escritos en IDB pero **no se cargaban al `cognitiveSnapshots` Map en RAM** — invisibles para el resto del `MemoryManager`. Bug silencioso, sin error de compilación, sin excepción, sin nada en consola.

**Aprendizaje:** cuando un módulo define un formato de ID (un prefijo + un separador como `:`, `_`, `-`), **todos los call sites que parsean/filtran por prefijo deben usar ese mismo separador**. Si en el mismo archivo ves 2+ separadores distintos para el mismo prefijo, es bug. Es el tipo de error que sobrevive a una migración (en este caso la migración localStorage→IDB de T-023) sin ser detectado, porque la migración cambió el comportamiento pero mantuvo el código "parecido" al original.

**Qué hacer — auditoría de consistencia de prefijos, 1 grep:**

```bash
# Reemplazar "cogsnap" por el prefijo que estés auditando
grep -n 'startsWith("cogsnap' artifacts/ux-arquitecto/src/core/memory.ts
# Si la salida tiene 2+ separadores distintos (":" vs "_"), es bug.
```

**Regla mnemónica:** para cada `generateId(prefix)`, `grep` todos los call sites de `startsWith("${prefix}")` y `endsWith("${prefix}")` y verificar consistencia carácter por carácter. Si hay mismatch, fix de 1 línea.

**Por qué importa:** sin este chequeo, bugs de este tipo sobreviven indefinidamente. La IA que implementó `hydrate` y la que migró a IDB nunca se cruzaron en git blame; el bug quedó en tierra de nadie. Como próxima IA, este grep te lleva 5 segundos y puede salvarte un merge de un fix silencioso en producción.

**Nota:** el fix del PR (`ia/aria/fix-cogsnap-hydrate`) cambió `cogsnap:` por `cogsnap_` en `hydrate()`. Es seguro porque `generateId("cogsnap")` ya retornaba con guion bajo — no rompe ningún ID existente en IDB, solo arregla que se lean.

**Conexión con L-005:** L-005 decía "verificar contra `origin/main` antes de reclamar". Esto es más chiquito pero complementario: "verificar consistencia interna del archivo antes de mergear". Mismo espíritu: 1 grep te ahorra horas de debugging futuro.


## L-008 — `Promise.resolve().then` no espera a que la transacción IDB complete — 2026-07-02 — @mavis-cloud (coordinador tests)

**Qué pasó:** Escribí `_idbMock.ts` con `Promise.resolve().then(() => txn._complete())` para simular que `tx.oncomplete` se dispara cuando la transacción termina. En mis primeros tests parecía funcionar. Subí el PR. Replit corre los tests, fallan 3: `deleteSnapshot`, `deleteByContext`, y cualquier test que dependa de `await txToPromise(tx)` dentro de un método que ya había iniciado otras operaciones en otra tx anterior.

**Por qué importa:** `Promise.resolve().then(...)` se encola en el microtask queue AHORA. Pero el `tx.oncomplete` que setea el código real se ejecuta DESPUÉS de que `store.put/delete` se haya completado, lo cual ocurre también en el microtask queue. La diferencia de orden es por tick. En algunos tests parece que funciona, en otros hace timeout (~5s por defecto en vitest) y muere. **Los tests pasaban donde nada concurría, fallaban donde había otra tx antes en el mismo test.**

**Solución (gracias a @replit-agent, PR #57):** cambiar `Promise.resolve().then(...)` por `setTimeout(0, ...)`. El setTimeout va al final del task queue, después de todos los microtasks. Así `tx.oncomplete` se dispara DESPUÉS de que cualquier promise pendiente de la tx se haya resuelto.

**Lección para las próximas IAs:**
- Si mockeás `tx.oncomplete` o cualquier callback async, **`setTimeout(0)` no `Promise.resolve().then()`**. El primero respeta el orden de eventos, el segundo se entromete.
- O, mejor todavía, no mockees IDB a mano: usá `fake-indexeddb` (librería npm estándar). Pero para el proyecto chico, el mock casero es suficiente SI respetás este detalle.
- Cuando un test pasa en tu máquina pero falla en CI, pensá en timing. Probablemente sea esto.

**Conexión con L-001 (git operations):** mismo principio: las IAs que trabajamos en distintas zonas del repo podemos no enterarnos de un bug que la otra arregló. Mi `_idbMock` hubiera quedado mal para siempre si Replit no hubiera corrido los tests en su entorno. **Siempre corré tests en CI, no confíes solo en tu sandbox.**


## L-009 — El sistema mutex funciona, pero solo si TODAS las IAs lo usan — 2026-07-02 — @mavis-cloud

**Qué pasó:** T-055 mergeó el sistema mutex (`CLAIMS.json` + `claim.sh`). Pablo lo aprobó. Pero al revisar `git log` vi que @aria mergeó 2 PRs después (T-056 Worker, S011 docs) y **no actualizó `CLAIMS.json`**. Yo usé `claim.sh` para T-050, T-051, T-053, T-054, T-052. @replit-agent también lo usó (vi en `.arkmind/STATE.json` que registró `t-047-test-fixes`). @aria no.

**Por qué importa:** el mutex no es solo un script, **es un acuerdo social**. Si una sola IA no lo usa, las otras pueden clamar tarjetas que ella está tocando. En el caso de T-056 y S011, @aria trabajó sola y no pisó a nadie, así que no hubo conflicto. Pero **es cuestión de tiempo**.

**Acción para todos:**
- Cada IA, cuando arranca una tarjeta nueva, corre `./claim.sh claim T-XXX "desc" "branch" "files"`. **Toma 5 segundos.**
- Si ves conflictos en `CLAIMS.json` durante un rebase, **no los borres**: significa que dos IAs trabajaron en paralelo, hay que combinar.
- Si tu tarjeta es chica (1 sesión) y no hay riesgo de pisar, podés no usar claim. Pero si vas a crear una rama nueva **siempre** usá claim, así las demás saben que esa rama está tomada.

**Lección:** la infraestructura técnica existe, pero depende de la adopción voluntaria. La próxima IA que ve esto: si no usás claim.sh, animate. Si ves otra IA que no lo usa, dejale el comentario en su commit/PR — sin drama, solo "veníamos usando claim.sh, sumate". Es un pacto del equipo.


## L-010 — Tests con módulos singleton requieren `vi.spyOn`, no reasignación directa — 2026-07-02 — @mavis-cloud

**Qué pasó:** Para testear `transactionManager.executeTransaction`, necesito que `webFilesystemProvider.writeFile` devuelva `success: false` en un test y `success: true` en otro. Mi primer instinto fue `webFilesystemProvider.writeFile = vi.fn(...)`. **No funcionó** — el código ya capturó la referencia al método original en el closure del manager.

**Solución:** usar `vi.spyOn(webFilesystemProvider, "writeFile").mockImplementation(...)`. Esto wrappea el método en el objeto, no lo reemplaza en una copia. El código que ya tenía la referencia sigue viendo `obj.writeFile(...)` que ahora apunta al spy.

**Lección:**
- Vitest/Jest con ESM y módulos singleton: **siempre `vi.spyOn(objeto, "método")`**.
- Si necesitás volver al original entre tests, `vi.restoreAllMocks()` en `afterEach`.
- Si necesitás resetear el call count, `.mockClear()`.
- Si querés mockear la implementación (no solo el return), `.mockImplementation(fn)`.

**Conexión con L-008:** misma idea: cuando algo no anda, no es magia, es el sandbox/ESM/singletons haciendo lo que hacen. La doc de vitest es clara sobre esto, pero yo no la leí antes de probar. Otra IA que mockee singletons: `vi.spyOn` primero.