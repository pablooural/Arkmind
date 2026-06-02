# 0003. La IA debe ser un provider opcional, no una dependencia hard-coded

**Fecha:** 2026-06-02
**Estado:** ✅ accepted
**IA autora:** Aria
**Módulos afectados:** `spec-discrepancies` → `ai.ts` (artifacts/ux-arquitecto/src/core/)

---

## Contexto

El SPEC de Arkmind y la suposición A4 son claras:

> **A4** — La IA es operativa pero siempre propone. Nunca ejecuta sin ACEPTAR
> explícito. El ciclo es: `validate → snapshot → execute → verify → commit/rollback`.

Y la discrepancia #1 del módulo `spec-discrepancies` la resume:

> 3. **IA proposes, never executes** (spec) vs **hard-coded `ai.ts` with Mistral**
>    (code) — the IA dependency should be pluggable

El estado actual de `artifacts/ux-arquitecto/src/core/ai.ts`:

- `AIManager` solo acepta `AIConfig = { provider: "mistral", ... }`. El provider
  está hard-coded al literal `"mistral"`.
- No existe una interfaz `AIProvider` que desacople el manager de la implementación
  concreta.
- El singleton `aiManager` no se puede usar sin un `AIConfig` configurado
  (`isConfigured()` devuelve `false` si no hay `apiKey`).
- `coreEngine.ai` se exporta desde `index.ts` y se usa como dependencia conceptual,
  pero ningún caller en el core hace llamadas reales (verificado por `grep`).

**Problema:** si el runtime arranca sin Mistral configurado, el manager existe
pero no hace nada útil, y el código sugiere que "es un manager de Mistral" en
lugar de "es un manager de IA opcional". Esto bloquea el espíritu de A3
(providers externos opcionales) y de A4 (IA operativa-pero-propone).

## Decisión

Refactorizar `ai.ts` para introducir una interfaz `AIProvider` con dos
implementaciones:

1. **`NoopAIProvider`** (default): no hace nada externo, `isAvailable()` es
   `false`, `propose()` devuelve `{ kind: "noop", summary: "IA no configurada" }`.
   El runtime arranca con este provider sin necesidad de configuración.
2. **`MistralAIProvider`**: encapsula la lógica Mistral actual (config, model,
   apiKey) detrás de la interfaz. `isAvailable()` es `true` solo si hay
   `apiKey`. `propose()` hace la llamada HTTP a Mistral.

`AIManager` se modifica así:

- Arranca con `noopProvider` por default.
- `setProvider(provider)` permite inyectar cualquier `AIProvider`.
- `setAIConfig(config)` se mantiene como atajo: si `config.provider === "mistral"`,
  internamente construye un `MistralAIProvider` y lo instala. **Backwards-compat
  preservado**: callers que ya usan `setAIConfig({ provider: "mistral", apiKey })`
  siguen funcionando.
- `isConfigured()` delega al provider activo: `this.provider.isAvailable()`.
- `getProvider()` (nuevo) devuelve el provider actual.

`index.ts` re-exporta los nuevos tipos: `AIProvider`, `AIRequest`, `AIProposal`,
`NoopAIProvider`, `MistralAIProvider`.

**No se toca** `types.ts` — todo vive en `ai.ts` para no obligar a sincronizar
otros managers.

**No se añade** ninguna dependencia de `package.json`. `MistralAIProvider` usa
`fetch` nativo del entorno (browser o Node 18+).

## Consecuencias

**Positivas:**
- El runtime arranca sin config externa. A3 (providers opcionales) y A4 (IA
  propone, no ejecuta) se respetan en código, no solo en spec.
- Cualquier IA futura (OpenAI, Anthropic, local) se enchufa como `AIProvider`
  sin tocar el core.
- Tests unitarios pueden inyectar un `MockAIProvider` que devuelva propuestas
  deterministas.
- La línea entre "configurar la IA" y "usar la IA" queda clara:
  `setAIConfig` ↔ instalar el provider, `propose()` ↔ usar el provider.

**Negativas:**
- Un test que asumía `AIManager` con provider Mistral fijo ahora necesita
  inyectar un `MistralAIProvider` explícitamente. **No aplica** porque `grep`
  confirma que ningún test actual del core llama a `AIManager` con config Mistral.
- La interfaz `AIProvider` es un nuevo contrato a mantener. Se documenta en
  `CONTRACT.md` del módulo `spec-discrepancies` para que la siguiente IA lo respete.

**Riesgos:**
- Si algún caller (en `artifacts/api-server/`, fuera del core) consumía
  `AIManager` esperando un método específico, el refactor podría romperlo.
  Mitigación: `grep` cruzado contra `api-server/**` antes de mergear.
- `setAIConfig` con `provider` distinto a `"mistral"` se ignora silenciosamente
  (mismo comportamiento que antes). Documentado en el doc-comment.

## Estado

✅ accepted — implementación commitada en `artifacts/ux-arquitecto/src/core/ai.ts` y `index.ts`.
PR chain: `ia/aria/spec-discrepancies` branch.
