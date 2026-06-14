/**
 * useWorkspace Hook
 * Integración del Workspace Engine con React
 * 
 * CAMBIOS CAPA 1:
 * - WorkspaceContext eliminado
 * - Ahora expone WorkspacePanel[] en lugar de activeContext
 * - Métodos actualizados para reflejar nueva API de WorkspaceManager
 */

import { useEffect, useState, useCallback } from "react";
import { workspaceManager, Workspace, WorkspacePanel } from "@/core";

interface UseWorkspaceReturn {
  workspace: Workspace | null;
  panels: WorkspacePanel[];
  activeContextPath: string | null;
  isLoading: boolean;
  setActiveContext: (path: string) => boolean;
  addPanel: (panel: WorkspacePanel) => void;
  removePanel: (panelId: string) => boolean;
  updatePanel: (panelId: string, updates: Partial<WorkspacePanel>) => boolean;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<Workspace | null>(
    workspaceManager.getWorkspace()
  );
  const [panels, setPanels] = useState<WorkspacePanel[]>(
    workspace?.panels || []
  );
  const [activeContextPath, setActiveContextPath] = useState<string | null>(
    workspace?.activeContextPath || null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Suscribirse a cambios de contexto
    const unsubscribe = workspaceManager.onContextChange((path) => {
      setActiveContextPath(path);
      const ws = workspaceManager.getWorkspace();
      if (ws) {
        setWorkspace(ws);
        setPanels(ws.panels);
      }
    });

    return unsubscribe;
  }, []);

  const handleSetActiveContext = useCallback((path: string): boolean => {
    setIsLoading(true);
    try {
      const success = workspaceManager.setActiveContext(path);
      if (success) {
        const ws = workspaceManager.getWorkspace();
        if (ws) {
          setWorkspace(ws);
          setActiveContextPath(ws.activeContextPath);
        }
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddPanel = useCallback((panel: WorkspacePanel) => {
    workspaceManager.addPanel(panel);
    const ws = workspaceManager.getWorkspace();
    if (ws) {
      setWorkspace(ws);
      setPanels(ws.panels);
    }
  }, []);

  const handleRemovePanel = useCallback((panelId: string): boolean => {
    const success = workspaceManager.removePanel(panelId);
    if (success) {
      const ws = workspaceManager.getWorkspace();
      if (ws) {
        setWorkspace(ws);
        setPanels(ws.panels);
      }
    }
    return success;
  }, []);

  const handleUpdatePanel = useCallback(
    (panelId: string, updates: Partial<WorkspacePanel>): boolean => {
      const success = workspaceManager.updatePanel(panelId, updates);
      if (success) {
        const ws = workspaceManager.getWorkspace();
        if (ws) {
          setWorkspace(ws);
          setPanels(ws.panels);
        }
      }
      return success;
    },
    []
  );

  return {
    workspace,
    panels,
    activeContextPath,
    isLoading,
    setActiveContext: handleSetActiveContext,
    addPanel: handleAddPanel,
    removePanel: handleRemovePanel,
    updatePanel: handleUpdatePanel,
  };
}
