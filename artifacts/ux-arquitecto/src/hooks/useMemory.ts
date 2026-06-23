/**
 * useMemory — React hook para el Sistema de Memoria
 *
 * Expone Working Memory, Context Memory, herencia jerárquica y
 * Cognitive Snapshots. Permite al ConversationPanel y otros componentes
 * leer, actualizar y persistir la memoria contextual.
 */

import { useState, useCallback, useEffect } from "react";
import { memoryManager } from "@/core/memory";
import { WorkingMemory, ContextMemory, CognitiveSnapshot } from "@/core/types";

interface UseMemoryOptions {
  sessionId: string | null;
  contextPath?: string;
}

interface UseMemoryReturn {
  workingMemory: WorkingMemory | null;
  contextMemory: ContextMemory | null;
  hasMemory: boolean;
  snapshots: CognitiveSnapshot[];

  updateWorkingMemory: (updates: Partial<WorkingMemory>) => void;
  updateContextMemory: (updates: Partial<ContextMemory>) => void;
  buildMemoryBlock: () => Promise<string>;
  createSnapshot: (label: string, trigger?: CognitiveSnapshot["trigger"]) => Promise<CognitiveSnapshot | null>;
  restoreSnapshot: (snapshotId: string) => void;

  trackResource: (resourcePath: string) => void;
  setFocus: (focus: string, intent?: string) => void;
  addInsight: (insight: string) => void;
  addDecision: (decision: string) => void;
  addQuestion: (question: string) => void;
}

export function useMemory({ sessionId, contextPath = "/" }: UseMemoryOptions): UseMemoryReturn {
  const [workingMemory, setWorkingMemory] = useState<WorkingMemory | null>(null);
  const [contextMemory, setContextMemory] = useState<ContextMemory | null>(null);
  const [snapshots, setSnapshots]         = useState<CognitiveSnapshot[]>([]);

  // Cargar memoria al montar o cuando cambia el contexto/sesión
  useEffect(() => {
    if (!sessionId) return;

    // FIX A: race condition — si sessionId/contextPath cambia mientras las
    // promesas están en vuelo, ignoramos las respuestas obsoletas para no
    // pisar el state de la nueva sesión con datos de la anterior.
    let cancelled = false;

    const wm = memoryManager.getWorkingMemory(sessionId);
    if (!cancelled) setWorkingMemory(wm);

    memoryManager.loadHierarchicalMemory(contextPath).then(({ merged, chain }) => {
      if (cancelled) return;
      setContextMemory(chain.length > 0 ? merged : null);
    }).catch((error) => {
      if (cancelled) return;
      console.error(`Failed to load hierarchical memory for ${contextPath}:`, error);
    });

    memoryManager.listCognitiveSnapshots(contextPath)
      .then((snaps) => {
        if (cancelled) return;
        setSnapshots(snaps.slice(0, 10));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(`Failed to list cognitive snapshots for ${contextPath}:`, error);
      });

    return () => { cancelled = true; };
  }, [sessionId, contextPath]);

  const updateWorkingMemory = useCallback(
    (updates: Partial<WorkingMemory>) => {
      if (!sessionId) return;
      const updated = memoryManager.updateWorkingMemory(sessionId, updates);
      setWorkingMemory({ ...updated });
    },
    [sessionId]
  );

  const updateContextMemory = useCallback(
    (updates: Partial<ContextMemory>) => {
      memoryManager.updateContextMemory(contextPath, updates).then((updated) => {
        setContextMemory({ ...updated });
      }).catch((error) => {
        console.error(`Failed to update context memory for ${contextPath}:`, error);
      });
    },
    [contextPath]
  );

  const buildMemoryBlock = useCallback(async (): Promise<string> => {
    if (!sessionId) return "";
    return memoryManager.buildMemoryBlock(contextPath, sessionId);
  }, [contextPath, sessionId]);

  const createSnapshot = useCallback(
    async (label: string, trigger: CognitiveSnapshot["trigger"] = "manual"): Promise<CognitiveSnapshot | null> => {
      if (!sessionId) return null;
      const snap = await memoryManager.createCognitiveSnapshot(contextPath, sessionId, label, trigger);
      setSnapshots((prev) => [snap, ...prev].slice(0, 10));
      return snap;
    },
    [contextPath, sessionId]
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      if (!sessionId) return;
      memoryManager.restoreFromSnapshot(snapshotId, sessionId).then((restored) => {
        if (restored) setWorkingMemory({ ...restored });
      }).catch((error) => {
        console.error(`Failed to restore snapshot ${snapshotId}:`, error);
      });
    },
    [sessionId]
  );

  const trackResource = useCallback(
    (resourcePath: string) => {
      if (!sessionId) return;
      memoryManager.addActiveResource(sessionId, resourcePath);
      setWorkingMemory((prev) =>
        prev
          ? { ...prev, activeResources: [...new Set([...prev.activeResources, resourcePath])].slice(-5) }
          : null
      );
    },
    [sessionId]
  );

  const setFocus = useCallback(
    (focus: string, intent?: string) => {
      if (!sessionId) return;
      const updates: Partial<WorkingMemory> = { focus };
      if (intent !== undefined) updates.intent = intent;
      const updated = memoryManager.updateWorkingMemory(sessionId, updates);
      setWorkingMemory({ ...updated });
    },
    [sessionId]
  );

  const addInsight = useCallback(
    (insight: string) => {
      if (!sessionId) return;
      memoryManager.addInsightToWorking(sessionId, insight);
      setWorkingMemory((prev) =>
        prev
          ? { ...prev, keyInsights: [...new Set([...prev.keyInsights, insight])].slice(-10) }
          : null
      );
    },
    [sessionId]
  );

  const addDecision = useCallback(
    (decision: string) => {
      if (!sessionId) return;
      // FIX B: leer del manager (no del state React, que puede ser null o
      // desactualizado por timing con useEffect). integrateAIResponse hace
      // read+append+write atómicamente desde la fuente de verdad (IDB+RAM).
      memoryManager.integrateAIResponse(contextPath, sessionId, "", { addDecision: decision })
        .then(() => memoryManager.getContextMemory(contextPath))
        .then((updated) => { setContextMemory({ ...updated }); })
        .catch((error) => {
          console.error(`Failed to add decision for ${contextPath}:`, error);
        });
    },
    [sessionId, contextPath]
  );

  const addQuestion = useCallback(
    (question: string) => {
      if (!sessionId) return;
      // FIX B: idem addDecision, pero para openQuestions
      memoryManager.integrateAIResponse(contextPath, sessionId, "", { addQuestion: question })
        .then(() => memoryManager.getContextMemory(contextPath))
        .then((updated) => { setContextMemory({ ...updated }); })
        .catch((error) => {
          console.error(`Failed to add question for ${contextPath}:`, error);
        });
    },
    [sessionId, contextPath]
  );

  return {
    workingMemory,
    contextMemory,
    hasMemory: contextMemory !== null || (workingMemory?.focus !== ""),
    snapshots,
    updateWorkingMemory,
    updateContextMemory,
    buildMemoryBlock,
    createSnapshot,
    restoreSnapshot,
    trackResource,
    setFocus,
    addInsight,
    addDecision,
    addQuestion,
  };
}
