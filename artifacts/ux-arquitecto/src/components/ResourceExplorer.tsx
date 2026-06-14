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

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFilesystemAccess } from "@/hooks/useFilesystemAccess";
import { Theme } from "@/types/theme";
import { ResourceNode, ResourceType } from "@/core/types";
import { filesystemManager } from "@/core/filesystem";
import { snapshotStore, SnapshotRecord } from "@/core/snapshotStore";
import { contextEnricher, ActiveContext } from "@/core/ia-context-bridge";
import {
  ChevronRight, Folder, File, MessageSquare, BookOpen, BookMarked,
  Camera, CheckSquare, StickyNote, Brain, GitBranch, FileText,
  FolderOpen, RotateCcw,
} from "lucide-react";

// ─── Tabs (T-012: panel multi-tab) ────────────────────────────────────────

type ExplorerTab = "archivos" | "contexto" | "snapshots" | "contratos" | "adrs";

// Listas hardcodeadas de contratos/ADRs. v0.1 de T-012; v0.2 las lee de
// `import.meta.glob` o via filesystemManager si el workspace apunta a la
// raíz del repo. Mantenerlas aquí es predecible y no requiere tocar Vite.
const MODULE_CONTRACTS: Array<{ id: string; name: string; path: string }> = [
  { id: "snapshot-store",       name: "snapshot-store",       path: ".arkmind/modules/snapshot-store/CONTRACT.md" },
  { id: "rollback-engine",      name: "rollback-engine",      path: ".arkmind/modules/rollback-engine/CONTRACT.md" },
  { id: "op-journal",           name: "op-journal",           path: ".arkmind/modules/op-journal/CONTRACT.md" },
  { id: "runtime-persistence",  name: "runtime-persistence",  path: ".arkmind/modules/runtime-persistence/CONTRACT.md" },
  { id: "spec-discrepancies",   name: "spec-discrepancies",   path: ".arkmind/modules/spec-discrepancies/CONTRACT.md" },
  { id: "ia-context-bridge",    name: "ia-context-bridge",    path: ".arkmind/modules/ia-context-bridge/CONTRACT.md" },
];

const ADR_LIST: Array<{ id: string; title: string; path: string }> = [
  { id: "0001", title: "Snapshot storage en IndexedDB",                   path: ".arkmind/decisions/0001-snapshot-storage-indexeddb.md" },
  { id: "0002", title: "Rollback: quién actualiza Transaction.status",     path: ".arkmind/decisions/0002-rollback-transaction-status-update.md" },
  { id: "0003", title: "IA as optional provider (AIProvider interface)",   path: ".arkmind/decisions/0003-ai-as-optional-provider.md" },
  { id: "0004", title: "Auth as local with optional remote",               path: ".arkmind/decisions/0004-auth-as-local-with-optional-remote.md" },
  { id: "0005", title: "Runtime state persistence in IndexedDB",           path: ".arkmind/decisions/0005-runtime-state-persistence-in-indexeddb.md" },
  { id: "0006", title: "OpJournal persistence and core integration",       path: ".arkmind/decisions/0006-op-journal-persistence-and-core-integration.md" },
  { id: "0007", title: "IA Context Bridge (ActiveContext pattern)",        path: ".arkmind/decisions/0007-ia-context-bridge.md" },
];

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

export function ResourceExplorer({ theme, onSelectResource, selectedResourcePath }: ResourceExplorerProps) {
  const { activeContextPath, setActiveContext } = useWorkspace();
  const {
    isReady, isLoading: fsLoading, rootName,
    isSupported, error: fsError,
    requestAccess, releaseAccess,
  } = useFilesystemAccess();

  const [items, setItems]                     = useState<ResourceNode[]>([]);
  const [selected, setSelected]               = useState<string | null>(selectedResourcePath ?? null);
  const [expanded, setExpanded]               = useState<Set<string>>(new Set());
  const [loadedChildren, setLoadedChildren]   = useState<Record<string, ResourceNode[]>>({});
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [currentPath, setCurrentPath]         = useState("/");
  const [activeTab, setActiveTab]             = useState<ExplorerTab>("archivos");

  // Estado para la tab Snapshots (se carga async al activarse)
  const [snapshots, setSnapshots]             = useState<SnapshotRecord[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullPath = activeContextPath || "/";

  // ── Cargar directorio actual ────────────────────────────────────────────

  const loadDir = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await filesystemManager.listDirectory(path);
      setItems(nodes);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) loadDir(currentPath);
  }, [isReady, currentPath, loadDir]);

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

  // ── Pantalla sin soporte (solo aplica a tab Archivos) ─────────────────

  if (activeTab === "archivos" && !isSupported) {
    return (
      <div style={{ padding: "1.5rem", color: theme.sub, fontSize: "0.75rem" }}>
        <p style={{ color: theme.text }}>Browser no compatible</p>
        <p>Requiere Chrome o Edge 86+.</p>
      </div>
    );
  }

  // ── Pantalla sin acceso (solo aplica a tab Archivos) ───────────────────

  if (activeTab === "archivos" && !isReady) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Courier New', monospace" }}>

      {/* TabBar (T-012) */}
      <div style={{
        display: "flex", gap: "0.15rem",
        padding: "0.4rem 0.6rem 0",
        borderBottom: `1px solid ${theme.accent}18`,
        background: `${theme.bg}dd`,
        flexShrink: 0,
      }}>
        {([
          { id: "archivos"  as ExplorerTab, label: "Archivos"  },
          { id: "contexto"  as ExplorerTab, label: "Contexto"  },
          { id: "snapshots" as ExplorerTab, label: "Snapshots" },
          { id: "contratos" as ExplorerTab, label: "Contratos" },
          { id: "adrs"      as ExplorerTab, label: "ADRs"      },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            data-active={activeTab === t.id}
            style={{
              background: activeTab === t.id ? `${theme.accent}22` : "transparent",
              color: activeTab === t.id ? theme.text : theme.sub,
              border: "none", borderRadius: "4px 4px 0 0",
              padding: "0.35rem 0.7rem",
              fontSize: "0.65rem", fontFamily: "'Courier New', monospace",
              cursor: "pointer", fontWeight: activeTab === t.id ? 600 : 400,
              borderBottom: activeTab === t.id ? `2px solid ${theme.accent}` : "2px solid transparent",
              transition: "all 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Archivos (T-012) */}
      {activeTab === "archivos" && (<>
      {/* Header */}
      <div style={{
        padding: "0.5rem 0.9rem",
        borderBottom: `1px solid ${theme.accent}18`,
        background: `${theme.bg}cc`,
        flexShrink: 0, fontSize: "0.65rem", color: theme.sub,
      }}>
        <div style={{ marginBottom: "0.2rem", opacity: 0.5 }}>CONTEXT RUNTIME</div>
        <p style={{
          margin: 0, color: theme.accent, fontSize: "0.72rem",
          fontWeight: 500, wordBreak: "break-all", opacity: 0.85,
        }}>
          📁 {rootName}{currentPath !== "/" ? currentPath : ""}
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{
        padding: "0.5rem 0.9rem",
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
        {!isLoading && !error && items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.4 }}>
            carpeta vacía
          </div>
        )}
        {!isLoading && !error && items.map((node) => (
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
      </>)}

      {/* Tab: Contexto (T-012) — usa ContextEnricher de ia-context-bridge */}
      {activeTab === "contexto" && <ContextoTab theme={theme} />}

      {/* Tab: Snapshots (T-012) — usa snapshotStore.listSnapshots() */}
      {activeTab === "snapshots" && (
        <SnapshotsTab
          theme={theme}
          snapshots={snapshots}
          loading={snapshotsLoading}
          onLoad={async () => {
            setSnapshotsLoading(true);
            try {
              const list = await snapshotStore.listSnapshots();
              setSnapshots(list);
            } catch (e) {
              console.error("listSnapshots failed:", e);
            } finally {
              setSnapshotsLoading(false);
            }
          }}
        />
      )}

      {/* Tab: Contratos (T-012) — lista hardcodeada de módulos */}
      {activeTab === "contratos" && (
        <StaticListTab
          theme={theme}
          title="Contratos de módulos"
          subtitle="Lista hardcodeada en v0.1. v0.2 las lee via import.meta.glob o filesystemManager."
          items={MODULE_CONTRACTS.map((c) => ({ id: c.id, title: c.name, subtitle: c.path }))}
        />
      )}

      {/* Tab: ADRs (T-012) — lista hardcodeada de decisiones */}
      {activeTab === "adrs" && (
        <StaticListTab
          theme={theme}
          title="Decisiones arquitectónicas (ADRs)"
          subtitle="Lista hardcodeada en v0.1. v0.2 las lee via import.meta.glob o filesystemManager."
          items={ADR_LIST.map((a) => ({ id: a.id, title: a.title, subtitle: a.path }))}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes de las tabs nuevas (T-012) ────────────────────────────

function ContextoTab({ theme }: { theme: Theme }) {
  const ctx: ActiveContext = contextEnricher.captureActiveContext();
  const card: React.CSSProperties = {
    margin: "0.5rem 0.6rem", padding: "0.6rem 0.8rem",
    borderRadius: "6px", background: `${theme.accent}0a`,
    border: `1px solid ${theme.accent}22`, fontSize: "0.7rem",
    color: theme.text, fontFamily: "'Courier New', monospace",
  };
  const label: React.CSSProperties = { color: theme.sub, fontSize: "0.6rem", opacity: 0.7, marginRight: "0.4rem" };
  const empty: React.CSSProperties = { padding: "2rem 1rem", textAlign: "center", color: theme.sub, fontSize: "0.7rem", opacity: 0.5 };

  const hasAnything =
    ctx.activeContextPath ||
    ctx.activeResource ||
    ctx.cognitiveContext ||
    ctx.activeSession;

  if (!hasAnything) {
    return <div style={empty}>No hay contexto activo. Abrí una carpeta y/o una sesión para empezar.</div>;
  }

  return (
    <div style={{ padding: "0.4rem 0" }}>
      {ctx.activeContextPath && (
        <div style={card}>
          <div><span style={label}>workspace:</span>{ctx.activeContextPath}</div>
        </div>
      )}
      {ctx.activeResource && (
        <div style={card}>
          <div><span style={label}>recurso activo:</span>{ctx.activeResource}</div>
        </div>
      )}
      {ctx.cognitiveContext && (
        <div style={card}>
          <div><span style={label}>goal:</span>{ctx.cognitiveContext.goal}</div>
          {ctx.cognitiveContext.focusSummary && (
            <div style={{ marginTop: "0.3rem" }}><span style={label}>focus:</span>{ctx.cognitiveContext.focusSummary}</div>
          )}
          {ctx.cognitiveContext.constraints.length > 0 && (
            <div style={{ marginTop: "0.3rem" }}>
              <span style={label}>constraints:</span>
              <ul style={{ margin: "0.2rem 0 0 1.2rem", padding: 0 }}>
                {ctx.cognitiveContext.constraints.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {ctx.activeSession && (
        <div style={card}>
          <div><span style={label}>sesión:</span>{ctx.activeSession.id}</div>
          <div style={{ marginTop: "0.3rem" }}><span style={label}>panel:</span>{ctx.activeSession.panelId}</div>
          <div style={{ marginTop: "0.3rem" }}><span style={label}>mensajes:</span>{ctx.activeSession.messages.length}</div>
        </div>
      )}
    </div>
  );
}

function SnapshotsTab({ theme, snapshots, loading, onLoad }: {
  theme: Theme;
  snapshots: SnapshotRecord[];
  loading: boolean;
  onLoad: () => void;
}) {
  React.useEffect(() => { if (snapshots.length === 0 && !loading) onLoad(); }, []);
  const card: React.CSSProperties = {
    margin: "0.4rem 0.6rem", padding: "0.5rem 0.8rem",
    borderRadius: "6px", background: `${theme.accent}08`,
    border: `1px solid ${theme.accent}18`, fontSize: "0.68rem",
    color: theme.text, fontFamily: "'Courier New', monospace",
  };
  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.7rem" }}>cargando snapshots...</div>;
  if (snapshots.length === 0) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center" }}>
        <p style={{ color: theme.sub, fontSize: "0.7rem", margin: 0 }}>No hay snapshots todavía.</p>
        <button onClick={onLoad} style={{ marginTop: "0.8rem", background: "transparent", color: theme.accent, border: `1px solid ${theme.accent}33`, borderRadius: "4px", padding: "0.3rem 0.7rem", fontSize: "0.65rem", cursor: "pointer" }}>recargar</button>
      </div>
    );
  }
  return (
    <div style={{ padding: "0.3rem 0" }}>
      {snapshots.map((s) => (
        <div key={s.id} style={card}>
          <div style={{ color: theme.accent, fontWeight: 600 }}>{s.label || s.id}</div>
          {s.contextPath && <div style={{ fontSize: "0.6rem", color: theme.sub, marginTop: "0.2rem" }}>📁 {s.contextPath}</div>}
          <div style={{ fontSize: "0.6rem", color: theme.sub, marginTop: "0.2rem" }}>{new Date(s.timestamp).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function StaticListTab({ theme, title, subtitle, items }: {
  theme: Theme;
  title: string;
  subtitle: string;
  items: Array<{ id: string; title: string; subtitle: string }>;
}) {
  return (
    <div style={{ padding: "0.5rem 0.6rem" }}>
      <div style={{ fontSize: "0.7rem", color: theme.text, fontWeight: 600, marginBottom: "0.2rem" }}>{title}</div>
      <div style={{ fontSize: "0.6rem", color: theme.sub, opacity: 0.6, marginBottom: "0.6rem" }}>{subtitle}</div>
      <div style={{ borderRadius: "6px", background: `${theme.accent}08`, border: `1px solid ${theme.accent}18` }}>
        {items.map((it) => (
          <div key={it.id} style={{
            padding: "0.5rem 0.7rem", borderBottom: `1px solid ${theme.accent}10`,
            fontSize: "0.68rem", color: theme.text, fontFamily: "'Courier New', monospace",
          }}>
            <div style={{ fontWeight: 600, color: theme.accent }}>{it.id} — {it.title}</div>
            <div style={{ fontSize: "0.58rem", color: theme.sub, opacity: 0.6, marginTop: "0.15rem" }}>{it.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
