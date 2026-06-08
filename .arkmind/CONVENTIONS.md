# 📐 Convenciones de Coordinación — Arkmind
> **v a4.0** · 2026-06-07 · bumpear al tocar. (a4.0 = la versión histórica v4 + bump por inicio de versionado formal; corresponde al merge de "pre-claim check" del 2026-06-04).

> **El contrato entre IAs.** Léelo entero antes de empezar un módulo.
> Si algo no encaja, pregunta, no improvises.
>
> **Lee primero:** `.arkmind/AXIOMS.md` (las reglas duras) y `.arkmind/NO-GO-ZONES.md` (qué no tocar).

---

## 🚦 Flujo de un módulo (sesión)

```
┌──────────────────────────────────────────────────────────────┐
│  1. INICIO — orden de lectura obligatorio (ver AXIOMS §I)    │
│     1. AXIOMS.md                                              │
│     2. NO-GO-ZONES.md                                         │
│     3. STATE.json                                             │
│     4. CONVENTIONS.md  ← este archivo                         │
│     5. modules/_REGISTRY.md                                  │
│     6. PROGRESS.md (últimas 2 entradas)                       │
│     7. SPEC + CONTRACT del módulo asignado                    │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  1.5 PRE-CLAIM CHECK — antes de reclamar un módulo           │
│     1. Leer README del proyecto (presentación y orientaciones)│
│     2. Leer STATUS.md del módulo objetivo                    │
│     3. Verificar rama actual:                                │
│        git branch -a && git fetch --all --prune               │
│     4. Verificar si hay trabajo pendiente de merge:          │
│        git log --oneline --graph --all -20                    │
│        abrir PRs en GitHub y mirar si hay alguno abierto      │
│     5. Recién después, reclamar (paso 2)                      │
│                                                                │
│     ¿Por qué? Evita:                                          │
│       - reclamar un módulo que ya hizo otra IA                │
│       - pisar trabajo pendiente de merge                      │
│       - empezar sin saber el estado real del módulo           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  2. CLAIM                                                     │
│     • Editar .arkmind/STATE.json:                             │
│         modules["<nombre>"].status = "in_progress"            │
│         modules["<nombre>"].claimedBy = "<tu-nombre>"          │
│         modules["<nombre>"].claimedAt = "<iso8601>"            │
│     • Editar .arkmind/modules/<nombre>/STATUS.md:             │
│         Estado: 🔵 in_progress, IA asignada, rama            │
│     • git add + commit:                                      │
│         [ia:<nombre>] chore: claim <module>                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  3. TRABAJO                                                   │
│     • Tocar código SOLO en archivos listados en               │
│       SPEC.md → "Files this module CAN touch"                 │
│     • Si necesitas tocar un NO-GO → parar y abrir ADR         │
│     • Si te bloqueas → actualizar STATUS.md + PROGRESS.md     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  4. CIERRE                                                    │
│     • Rellenar entrada slim en PROGRESS.md                    │
│     • Editar STATUS.md del módulo → estado final + handoff    │
│     • Editar STATE.json → status, claimedBy: null             │
│     • Editar modules/_REGISTRY.md → fila actualizada          │
│     • git add + commit con convención de mensaje              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌿 Ramas

Una rama por módulo, no por IA. Varias IAs pueden trabajar en módulos distintos
en paralelo si están en archivos sin solape.

**Formato:** `ia/<ia-name>/<module-name>`

**Ejemplos:**
- `ia/mavis/snapshot-store`
- `ia/claude/rollback-engine`
- `ia/otra/op-journal`

**Merge a `main`:** manual al cerrar el módulo. Si hay conflicto, revisar antes.

---

## 💬 Commits

**Formato:** `[ia:<nombre>] [<module>] <tipo>: <descripción corta>`

**Tipos (conventional commits simplificado):**
- `feat` — nueva funcionalidad
- `fix` — corrección
- `refactor` — cambio interno sin cambio de comportamiento
- `docs` — solo documentación
- `chore` — tooling, config, housekeeping (claims, releases)
- `wip` — work in progress (NO mergear a main, solo pushear a la rama)

**Ejemplos:**
```
[ia:mavis] [snapshot-store] feat: SnapshotStore con IndexedDB transaccional
[ia:mavis] [snapshot-store] refactor: SnapshotManager con hidratacion lazy
[ia:claude] [rollback-engine] feat: rollback con RollbackResult discriminado
[ia:claude] chore: claim rollback-engine
[ia:mavis] chore: release rollback-engine
```

---

## 📁 Estructura de archivos de coordinación

```
Arkmind/
├── .arkmind/
│   ├── AXIOMS.md              ← reglas duras (nivel 1, inamovible)
│   ├── STATE.json             ← estado actual (machine-readable, nivel 2)
│   ├── NO-GO-ZONES.md         ← zonas prohibidas (nivel 3)
│   ├── SUPOSICIONES.md        ← creencias estables (nivel 3)
│   ├── CONVENTIONS.md         ← este archivo
│   ├── decisions/             ← ADRs (uno por decisión arquitectural gorda)
│   │   └── NNNN-titulo.md
│   └── modules/               ← un directorio por módulo
│       ├── _REGISTRY.md
│       └── <module>/
│           ├── SPEC.md
│           ├── CONTRACT.md
│           └── STATUS.md
├── PROGRESS.md                ← log narrativo append-only (nivel 6)
└── (resto del proyecto)
```

---

## 📝 Plantilla slim para entradas de PROGRESS.md

```markdown
## <module> — <título corto> — <fecha> — <IA>

**STATUS:** ✅ done | ⚠️ partial | ❌ blocked

**TOUCHED:**
- `ruta/al/archivo.ts` — qué se hizo (1 línea)

**VERIFIED:** qué se probó
**NOT VERIFIED:** qué queda pendiente de probar

**DECISIONS:**
- (1-2 frases, máx 3 bullets; las gordas van a `.arkmind/decisions/`)

**OPEN QUESTIONS:** (preguntas que no bloquean pero conviene resolver)
- … (o "ninguna")

**HANDOFF:** (para la siguiente IA)
- Qué necesita saber
- Por dónde empezar

**PROBLEMS / BLOCKERS:** (vacío si no hay)
- (…)
```

---

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
- Bug fixes

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

---

## 🚨 Reglas de oro

1. **Sigue el orden de lectura de AXIOMS §I.** Sin saltarte pasos.
2. **Nunca trabajes en `main` directamente.** Siempre en tu rama `ia/<nombre>/<module>`.
3. **No asumas que "no hay nadie más".** Lee STATE.json y mira el estado del módulo.
4. **Si rompes un archivo que otra IA marcó como "no tocar", para y deja nota.** No arregles en silencio.
5. **El PROGRESS.md es append-only.** No borres entradas anteriores.
6. **El STATE.json es la verdad consultable.** Si el markdown y el JSON discrepan, el JSON gana para coordinación.
7. **Jerarquía AXIOMS §II gana para contradicciones.** Si conversación contradice CONTRACT, CONTRACT gana.
8. **Si dudas, claim y pregunta.** Es mejor decir "estoy en ello, ¿alguien más está?" que chocar.

---

## ❓ Sobre las "Preguntas Abiertas"

`STATE.json` tiene un campo `openQuestions[]` para cosas que **no bloquean** el módulo
actual pero conviene resolver. Diferencia importante:

- **`modules["x"].status: "blocked"`** → no puedes seguir sin resolverlo
- **`PROBLEMS / BLOCKERS` en PROGRESS** → algo falló durante el trabajo
- **`openQuestions` en STATE** → cuestiones a futuro, no bloquean

Cuando una pregunta abierta se resuelve, se mueve a un ADR y se elimina del array.
