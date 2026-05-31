/**
 * Home Page
 * Inicializa el workspace y renderiza DualPanelLayout
 * 
 * CAMBIOS CAPA 6:
 * - Inicializa workspace con workspaceManager
 * - Crea sesión IA inicial
 * - Configura contextos cognitivos y visuales
 * - Agrega logout button y user info
 */

import { useEffect, useState } from "react";
import { workspaceManager, sessionManager, cognitiveManager, visualManager } from "@/core";
import DualPanelLayout from "./DualPanelLayout";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const workspace = workspaceManager.initializeWorkspace(
      "workspace_main",
      "UX Arquitecto",
      "/home/user/projects"
    );

    const cognitiveContext = cognitiveManager.createContext("/home/user/projects", "architecture");
    const visualContext = visualManager.createContext("panel_chat", "/home/user/projects");

    const session = sessionManager.createSession(
      "panel_chat",
      "/home/user/projects",
      cognitiveContext,
      visualContext
    );

    workspaceManager.attachSession("panel_chat", session);
    setSessionId(session.id);

    console.log("✓ Workspace inicializado:", workspace);
    console.log("✓ Sesión IA creada:", session.id);

    return () => {
      sessionManager.destroySession(session.id);
      cognitiveManager.clearContext("/home/user/projects");
      visualManager.clearContext("panel_chat");
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <DualPanelLayout sessionId={sessionId} />
    </div>
  );
}
