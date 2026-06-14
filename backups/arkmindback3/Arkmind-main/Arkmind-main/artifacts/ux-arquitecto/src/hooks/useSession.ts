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
  CognitiveContext,
  VisualContext,
  CognitiveGoal,
  snapshotStore,
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
  createSession: (title?: string, panelId?: string, contextPath?: string) => AIContextSession;
  forkSession: (fromMessageIndex?: number, title?: string) => AIContextSession | null;
  setActiveSession: (id: string) => Promise<void>;
  listSessions: (includeArchived?: boolean) => AIContextSession[];
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

  const handleGetSummary = useCallback((): string => {
    if (!session) return "";
    return sessionManager.getSummary(session.id);
  }, [session]);

  const handleCreateSession = useCallback(
    (title?: string, panelId?: string, contextPath?: string): AIContextSession => {
      const cognitiveContext: CognitiveContext = {
        contextPath: contextPath || "",
        goal: "exploration" as CognitiveGoal,
        focusSummary: title || "",
        insights: [],
        openQuestions: [],
        constraints: [],
        lastUpdated: Date.now(),
      };
      const visualContext: VisualContext = {
        panelId: panelId || "panel_1",
        contextPath: contextPath || "",
        persistent: { openResources: [], viewMode: "code" },
        transient: { lastInteraction: Date.now() },
      };

      const newSession = sessionManager.createSession(
        panelId || visualContext.panelId,
        contextPath || "",
        cognitiveContext,
        visualContext
      );
      if (title) (newSession as any).title = title;
      setSession(newSession);
      setMessages(newSession.messages);
      setProposals(newSession.proposals);
      return newSession;
    },
    []
  );

  const handleForkSession = useCallback(
    (fromMessageIndex?: number, title?: string): AIContextSession | null => {
      if (!session) return null;
      const forked = sessionManager.forkSession(session.id, { fromMessageIndex, title });
      if (forked) {
        setSession(forked);
        setMessages(forked.messages);
        setProposals(forked.proposals);
      }
      return forked;
    },
    [session]
  );

  const handleSetActiveSession = useCallback(async (id: string): Promise<void> => {
    const sess = sessionManager.getSession(id);
    if (sess) {
      setSession(sess);
      setMessages(sess.messages);
      setProposals(sess.proposals);

      // Restore visual context if available
      const visualId = sess.visualContextId;
      if (visualId) {
        try {
          const { tx, store } = await snapshotStore.getRuntimeStore('visual_contexts', 'readonly');
          const req = store.get(visualId);
          const visual = await new Promise<any>((resolve) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          });
          if (visual) {
            // Emit event so UI can restore visual state
            window.dispatchEvent(new CustomEvent('visual:restore', { detail: visual }));
          }
        } catch (err) {
          // ignore
          // console.error('Failed to restore visual context', err);
        }
      }

      // Activate panel globally
      window.dispatchEvent(new CustomEvent('panel:setActive', { detail: { panelId: sess.panelId, sessionId: id } }));
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as any;
      if (detail?.id) {
        handleSetActiveSession(detail.id).catch(() => {});
      }
    };

    window.addEventListener('session:activate', handler as EventListener);
    return () => window.removeEventListener('session:activate', handler as EventListener);
  }, [handleSetActiveSession]);

  const handleListSessions = useCallback((includeArchived = false): AIContextSession[] => {
    const all = sessionManager.getAllSessions();
    return all
      .filter((s) => (includeArchived ? true : s.state !== "archived"))
      .sort((a, b) => b.lastActive - a.lastActive);
  }, []);

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
    createSession: handleCreateSession,
    forkSession: handleForkSession,
    setActiveSession: handleSetActiveSession,
    listSessions: handleListSessions,
    getSummary: handleGetSummary,
  };
}
