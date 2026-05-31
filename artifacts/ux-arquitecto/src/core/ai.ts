import { StructuredMessage } from "./types";

export type MistralModel = "mistral-large-latest" | "mistral-small-latest" | "open-mistral-7b" | "open-mixtral-8x7b";

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

export class AIManager {
  private aiConfig: AIConfig | null = null;
  private supabaseConfig: SupabaseConfig | null = null;
  private conversationHistory: AIMessage[] = [];

  setAIConfig(config: AIConfig): void {
    this.aiConfig = config;
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

  getAvailableModels(): Array<{ id: MistralModel; name: string; description: string }> {
    return Object.entries(MISTRAL_MODELS).map(([id, info]) => ({
      id: id as MistralModel,
      ...info,
    }));
  }

  setModel(model: MistralModel): boolean {
    if (!this.aiConfig) {
      this.aiConfig = {
        provider: "mistral",
        model,
        apiKey: "",
      };
    } else {
      this.aiConfig.model = model;
    }
    return true;
  }

  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  isConfigured(): boolean {
    return !!this.aiConfig && !!this.aiConfig.apiKey;
  }
}

export const aiManager = new AIManager();
