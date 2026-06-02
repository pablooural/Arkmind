# Contract: spec-discrepancies
**Versión:** 0.2 — 2026-06-02 (refinado por Aria)
**Fecha:** 2026-06-02

---

## Consumes

- El módulo NO consume ningún manager del core. Es un refactor de `ai.ts` y `auth.ts`
  en aislamiento. No introduce nuevos imports cross-module.
- Lee `SUPOSICIONES.md` (A3, A4) y `NO-GO-ZONES.md` para saber qué respetar.

## Exposes

### Desde `core/ai.ts` (re-exportado por `core/index.ts`)

```ts
// Interfaz nueva (nivel API público, no romperla sin ADR)
export interface AIProvider {
  readonly id: string;                     // p.ej. "noop", "mistral"
  isAvailable(): boolean;                  // ¿puede responder a propose()?
  propose(request: AIRequest): Promise<AIProposal>;
}

export type AIRequest =
  | { kind: "structural_change"; context: string; diff?: string }
  | { kind: "explain"; target: string; question: string }
  | { kind: "summarize"; content: string };

export type AIProposal =
  | { kind: "noop"; summary: string }                                  // NoopAIProvider
  | { kind: "suggestion"; title: string; rationale: string; patch?: string }
  | { kind: "explanation"; text: string }
  | { kind: "summary"; text: string };

export class NoopAIProvider implements AIProvider {
  readonly id = "noop";
  isAvailable(): false;
  propose(): Promise<{ kind: "noop"; summary: string }>;
}

export class MistralAIProvider implements AIProvider {
  readonly id = "mistral";
  constructor(config: AIConfig);
  isAvailable(): boolean;       // true solo si apiKey está set
  propose(request: AIRequest): Promise<AIProposal>;
}

// AIManager (existente, extendido)
export class AIManager {
  setProvider(provider: AIProvider): void;        // NUEVO
  getProvider(): AIProvider;                      // NUEVO (default: noopProvider)
  setAIConfig(config: AIConfig): void;            // EXISTENTE — ahora construye MistralAIProvider
  setModel(model: MistralModel): boolean;         // EXISTENTE
  isConfigured(): boolean;                        // EXISTENTE — ahora delega a provider
  // … resto igual
}
```

### Desde `core/auth.ts` (re-exportado por `core/index.ts`)

```ts
export interface AuthConfig {
  remoteUrl: string;        // antes supabaseUrl
  remoteKey: string;        // antes supabaseKey
}

// Compatibilidad hacia atrás: aliases deprecated, no rompen compiladores
/** @deprecated usar AuthConfig.remoteUrl */
export type DeprecatedAuthSupabaseUrl = string;
/** @deprecated usar AuthConfig.remoteKey */
export type DeprecatedAuthSupabaseKey = string;

// AuthManager: sin cambios en API pública. Solo se renombran los campos del type.
```

## Invariants

1. **A1-A4 de `SUPOSICIONES.md` se respetan**: runtime local-first, providers opcionales,
   IA operativa-pero-propone, indexedDB como storage base.
2. **El runtime arranca sin configuración externa**: `aiManager` siempre tiene un
   provider (default `noopProvider`), `authManager` funciona sin `remoteUrl`/`remoteKey`.
3. **`isConfigured()` de AIManager refleja al provider activo**: si el provider es
   `noop`, devuelve `false`; si es `mistral` con apiKey, devuelve `true`.
4. **No se introduce dependencia nueva en `package.json`**. No se añade HTTP client,
   no se añade SDK de Mistral. `MistralAIProvider` usa `fetch` nativo (ya disponible
   en browser/Node 18+) o delega al manager de fetch existente.
5. **`types.ts` no se toca**. Todas las interfaces nuevas viven en `ai.ts`.

## What this module does NOT do

- **No implementa persistencia en IndexedDB** para session/cognitive/visual/memory
  (eso es ADR 0005, fuera de alcance).
- **No toca `api-server`**. La integración con Mistral/Supabase real vive ahí.
- **No cambia los nombres de los singletons** (`aiManager`, `authManager`, `coreEngine`).
- **No introduce async/await en `AIManager.isConfigured()`** (sigue siendo sync,
  como exige el caller actual en hooks).
