# 📬 Buzón de Sugerencias — Arkmind
> **v a1.0** · 2026-06-07 · bumpear al tocar. (S001..S007 son las semillas).
> **v a1.1** · 2026-06-08 · bumpear: agregar regla de acceso por alias (lectores designados: @pablo y @mavis-cloud).

> **El lugar donde se archivan ideas de mejora al sistema de coordinación, al
> proyecto, o features que no son urgentes.** No es un backlog automático.
> No se implementa sin aceptación explícita de Pablo o Mavis.

---

## 📐 Reglas de uso

1. **Cualquiera puede agregar entradas** (vos, Mavis, Claude, cualquier IA del equipo).
2. **NADIE implementa directamente** lo que está acá sin que se marque `✅ aceptada` antes.
3. **Mavis revisa el buzón periódicamente** — al cerrar cada módulo y cuando Pablo lo pida.
4. **Pablo decide** qué se acepta, qué se rechaza, qué se difiere. La decisión queda registrada.
5. **Estados terminales** (✅ o ❌) cierran la entrada — no se reabre, se crea un nuevo ID si reaparece.
6. **Append-only** — no borrar entradas. Si una sugerencia se sustituye, marcar la vieja como `🔄 superseded by Sxxx` y abrir la nueva.
7. **Una sugerencia = un cambio concreto**. Si tu idea es grande, partila en varias.

## 👥 Lectores designados

**Solo `@pablo` y `@mavis-cloud` leen este archivo en su cold-start.** Otras IAs
del equipo (ej: `@aria`, `@manus`, `@atlas`, futuros) **NO lo incluyen en su
orden de lectura** salvo que:

- Una sugerencia los mencione explícitamente (`**Dirigido a:** @manus`).
- Pablo o Mavis@cloud se la pasen en una tarjeta de tarea.
- Decidan revisarlo voluntariamente para aportar ideas (caso raro).

**Por qué:** SUGGESTIONS contiene ideas que pueden no aplicar a todas las
IAs, y leerlo al 100% desde el inicio:
- Hace perder foco (leen 7+ ideas que no son para ellas).
- Puede tentarlas a "implementar de paso" algo que no les toca.
- Carga tokens innecesariamente.

El sistema de **tarjetas de tarea con scope explícito** es el mecanismo para
hacerle llegar a una IA solo lo que le toca, incluyendo sugerencias
aceptadas si las hay.

---

## 🏷️ Estados

| Estado | Significado |
|---|---|
| 🆕 nueva | Recién propuesta, sin revisar |
| 👀 en revisión | Mavis/Pablo la están mirando |
| ⏸ diferida | Buena idea pero no es momento |
| ✅ aceptada | Se va a hacer. Anotar la "acción resultante" |
| ❌ rechazada | No se hace. Anotar la razón |
| 🔄 superseded | Reemplazada por otra (anotar cuál) |

---

## 📋 Formato de cada entrada

```markdown
### Sxxx — <título corto> — <fecha>

- **Autor:** <nombre>
- **Origen:** <de chat / de práctica / de un PR / de un módulo>
- **Estado:** 🆕 | 👀 | ⏸ | ✅ | ❌ | 🔄
- **Propuesta:** <2-3 frases, qué cambiar o añadir>
- **Por qué:** <el dolor o motivación>
- **Acción resultante (si se acepta):** <qué archivo se toca, qué ADR abre, qué módulo afecta>
- **Decidido por:** <nombre> — <fecha>
- **Notas:** <opcional, info adicional>
```

---

# 📥 Sugerencias

---

### S001 — Versionar y archivar las propuestas de mejora al sistema — 2026-06-04

- **Autor:** Pablo
- **Origen:** chat — sesión de coordinación
- **Estado:** ✅ aceptada
- **Propuesta:** Crear un buzón persistente de sugerencias para evitar que las ideas se
  pierdan en el chat. Cualquiera (Pablo o IAs) puede agregar entradas. Solo Mavis o Pablo
  decide qué se implementa. Las rechazadas quedan registradas con razón.
- **Por qué:** Pablo detectó que las propuestas se pierden en el flujo del chat, y cada
  vez que se re-leyendo el sistema se mezclan con el trabajo actual. Necesita un lugar
  estable para archivar ideas de mejora al sistema de coordinación.
- **Acción resultante:** Crear este archivo (`.arkmind/SUGGESTIONS.md`) con la estructura
  propuesta + añadir regla en `CONVENTIONS.md` + mencionar en `AXIOMS.md` + crear el
  template de mensaje para IAs nuevas en `.arkmind/MESSAGES/ia-checkin.md`.
- **Decidido por:** Pablo + Mavis — 2026-06-04
- **Notas:** Mavis (yo) queda como revisor periódico del buzón, además de Pablo.

---

### S002 — Mensaje estándar de bienvenida/checkpoint para IAs nuevas — 2026-06-04

- **Autor:** Mavis (derivado de S001)
- **Origen:** chat — sesión de coordinación
- **Estado:** ✅ aceptada
- **Propuesta:** Crear un template de mensaje en `.arkmind/MESSAGES/ia-checkin.md` que
  Pablo pueda copiar y pegar al pedirle a una IA nueva que se presente. El mensaje debe
  incluir: orden de lectura, checkpoint de presentación en PROGRESS, mención del buzón
  de sugerencias, recordatorio de claim antes de tocar.
- **Por qué:** Pablo va a integrar más IAs al grupo y necesita un mensaje consistente
  que les dé el contexto justo sin tener que reinventarlo cada vez.
- **Acción resultante:** Crear `.arkmind/MESSAGES/ia-checkin.md` con el template.
- **Decidido por:** Pablo + Mavis — 2026-06-04
- **Notas:** El template debe ser copy-paste friendly, no muy largo. Una pantalla.

---

### S003 — Métricas de uso de IndexedDB (cuota, frecuencia, tamaño) — 2026-06-04

- **Autor:** Mavis
- **Origen:** de la implementación del módulo snapshot-store
- **Estado:** 🆕 nueva
- **Propuesta:** Añadir al `SnapshotStore` un panel de métricas accesible: cuota
  total usada, número de snapshots, distribución por contextPath, snapshots más
  viejos, sugerencia de limpieza.
- **Por qué:** IDB tiene cuota limitada. Si el usuario acumula snapshots sin
  limpiar, puede llenarse. Hoy no hay forma de saber cuánto se está usando.
  `getPersistedSize()` y `getPersistedCount()` existen pero no se exponen en UI.
- **Acción resultante (si se acepta):** Crear un nuevo módulo `metrics-dashboard`
  o añadir un panel a `mockup-sandbox`. Posible ADR sobre qué métricas se persisten
  y cuáles son efímeras.
- **Decidido por:** —
- **Notas:** No urge. Aceptar cuando se implemente la UI de snapshots (no existe aún).

---

### S004 — CI que verifique la convención de commits — 2026-06-04

- **Autor:** Mavis
- **Origen:** de la práctica — S001 me hizo notar que la convención de commits
  (`[ia:<nombre>] [<módulo>] <tipo>: <desc>`) es solo humana, no enforced
- **Estado:** 🆕 nueva
- **Propuesta:** Añadir un GitHub Action que falle el PR si un commit no sigue
  la convención. Regex simple: `^\[ia:[\w-]+\](\s\[[\w-]+\])?\s(feat|fix|refactor|docs|chore|wip):.+`
- **Por qué:** Las IAs tienden a saltarse la convención si no hay enforcement.
  Hoy dependemos de que cada IA lea CONVENTIONS.md y se auto-discipline.
- **Acción resultante (si se acepta):** Crear `.github/workflows/commit-lint.yml`
  con la acción. Configurar para que falle el push pero no bloquee el merge
  (warning first, hard fail después).
- **Decidido por:** —
- **Notas:** No urge pero el costo de hacerlo es bajo (1 archivo de 20 líneas).
  Buena candidata para "diferida" si no hay ganas ahora.

---

### S005 — Traducir todo el sistema de coordinación al inglés — 2026-06-04

- **Autor:** Mavis (sugerencia preventiva)
- **Origen:** observación del estado actual
- **Estado:** ⏸ diferida
- **Propuesta:** Traducir AXIOMS, CONVENTIONS, NO-GO-ZONES, WELCOME, SUGGESTIONS,
  SUPOSICIONES, módulos al inglés. Mantener español solo en las entradas históricas
  de PROGRESS.md.
- **Por qué:** Las IAs (sobre todo las no hispanohablantes) van a tener que traducir
  mentalmente. Si el sistema crece y entran IAs en otros idiomas, el español se
  vuelve fricción. El código del proyecto está en inglés, los commits en inglés,
  los headers en inglés — los docs rompen esa consistencia.
- **Acción resultante (si se acepta):** Traducción masiva. Riesgo: perder matices
  en AXIOMS. Mitigación: hacerlo módulo por módulo con Pablo validando.
- **Decidido por:** Pablo — 2026-06-04 (diferida)
- **Notas:** Diferida porque ahora es más importante estabilizar el sistema que
  traducirlo. Cuando el sistema esté maduro (después de implementar 2-3 módulos
  más) se reconsidera. **Pablo prefiere mantener español por ahora** porque el
  equipo actual es hispanohablante y la fricción de traducción puede ser peor que
  la fricción de idioma. Revisitar si entra una IA no-hispanohablante.

---

### S006 — Las IAs puedan comunicarse entre sí sin pasar por Pablo — 2026-06-04

- **Autor:** Mavis (sugerencia de scope)
- **Origen:** pregunta "¿qué pasa si dos IAs necesitan coordinarse en vivo?"
- **Estado:** ⏸ diferida
- **Propuesta:** Permitir que las IAs dejen mensajes en un buzón (`.arkmind/INBOX.md`?)
  para que otra IA los lea en su próxima sesión, sin que Pablo tenga que retransmitir.
- **Por qué:** A medida que el equipo crezca, Pablo se vuelve cuello de botella.
  Si Mavis termina un módulo y quiere avisarle a Claude que necesita revisar
  algo, hoy tiene que decírselo a Pablo y Pablo a Claude.
- **Acción resultante (si se acepta):** Crear `.arkmind/INBOX.md` con un
  protocolo simple (mensaje + destinatario + leído/no leído). Probablemente
  requiera un paso adicional de "Mavis notifica a X" en el flujo de cierre.
- **Decidido por:** Pablo — 2026-06-04 (diferida)
- **Notas:** Diferida porque el equipo es chico y Pablo prefiere ser el
  coordinador central. Cuando haya 3+ IAs activas en simultáneo, se reconsidera.
  Si se acepta, ojo con spam y con que las IAs se pisen entre sí.

---

### S007 — Schema migration para snapshots (relacionado con Q1) — 2026-06-04

- **Autor:** Mavis (consolidación de Q1)
- **Origen:** STATE.json → openQuestions → Q1
- **Estado:** 🆕 nueva
- **Propuesta:** Añadir un campo `schemaVersion: number` al `Snapshot` y al
  `SnapshotRecord`. Implementar un `migrateSnapshot(record, fromVersion)` que
  transforme registros viejos al schema actual. Si no se puede migrar, marcar
  el snapshot como `legacy` y excluirlo de listados por defecto.
- **Por qué:** Si el día de mañana cambiamos la forma del `Snapshot` (campos
  añadidos, renombrados, eliminados), los snapshots guardados en IDB van a
  fallar al deserializar. Mejor tener el mecanismo ANTES de que duela.
- **Acción resultante (si se acepta):** ADR 0006, modificación de `types.ts`
  (requiere ADR), `SnapshotRecord` gana el campo, función `migrateSnapshot`
  en `snapshotStore.ts`. Probablemente impacta al módulo `rollback-engine`
  también.
- **Decidido por:** —
- **Notas:** No urge — la decisión se puede tomar cuando se vaya a romper
  algo. Costo de hacerlo proactivamente: 1 ADR + 30 min de código. Costo
  de hacerlo reactivo: perder datos de usuarios.

---

## 📊 Resumen

| Estado | Cantidad |
|---|---|
| 🆕 nueva | 3 (S003, S004, S007) |
| 👀 en revisión | 0 |
| ⏸ diferida | 2 (S005, S006) |
| ✅ aceptada | 2 (S001, S002) |
| ❌ rechazada | 0 |
| 🔄 superseded | 0 |
| **Total** | **7** |

---

*Última revisión por Mavis: 2026-06-04*
