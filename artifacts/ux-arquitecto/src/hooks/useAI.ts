import { useState, useCallback, useEffect } from "react";
import { aiManager, AIConfig, SupabaseConfig, MistralModel } from "@/core";
import { sessionManager } from "@/core";
import { getAIConfig, sendMessageToAI, ResourceContext, ConversationMessage } from "@/lib/aiApi";

interface UseAIReturn {
  isConfigured: boolean;
  currentModel: MistralModel | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (
    sessionId: string,
    userMessage: string,
    resourceContext?: ResourceContext | null,
    memoryBlock?: string | null
  ) => Promise<string | null>;
  setAIConfig: (config: AIConfig) => void;
  setSupabaseConfig: (config: SupabaseConfig) => void;
  setModel: (model: MistralModel) => boolean;
  getAvailableModels: () => Array<{ id: MistralModel; name: string; description: string }>;
  clearError: () => void;
}

export function useAI(): UseAIReturn {
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [currentModel, setCurrentModel] = useState<MistralModel | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getAIConfig();
        setIsConfigured(config.configured);
        setCurrentModel((config.mistral.model as MistralModel) || null);
        console.log("✓ Configuración de IA cargada desde backend");
      } catch {
        setError("No se pudo cargar la configuración de IA");
      }
    };
    loadConfig();
  }, []);

  const handleSendMessage = useCallback(
    async (
      sessionId: string,
      userMessage: string,
      resourceContext?: ResourceContext | null,
      memoryBlock?: string | null
    ): Promise<string | null> => {
      if (!isConfigured) {
        setError("IA no está configurada en el servidor.");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Agregar mensaje del usuario a la sesión
        const userMsg = sessionManager.addMessage(sessionId, {
          id: `msg_${Date.now()}`,
          role: "user",
          type: "text",
          content: userMessage,
          timestamp: Date.now(),
        });

        if (!userMsg) {
          setError("No se pudo agregar el mensaje a la sesión");
          return null;
        }

        // 2. Construir historial de conversación desde la sesión
        const session = sessionManager.getSession(sessionId);
        const history: ConversationMessage[] = (session?.messages ?? [])
          .filter((m) => m.type === "text" && m.id !== userMsg.id)
          .slice(-20) // máximo 20 mensajes anteriores
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: (m as { type: "text"; content: string }).content,
          }));

        // 3. Enviar a Mistral con historial, contexto de recurso y memoria
        const aiResponse = await sendMessageToAI(
          userMessage,
          currentModel || undefined,
          history,
          resourceContext,
          memoryBlock
        );

        if (!aiResponse) {
          setError("Error al obtener respuesta de Mistral AI");
          return null;
        }

        // 4. Agregar respuesta a la sesión
        sessionManager.addMessage(sessionId, {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          type: "text",
          content: aiResponse,
          timestamp: Date.now(),
        });

        return aiResponse;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured, currentModel]
  );

  const handleSetAIConfig = useCallback((config: AIConfig) => {
    aiManager.setAIConfig(config);
    setError(null);
  }, []);

  const handleSetSupabaseConfig = useCallback((config: SupabaseConfig) => {
    aiManager.setSupabaseConfig(config);
    setError(null);
  }, []);

  const handleSetModel = useCallback((model: MistralModel): boolean => {
    const success = aiManager.setModel(model);
    if (success) {
      setCurrentModel(model);
      setError(null);
    }
    return success;
  }, []);

  const handleGetAvailableModels = useCallback(() => {
    return aiManager.getAvailableModels();
  }, []);

  return {
    isConfigured,
    currentModel,
    isLoading,
    error,
    sendMessage: handleSendMessage,
    setAIConfig: handleSetAIConfig,
    setSupabaseConfig: handleSetSupabaseConfig,
    setModel: handleSetModel,
    getAvailableModels: handleGetAvailableModels,
    clearError: useCallback(() => setError(null), []),
  };
}
