# 0004. Auth es un manager local; el provider remoto (Supabase) es opcional y vive fuera del core

**Fecha:** 2026-06-02
**Estado:** ✅ accepted
**IA autora:** Aria
**Módulos afectados:** `spec-discrepancies` → `auth.ts` (artifacts/ux-arquitecto/src/core/)

---

## Contexto

La suposición A3 dice:

> **A3** — Los providers externos (Supabase, Replit, GitHub, etc.) son
> **opcionales**. El runtime funciona sin ninguno. Si se enchufan, es para
> sync/backup/colaboración.

Y la discrepancia #2 de `spec-discrepancies` la resume:

> 2. **Offline-first / no cloud** (spec) vs **Supabase + Replit deps** (code) —
>    the cloud bits must be modeled as `optional providers`

Estado actual de `artifacts/ux-arquitecto/src/core/auth.ts`:

- `AuthConfig` tiene campos `supabaseUrl` y `supabaseKey` — el nombre implica
  una dependencia dura con Supabase.
- `AuthManager` en realidad **NO** llama a Supabase desde el core. Solo persiste
  la sesión en `localStorage` y notifica listeners. La dependencia con Supabase
  es **conceptual**, no técnica.
- El único archivo que **sí** habla con Supabase es `artifacts/api-server/src/routes/supabase.ts`,
  que vive en otro artefacto y NO está en el core.

**Problema:** los nombres `supabaseUrl` / `supabaseKey` sugieren un acoplamiento
inexistente. Si una IA o un dev nuevo lee `auth.ts`, puede asumir que el manager
del core hace llamadas a Supabase, cuando la realidad es que la integración con
cualquier provider de auth vive en `api-server`.

## Decisión

Refactor menor de `auth.ts`:

1. **Renombrar campos del type** `AuthConfig`:
   - `supabaseUrl` → `remoteUrl`
   - `supabaseKey` → `remoteKey`
   - Mantener **aliases deprecated** (`supabaseUrl`, `supabaseKey`) como
     propiedades opcionales para no romper código que ya los use. Marcar
     con `@deprecated` en el doc-comment.
2. **Doc-comment al manager**: aclarar que `AuthManager` es el estado LOCAL de
   la sesión (localStorage). La integración con el auth provider (Supabase,
   Auth0, custom) vive en `api-server`, fuera del core.
3. **No tocar** la lógica interna (`loadSession`, `saveSession`, `getSession`,
   `isAuthenticated`, `onSessionChange`, etc.) — el comportamiento observable
   es correcto.
4. **No añadir** ninguna dependencia nueva. No se importa Supabase, no se
   añade HTTP client, no se cambia el storage (sigue siendo `localStorage`).

**No se toca** `types.ts`. Todo el cambio vive en `auth.ts`.

## Consecuencias

**Positivas:**
- El código refleja la realidad: el core es local-first, el provider remoto
  es opcional y vive en otro artefacto.
- Una IA o dev nuevo que lea `auth.ts` ya no confunde "auth del core" con
  "auth provider real". El doc-comment lo aclara.
- Los aliases deprecated preservan backwards-compat para callers externos
  (LoginPage, useAuth) que puedan estar pasando `supabaseUrl`.

**Negativas:**
- Hay un periodo de transición donde ambos nombres coexisten. Riesgo bajo
  porque son aliases opcionales; el código nuevo debería usar `remoteUrl`.
- El refactor no resuelve el problema completo (la integración con Supabase
  sigue existiendo en `api-server`). Eso está fuera del alcance del core.

**Riesgos:**
- Si `LoginPage.tsx` o `useAuth.ts` pasan `supabaseUrl` como campo **requerido**
  (no opcional) en un objeto literal, TypeScript podría quejarse porque el
  campo ya no existe (solo está el alias deprecated opcional). Mitigación:
  los aliases están presentes en el type, así que TS los aceptará con un
  warning de deprecation.
- `api-server` puede tener su propio type `AuthConfig` con campos `supabaseUrl`
  que no se ven afectados por este cambio. No hay acoplamiento entre los dos.

## Estado

✅ accepted — implementación commitada en `artifacts/ux-arquitecto/src/core/auth.ts` y `index.ts`.
PR chain: `ia/aria/spec-discrepancies` branch.
