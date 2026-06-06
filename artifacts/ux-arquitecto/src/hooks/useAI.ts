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
  propose: (
    sessionId: string,
    message: string,
    context?: string,
    memoryBlock?: string
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

  const handlePropose = useCallback(
    async (
      sessionId: string,
      message: string,
      context?: string,
      memoryBlock?: string
    ): Promise<string | null> => {
      if (!isConfigured) {
        setError("IA no está configurada.");
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
          content: message,
          timestamp: Date.now(),
        });

        if (!userMsg) {
          setError("No se pudo agregar el mensaje a la sesión");
          return null;
        }

        // 2. Construir historial de conversación
        const session = sessionManager.getSession(sessionId);
        const history = (session?.messages ?? [])
          .filter((m) => m.type === "text" && m.id !== userMsg.id)
          .slice(-10)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: (m as { type: "text"; content: string }).content,
          }));

        // 3. Llamar al manager unificado
        const proposal = await aiManager.propose({
          kind: "chat",
          message,
          history,
          context,
          memoryBlock,
        });

        if (proposal.kind === "noop") {
          setError(proposal.summary);
          return null;
        }

        let aiResponse = "";
        
        if (proposal.kind === "explanation") {
          aiResponse = proposal.text;
        } else if (proposal.kind === "insight_proposal") {
          aiResponse = `💡 **Propuesta de Insight:** ${proposal.content}`;
          // Auto-cerrar el bucle: registrar en la memoria de la sesión
          const { memoryManager } = await import("@/core");
          memoryManager.addInsightToWorking(sessionId, proposal.content);
        } else {
          aiResponse = "Respuesta no disponible";
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
    [isConfigured]
  );

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
    propose: handlePropose,
    setAIConfig: handleSetAIConfig,
    setSupabaseConfig: handleSetSupabaseConfig,
    setModel: handleSetModel,
    getAvailableModels: handleGetAvailableModels,
    clearError: useCallback(() => setError(null), []),
  };
}
