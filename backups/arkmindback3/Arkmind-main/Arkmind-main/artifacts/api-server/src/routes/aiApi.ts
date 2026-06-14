/**
 * AI API Service
 * Cliente para comunicarse con el backend seguro.
 * Las claves API están en el servidor, no en el frontend.
 *
 * CAMBIO: ResourceContext ahora incluye fileContent opcional.
 */

export interface AIConfigResponse {
  mistral: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  supabase: {
    url: string;
  };
  configured: boolean;
}

export interface AIMessageResponse {
  content: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ResourceContext {
  name: string;
  type: string;
  path: string;
  /** Contenido real del archivo, si está disponible y es texto */
  fileContent?: string;
}

export async function getAIConfig(): Promise<AIConfigResponse> {
  try {
    const response = await fetch("/api/ai/config");
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error("Error obteniendo configuración de IA:", error);
    throw error;
  }
}

export async function sendMessageToAI(
  message: string,
  model?: string,
  history?: ConversationMessage[],
  resourceContext?: ResourceContext | null,
  memoryBlock?: string | null
): Promise<string> {
  try {
    const response = await fetch("/api/ai/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, model, history, resourceContext, memoryBlock }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error enviando mensaje");
    }

    const data: AIMessageResponse = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error enviando mensaje a IA:", error);
    throw error;
  }
}
