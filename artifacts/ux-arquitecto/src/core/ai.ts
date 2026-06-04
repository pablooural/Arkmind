/**
 * AI Manager
 *
 * ADR 0003: la IA es un provider opcional. El runtime arranca con NoopAIProvider
 * (no hace nada) y puede inyectar un provider real (MistralAIProvider, o futuro
 * OpenAI, Anthropic, local) vía `setProvider(...)` o como atajo vía `setAIConfig(...)`.
 *
 * Spec A4: la IA es operativa pero siempre propone, nunca ejecuta sin ACEPTAR.
 * Spec A3: los providers externos son opcionales. El runtime funciona sin ellos.
 *
 * Backwards-compat preservado:
 *   - `aiManager` (singleton), `AIManager` (clase), `AIConfig`, `SupabaseConfig`,
 *     `AIMessage`, `MistralModel` se siguen exportando con la misma forma.
 *   - `setAIConfig({ provider: "mistral", ... })` sigue funcionando: instala
 *     internamente un MistralAIProvider.
 *   - `isConfigured()` ahora delega a `provider.isAvailable()`, pero la
 *     semántica observable (true solo si Mistral tiene apiKey) se mantiene.
 */
import { StructuredMessage } from "./types";
import { ActiveContext, contextEnricher } from "./ia-context-bridge";

// ────────────────────────────────────────────────────────────────────────────
// Public types (existentes — backwards-compat)
// ────────────────────────────────────────────────────────────────────────────

export type MistralModel =
  | "mistral-large-latest"
  | "mistral-small-latest"
  | "open-mistral-7b"
  | "open-mixtral-8x7b";

export interface AIConfig {
  provider: "mistral";
  model: MistralModel;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SupabaseConfig {
  projectUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AIProvider — interfaz nueva (ADR 0003, alineada con A3 y A4)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Tipos de pedido que un caller puede hacer a la IA.
 * El manager dispatcha según `kind`; el provider decide cómo responder.
 */
export type AIRequest = (
  | { kind: "structural_change"; context: string; diff?: string }
  | { kind: "explain"; target: string; question: string }
  | { kind: "summarize"; content: string }
) & { activeContext?: ActiveContext };

/**
 * Propuesta que devuelve la IA. Es siempre declarativa: el caller decide si
 * aplicarla, pedir más detalle o descartarla. Ver A4.
 *
 * Discriminated union por `kind` para que el caller pueda hacer pattern-match.
 */
export type AIProposal =
  | { kind: "noop"; summary: string }
  | { kind: "suggestion"; title: string; rationale: string; patch?: string }
  | { kind: "explanation"; text: string }
  | { kind: "summary"; text: string };

/**
 * Contrato público de cualquier provider de IA enchufable al runtime.
 *
 * Reglas:
 *   - `isAvailable()` es síncrono. Permite que `AIManager.isConfigured()` siga
 *     siendo síncrono (los hooks lo llaman en render).
 *   - `propose()` NUNCA muta estado. Devuelve una propuesta; el caller decide.
 *   - `id` es estable y lowercase. Sirve para logging y para el switch de
 *     `setAIConfig`.
 */
export interface AIProvider {
  readonly id: string;
  isAvailable(): boolean;
  propose(request: AIRequest): Promise<AIProposal>;
}

/**
 * Provider por defecto. No hace nada externo. El runtime arranca con este
 * provider aunque no haya configuración de IA.
 *
 *   - `isAvailable() === false` → `AIManager.isConfigured()` devuelve `false`.
 *   - `propose()` devuelve `{ kind: "noop", summary }` para que el caller
 *     sepa que la IA no hizo nada y pueda manejarlo explícitamente.
 */
export class NoopAIProvider implements AIProvider {
  readonly id = "noop";

  isAvailable(): false {
    return false;
  }

  async propose(_request: AIRequest): Promise<{ kind: "noop"; summary: string }> {
    return {
      kind: "noop",
      summary: "IA no configurada — el provider activo es NoopAIProvider. " +
               "Llama a aiManager.setAIConfig({ provider: 'mistral', apiKey, model }) " +
               "para habilitar una IA real.",
    };
  }
}

/**
 * Provider concreto para Mistral. Encapsula la config existente (model, apiKey,
 * baseUrl, temperature, maxTokens) detrás de la interfaz AIProvider.
 *
 * `propose()` es un stub estructurado en esta versión: devuelve una propuesta
 * coherente con el `kind` del request pero NO hace fetch HTTP. La llamada
 * real a la API de Mistral queda para un módulo dedicado (ver
 * `.arkmind/decisions/0003-ai-as-optional-provider.md`, sección "Riesgos").
 *
 * Razón del stub: el código original tampoco hacía fetch — solo configuraba.
 * Mantenemos el mismo nivel de "operación" para no introducir I/O sin tests.
 */
export class MistralAIProvider implements AIProvider {
  readonly id = "mistral";
  private config: AIConfig;

  constructor(config: AIConfig) {
    // Copia defensiva para que mutaciones externas no afecten al provider
    this.config = { ...config };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  setModel(model: MistralModel): void {
    this.config = { ...this.config, model };
  }

  async propose(request: AIRequest): Promise<AIProposal> {
    if (!this.isAvailable()) {
      return {
        kind: "noop",
        summary: "MistralAIProvider.propose() llamado sin apiKey configurada",
      };
    }

    // Log de contexto para depuración (según diseño)
    if (request.activeContext) {
      console.log(`[MistralAIProvider] Contexto enriquecido recibido:`, {
        path: request.activeContext.activeContextPath,
        resource: request.activeContext.activeResource,
        hasCognitive: !!request.activeContext.cognitiveContext,
        hasSession: !!request.activeContext.activeSession
      });
    }

    // Stub estructurado enriquecido con contexto
    const ctxLabel = request.activeContext?.activeResource 
      ? ` (sobre ${request.activeContext.activeResource})` 
      : "";

    switch (request.kind) {
      case "structural_change":
        return {
          kind: "suggestion",
          title: "Cambio estructural propuesto" + ctxLabel,
          rationale:
            `Stub: revisaría el cambio sobre contexto (${truncate(request.context, 60)})` +
            (request.diff ? ` y diff de ${request.diff.length} chars` : "") +
            `. Implementación real pendiente con contexto enriquecido.`,
          patch: undefined,
        };
      case "explain":
        return {
          kind: "explanation",
          text:
            `Stub: explicaría \`${truncate(request.target, 40)}\`${ctxLabel} respondiendo a ` +
            `"${truncate(request.question, 60)}". Implementación real pendiente.`,
        };
      case "summarize":
        return {
          kind: "summary",
          text:
            `Stub: resumiría ${request.content.length} caracteres${ctxLabel}. ` +
            `Implementación real pendiente.`,
        };
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Catálogo de modelos (solo Mistral, solo si el provider activo es Mistral)
// ────────────────────────────────────────────────────────────────────────────

const MISTRAL_MODELS: Record<MistralModel, { name: string; description: string }> = {
  "mistral-small-latest": {
    name: "Mistral Small",
    description: "Rápido y eficiente — plan gratuito",
  },
  "mistral-large-latest": {
    name: "Mistral Large",
    description: "Más potente — requiere plan de pago",
  },
  "open-mistral-7b": {
    name: "Mistral 7B",
    description: "Modelo abierto, muy rápido — plan gratuito",
  },
  "open-mixtral-8x7b": {
    name: "Mixtral 8x7B",
    description: "Mezcla de expertos, gran calidad — plan gratuito",
  },
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// ────────────────────────────────────────────────────────────────────────────
// AIManager
// ────────────────────────────────────────────────────────────────────────────

export class AIManager {
  private aiConfig: AIConfig | null = null;
  private supabaseConfig: SupabaseConfig | null = null;
  private provider: AIProvider = new NoopAIProvider();
  private conversationHistory: AIMessage[] = [];

  // ─── Provider API (nuevo, ADR 0003) ────────────────────────────────────

  /**
   * Inyecta un provider de IA arbitrario. Reemplaza al provider activo
   * (incluyendo el NoopAIProvider por default).
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Devuelve el provider activo. Útil para inspección y para tests.
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  // ─── Backwards-compat API ──────────────────────────────────────────────

  /**
   * Atajo para instalar un MistralAIProvider. Si `config.provider === "mistral"`,
   * construye el provider y lo inyecta. Para otros providers, usar `setProvider`.
   *
   * Comportamiento legacy preservado: si no había config previa, se guarda;
   * si la había, se actualiza `model` cuando coincide.
   */
  setAIConfig(config: AIConfig): void {
    this.aiConfig = config;
    if (config.provider === "mistral") {
      this.provider = new MistralAIProvider(config);
    }
    // Otros providers: se ignoran silenciosamente (mismo comportamiento que
    // antes, cuando el `provider` solo se leía para mostrar la config).
  }

  setSupabaseConfig(config: SupabaseConfig): void {
    this.supabaseConfig = config;
  }

  getAIConfig(): AIConfig | null {
    return this.aiConfig;
  }

  getSupabaseConfig(): SupabaseConfig | null {
    return this.supabaseConfig;
  }

  /**
   * Lista los modelos Mistral disponibles. Si el provider activo es
   * MistralAIProvider, devuelve el catálogo completo. Si no, devuelve `[]`
   * (no hay catálogo que mostrar para un provider genérico).
   */
  getAvailableModels(): Array<{ id: MistralModel; name: string; description: string }> {
    if (this.provider instanceof MistralAIProvider) {
      return Object.entries(MISTRAL_MODELS).map(([id, info]) => ({
        id: id as MistralModel,
        ...info,
      }));
    }
    return [];
  }

  /**
   * Cambia el modelo activo. Solo aplica si el provider es MistralAIProvider.
   * Si no hay provider Mistral, comportamiento legacy: crea un AIConfig
   * vacío con el modelo pedido, para que `getAIConfig()` lo refleje.
   */
  setModel(model: MistralModel): boolean {
    if (this.provider instanceof MistralAIProvider) {
      this.provider.setModel(model);
      if (this.aiConfig) {
        this.aiConfig = { ...this.aiConfig, model };
      }
      return true;
    }
    // Legacy: crear aiConfig mínimo si no existe
    this.aiConfig = { provider: "mistral", model, apiKey: "" };
    return true;
  }

  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * `true` si el provider activo está disponible para responder a `propose()`.
   * Para NoopAIProvider: siempre `false`. Para MistralAIProvider: `true` solo
   * si `apiKey` está configurada.
   */
  isConfigured(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Envía una petición a la IA enriqueciéndola automáticamente con el contexto
   * activo del runtime.
   */
  async propose(request: AIRequest): Promise<AIProposal> {
    const enrichedRequest = {
      ...request,
      activeContext: request.activeContext || contextEnricher.captureActiveContext(),
    };
    return this.provider.propose(enrichedRequest);
  }
}

export const aiManager = new AIManager();
