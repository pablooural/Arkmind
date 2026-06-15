/**
 * AI API Service
 * Cliente para comunicarse con el backend seguro
 * Las claves API están en el servidor, no en el frontend
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

export async function streamMessageFromAI(
  message: string,
  onToken: (token: string) => void,
  model?: string,
  history?: ConversationMessage[],
  resourceContext?: ResourceContext | null,
  memoryBlock?: string | null
): Promise<string> {
  const response = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, history, resourceContext, memoryBlock }),
  });

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({ error: "Stream error" })) as { error?: string };
    throw new Error(err.error || "Error en stream de IA");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return fullContent;
      try {
        const chunk = JSON.parse(data) as { token?: string; error?: string };
        if (chunk.error) throw new Error(chunk.error);
        if (chunk.token) {
          fullContent += chunk.token;
          onToken(chunk.token);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullContent;
}
