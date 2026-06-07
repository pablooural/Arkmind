/**
 * ResourceExplorer Component (Panel B)
 *
 * Context Runtime — explorador universal de recursos vivos.
 *
 * CAMBIO: Reemplaza DEMO_RESOURCES por filesystem real.
 * Usa useFilesystemAccess para pedir acceso y filesystemManager para listar.
 * Mantiene todos los tipos de recursos (conversación, nota, snapshot, etc.)
 * para cuando el Runtime los agregue en el futuro.
 * Long-press sobre cualquier elemento para cambiar el contexto raíz.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFilesystemAccess } from "@/hooks/useFilesystemAccess";
import { Theme } from "@/types/theme";
import { ResourceNode, ResourceType, Snapshot } from "@/core/types";
import { filesystemManager } from "@/core/filesystem";
import { snapshotManager } from "@/core/snapshots";
import {
  ChevronRight, Folder, File, MessageSquare, BookOpen, BookMarked,
  Camera, CheckSquare, StickyNote, Brain, GitBranch, FileText,
  FolderOpen, RotateCcw, Search, History, FileCheck, ShieldAlert,
} from "lucide-react";

// ─── Helpers de tipo / icono / color ──────────────────────────────────────────

function getResourceIcon(type: ResourceType, size = 14) {
  const style = { flexShrink: 0 as const, opacity: 0.75 };
  switch (type) {
    case "folder":       return <Folder        size={size} style={style} />;
    case "file":         return <File          size={size} style={style} />;
    case "conversation": return <MessageSquare size={size} style={style} />;
    case "story":        return <BookOpen      size={size} style={style} />;
    case "chapter":      return <BookMarked    size={size} style={style} />;
    case "snapshot":     return <Camera        size={size} style={style} />;
    case "task":         return <CheckSquare   size={size} style={style} />;
    case "note":         return <StickyNote    size={size} style={style} />;
    case "ai-node":      return <Brain         size={size} style={style} />;
    case "branch":       return <GitBranch     size={size} style={style} />;
    case "document":     return <FileText      size={size} style={style} />;
    default:             return <File          size={size} style={style} />;
  }
}

function getResourceColor(type: ResourceType, accent: string, text: string): string {
  switch (type) {
    case "conversation": return "#60a5fa";
    case "story":        return "#a78bfa";
    case "chapter":      return "#c4b5fd";
    case "snapshot":     return "#f472b6";
    case "task":         return "#34d399";
    case "note":         return "#fbbf24";
    case "ai-node":      return "#f87171";
    case "branch":       return "#4ade80";
    case "document":     return "#94a3b8";
    case "folder":       return accent;
    default:             return text;
  }
}

function getResourceLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    folder: "carpeta", file: "archivo", conversation: "conversación",
    story: "historia", chapter: "capítulo", snapshot: "snapshot",
    task: "tarea", note: "nota", "ai-node": "nodo IA",
    branch: "rama", document: "documento",
  };
  return labels[type] ?? type;
}

const isContainer = (type: ResourceType) =>
  type === "folder" || type === "story" || type === "branch";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResourceExplorerProps {
  theme: Theme;
  onSelectResource?: (node: ResourceNode) => void;
  selectedResourcePath?: string | null;
}

// ─── Fila de recurso ──────────────────────────────────────────────────────────

interface ResourceRowProps {
  node: ResourceNode;
  depth: number;
  selected: string | null;
  expanded: Set<string>;
  loadedChildren: Record<string, ResourceNode[]>;
  theme: Theme;
  onSelect: (node: ResourceNode) => void;
  onToggle: (node: ResourceNode) => void;
  onLongPressStart: (path: string) => void;
  onLongPressEnd: () => void;
}

function ResourceRow({
  node, depth, selected, expanded, loadedChildren, theme,
  onSelect, onToggle, onLongPressStart, onLongPressEnd,
}: ResourceRowProps) {
  const isSelected   = selected === node.path;
  const isExpandable = isContainer(node.type);
  const isExpanded   = expanded.has(node.path);
  const nodeColor    = getResourceColor(node.type, theme.accent, theme.text);
  const children     = loadedChildren[node.path] ?? node.children ?? [];

  return (
    <>
      <div
        onClick={() => {
          if (isExpandable) onToggle(node);
          onSelect(node);
        }}
        onMouseDown={() => onLongPressStart(node.path)}
        onMouseUp={onLongPressEnd}
        onTouchStart={() => onLongPressStart(node.path)}
        onTouchEnd={onLongPressEnd}
        title={`${getResourceLabel(node.type)} — long-press para cambiar contexto`}
        style={{
          padding: "0.42rem 0.9rem",
          paddingLeft: `${0.9 + depth * 1.1}rem`,
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          cursor: "pointer",
          background: isSelected ? `${theme.accent}18` : "transparent",
          borderLeft: isSelected ? `2px solid ${theme.accent}` : "2px solid transparent",
          color: isSelected ? nodeColor : theme.text,
          fontSize: "0.74rem",
          transition: "all 0.1s",
          userSelect: "none",
        }}
      >
        {isExpandable ? (
          <ChevronRight
            size={13}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.18s",
              flexShrink: 0, opacity: 0.55, cursor: "pointer",
            }}
            onClick={(e) => { e.stopPropagation(); onToggle(node); }}
          />
        ) : (
          <ChevronRight size={13} style={{ opacity: 0, flexShrink: 0 }} />
        )}

        <span style={{ color: isSelected ? nodeColor : `${nodeColor}bb` }}>
          {getResourceIcon(node.type)}
        </span>

        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.name}
        </span>

        {node.size !== undefined && node.type === "file" && (
          <span style={{ fontSize: "0.58rem", opacity: 0.3, flexShrink: 0 }}>
            {node.size < 1024 ? `${node.size}b` : `${(node.size / 1024).toFixed(0)}k`}
          </span>
        )}

        {isSelected && (
          <span style={{
            fontSize: "0.58rem", color: `${nodeColor}99`,
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.04em", flexShrink: 0,
          }}>
            {getResourceLabel(node.type)}
          </span>
        )}
      </div>

      {isExpandable && isExpanded && children.map((child) => (
        <ResourceRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          loadedChildren={loadedChildren}
          theme={theme}
          onSelect={onSelect}
          onToggle={onToggle}
          onLongPressStart={onLongPressStart}
          onLongPressEnd={onLongPressEnd}
        />
      ))}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type ExplorerTab = "files" | "context" | "snapshots" | "contracts" | "adrs";

export function ResourceExplorer({ theme, onSelectResource, selectedResourcePath }: ResourceExplorerProps) {
  const { activeContextPath, setActiveContext } = useWorkspace();
  const {
    isReady, isLoading: fsLoading, rootName,
    isSupported, error: fsError,
    requestAccess, releaseAccess,
  } = useFilesystemAccess();

  const [activeTab, setActiveTab]             = useState<ExplorerTab>("files");
  const [items, setItems]                     = useState<ResourceNode[]>([]);
  const [snapshots, setSnapshots]             = useState<Snapshot[]>([]);
  const [selected, setSelected]               = useState<string | null>(selectedResourcePath ?? null);
  const [expanded, setExpanded]               = useState<Set<string>>(new Set());
  const [loadedChildren, setLoadedChildren]   = useState<Record<string, ResourceNode[]>>({});
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [currentPath, setCurrentPath]         = useState("/");

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullPath = activeContextPath || "/";

  // ── Cargar datos según pestaña ──────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case "files":
          const nodes = await filesystemManager.listDirectory(currentPath);
          setItems(nodes);
          break;
        case "context":
          // Archivos relevantes en .arkmind/ (SUPOSICIONES, LEARNINGS, etc)
          const ctxNodes = await filesystemManager.listDirectory("/.arkmind");
          setItems(ctxNodes.filter(n => n.type === "file" && n.name.endsWith(".md")));
          break;
        case "contracts":
          // Todos los CONTRACT.md en .arkmind/modules/
          const modules = await filesystemManager.listDirectory("/.arkmind/modules");
          const contracts: ResourceNode[] = [];
          for (const mod of modules) {
            if (mod.type === "folder") {
              const modFiles = await filesystemManager.listDirectory(mod.path);
              const contract = modFiles.find(f => f.name === "CONTRACT.md");
              if (contract) contracts.push({ ...contract, name: `${mod.name} (Contract)` });
            }
          }
          setItems(contracts);
          break;
        case "adrs":
          // Todos los ADRs en .arkmind/decisions/
          const adrNodes = await filesystemManager.listDirectory("/.arkmind/decisions");
          setItems(adrNodes.filter(n => n.type === "file" && n.name.endsWith(".md")));
          break;
        case "snapshots":
          await snapshotManager.hydrate();
          const snaps = snapshotManager.listSnapshots(activeContextPath || "/");
          setSnapshots(snaps);
          break;
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, activeTab, currentPath, activeContextPath]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Expandir carpeta (carga lazy) ───────────────────────────────────────

  const handleToggle = useCallback(async (node: ResourceNode) => {
    const path = node.path;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) { next.delete(path); return next; }
      next.add(path);
      return next;
    });
    if (!loadedChildren[path]) {
      try {
        const children = await filesystemManager.listDirectory(path);
        setLoadedChildren((prev) => ({ ...prev, [path]: children }));
      } catch { /* silencioso */ }
    }
  }, [loadedChildren]);

  // ── Selección ───────────────────────────────────────────────────────────

  const handleSelect = useCallback((node: ResourceNode) => {
    setSelected(node.path);
    if (onSelectResource) onSelectResource(node);
  }, [onSelectResource]);

  // ── Long press ──────────────────────────────────────────────────────────

  const handleLongPressStart = (itemPath: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveContext(itemPath);
      setCurrentPath(itemPath);
      setSelected(null);
      setExpanded(new Set());
      setLoadedChildren({});
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ── Acceso ──────────────────────────────────────────────────────────────

  const handleOpenFolder = async () => {
    const ok = await requestAccess();
    if (ok) {
      setCurrentPath("/");
      setItems([]);
      setSelected(null);
      setExpanded(new Set());
      setLoadedChildren({});
    }
  };

  const handleChangeFolder = async () => {
    await releaseAccess();
    setItems([]);
    setSelected(null);
  };

  // ── Pantalla sin soporte ────────────────────────────────────────────────

  if (!isSupported) {
    return (
      <div style={{ padding: "1.5rem", color: theme.sub, fontSize: "0.75rem" }}>
        <p style={{ color: theme.text }}>Browser no compatible</p>
        <p>Requiere Chrome o Edge 86+.</p>
      </div>
    );
  }

  // ── Pantalla sin acceso ─────────────────────────────────────────────────

  if (!isReady) {
    const hasPrevious = !!rootName;
    const loading = fsLoading || isLoading;
    const displayError = fsError || error;

    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: "1rem", padding: "2rem",
        fontFamily: "'Courier New', monospace",
      }}>
        {hasPrevious
          ? <RotateCcw size={26} style={{ color: theme.accent, opacity: 0.7 }} />
          : <FolderOpen size={30} style={{ color: theme.accent, opacity: 0.7 }} />
        }
        <p style={{ color: theme.sub, fontSize: "0.75rem", textAlign: "center", margin: 0 }}>
          {hasPrevious
            ? <>Última: <strong style={{ color: theme.text }}>📁 {rootName}</strong><br />Necesitás re-autorizar el acceso.</>
            : "Elegí una carpeta para navegar"
          }
        </p>
        <button
          onClick={handleOpenFolder}
          disabled={loading}
          style={{
            background: theme.accent, color: theme.bg,
            border: "none", borderRadius: "6px",
            padding: "0.5rem 1.2rem", fontSize: "0.8rem",
            cursor: loading ? "wait" : "pointer",
            fontFamily: "'Courier New', monospace", fontWeight: 600,
            opacity: loading ? 0.6 : 1, transition: "opacity 0.15s",
          }}
        >
          {loading ? "abriendo..." : hasPrevious ? `Re-abrir "${rootName}"` : "Abrir carpeta"}
        </button>
        {hasPrevious && (
          <span onClick={handleChangeFolder} style={{
            color: theme.sub, fontSize: "0.68rem",
            cursor: "pointer", textDecoration: "underline", opacity: 0.6,
          }}>
            elegir otra carpeta
          </span>
        )}
        {displayError && (
          <p style={{ color: "#ff6b6b", fontSize: "0.7rem", textAlign: "center", margin: 0 }}>
            {displayError}
          </p>
        )}
      </div>
    );
  }

  // ── Render principal ────────────────────────────────────────────────────

  const renderTabTrigger = (id: ExplorerTab, icon: React.ReactNode, label: string) => {
    const isActive = activeTab === id;
    return (
      <div
        onClick={() => setActiveTab(id)}
        title={label}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0.5rem 0", cursor: "pointer",
          borderBottom: `2px solid ${isActive ? theme.accent : "transparent"}`,
          color: isActive ? theme.accent : theme.sub,
          transition: "all 0.2s",
        }}
      >
        {icon}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Courier New', monospace" }}>

      {/* Tabs Selector */}
      <div style={{
        display: "flex", background: `${theme.bg}ee`,
        borderBottom: `1px solid ${theme.accent}12`, flexShrink: 0,
      }}>
        {renderTabTrigger("files",     <Folder size={14} />, "Archivos")}
        {renderTabTrigger("context",   <Brain size={14} />, "Contexto")}
        {renderTabTrigger("snapshots", <History size={14} />, "Snapshots")}
        {renderTabTrigger("contracts", <FileCheck size={14} />, "Contratos")}
        {renderTabTrigger("adrs",      <ShieldAlert size={14} />, "ADRs")}
      </div>

      {/* Header Info */}
      <div style={{
        padding: "0.4rem 0.9rem",
        borderBottom: `1px solid ${theme.accent}08`,
        background: `${theme.bg}88`,
        flexShrink: 0, fontSize: "0.6rem", color: theme.sub,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ opacity: 0.5, letterSpacing: "0.05em" }}>
          {activeTab.toUpperCase()} {activeTab === "files" && `— ${currentPath}`}
        </span>
        {activeTab === "files" && (
          <span style={{ color: theme.accent, fontSize: "0.65rem", fontWeight: 600 }}>
            📁 {rootName}
          </span>
        )}
      </div>

      {/* Breadcrumb (solo en archivos) */}
      {activeTab === "files" && (
        <div style={{
          padding: "0.4rem 0.9rem",
          borderBottom: `1px solid ${theme.accent}18`,
          display: "flex", alignItems: "center", gap: "0.3rem",
          flexWrap: "wrap", background: `${theme.bg}cc`, flexShrink: 0,
        }}>
          <span
            onClick={() => { setCurrentPath("/"); setExpanded(new Set()); }}
            onMouseDown={() => handleLongPressStart("/")}
            onMouseUp={handleLongPressEnd}
            onTouchStart={() => handleLongPressStart("/")}
            onTouchEnd={handleLongPressEnd}
            style={{
              color: currentPath === "/" ? theme.text : theme.accent,
              cursor: "pointer", fontSize: "0.7rem",
              fontWeight: currentPath === "/" ? 600 : 400, userSelect: "none",
            }}
          >
            ~
          </span>
          {currentPath.replace(/^\//, "").split("/").filter(Boolean).map((part, i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ color: theme.sub, fontSize: "0.6rem" }}>/</span>
              <span
                onClick={() => {
                  const newPath = "/" + arr.slice(0, i + 1).join("/");
                  setCurrentPath(newPath);
                }}
                style={{
                  color: i === arr.length - 1 ? theme.text : theme.accent,
                  cursor: "pointer", fontSize: "0.7rem",
                  fontWeight: i === arr.length - 1 ? 600 : 400, userSelect: "none",
                }}
              >
                {part}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.3rem 0" }}>
        {isLoading && (
          <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.4 }}>
            cargando...
          </div>
        )}
        {error && !isLoading && (
          <div style={{
            padding: "1rem", margin: "0.5rem", borderRadius: "6px",
            background: "#ff6b6b18", border: "1px solid #ff6b6b33",
            color: "#ff6b6b", fontSize: "0.7rem",
          }}>
            {error}
          </div>
        )}
        
        {!isLoading && !error && activeTab !== "snapshots" && items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.4 }}>
            vacío
          </div>
        )}

        {/* Lista de Recursos (Files, Context, Contracts, ADRs) */}
        {!isLoading && !error && activeTab !== "snapshots" && items.map((node) => (
          <ResourceRow
            key={node.path}
            node={node}
            depth={0}
            selected={selectedResourcePath ?? selected}
            expanded={expanded}
            loadedChildren={loadedChildren}
            theme={theme}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
          />
        ))}

        {/* Lista de Snapshots */}
        {!isLoading && !error && activeTab === "snapshots" && (
          snapshots.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.4 }}>
              no hay snapshots en este contexto
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                onClick={() => onSelectResource?.({
                  id: snap.id,
                  name: snap.label || `Snapshot ${snap.id.slice(0, 8)}`,
                  path: `snapshot://${snap.id}`,
                  type: "snapshot",
                })}
                style={{
                  padding: "0.6rem 0.9rem", cursor: "pointer",
                  borderBottom: `1px solid ${theme.accent}08`,
                  display: "flex", flexDirection: "column", gap: "0.2rem",
                  background: selectedResourcePath === `snapshot://${snap.id}` ? `${theme.accent}12` : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Camera size={14} style={{ color: theme.accent }} />
                  <span style={{ fontSize: "0.75rem", color: theme.text, fontWeight: 500 }}>
                    {snap.label || "Sin etiqueta"}
                  </span>
                </div>
                <div style={{ fontSize: "0.6rem", color: theme.sub, display: "flex", gap: "0.5rem" }}>
                  <span>{new Date(snap.timestamp).toLocaleString()}</span>
                  <span>•</span>
                  <span>{snap.metadata.resourceCount} archivos</span>
                </div>
                {snap.description && (
                  <div style={{ fontSize: "0.65rem", color: theme.sub, opacity: 0.8, fontStyle: "italic" }}>
                    {snap.description}
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "0.35rem 0.9rem",
        borderTop: `1px solid ${theme.accent}12`,
        fontSize: "0.58rem", color: theme.sub, opacity: 0.45,
        flexShrink: 0, display: "flex", justifyContent: "space-between",
      }}>
        <span>{items.length} elementos</span>
        <span
          onClick={handleChangeFolder}
          style={{ cursor: "pointer", textDecoration: "underline" }}
          title="Cambiar carpeta raíz"
        >
          cambiar carpeta
        </span>
      </div>
    </div>
  );
}
