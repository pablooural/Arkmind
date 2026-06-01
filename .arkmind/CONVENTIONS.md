# 📐 Convenciones de Coordinación — Arkmind

> **El contrato entre IAs.** Léelo entero antes de empezar un paso.
> Si algo no encaja, pregunta, no improvises.

## 🚦 Flujo de un paso (sesión)

```
┌──────────────────────────────────────────────────────────────┐
│  1. INICIO                                                    │
│     • Leer STATE.json                                         │
│     • Leer .arkmind/NO-GO-ZONES.md                            │
│     • Leer entrada anterior de PROGRESS.md (la del paso previo)│
│     • grep "🔒 CLAIMED" PROGRESS.md — si hay <2h, NO empezar   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  2. CLAIM                                                     │
│     • Editar .arkmind/STATE.json:                             │
│         status: "in_progress"                                 │
│         claimedBy: "<tu-nombre>"                              │
│         claimedAt: "<iso8601>"                                │
│     • Añadir línea en PROGRESS.md:                            │
│         ### 🔒 CLAIMED — Paso N — <título> — <IA> — <iso>     │
│     • git add + commit                                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  3. TRABAJO                                                   │
│     • Tocar código solo en archivos autorizados               │
│     • Si necesitas tocar un NO-GO → parar y abrir ADR         │
│     • Si te bloqueas → actualizar PROGRESS con "🚧 blocked"  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  4. CIERRE                                                    │
│     • Rellenar entrada del paso en PROGRESS.md (formato slim) │
│     • Editar STATE.json:                                      │
│         status: "done" | "partial" | "blocked"                │
│         claimedBy: null                                       │
│         claimedAt: null                                       │
│         append entrada a stepHistory                          │
│     • git add + commit con convención de mensaje              │
│     • Añadir línea en PROGRESS.md:                            │
│         ### 🔓 RELEASED — Paso N — <iso>                      │
└──────────────────────────────────────────────────────────────┘
```

## 🌿 Ramas

Una rama por paso, no por IA. Varias IAs pueden trabajar en pasos distintos
en paralelo si están en archivos sin solape.

**Formato:** `ia/<ia-name>/paso-<n>-<slug-corto>`

**Ejemplos:**
- `ia/mavis/paso-1-snapshot-persistence`
- `ia/claude/paso-2-rollback`
- `ia/otra/paso-3-spec-discrepancies`

**Merge a `main`:** manual al cerrar el paso. Si hay conflicto, ganará el
último commit; revisar antes de merge.

## 💬 Commits

**Formato:** `[ia:<nombre>][paso-<n>] <tipo>: <descripción corta>`

**Tipos (conventional commits simplificado):**
- `feat` — nueva funcionalidad
- `fix` — corrección
- `refactor` — cambio interno sin cambio de comportamiento
- `docs` — solo documentación
- `chore` — tooling, config, etc.
- `wip` — work in progress (NO mergear a main, solo pushear a la rama)

**Ejemplos:**
```
[ia:mavis][paso-1] feat: snapshotStore con IndexedDB transaccional
[ia:mavis][paso-1] refactor: SnapshotManager con hidratacion lazy
[ia:mavis][paso-1] chore: PROGRESS + STATE + NO-GO-ZONES
[ia:claude][paso-2] feat: rollback real con validacion post-condicion
```

## 📁 Estructura de archivos de coordinación

```
Arkmind/
├── .arkmind/
│   ├── STATE.json              ← estado actual (machine-readable, incluye openQuestions)
│   ├── NO-GO-ZONES.md          ← zonas prohibidas
│   ├── SUPOSICIONES.md         ← creencias estables del proyecto (A1, A2, ...)
│   ├── CONVENTIONS.md          ← este archivo
│   └── decisions/              ← ADRs (uno por decisión arquitectural gorda)
│       └── NNNN-titulo.md
├── PROGRESS.md                 ← log narrativo append-only
└── (resto del proyecto)
```

## 📝 Plantilla slim para entradas de PROGRESS.md

```markdown
## Paso N — <título corto> — <fecha> — <IA>

**STATUS:** ✅ done | ⚠️ partial | ❌ blocked

**TOUCHED:**
- `ruta/al/archivo.ts` — qué se hizo (1 línea)

**VERIFIED:** qué se probó
**NOT VERIFIED:** qué queda pendiente de probar

**DECISIONS:**
- (1-2 frases, máx 3 bullets)

**HANDOFF:** (para la siguiente IA)
- Qué necesita saber
- Por dónde empezar

**PROBLEMS / BLOCKERS:** (vacío si no hay)
- (…)
```

## 🧠 ADRs (Architectural Decision Records)

Para decisiones gordas que afectan a varios archivos o a la arquitectura. Las
pequeñas viven en el DECISIONS de la entrada del PROGRESS.

**Cuándo abrir un ADR:**
- Cambia la forma de un tipo compartido (NO-GO-ZONES lo activa)
- Introduce un nuevo provider / abstracción
- Decide el almacenamiento de algo (IndexedDB vs FS vs ambos)
- Modela la IA como opcional, etc.

**Cuándo NO:**
- Detalles de implementación locales
- Refactors que no cambian contratos
- Bugs fixes

**Formato del archivo:** `.arkmind/decisions/NNNN-titulo-en-kebab.md`

```markdown
# NNNN. <Título de la decisión>

**Fecha:** YYYY-MM-DD
**Estado:** 🟡 proposed | ✅ accepted | ❌ rejected | 🔄 superseded

## Contexto
<qué problema resuelve, 2-3 párrafos>

## Decisión
<qué se decidió, 1 párrafo>

## Consecuencias
**Positivas:** …
**Negativas:** …
**Riesgos:** …
```

## 🚨 Reglas de oro

1. **Nunca trabajes en `main` directamente.** Siempre en tu rama `ia/<nombre>/paso-N-...`.
2. **No asumas que "no hay nadie más".** Siempre lee STATE.json y haz grep de CLAIMED.
3. **Si rompes un archivo que otra IA marcó como "no tocar", para y deja nota.** No arregles en silencio.
4. **El PROGRESS.md es append-only.** No borres entradas anteriores.
5. **El STATE.json es la verdad consultable.** Si el markdown y el JSON discrepan, el JSON gana para decisiones de coordinación.
6. **Si dudas, claim y pregunta.** Es mejor decir "estoy en ello, ¿alguien más está?" que chocar.

## ❓ Sobre las "Preguntas Abiertas"

`STATE.json` tiene un campo `openQuestions[]` para cosas que **no bloquean** el paso
actual pero conviene resolver. Diferencia importante:

- **Bloqueos (`blockedOn`)** → no puedes seguir sin resolverlos. Reclamar el paso o pedir ayuda.
- **Problemas (`PROBLEMS / BLOCKERS` en PROGRESS)** → algo falló durante el trabajo.
- **Preguntas abiertas (`openQuestions` en STATE)** → cuestiones que vemos a futuro y conviene no olvidar.

Cuando una pregunta abierta se resuelva, se mueve a un ADR y se elimina del array.
