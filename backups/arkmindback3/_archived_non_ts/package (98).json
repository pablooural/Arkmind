/**
 * useSession Hook
 * Integración de sesiones IA con React
 * 
 * NUEVO en Arkitectgr:
 * - Wrappea SessionManager para React
 * - Expone métodos para enviar distintos tipos de mensajes
 * - Gestiona estado de sesión y propuestas
 */

import { useEffect, useState, useCallback } from "react";
import {
  sessionManager,
  AIContextSession,
  StructuredMessage,
  OperationProposal,
  SessionState,
} from "@/core";

interface UseSessionReturn {
  session: AIContextSession | null;
  messages: StructuredMessage[];
  proposals: OperationProposal[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<StructuredMessage | null>;
  sendCode: (content: string, language: string, path?: string) => Promise<StructuredMessage | null>;
  sendProposal: (summary: string, proposalId: string) => Promise<StructuredMessage | null>;
  updateProposalStatus: (proposalId: string, status: OperationProposal["status"]) => boolean;
  setState: (state: SessionState) => boolean;
  forkSession: () => AIContextSession | null;
  getSummary: () => string;
}

export function useSession(sessionId: string | null): UseSessionReturn {
  const [session, setSession] = useState<AIContextSession | null>(() =>
    sessionId ? sessionManager.getSession(sessionId) || null : null
  );
  const [messages, setMessages] = useState<StructuredMessage[]>(() => {
    if (!sessionId) return [];
    const sess = sessionManager.getSession(sessionId);
    return sess?.messages || [];
  });
  const [proposals, setProposals] = useState<OperationProposal[]>(() => {
    if (!sessionId) return [];
    const sess = sessionManager.getSession(sessionId);
    return sess?.proposals || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const sess = sessionManager.getSession(sessionId);
    if (sess) {
      setSession(sess);
      setMessages(sess.messages);
      setProposals(sess.proposals);
    }
  }, [sessionId]);

  const handleSendMessage = useCallback(
    async (content: string): Promise<StructuredMessage | null> => {
      if (!session) return null;

      setIsLoading(true);
      setError(null);

      try {
        const message: StructuredMessage = {
          id: `msg_${Date.now()}`,
          role: "user",
          type: "text",
          content,
          timestamp: Date.now(),
        };

        const added = sessionManager.addMessage(session.id, message);
        if (added) {
          setMessages([...sessionManager.getMessages(session.id)]);
          return added;
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const handleSendCode = useCallback(
    async (content: string, language: string, path?: string): Promise<StructuredMessage | null> => {
      if (!session) return null;

      setIsLoading(true);
      setError(null);

      try {
        const message: StructuredMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          type: "code",
          language,
          content,
          path,
          timestamp: Date.now(),
        };

        const added = sessionManager.addMessage(session.id, message);
        if (added) {
          setMessages([...sessionManager.getMessages(session.id)]);
          return added;
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const handleSendProposal = useCallback(
    async (summary: string, proposalId: string): Promise<StructuredMessage | null> => {
      if (!session) return null;

      setIsLoading(true);
      setError(null);

      try {
        const message: StructuredMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          type: "proposal",
          proposalId,
          summary,
          timestamp: Date.now(),
        };

        const added = sessionManager.addMessage(session.id, message);
        if (added) {
          setMessages([...sessionManager.getMessages(session.id)]);
          return added;
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const handleUpdateProposalStatus = useCallback(
    (proposalId: string, status: OperationProposal["status"]): boolean => {
      if (!session) return false;

      const success = sessionManager.updateProposalStatus(session.id, proposalId, status);
      if (success) {
        const updated = sessionManager.getSession(session.id);
        if (updated) {
          setProposals(updated.proposals);
        }
      }

      return success;
    },
    [session]
  );

  const handleSetState = useCallback(
    (state: SessionState): boolean => {
      if (!session) return false;

      const success = sessionManager.setState(session.id, state);
      if (success) {
        const updated = sessionManager.getSession(session.id);
        if (updated) {
          setSession(updated);
        }
      }

      return success;
    },
    [session]
  );

  const handleForkSession = useCallback((): AIContextSession | null => {
    if (!session) return null;

    const forked = sessionManager.forkSession(session.id);
    if (forked) {
      setSession(forked);
      setMessages(forked.messages);
      setProposals(forked.proposals);
    }

    return forked;
  }, [session]);

  const handleGetSummary = useCallback((): string => {
    if (!session) return "";
    return sessionManager.getSummary(session.id);
  }, [session]);

  return {
    session,
    messages,
    proposals,
    isLoading,
    error,
    sendMessage: handleSendMessage,
    sendCode: handleSendCode,
    sendProposal: handleSendProposal,
    updateProposalStatus: handleUpdateProposalStatus,
    setState: handleSetState,
    forkSession: handleForkSession,
    getSummary: handleGetSummary,
  };
}
