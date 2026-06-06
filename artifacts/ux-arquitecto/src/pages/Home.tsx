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
    const init = async () => {
      // 1. Intentar hidratar estado previo desde IDB
      const { coreEngine } = await import("@/core");
      await coreEngine.hydrateAll();

      // 2. Inicializar workspace (singleton)
      const workspace = workspaceManager.initializeWorkspace(
        "workspace_main",
        "UX Arquitecto",
        "/home/user/projects"
      );

      // 3. Verificar si ya existe una sesión para el panel principal
      let session = sessionManager.getSessionByPanel("panel_chat");
      
      if (!session) {
        // Solo crear si no existe (primera vez)
        const cognitiveContext = cognitiveManager.getContext("/home/user/projects") || 
                                 cognitiveManager.createContext("/home/user/projects", "architecture");
        
        const visualContext = visualManager.getContext("panel_chat") || 
                              visualManager.createContext("panel_chat", "/home/user/projects");

        session = sessionManager.createSession(
          "panel_chat",
          "/home/user/projects",
          cognitiveContext,
          visualContext
        );
        console.log("✓ Nueva sesión IA creada:", session.id);
      } else {
        console.log("✓ Sesión IA recuperada de persistencia:", session.id);
      }

      workspaceManager.attachSession("panel_chat", session);
      setSessionId(session.id);
      console.log("✓ Workspace inicializado:", workspace);
    };

    init();

    // Nota: Eliminamos el cleanup destructivo para mantener la persistencia entre refrescos.
    // El cleanup ahora solo debería ser para suscripciones si las hubiera.
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <DualPanelLayout sessionId={sessionId} />
    </div>
  );
}
