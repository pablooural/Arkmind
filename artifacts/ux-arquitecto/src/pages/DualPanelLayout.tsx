/**
 * DualPanelLayout
 * Orquestador principal del Context Runtime.
 *
 * CAMBIO: Integra EditorPanel.
 * Cuando se selecciona un archivo, el panel principal cambia a editor.
 * El explorador sigue visible en modo split o slide.
 *
 * Panel A: ConversationPanel o EditorPanel (según selección)
 * Panel B: ResourceExplorer
 */

import { useState, useCallback, useEffect } from "react";
import { Theme } from "@/types/theme";
import { getDefaultTheme } from "@/utils/colorSystem";
import { ConfigMenu } from "@/components/ConfigMenu";
import { ConversationPanel } from "@/components/ConversationPanel";
import { ResourceExplorer } from "@/components/ResourceExplorer";
import { EditorPanel } from "@/components/EditorPanel";
import { SnapshotPanel } from "@/components/SnapshotPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { SplitView } from "@/components/SplitView";
import { SlideModeView } from "@/components/SlideModeView";
import { ResourceNode } from "@/core/types";

type LayoutMode = "slide" | "split-v" | "split-h";

interface DualPanelLayoutProps {
  sessionId: string | null;
}

export default function DualPanelLayout({ sessionId }: DualPanelLayoutProps) {
  // T-043: restaurar UI prefs desde localStorage al boot.
  // Solo restauramos en el render inicial; luego useEffect persiste los cambios.
  const [mode, setMode]             = useState<LayoutMode>(() => {
    const v = localStorage.getItem("arkmind.ui.mode");
    return (v === "slide" || v === "split-v" || v === "split-h") ? v : "slide";
  });
  const [sideOpen, setSideOpen]     = useState(false);
  const [swapped, setSwapped]       = useState<boolean>(() => {
    return localStorage.getItem("arkmind.ui.swapped") === "true";
  });
  const [flipping, setFlipping]     = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHistory, setShowHistory]     = useState(false);
  const [theme, setTheme]           = useState<Theme>(() => {
    const v = localStorage.getItem("arkmind.ui.theme");
    return v ? JSON.parse(v) : getDefaultTheme();
  });
  const [selectedResource, setSelectedResource] = useState<ResourceNode | null>(() => {
    const v = localStorage.getItem("arkmind.ui.selectedResource");
    return v ? JSON.parse(v) : null;
  });

  // T-043: persistir UI prefs cuando cambian.
  useEffect(() => { localStorage.setItem("arkmind.ui.mode", mode); }, [mode]);
  useEffect(() => { localStorage.setItem("arkmind.ui.swapped", String(swapped)); }, [swapped]);
  useEffect(() => { localStorage.setItem("arkmind.ui.theme", JSON.stringify(theme)); }, [theme]);
  useEffect(() => {
    if (selectedResource) {
      localStorage.setItem("arkmind.ui.selectedResource", JSON.stringify(selectedResource));
    } else {
      localStorage.removeItem("arkmind.ui.selectedResource");
    }
  }, [selectedResource]);

  // Si hay un archivo seleccionado (no carpeta), mostramos el editor
  const showEditor = selectedResource !== null && selectedResource.type !== "folder";

  const handleSelectResource = useCallback((node: ResourceNode) => {
    setSelectedResource(node);
    // En modo slide: si el explorador está en el panel lateral, lo cerramos
    // para que el usuario vea el editor/chat
    if (mode === "slide" && swapped) setSideOpen(false);
    if (mode === "slide" && !swapped) setSideOpen(false);
  }, [mode, swapped]);

  const handleSwap = () => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setSwapped((s) => !s);
      setFlipping(false);
    }, 420);
  };

  // Panel principal: editor si hay archivo seleccionado, chat si no
  const mainPanel = showEditor ? (
    <EditorPanel theme={theme} resource={selectedResource} />
  ) : (
    <ConversationPanel
      theme={theme}
      sessionId={sessionId}
      activeResource={selectedResource}
      onResourceChange={(resource) => {
        // T-038: cuando el chat sube un archivo y el padre quiere abrirlo en el editor,
        // construimos un ResourceNode mínimo y lo activamos.
        setSelectedResource({
          id: resource.path,
          path: resource.path,
          name: resource.name,
          type: "file",
          size: resource.size,
          ext: resource.name.includes(".") ? resource.name.split(".").pop() : undefined,
        });
        if (mode === "slide" && (swapped || !swapped)) setSideOpen(false);
      }}
    />
  );

  const explorerPanel = (
    <ResourceExplorer
      theme={theme}
      onSelectResource={handleSelectResource}
      selectedResourcePath={selectedResource?.path ?? null}
    />
  );

  const fixedContent = swapped ? explorerPanel : mainPanel;
  const sideContent  = swapped ? mainPanel     : explorerPanel;

  const btn = (active: boolean) => ({
    display:        "flex"    as const,
    alignItems:     "center"  as const,
    justifyContent: "center"  as const,
    width:          "40px",
    height:         "40px",
    borderRadius:   "9px",
    border:         active ? `1px solid ${theme.accent}88` : "1px solid rgba(255,255,255,0.1)",
    background:     active ? `${theme.accent}22`           : "rgba(255,255,255,0.05)",
    color:          active ? theme.accent                  : "#94a3b8",
    cursor:         "pointer",
    fontSize:       "16px",
    transition:     "all 0.18s",
    userSelect:     "none" as const,
    flexShrink:     0,
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <div style={{
      width:         "100vw",
      height:        "100vh",
      background:    `linear-gradient(135deg, ${theme.bg} 0%, ${theme.surface} 55%, ${theme.bg} 100%)`,
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
      fontFamily:    "'Courier New', monospace",
      transition:    "background 0.4s",
    }}>

      {/* TOP BAR */}
      <div style={{
        height:         "54px",
        flexShrink:     0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 0.9rem",
        borderBottom:   "1px solid rgba(255,255,255,0.07)",
        background:     "rgba(0,0,0,0.35)",
        backdropFilter: "blur(12px)",
      }}>
        <button
          onClick={() => setConfigOpen(true)}
          style={{ ...btn(configOpen), fontSize: "18px", letterSpacing: "-1px" }}
          title="Configuración"
        >
          ≡
        </button>

        {/* Título / archivo activo */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "0.1rem",
          overflow: "hidden", maxWidth: "50%",
        }}>
          <span style={{
            fontSize: "0.6rem", color: theme.sub,
            letterSpacing: "0.1em", opacity: 0.5, userSelect: "none",
          }}>
            {showEditor ? "EDITOR" : "CONTEXT RUNTIME"}
          </span>
          {showEditor && selectedResource && (
            <span style={{
              fontSize: "0.65rem", color: theme.accent, opacity: 0.8,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
              {selectedResource.name}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          {/* Botón Historial */}
          <button
            style={{...btn(showHistory), fontSize: "14px"}}
            onClick={() => { setShowHistory((s) => !s); setShowSnapshots(false); }}
            title="Historial de operaciones"
          >
            📋
          </button>
          {/* Botón Snapshots */}
          <button
            style={{...btn(showSnapshots), fontSize: "14px"}}
            onClick={() => { setShowSnapshots((s) => !s); setShowHistory(false); }}
            title="Historial de snapshots"
          >
            ⏱
          </button>
          {/* Botón para volver al chat si hay editor abierto */}
          {showEditor && (
            <button
              style={{ ...btn(false), fontSize: "14px" }}
              onClick={() => setSelectedResource(null)}
              title="Volver al chat"
            >
              💬
            </button>
          )}
          <button
            style={{
              ...btn(false),
              transform:  flipping ? "rotateY(90deg)" : "rotateY(0deg)",
              transition: "transform 0.42s ease, background 0.18s, border 0.18s, color 0.18s",
            }}
            onClick={handleSwap}
            title="Intercambiar paneles"
          >
            ⇄
          </button>
          <button
            style={btn(mode === "split-v")}
            onClick={() => setMode((m) => (m === "split-v" ? "slide" : "split-v"))}
            title="División vertical"
          >
            ▐
          </button>
          <button
            style={btn(mode === "split-h")}
            onClick={() => setMode((m) => (m === "split-h" ? "slide" : "split-h"))}
            title="División horizontal"
          >
            ▄
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {mode === "slide" && (
          <SlideModeView
            sideOpen={sideOpen}
            setSideOpen={setSideOpen}
            sideContent={sideContent}
            fixedContent={fixedContent}
            flipping={flipping}
            theme={theme}
          />
        )}

        {mode === "split-v" && (
          <SplitView
            direction="vertical"
            accent={theme.accent}
            theme={theme}
            panelA={swapped ? explorerPanel : mainPanel}
            panelB={swapped ? mainPanel     : explorerPanel}
          />
        )}

        {mode === "split-h" && (
          <SplitView
            direction="horizontal"
            accent={theme.accent}
            theme={theme}
            panelA={swapped ? explorerPanel : mainPanel}
            panelB={swapped ? mainPanel     : explorerPanel}
          />
        )}
      </div>

      {/* HISTORY PANEL OVERLAY */}
      {showHistory && (
        <HistoryPanel
          theme={theme}
          contextPath={selectedResource?.path ?? "/"}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* SNAPSHOT PANEL OVERLAY */}
      {showSnapshots && (
        <SnapshotPanel
          theme={theme}
          contextPath={selectedResource?.path ?? "/"}
          filePaths={selectedResource?.type === "file" ? [selectedResource.path] : []}
          onClose={() => setShowSnapshots(false)}
        />
      )}

      {/* STATUS BAR */}
      <div style={{
        height:        "24px",
        flexShrink:    0,
        display:       "flex",
        alignItems:    "center",
        padding:       "0 0.9rem",
        gap:           "1.2rem",
        borderTop:     "1px solid rgba(255,255,255,0.05)",
        background:    "rgba(0,0,0,0.3)",
        fontSize:      "0.6rem",
        color:         "#334155",
        letterSpacing: "0.06em",
        overflow:      "hidden",
      }}>
        <span>
          {mode === "slide"    ? "LATERAL"
          : mode === "split-v" ? "DIV. VERTICAL"
          :                      "DIV. HORIZONTAL"}
        </span>
        {selectedResource && (
          <span style={{ color: theme.accent, opacity: 0.5 }}>
            {selectedResource.path}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: theme.accent, opacity: 0.5, fontSize: "0.55rem" }}>
          ● {theme.name || "Custom"}
        </span>
      </div>

      <ConfigMenu
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
}
