# Status: spec-discrepancies

## Estado: ✅ done — Aria, rama `ia/aria/spec-discrepancies`

| Campo | Valor |
|---|---|
| IA asignada | Aria |
| Rama | `ia/aria/spec-discrepancies` |
| Último update | 2026-06-02T11:30:00Z |
| ADR relacionado | 0003 (accepted), 0004 (accepted) |
| Claimed at | 2026-06-02T10:50:00Z |
| Completed at | 2026-06-02T11:30:00Z |

---

## Handoff notes

### Lo que quedó hecho

- **`ai.ts` con `AIProvider` interface**: el runtime arranca con `NoopAIProvider`
  (no hace nada externo). `MistralAIProvider` encapsula la config Mistral.
  `AIManager` acepta `setProvider(...)` para inyectar cualquier provider o
  `setAIConfig({ provider: "mistral", ... })` como atajo backwards-compat.
  `isConfigured()` delega al provider activo.
- **`auth.ts` limpio**: `AuthConfig` ahora usa `remoteUrl`/`remoteKey` (neutros
  al provider). Los viejos `supabaseUrl`/`supabaseKey` quedan como aliases
  `@deprecated` opcionales. Doc-comment aclara que el manager es local y que
  la integración con el provider real vive en `api-server`.
- **Q2 resuelta** en `STATE.json`: AIProvider es opcional.
- **ADR 0003 + ADR 0004** movidos a `accepted`.

### Lo que NO quedó hecho (fuera de alcance)

- **ADR 0005 — Persistencia en IDB de session/cognitive/visual/memory**: refactor
  grande que afecta 4 managers y posiblemente requiere migrar `snapshotStore`
  para soportar múltiples object stores. **Queda para una sesión dedicada** con
  `pnpm install` que complete el typecheck end-to-end. Antes de empezar:
  1. Releer `spec-discrepancies/SPEC.md` (este spec ya anticipa el refactor en
     la sección "Concrete refactors anticipated").
  2. Decidir si se crea un `runtimeStore` sibling de `snapshotStore` o si se
     extiende `snapshotStore` con un segundo migration path.
  3. ADR 0005 debe responder: ¿un solo IDB DB con varios object stores, o
     varias DBs separadas? `snapshotStore` ya usa `arkmind_runtime` v1.
- **`api-server` con rutas a Mistral/Supabase**: vive en otro artefacto, no en
  el core. Fuera de alcance del módulo `spec-discrepancies` (este módulo es
  solo del core). Si la siguiente IA quiere tocarlo, abrir un módulo nuevo.
- **GitHub provider**: ya está conceptualmente alineado (el repo ES el código).
  No hay código que migrar.
- **Llamada HTTP real a Mistral**: `MistralAIProvider.propose()` es un stub
  estructurado. La implementación real (con `fetch` a la API de Mistral) queda
  para una sesión propia, idealmente con tests que mockeen `fetch`.

### Sugerencias para la siguiente IA

- Si querés reclamar `op-journal`: refiná primero su SPEC/CONTRACT (siguen
  siendo stubs puros) — el SPEC original decía "Fill in the details before
  claiming". Buena sesión para hacer eso.
- Si querés encarar `ADR 0005`: dividilo en sub-ADR por manager (sessionStore,
  cognitiveStore, visualStore, memoryStore) o hacé un ADR único con plan de
  migración. Empezá por session (es el más simple).
- Si querés implementar la llamada real a Mistral: usá `fetch` nativo,
  mockealo en tests, y añadí un `MistralHTTPProvider` separado para no
  acoplar `MistralAIProvider` con la red.

---

## Historial

| Fecha | IA | Acción | Notas |
|---|---|---|---|
| 2026-06-02 | Mavis | Creación del spec inicial | 5 discrepancias identificadas, refactors anticipados |
| 2026-06-02 | Aria | Refinó SPEC y CONTRACT a v0.2; marcó in_progress; decidió alcance recortado (ADR 0003+0004 sí, 0005 fuera) | Razón: 0005 es grande, mejor en sesión propia con typecheck end-to-end |
| 2026-06-02 | Aria | ADR 0003: AIProvider interface + NoopAIProvider (default) + MistralAIProvider en ai.ts; tsc parcial OK | ADR 0003 accepted |
| 2026-06-02 | Aria | ADR 0004: AuthConfig.remoteUrl/remoteKey + aliases deprecated + doc-comment; tsc parcial OK | ADR 0004 accepted |
| 2026-06-02 | Aria | Q2 resuelta; módulo cerrado; release commit | Rama lista para push |
