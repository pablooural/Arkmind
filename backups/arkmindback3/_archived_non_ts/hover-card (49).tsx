/**
 * FileExplorer Component (Panel B)
 * Explorador de archivos con navegación jerárquica y long-press.
 *
 * CAMBIO: Usa useFilesystemAccess para persistir el acceso entre sesiones.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFilesystemAccess } from "@/hooks/useFilesystemAccess";
import { Theme } from "@/types/theme";
import { ChevronRight, Folder, File, FolderOpen, RotateCcw } from "lucide-react";
import { filesystemManager } from "@/core/filesystem";
import { FileNode } from "@/core/types";

interface FileExplorerProps {
  theme: Theme;
}

export function FileExplorer({ theme }: FileExplorerProps) {
  const { activeContextPath, setActiveContext } = useWorkspace();
  const {
    isReady,
    isLoading: fsLoading,
    rootName,
    isSupported,
    error: fsError,
    requestAccess,
    releaseAccess,
  } = useFilesystemAccess();
  const [items, setItems] = useState<FileNode[]>([]);
  const [path, setPath] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedChildren, setExpandedChildren] = useState<Record<string, FileNode[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPath = "/" + path.join("/");

  // ── Carga de directorio ────────────────────────────────────────────────

  const loadDirectory = useCallback(async (dirPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const nodes = await filesystemManager.listDirectory(dirPath);
      setItems(nodes);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      loadDirectory(currentPath);
    }
  }, [isReady, currentPath, loadDirectory]);

  // ── Acceso ────────────────────────────────────────────────────────────

  const handleOpenFolder = async () => {
    const ok = await requestAccess();
    if (ok) {
      setPath([]);
      setSelected(null);
      setExpanded(new Set());
      setExpandedChildren({});
    }
  };

  const handleChangeFolder = async () => {
    await releaseAccess();
    setItems([]);
    setPath([]);
    setSelected(null);
  };

  // ── Subcarpetas expandibles ────────────────────────────────────────────

  const handleToggleExpand = async (node: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expanded);
    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
    } else {
      newExpanded.add(node.path);
      if (!expandedChildren[node.path]) {
        try {
          const children = await filesystemManager.listDirectory(node.path);
          setExpandedChildren((prev) => ({ ...prev, [node.path]: children }));
        } catch {
          // silencioso
        }
      }
    }
    setExpanded(newExpanded);
  };

  // ── Navegación ─────────────────────────────────────────────────────────

  const handleFolderClick = (folderName: string) => {
    setPath((prev) => [...prev, folderName]);
    setSelected(null);
    setExpanded(new Set());
    setExpandedChildren({});
  };

  const handleBreadcrumbClick = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
    setSelected(null);
  };

  const handleRootClick = () => {
    setPath([]);
    setSelected(null);
  };

  // ── Long press (cambio de contexto raíz) ──────────────────────────────

  const handleLongPressStart = (itemPath: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveContext(itemPath);
      setPath([]);
      setSelected(null);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ── Render: sin soporte ───────────────────────────────────────────────

  if (!isSupported) {
    return (
      <div style={{ padding: "1.5rem", color: theme.sub, fontSize: "0.75rem", lineHeight: 1.6 }}>
        <p style={{ color: theme.text, marginBottom: "0.5rem" }}>Browser no compatible</p>
        <p>La File System Access API requiere Chrome o Edge 86+.</p>
      </div>
    );
  }

  // ── Render: sin acceso todavía ────────────────────────────────────────

  if (!isReady) {
    const hasPrevious = !!rootName;
    const loading = fsLoading || isLoading;
    const displayError = fsError || error;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        {hasPrevious
          ? <RotateCcw size={28} style={{ color: theme.accent, opacity: 0.7 }} />
          : <FolderOpen size={32} style={{ color: theme.accent, opacity: 0.7 }} />
        }

        <p style={{ color: theme.sub, fontSize: "0.75rem", textAlign: "center", margin: 0 }}>
          {hasPrevious
            ? <>Última carpeta: <strong style={{ color: theme.text }}>📁 {rootName}</strong><br />El browser necesita que re-autorices el acceso.</>
            : "Elegí una carpeta para empezar a navegar"
          }
        </p>

        <button
          onClick={handleOpenFolder}
          disabled={loading}
          style={{
            background: theme.accent,
            color: theme.bg,
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem 1.2rem",
            fontSize: "0.8rem",
            cursor: loading ? "wait" : "pointer",
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "abriendo..." : hasPrevious ? `Re-abrir "${rootName}"` : "Abrir carpeta"}
        </button>

        {hasPrevious && (
          <span
            onClick={handleChangeFolder}
            style={{
              color: theme.sub,
              fontSize: "0.68rem",
              cursor: "pointer",
              textDecoration: "underline",
              opacity: 0.6,
            }}
          >
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

  // ── Render: explorador ────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Courier New', monospace" }}>

      {/* Header */}
      <div
        style={{
          padding: "0.5rem 0.9rem",
          borderBottom: `1px solid ${theme.accent}15`,
          background: `${theme.bg}cc`,
          flexShrink: 0,
          fontSize: "0.7rem",
          color: theme.sub,
        }}
      >
        <p style={{ margin: 0, marginBottom: "0.2rem" }}>Raíz:</p>
        <p
          style={{
            margin: 0,
            color: theme.accent,
            fontSize: "0.75rem",
            fontWeight: 600,
            wordBreak: "break-all",
          }}
        >
          📁 {rootName}
        </p>
      </div>

      {/* Breadcrumb */}
      <div
        style={{
          padding: "0.6rem 0.9rem",
          borderBottom: `1px solid ${theme.accent}22`,
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          flexWrap: "wrap",
          background: `${theme.bg}cc`,
          flexShrink: 0,
        }}
      >
        <span
          onClick={handleRootClick}
          onMouseDown={() => handleLongPressStart("/")}
          onMouseUp={handleLongPressEnd}
          onTouchStart={() => handleLongPressStart("/")}
          onTouchEnd={handleLongPressEnd}
          style={{
            color: path.length === 0 ? theme.text : theme.accent,
            cursor: "pointer",
            fontSize: "0.72rem",
            fontWeight: path.length === 0 ? 600 : 400,
            userSelect: "none",
          }}
        >
          ~
        </span>
        {path.map((p, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ color: theme.sub, fontSize: "0.65rem" }}>/</span>
            <span
              onClick={() => handleBreadcrumbClick(i)}
              style={{
                color: i === path.length - 1 ? theme.text : theme.accent,
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: i === path.length - 1 ? 600 : 400,
                userSelect: "none",
              }}
            >
              {p}
            </span>
          </span>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.4rem 0" }}>
        {isLoading && (
          <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.5 }}>
            cargando...
          </div>
        )}

        {error && !isLoading && (
          <div
            style={{
              padding: "1rem",
              margin: "0.5rem",
              borderRadius: "6px",
              background: "#ff6b6b30",
              border: "1px solid #ff6b6b44",
              color: "#ff6b6b",
              fontSize: "0.7rem",
            }}
          >
            {error}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: theme.sub, fontSize: "0.75rem", opacity: 0.5 }}>
            carpeta vacía
          </div>
        )}

        {!isLoading && !error && items.map((item) => (
          <FileItem
            key={item.path}
            item={item}
            depth={0}
            selected={selected}
            expanded={expanded}
            expandedChildren={expandedChildren}
            theme={theme}
            onFileClick={(node) => setSelected(node.path)}
            onFolderClick={(node) => handleFolderClick(node.name)}
            onToggleExpand={handleToggleExpand}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={handleLongPressEnd}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "0.4rem 0.9rem",
          borderTop: `1px solid ${theme.accent}15`,
          fontSize: "0.6rem",
          color: theme.sub,
          opacity: 0.5,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{items.length} elementos</span>
        <span
          onClick={handleChangeFolder}
          style={{ cursor: "pointer", opacity: 0.7, textDecoration: "underline" }}
          title="Cambiar carpeta raíz"
        >
          cambiar carpeta
        </span>
      </div>
    </div>
  );
}

// ─── Componente de fila ────────────────────────────────────────────────────────

interface FileItemProps {
  item: FileNode;
  depth: number;
  selected: string | null;
  expanded: Set<string>;
  expandedChildren: Record<string, FileNode[]>;
  theme: Theme;
  onFileClick: (node: FileNode) => void;
  onFolderClick: (node: FileNode) => void;
  onToggleExpand: (node: FileNode, e: React.MouseEvent) => void;
  onLongPressStart: (path: string) => void;
  onLongPressEnd: () => void;
}

function FileItem({
  item, depth, selected, expanded, expandedChildren,
  theme, onFileClick, onFolderClick, onToggleExpand,
  onLongPressStart, onLongPressEnd,
}: FileItemProps) {
  const isFolder = item.type === "folder";
  const isExpanded = expanded.has(item.path);
  const isSelected = selected === item.path;
  const indent = depth * 14;

  return (
    <div>
      <div
        onClick={() => isFolder ? onFolderClick(item) : onFileClick(item)}
        onMouseDown={() => onLongPressStart(item.path)}
        onMouseUp={onLongPressEnd}
        onTouchStart={() => onLongPressStart(item.path)}
        onTouchEnd={onLongPressEnd}
        style={{
          paddingLeft: `${0.9 + indent / 16}rem`,
          paddingRight: "0.9rem",
          paddingTop: "0.45rem",
          paddingBottom: "0.45rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          cursor: "pointer",
          background: isSelected ? `${theme.accent}15` : "transparent",
          borderLeft: isSelected ? `2px solid ${theme.accent}` : "2px solid transparent",
          color: isSelected ? theme.accent : theme.text,
          fontSize: "0.75rem",
          transition: "all 0.1s",
          userSelect: "none",
        }}
      >
        {isFolder ? (
          <ChevronRight
            size={13}
            onClick={(e) => onToggleExpand(item, e)}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              flexShrink: 0,
              opacity: 0.6,
            }}
          />
        ) : (
          <span style={{ width: 13, flexShrink: 0 }} />
        )}

        {isFolder
          ? <Folder size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
          : <File size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        }

        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </span>

        {item.size !== undefined && !isFolder && (
          <span style={{ fontSize: "0.6rem", opacity: 0.35, flexShrink: 0 }}>
            {formatSize(item.size)}
          </span>
        )}
      </div>

      {isFolder && isExpanded && expandedChildren[item.path]?.map((child) => (
        <FileItem
          key={child.path}
          item={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          expandedChildren={expandedChildren}
          theme={theme}
          onFileClick={onFileClick}
          onFolderClick={onFolderClick}
          onToggleExpand={onToggleExpand}
          onLongPressStart={onLongPressStart}
          onLongPressEnd={onLongPressEnd}
        />
      ))}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}
