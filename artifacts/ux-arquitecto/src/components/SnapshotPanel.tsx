/**
 * SnapshotPanel — T-034
 * Overlay para visualizar, crear y restaurar snapshots del contexto activo.
 *
 * T-034 agrega:
 * - prop filePaths: archivos a incluir en snapshot manual
 * - Boton "Crear snapshot" en header (manual trigger)
 * - Fila expandible: muestra lista de archivos incluidos
 * - Boton "Eliminar" por snapshot con confirmacion inline
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Theme } from "@/types/theme";
import { Snapshot } from "@/core/types";
import { snapshotManager } from "@/core/snapshots";

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

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "hace " + secs + "s";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return "hace " + mins + "min";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return "hace " + hours + "h";
  return "hace " + Math.floor(hours / 24) + "d";
}

export function SnapshotPanel({ theme, contextPath, filePaths = [], onClose }: SnapshotPanelProps) {
  const [snapshots, setSnapshots]           = useState<Snapshot[]>([]);
  const [rollbackStatus, setRollbackStatus] = useState<RollbackStatus | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [isCreating, setIsCreating]         = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSnapshots = useCallback(() => {
    try {
      const list = snapshotManager.listSnapshots(contextPath);
      setSnapshots(list);
    } catch (err) {
      console.error("[SnapshotPanel] Error cargando snapshots:", err);
    }
  }, [contextPath]);

  useEffect(() => {
    loadSnapshots();
    intervalRef.current = setInterval(loadSnapshots, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSnapshots]);

  const handleRollback = useCallback(async (snapshotId: string) => {
    setRollbackStatus({ id: snapshotId, status: "loading" });
    try {
      const result = await snapshotManager.rollback(snapshotId);
      if (result.success) {
        setRollbackStatus({ id: snapshotId, status: "success", message: "Restauracion exitosa" });
        loadSnapshots();
      } else {
        setRollbackStatus({
          id: snapshotId,
          status: "error",
          message: "Algunos archivos no se pudieron restaurar",
        });
      }
    } catch (err) {
      setRollbackStatus({
        id: snapshotId,
        status: "error",
        message: err instanceof Error ? err.message : "Error desconocido",
      });
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
      const label = "Manual " + hh + ":" + mm + ":" + ss;
      await snapshotManager.createSnapshot(contextPath, filePaths, "manual", label);
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

  const borderColor = theme.accent + "33";
  const btnBase: React.CSSProperties = {
    background: "transparent", border: "none",
    cursor: "pointer", padding: "4px", opacity: 0.7,
  };

  return (
    <div
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: "min(400px, 100vw)", zIndex: 50,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)",
        borderLeft: "1px solid " + borderColor,
        display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace", overflow: "hidden",
      }}
      role="dialog"
      aria-label="Panel de snapshots"
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1rem",
        borderBottom: "1px solid " + borderColor, flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: "0.65rem", color: theme.accent, letterSpacing: "0.12em" }}>
            SNAPSHOTS
          </span>
          <div style={{
            fontSize: "0.55rem", color: theme.sub, opacity: 0.6,
            marginTop: "0.15rem", maxWidth: 220,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {contextPath || "/"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={handleCreateSnapshot}
            disabled={isCreating}
            title={filePaths.length ? ("+ snap (" + filePaths.length + " archivo" + (filePaths.length !== 1 ? "s" : "") + ")") : "+ snap (checkpoint logico)"}
            style={{
              ...btnBase,
              fontSize: "11px", fontFamily: "'Courier New', monospace",
              color: isCreating ? theme.sub : theme.accent,
              border: "1px solid " + (isCreating ? theme.sub + "44" : theme.accent + "55"),
              borderRadius: "5px", padding: "3px 8px",
              opacity: isCreating ? 0.5 : 0.85,
              cursor: isCreating ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {isCreating ? "creando…" : "+ snap"}
          </button>
          <button onClick={loadSnapshots} title="Actualizar" style={{ ...btnBase, fontSize: "14px", color: theme.sub }}>↻</button>
          <button onClick={onClose} title="Cerrar" style={{ ...btnBase, fontSize: "18px", lineHeight: "1", color: theme.sub }}>×</button>
        </div>
      </div>

      {/* Conteo */}
      <div style={{
        padding: "0.45rem 1rem", fontSize: "0.55rem",
        color: theme.sub, opacity: 0.5,
        borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0,
      }}>
        {snapshots.length === 0
          ? "Sin snapshots para este contexto"
          : snapshots.length + " snapshot" + (snapshots.length !== 1 ? "s" : "") + " — mas reciente primero"}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {snapshots.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: "0.75rem",
            color: theme.sub, opacity: 0.35, fontSize: "0.65rem", userSelect: "none",
          }}>
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
            const changedFiles  = snap.metadata.changedResources ?? [];

            return (
              <div
                key={snap.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: wasSuccess ? theme.accent + "0f" : wasError ? "rgba(239,68,68,0.08)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ padding: "0.65rem 1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {/* Label + toggle expand */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                    title={formatTimestamp(snap.timestamp)}
                    style={{
                      fontSize: "0.65rem", color: theme.fg, opacity: 0.9, fontWeight: "bold",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      cursor: "pointer", userSelect: "none",
                      display: "flex", alignItems: "center", gap: "0.4rem",
                    }}
                  >
                    <span style={{ fontSize: "0.55rem", opacity: 0.5, flexShrink: 0 }}>
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {snap.label || snap.id}
                    </span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.55rem", color: theme.sub, opacity: 0.6 }}>
                    <span title={formatTimestamp(snap.timestamp)}>{timeAgo(snap.timestamp)}</span>
                    <span>{snap.metadata.resourceCount} recurso{snap.metadata.resourceCount !== 1 ? "s" : ""}</span>
                    {snap.metadata.totalSize !== undefined && <span>{formatSize(snap.metadata.totalSize)}</span>}
                  </div>

                  {(wasSuccess || wasError) && (
                    <div style={{ fontSize: "0.55rem", color: wasSuccess ? theme.accent : "#ef4444", opacity: 0.9 }}>
                      {rollbackStatus?.message}
                    </div>
                  )}

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.15rem", alignItems: "center" }}>
                    <button
                      onClick={() => handleRollback(snap.id)}
                      disabled={isRollingBack}
                      style={{
                        padding: "3px 10px", fontSize: "0.6rem",
                        fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
                        color: isRollingBack ? theme.sub : theme.accent,
                        background: "transparent",
                        border: "1px solid " + (isRollingBack ? theme.sub + "44" : theme.accent + "55"),
                        borderRadius: "5px",
                        cursor: isRollingBack ? "not-allowed" : "pointer",
                        opacity: isRollingBack ? 0.5 : 1, transition: "all 0.15s",
                      }}
                    >
                      {isRollingBack ? "Restaurando..." : "Restaurar"}
                    </button>

                    {!isConfirmDel ? (
                      <button
                        onClick={() => setDeletingId(snap.id)}
                        title="Eliminar snapshot"
                        style={{
                          padding: "3px 8px", fontSize: "0.55rem",
                          fontFamily: "'Courier New', monospace",
                          color: "#ef4444", background: "transparent",
                          border: "1px solid #ef444433", borderRadius: "5px",
                          cursor: "pointer", opacity: 0.6, transition: "all 0.15s",
                        }}
                      >
                        ✕
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.55rem", color: "#ef4444", opacity: 0.8 }}>¿Eliminar?</span>
                        <button
                          onClick={() => handleDelete(snap.id)}
                          style={{
                            padding: "2px 7px", fontSize: "0.55rem",
                            color: "#ef4444", background: "#ef444422",
                            border: "1px solid #ef444455", borderRadius: "4px",
                            cursor: "pointer", fontFamily: "'Courier New', monospace",
                          }}
                        >Sí</button>
                        <button
                          onClick={() => setDeletingId(null)}
                          style={{
                            padding: "2px 7px", fontSize: "0.55rem",
                            color: theme.sub, background: "transparent",
                            border: "1px solid " + theme.sub + "44", borderRadius: "4px",
                            cursor: "pointer", fontFamily: "'Courier New', monospace",
                          }}
                        >No</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Archivos incluidos (expandible) */}
                {isExpanded && (
                  <div style={{
                    padding: "0.4rem 1rem 0.6rem 1.8rem",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    {changedFiles.length === 0 ? (
                      <div style={{ fontSize: "0.55rem", color: theme.sub, opacity: 0.5, fontStyle: "italic" }}>
                        Checkpoint logico — sin archivos capturados
                      </div>
                    ) : (
                      changedFiles.map((f) => (
                        <div key={f} style={{
                          fontSize: "0.55rem", color: theme.sub, opacity: 0.7,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          padding: "0.1rem 0",
                        }} title={f}>
                          📄 {f}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
