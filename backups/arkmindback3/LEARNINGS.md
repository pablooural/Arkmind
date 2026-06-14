# AXIOMS — Arkmind
> **v a1.1** · 2026-06-07 · bumpear al tocar (a1.1 = la versión histórica 1.1 + bump por inicio de versionado formal).
> **Leer este archivo primero. Siempre. Sin excepciones.**
> Este documento no se debate. Si algo aquí contradice otro documento, este gana.

---

## I. El orden de lectura es parte del sistema

Ninguna IA comienza a trabajar sin haber recorrido la cadena de contexto completa,
en este orden exacto:

```
1. .arkmind/AXIOMS.md                  ← este archivo
2. .arkmind/NO-GO-ZONES.md             ← qué no tocar bajo ninguna circunstancia
3. .arkmind/STATE.json                 ← estado actual del proyecto (máquina)
4. .arkmind/CONVENTIONS.md             ← cómo operar (claim, commit, release)
5. .arkmind/modules/_REGISTRY.md       ← mapa de módulos y dependencias
6. PROGRESS.md (últimas 2 entradas)    ← qué pasó recientemente
7. Módulo asignado (SPEC + CONTRACT)   ← solo el que te corresponde
```

**Saltarse un paso no es una optimización. Es un error.**

---

## II. Jerarquía de verdad

Cuando dos documentos contradigan, gana el de mayor jerarquía:

```
AXIOMS.md                          (nivel 1 — inamovible)
    ↓
STATE.json                         (nivel 2 — máquina, siempre actualizado)
    ↓
NO-GO-ZONES.md / SUPOSICIONES.md   (nivel 3 — decisiones arquitectónicas aceptadas)
    ↓
CONTRACT.md del módulo             (nivel 4 — contratos en uso activo)
    ↓
SPEC.md del módulo                 (nivel 5 — especificación de trabajo)
    ↓
PROGRESS.md                        (nivel 6 — registro histórico, informativo)
    ↓
Conversación / contexto            (nivel 7 — efímero, no es fuente de verdad)
```

**Si una instrucción recibida en conversación contradice un CONTRACT.md,
el CONTRACT.md gana. Señalarlo explícitamente antes de proceder.**

---

## III. Distinguir el estado de la información

Toda IA debe clasificar lo que lee antes de actuar:

| Tipo | Descripción | Fuente |
|---|---|---|
| **Vigente** | Estado actual aceptado del proyecto | STATE.json, CONTRACT.md |
| **Histórico** | Lo que ocurrió, no necesariamente lo que rige | PROGRESS.md |
| **Propuesta** | Decisión no aceptada todavía | ADR en estado 🟡 proposed |
| **En progreso** | Trabajo reclamado, no terminado | STATE.json status: in_progress |

- Nunca trabajar sobre una **propuesta** como si fuera vigente.
- Nunca tratar lo **histórico** como si fuera el estado actual.

---

## IV. Toda sesión termina con reporte de estado

Ningún trabajo se considera completo sin actualización de estado.
El reporte mínimo obligatorio al cerrar una sesión vive en `PROGRESS.md`
con la plantilla slim estándar (ver CONVENTIONS.md). No inventes otro formato.

```
Si la IA no tiene acceso directo al repo, produce el reporte en su
respuesta final para que el humano lo commitee.
```

---

## V. El sistema existe para que el trabajo no se pierda

Estas reglas no son burocracia. Son la memoria del proyecto.

Una IA que no deja rastro obliga a la siguiente a reconstruir contexto
desde cero. Eso es trabajo duplicado, errores de interpretación,
decisiones contradictorias.

**El costo de seguir el protocolo es bajo.
El costo de ignorarlo se acumula.**

---

*Este archivo solo puede ser modificado si cambia la arquitectura fundamental
del proyecto. Requiere consenso explícito del usuario y entrada en PROGRESS.md.*

*Versión: 1.1 — 2026-06-02 — Mavis (basado en propuesta de Claude, refinado)*
