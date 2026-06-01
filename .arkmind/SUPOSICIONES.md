# 🧱 Suposiciones del proyecto

> Las **creencias estables** sobre las que se construye Arkmind.
> NO son decisiones técnicas detalladas (esas viven en `decisions/`) ni
> zonas prohibidas (esas viven en `NO-GO-ZONES.md`). Son el "así funciona
> el mundo" sobre el que se apoya todo lo demás.
>
> **Si una suposición falla, hay que abrir un ADR.** No se modifica en silencio.

---

## Arquitectura

- **A1** — El runtime es **local-first**. El usuario debe poder usarlo sin internet.
- **A2** — **IndexedDB** es el almacenamiento base para estado del runtime (snapshots, sesiones, contexto, journal). El FS del usuario (vía `WebFilesystemProvider`) es para *su* contenido, no para el estado del runtime.
- **A3** — Los providers externos (Supabase, Replit, GitHub, etc.) son **opcionales**. El runtime funciona sin ninguno. Si se enchufan, es para sync/backup/colaboración.
- **A4** — La IA es **operativa pero siempre propone**. Nunca ejecuta sin `ACEPTAR` explícito. El ciclo es: `validate → snapshot → execute → verify → commit/rollback`.
- **A5** — La transacción es la **unidad de cambio**. Toda mutación destructiva pasa por `transactionManager`. El snapshot previo es obligatorio (no negociable).

## Modelo de dominio

- **A6** — Los tipos en `core/types.ts` son la **fuente de verdad**. Cualquier cambio ahí obliga a sincronizar todos los managers y, si afecta a la API pública del core, abrir un ADR.
- **A7** — `ResourceNode` es la unidad universal. Archivos, conversaciones, historias, notas, branches son todos `ResourceNode` con distinto `type`. El manager dispatcha según el tipo.

## Coordinación

- **A8** — Las IAs que colaboran siguen `.arkmind/CONVENTIONS.md` y `.arkmind/NO-GO-ZONES.md`. Protocolo claim/release es ley.
- **A9** — `PROGRESS.md` es append-only. `STATE.json` es la verdad consultable del estado actual. Si discrepan, gana `STATE.json` para coordinación.
- **A10** — Cada paso se cierra con: entrada slim en `PROGRESS.md` + update de `STATE.json` + commit con convención `[ia:<nombre>][paso-N] <tipo>: <desc>`.

## Operación

- **A11** — `rollback()` es un ciudadano de primera. Si una operación no puede hacer rollback limpio, **no se ejecuta**. La seguridad gana sobre la conveniencia.
- **A12** — Las **decisiones arquitecturales gordas** se documentan en `decisions/NNNN-*.md` siguiendo el formato ADR. Las pequeñas viven en el `DECISIONS` de la entrada del PROGRESS.

---

## 📋 Cómo actualizar este archivo

- **Añadir** una suposición: solo si emerge una nueva creencia estable que afecta a varias áreas.
- **Modificar** una existente: solo si la realidad cambia (ej. dejamos IndexedDB). Va con ADR.
- **Eliminar** una: solo si se cierra el ADR que la invalida.

**Formato de suposición:**
- ID estable (`A13`, `A14`, …) — para poder referenciarla desde otros docs
- Una línea — la suposición en sí
- (Opcional) Por qué importa
