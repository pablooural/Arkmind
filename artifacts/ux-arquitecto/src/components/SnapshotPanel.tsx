/**
 * SnapshotPanel — T-035
 * T-035 agrega diff visual: al expandir un snapshot, carga el contenido
 * guardado + el estado actual del archivo via WebFilesystemProvider y muestra
 * las diferencias linea a linea (verde = añadido al actual, rojo = perdido).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Theme } from "@/types/theme";
import { Snapshot } from "@/core/types";
import { snapshotManager } from "@/core/snapshots";
import { webFilesystemProvider } from "@/core/WebFilesystemProvider";

interface SnapshotPanelProps {
  theme: Theme;
  contextPath: string;
  filePaths?: string[];
  onClose: () => void;
}

type RollbackStatus = {
  id: string;
  status: "loading" | "success" | "error";
  message?: string;
};

type DiffLine = { type: "eq" | "add" | "rm"; line: string };

type FileDiff = {
  path: string;
  lines: DiffLine[];
  identical: boolean;
  noCurrentFs: boolean;
};

type SnapDiffState = {
  status: "idle" | "loading" | "done" | "error";
  files: FileDiff[];
  error?: string;
};

// ── Simple diff: prefix + suffix + middle block ───────────────────────────────
function computeDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: DiffLine[] = [];

  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    out.push({ type: "eq", line: a[i] });
    i++;
  }

  let ai = a.length - 1;
  let bi = b.length - 1;
  const suffix: DiffLine[] = [];
  while (ai >= i && bi >= i && a[ai] === b[bi]) {
    suffix.unshift({ type: "eq", line: a[ai] });
    ai--;
    bi--;
  }

  for (let j = i; j <= ai; j++) out.push({ type: "rm", line: a[j] });
  for (let j = i; j <= bi; j++) out.push({ type: "add", line: b[j] });
  out.push(...suffix);
  return out;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
         " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "hace " + s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return "hace " + m + "min";
  const h = Math.floor(m / 60);
  if (h < 24) return "hace " + h + "h";
  return "hace " + Math.floor(h / 24) + "d";
}

const MAX_DIFF_LINES = 120;

export function SnapshotPanel({ theme, contextPath, filePaths = [], onClose }: SnapshotPanelProps) {
  const [snapshots, setSnapshots]           = useState<Snapshot[]>([]);
  const [rollbackStatus, setRollbackStatus] = useState<RollbackStatus | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [isCreating, setIsCreating]         = useState(false);
  // diff state: snapId -> SnapDiffState
  const [diffMap, setDiffMap]               = useState<Map<string, SnapDiffState>>(new Map());
  // per-file expand within diff (show all lines toggle)
  const [expandedFile, setExpandedFile]     = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSnapshots = useCallback(() => {
    try {
      setSnapshots(snapshotManager.listSnapshots(contextPath));
    } catch (err) {
      console.error("[SnapshotPanel] Error cargando snapshots:", err);
    }
  }, [contextPath]);

  useEffect(() => {
    loadSnapshots();
    intervalRef.current = setInterval(loadSnapshots, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadSnapshots]);

  // ── Load diff when a snapshot is expanded ──────────────────────────────────
  const loadDiff = useCallback(async (snapId: string) => {
    setDiffMap(prev => {
      const m = new Map(prev);
      m.set(snapId, { status: "loading", files: [] });
      return m;
    });

    try {
      const snapFiles = await snapshotManager.loadSnapshotFiles(snapId);
      const fsReady   = webFilesystemProvider.isReady();
      const fileDiffs: FileDiff[] = [];

      for (const [path, snapContent] of snapFiles.entries()) {
        if (fsReady) {
          const current = await webFilesystemProvider.readFile(path);
          const curText = current.success && current.content !== undefined ? current.content : null;
          if (curText === null) {
            // archivo ya no existe en el FS
            const lines = snapContent.split("\n").map(l => ({ type: "rm" as const, line: l }));
            fileDiffs.push({ path, lines, identical: false, noCurrentFs: true });
          } else {
            const lines = computeDiff(snapContent, curText);
            const identical = lines.every(l => l.type === "eq");
            fileDiffs.push({ path, lines, identical, noCurrentFs: false });
          }
        } else {
          // FS no disponible: sólo mostramos contenido del snapshot
          const lines = snapContent.split("\n").map(l => ({ type: "rm" as const, line: l }));
          fileDiffs.push({ path, lines, identical: false, noCurrentFs: true });
        }
      }

      setDiffMap(prev => {
        const m = new Map(prev);
        m.set(snapId, { status: "done", files: fileDiffs });
        return m;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setDiffMap(prev => {
        const m = new Map(prev);
        m.set(snapId, { status: "error", files: [], error: msg });
        return m;
      });
    }
  }, []);

  const handleExpand = useCallback((snapId: string) => {
    const next = expandedId === snapId ? null : snapId;
    setExpandedId(next);
    setExpandedFile(null);
    if (next && !diffMap.has(next)) {
      loadDiff(next);
    }
  }, [expandedId, diffMap, loadDiff]);

  const handleRollback = useCallback(async (snapshotId: string) => {
    setRollbackStatus({ id: snapshotId, status: "loading" });
    try {
      const result = await snapshotManager.rollback(snapshotId);
      if (result.success) {
        setRollbackStatus({ id: snapshotId, status: "success", message: "Restauracion exitosa" });
        loadSnapshots();
      } else {
        setRollbackStatus({ id: snapshotId, status: "error", message: "Algunos archivos no se pudieron restaurar" });
      }
    } catch (err) {
      setRollbackStatus({ id: snapshotId, status: "error", message: err instanceof Error ? err.message : "Error desconocido" });
    }
    setTimeout(() => setRollbackStatus(null), 3000);
  }, [loadSnapshots]);

  const handleCreateSnapshot = useCallback(async () => {
    setIsCreating(true);
    try {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const ss = now.getSeconds().toString().padStart(2, "0");
      await snapshotManager.createSnapshot(contextPath, filePaths, "manual", "Manual " + hh + ":" + mm + ":" + ss);
      loadSnapshots();
    } catch (err) {
      console.error("[SnapshotPanel] Error creando snapshot:", err);
    } finally {
      setIsCreating(false);
    }
  }, [contextPath, filePaths, loadSnapshots]);

  const handleDelete = useCallback(async (snapshotId: string) => {
    try {
      await snapshotManager.deleteSnapshot(snapshotId);
      setDeletingId(null);
      if (expandedId === snapshotId) setExpandedId(null);
      setDiffMap(prev => { const m = new Map(prev); m.delete(snapshotId); return m; });
      loadSnapshots();
    } catch (err) {
      console.error("[SnapshotPanel] Error eliminando snapshot:", err);
    }
  }, [expandedId, loadSnapshots]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deletingId) { setDeletingId(null); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, deletingId]);

  const border = theme.accent + "33";
  const btnBase: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: "4px", opacity: 0.7 };

  // ── Diff renderer ────────────────────────────────────────────────────────────
  function renderDiff(fd: FileDiff, fileKey: string) {
    const isFileExpanded = expandedFile === fileKey;
    const changed = fd.lines.filter(l => l.type !== "eq");
    const added   = fd.lines.filter(l => l.type === "add").length;
    const removed  = fd.lines.filter(l => l.type === "rm").length;

    const displayLines = isFileExpanded ? fd.lines : fd.lines.slice(0, MAX_DIFF_LINES);
    const truncated = !isFileExpanded && fd.lines.length > MAX_DIFF_LINES;

    if (fd.identical) {
      return (
        <div style={{ fontSize: "0.5rem", color: theme.sub, opacity: 0.45, padding: "0.25rem 0", fontStyle: "italic" }}>
          Sin cambios respecto al estado actual
        </div>
      );
    }

    return (
      <div>
        {/* Stat bar */}
        <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.5rem", marginBottom: "0.3rem", alignItems: "center" }}>
          {removed > 0 && (
            <span style={{ color: "#ef4444", opacity: 0.9 }}>−{removed}</span>
          )}
          {added > 0 && (
            <span style={{ color: "#22c55e", opacity: 0.9 }}>+{added}</span>
          )}
          {fd.noCurrentFs && (
            <span style={{ color: "#f59e0b", opacity: 0.7, fontSize: "0.48rem" }}>
              {webFilesystemProvider.isReady() ? "(archivo eliminado)" : "(FS no disponible — solo snapshot)"}
            </span>
          )}
        </div>

        {/* Diff lines */}
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.5rem",
          lineHeight: "1.45",
          overflowX: "auto",
          maxHeight: isFileExpanded ? "480px" : "200px",
          overflowY: "auto",
          borderRadius: "4px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
        }}>
          {displayLines.map((dl, idx) => {
            const bg  = dl.type === "add" ? "rgba(34,197,94,0.12)"
                      : dl.type === "rm"  ? "rgba(239,68,68,0.12)"
                      : "transparent";
            const col = dl.type === "add" ? "#86efac"
                      : dl.type === "rm"  ? "#fca5a5"
                      : theme.sub;
            const pfx = dl.type === "add" ? "+" : dl.type === "rm" ? "−" : " ";
            return (
              <div key={idx} style={{
                display: "flex", gap: "0.3rem", padding: "0 0.4rem",
                background: bg, whiteSpace: "pre",
                borderLeft: dl.type === "eq" ? "none" : "2px solid " + (dl.type === "add" ? "#22c55e66" : "#ef444466"),
              }}>
                <span style={{ color: col, opacity: 0.4, flexShrink: 0, userSelect: "none" }}>{pfx}</span>
                <span style={{ color: col, opacity: dl.type === "eq" ? 0.4 : 0.85, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {dl.line || " "}
                </span>
              </div>
            );
          })}
        </div>

        {truncated && (
          <button
            onClick={() => setExpandedFile(fileKey)}
            style={{
              marginTop: "0.25rem", fontSize: "0.48rem",
              color: theme.accent, background: "transparent",
              border: "none", cursor: "pointer", opacity: 0.7, padding: 0,
            }}
          >
            Ver {fd.lines.length - MAX_DIFF_LINES} lineas mas…
          </button>
        )}
        {isFileExpanded && (
          <button
            onClick={() => setExpandedFile(null)}
            style={{
              marginTop: "0.25rem", fontSize: "0.48rem",
              color: theme.sub, background: "transparent",
              border: "none", cursor: "pointer", opacity: 0.6, padding: 0,
            }}
          >
            Colapsar
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "min(420px, 100vw)",
        zIndex: 50, background: "rgba(0,0,0,0.93)", backdropFilter: "blur(16px)",
        borderLeft: "1px solid " + border, display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace", overflow: "hidden",
      }}
      role="dialog" aria-label="Panel de snapshots"
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1rem", borderBottom: "1px solid " + border, flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: "0.65rem", color: theme.accent, letterSpacing: "0.12em" }}>SNAPSHOTS</span>
          <div style={{ fontSize: "0.55rem", color: theme.sub, opacity: 0.6, marginTop: "0.15rem", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {contextPath || "/"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={handleCreateSnapshot} disabled={isCreating}
            title={filePaths.length ? ("+ snap (" + filePaths.length + " archivo" + (filePaths.length !== 1 ? "s" : "") + ")") : "+ snap (checkpoint logico)"}
            style={{
              ...btnBase,
              fontSize: "11px", fontFamily: "'Courier New', monospace",
              color: isCreating ? theme.sub : theme.accent,
              border: "1px solid " + (isCreating ? theme.sub + "44" : theme.accent + "55"),
              borderRadius: "5px", padding: "3px 8px", opacity: isCreating ? 0.5 : 0.85,
              cursor: isCreating ? "not-allowed" : "pointer", letterSpacing: "0.04em",
            }}
          >
            {isCreating ? "creando…" : "+ snap"}
          </button>
          <button onClick={loadSnapshots} title="Actualizar" style={{ ...btnBase, fontSize: "14px", color: theme.sub }}>↻</button>
          <button onClick={onClose} title="Cerrar" style={{ ...btnBase, fontSize: "18px", lineHeight: "1", color: theme.sub }}>×</button>
        </div>
      </div>

      {/* Count */}
      <div style={{ padding: "0.45rem 1rem", fontSize: "0.55rem", color: theme.sub, opacity: 0.5, borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
        {snapshots.length === 0
          ? "Sin snapshots para este contexto"
          : snapshots.length + " snapshot" + (snapshots.length !== 1 ? "s" : "") + " — mas reciente primero"}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {snapshots.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", color: theme.sub, opacity: 0.35, fontSize: "0.65rem", userSelect: "none" }}>
            <span style={{ fontSize: "2rem" }}>⏱</span>
            <span>No hay snapshots para este contexto</span>
            <span style={{ fontSize: "0.55rem", opacity: 0.7 }}>Usa "+ snap" para crear uno manual</span>
          </div>
        ) : (
          snapshots.map((snap) => {
            const isRollingBack = rollbackStatus?.id === snap.id && rollbackStatus.status === "loading";
            const wasSuccess    = rollbackStatus?.id === snap.id && rollbackStatus.status === "success";
            const wasError      = rollbackStatus?.id === snap.id && rollbackStatus.status === "error";
            const isExpanded    = expandedId === snap.id;
            const isConfirmDel  = deletingId === snap.id;
            const diffState     = diffMap.get(snap.id);

            return (
              <div key={snap.id} style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: wasSuccess ? theme.accent + "0f" : wasError ? "rgba(239,68,68,0.08)" : "transparent",
                transition: "background 0.15s",
              }}>
                {/* Row */}
                <div style={{ padding: "0.65rem 1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {/* Label */}
                  <div
                    onClick={() => handleExpand(snap.id)}
                    title={formatTimestamp(snap.timestamp)}
                    style={{ fontSize: "0.65rem", color: theme.fg, opacity: 0.9, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span style={{ fontSize: "0.55rem", opacity: 0.5, flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{snap.label || snap.id}</span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.55rem", color: theme.sub, opacity: 0.6 }}>
                    <span title={formatTimestamp(snap.timestamp)}>{timeAgo(snap.timestamp)}</span>
                    <span>{snap.metadata.resourceCount} recurso{snap.metadata.resourceCount !== 1 ? "s" : ""}</span>
                    {snap.metadata.totalSize !== undefined && <span>{formatSize(snap.metadata.totalSize)}</span>}
                  </div>

                  {(wasSuccess || wasError) && (
                    <div style={{ fontSize: "0.55rem", color: wasSuccess ? theme.accent : "#ef4444", opacity: 0.9 }}>{rollbackStatus?.message}</div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.15rem", alignItems: "center" }}>
                    <button
                      onClick={() => handleRollback(snap.id)} disabled={isRollingBack}
                      style={{
                        padding: "3px 10px", fontSize: "0.6rem", fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
                        color: isRollingBack ? theme.sub : theme.accent, background: "transparent",
                        border: "1px solid " + (isRollingBack ? theme.sub + "44" : theme.accent + "55"),
                        borderRadius: "5px", cursor: isRollingBack ? "not-allowed" : "pointer",
                        opacity: isRollingBack ? 0.5 : 1, transition: "all 0.15s",
                      }}
                    >
                      {isRollingBack ? "Restaurando..." : "Restaurar"}
                    </button>
                    {!isConfirmDel ? (
                      <button onClick={() => setDeletingId(snap.id)} title="Eliminar snapshot" style={{ padding: "3px 8px", fontSize: "0.55rem", fontFamily: "'Courier New', monospace", color: "#ef4444", background: "transparent", border: "1px solid #ef444433", borderRadius: "5px", cursor: "pointer", opacity: 0.6, transition: "all 0.15s" }}>✕</button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.55rem", color: "#ef4444", opacity: 0.8 }}>¿Eliminar?</span>
                        <button onClick={() => handleDelete(snap.id)} style={{ padding: "2px 7px", fontSize: "0.55rem", color: "#ef4444", background: "#ef444422", border: "1px solid #ef444455", borderRadius: "4px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>Si</button>
                        <button onClick={() => setDeletingId(null)} style={{ padding: "2px 7px", fontSize: "0.55rem", color: theme.sub, background: "transparent", border: "1px solid " + theme.sub + "44", borderRadius: "4px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>No</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded: diff view */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.25)", padding: "0.5rem 1rem 0.75rem" }}>
                    {/* Diff status */}
                    {!diffState || diffState.status === "loading" ? (
                      <div style={{ fontSize: "0.55rem", color: theme.sub, opacity: 0.5, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                        Cargando diff…
                      </div>
                    ) : diffState.status === "error" ? (
                      <div style={{ fontSize: "0.5rem", color: "#ef4444", opacity: 0.8 }}>
                        Error cargando diff: {diffState.error}
                        <button
                          onClick={() => loadDiff(snap.id)}
                          style={{ marginLeft: "0.5rem", background: "transparent", border: "none", color: theme.accent, cursor: "pointer", fontSize: "0.5rem" }}
                        >Reintentar</button>
                      </div>
                    ) : diffState.files.length === 0 ? (
                      <div style={{ fontSize: "0.55rem", color: theme.sub, opacity: 0.45, fontStyle: "italic" }}>
                        Checkpoint logico — sin archivos capturados
                      </div>
                    ) : (
                      diffState.files.map((fd) => {
                        const fileKey = snap.id + ":" + fd.path;
                        const changedCount = fd.lines.filter(l => l.type !== "eq").length;
                        return (
                          <div key={fd.path} style={{ marginBottom: "0.75rem" }}>
                            {/* File header */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                              <span style={{ fontSize: "0.5rem", opacity: 0.4, color: theme.sub }}>📄</span>
                              <span style={{ fontSize: "0.52rem", color: fd.identical ? theme.sub : theme.fg, opacity: fd.identical ? 0.4 : 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={fd.path}>
                                {fd.path.split("/").pop()}
                              </span>
                              {fd.identical ? (
                                <span style={{ fontSize: "0.45rem", color: theme.sub, opacity: 0.4, flexShrink: 0 }}>identical</span>
                              ) : (
                                <span style={{ fontSize: "0.45rem", color: theme.accent, opacity: 0.6, flexShrink: 0 }}>
                                  {changedCount} cambio{changedCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {renderDiff(fd, fileKey)}
                          </div>
                        );
                      })
                    )}

                    {/* Reload diff */}
                    {diffState?.status === "done" && (
                      <button
                        onClick={() => { setDiffMap(prev => { const m = new Map(prev); m.delete(snap.id); return m; }); setExpandedFile(null); loadDiff(snap.id); }}
                        style={{ marginTop: "0.25rem", fontSize: "0.48rem", color: theme.sub, background: "transparent", border: "none", cursor: "pointer", opacity: 0.5, padding: 0 }}
                      >
                        ↻ Recargar diff
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
