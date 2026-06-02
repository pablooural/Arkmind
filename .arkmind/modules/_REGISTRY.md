# Arkmind — Registro de Módulos

Índice consultable por cualquier IA antes de empezar a trabajar.
**Léelo para entender el mapa completo del proyecto.**

**Regla:** si vas a tocar un módulo, verifica su `STATUS.md` primero.

---

## Mapa de módulos

| Módulo | Estado | IA actual | Depende de | ADR |
|---|---|---|---|---|
| `snapshot-store` | ✅ done | Mavis | — | 0001 |
| `rollback-engine` | ✅ done | Mavis@cloud | `snapshot-store` | 0002 (accepted) |
| `op-journal` | ✅ done | Manus@delta | `rollback-engine` | 0006 |
| `runtime-persistence` | 🔵 in_progress | Manus@delta | `op-journal` | 0005 (proposed) |
| `spec-discrepancies` | ✅ done | Aria | — | 0003-0004 (accepted); 0005 fuera de alcance |

### Leyenda
- ✅ done — implementado y verificado
- 🔵 in_progress — reclamado, en trabajo activo
- 🟡 pending — listo para reclamar
- ⚠️ partial — implementado pero con deuda conocida
- ❌ blocked — bloqueado por dependencia o decisión pendiente

---

## Estructura de archivos por módulo

```
.arkmind/modules/
  _REGISTRY.md              ← este archivo
  snapshot-store/
    SPEC.md                 ← qué se construyó y límites
    CONTRACT.md             ← qué consume y qué expone
    STATUS.md               ← estado actual y handoff
  rollback-engine/
    SPEC.md
    CONTRACT.md
    STATUS.md
  op-journal/
    SPEC.md
    CONTRACT.md
    STATUS.md
  spec-discrepancies/
    SPEC.md
    CONTRACT.md
    STATUS.md
```

---

## Qué entregar a una IA para que trabaje en un módulo

Si la IA **NO tiene acceso al repo**, pegarle exactamente esto (en este orden):

1. `.arkmind/AXIOMS.md` — para saber las reglas duras
2. `.arkmind/NO-GO-ZONES.md` — para saber qué no tocar
3. `.arkmind/modules/_REGISTRY.md` — para contexto global
4. `SPEC.md` del módulo asignado — para saber qué construir
5. `CONTRACT.md` del módulo asignado — para conocer las interfaces
6. Los tipos relevantes de `core/types.ts` — fuente de verdad del modelo
7. El código actual del archivo que va a modificar

**No hace falta más.** Con eso puede construir su módulo de forma aislada.

---

## Cómo añadir un módulo nuevo

1. Crear carpeta `.arkmind/modules/<nombre>/`
2. Copiar las tres plantillas vacías (SPEC, CONTRACT, STATUS)
3. Completar SPEC y CONTRACT **antes** de asignar a ninguna IA
4. Añadir fila en este registro
5. Commit: `[ia:<nombre>] docs: nuevo módulo <nombre>`

---

## Cómo cerrar un módulo

1. Editar `STATUS.md` del módulo → cambiar estado, completar **Notas de handoff**
2. Editar `.arkmind/STATE.json` → reflejar cambio
3. Editar `_REGISTRY.md` → actualizar fila
4. Añadir entrada en `PROGRESS.md` con la plantilla slim
5. Commit siguiendo la convención de CONVENTIONS.md

---

*Última actualización: 2026-06-02 — Aria (spec-discrepancies done, ADRs 0003+0004 accepted, Q2 resuelta, rama ia/aria/spec-discrepancies)*
