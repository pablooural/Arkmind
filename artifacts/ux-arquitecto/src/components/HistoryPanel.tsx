/**
 * HistoryPanel — T-036
 * Overlay de historial de operaciones en tiempo real.
 * Lee desde opJournal (IndexedDB) y permite restaurar directamente
 * desde cada entrada que tenga un snapshotId asociado.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Theme } from "@/types/theme";
import { JournalEntry } from "@/core/types";
import { opJournal } from "@/core/opJournal";
import { snapshotManager } from "@/core/snapshots";

interface HistoryPanelProps {
  theme: Theme;
  contextPath: string;
  onClose: () => void;
}

type FilterType = "all" | "transaction" | "rollback" | "system";

type RestoreStatus = {
  entryId: string;
  status: "loading" | "success" | "error";
  message?: string;
};

const TYPE_ICONS: Record<string, string> = {
  transaction: "⇄",
  rollback: "↩",
  system: "⚙",
};

const STATUS_COLORS: Record<string, string> = {
  success: "#22c55e",
  error: "#ef4444",
  partial: "#f59e0b",
};

const ACTION_LABELS: Record<string, string> = {
  create_write: "escribir",
  create_delete: "eliminar",
  create_create: "crear",
  create_move: "mover",
  create_read: "leer",
  create_branch: "ramificar",
  execute: "ejecutar",
  rollback: "rollback",
  confirm: "confirmar",
  validate: "validar",
};

function friendlyAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "min";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  return Math.floor(h / 24) + "d";
}

export function HistoryPanel({ theme, contextPath, onClose }: HistoryPanelProps) {
  const [entries, setEntries]         = useState<JournalEntry[]>([]);
  const [filter, setFilter]           = useState<FilterType>("all");
  const [loading, setLoading]         = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus | null>(null);
  const [showAll, setShowAll]         = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const all = await opJournal.getEntries({
        limit: showAll ? 200 : 60,
        ...(filter !== "all" ? { type: filter as JournalEntry["type"] } : {}),
      });
      setEntries(all);
    } catch (err) {
      console.error("[HistoryPanel] Error cargando journal:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, showAll]);

  useEffect(() => {
    loadEntries();
    intervalRef.current = setInterval(loadEntries, 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadEntries]);

  const handleRestore = useCallback(async (entry: JournalEntry) => {
    if (!entry.snapshotId) return;
    setRestoreStatus({ entryId: entry.id, status: "loading" });
    try {
      const result = await snapshotManager.rollback(entry.snapshotId);
      if (result.success) {
        setRestoreStatus({ entryId: entry.id, status: "success", message: "Restaurado — " + (result.restoredFiles?.length ?? 0) + " archivos" });
      } else {
        setRestoreStatus({ entryId: entry.id, status: "error", message: "Fallo parcial (" + (result.failedFiles?.length ?? 0) + " errores)" });
      }
    } catch (err) {
      setRestoreStatus({ entryId: entry.id, status: "error", message: err instanceof Error ? err.message : "Error" });
    }
    setTimeout(() => setRestoreStatus(null), 4000);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const border  = theme.accent + "33";
  const btnBase: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: "4px", opacity: 0.7 };
  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: "2px 8px", fontSize: "0.5rem", fontFamily: "'Courier New', monospace",
    color: active ? theme.accent : theme.sub,
    background: active ? theme.accent + "18" : "transparent",
    border: "1px solid " + (active ? theme.accent + "55" : "rgba(255,255,255,0.08)"),
    borderRadius: "4px", cursor: "pointer", letterSpacing: "0.05em",
    transition: "all 0.15s",
  });

  // Filter entries by contextPath toggle is optional — for now show all paths
  const displayed = entries;

  return (
    <div
      style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "min(440px, 100vw)",
        zIndex: 50, background: "rgba(0,0,0,0.93)", backdropFilter: "blur(16px)",
        borderRight: "1px solid " + border,
        display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace", overflow: "hidden",
      }}
      role="dialog" aria-label="Historial de operaciones"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid " + border, flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: "0.65rem", color: theme.accent, letterSpacing: "0.12em" }}>HISTORIAL</span>
          <div style={{ fontSize: "0.55rem", color: theme.sub, opacity: 0.5, marginTop: "0.1rem" }}>
            operaciones del sistema
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button onClick={loadEntries} title="Actualizar" style={{ ...btnBase, fontSize: "14px", color: theme.sub }}>↻</button>
          <button onClick={onClose} title="Cerrar" style={{ ...btnBase, fontSize: "18px", lineHeight: "1", color: theme.sub }}>×</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "0.35rem", padding: "0.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, flexWrap: "wrap" }}>
        {(["all", "transaction", "rollback", "system"] as FilterType[]).map(f => (
          <button key={f} style={filterBtn(filter === f)} onClick={() => setFilter(f)}>
            {f === "all" ? "todo" : f}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: "0.5rem", color: theme.sub, opacity: 0.4, display: "flex", alignItems: "center", gap: "0.3rem" }}>
          {loading ? "cargando…" : displayed.length + " entradas"}
        </div>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {displayed.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", color: theme.sub, opacity: 0.35, fontSize: "0.65rem", userSelect: "none" }}>
            <span style={{ fontSize: "2rem" }}>📋</span>
            <span>Sin operaciones registradas</span>
            <span style={{ fontSize: "0.55rem", opacity: 0.7 }}>Las operaciones aparecen aqui en tiempo real</span>
          </div>
        ) : (
          <>
            {displayed.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const rs = restoreStatus?.entryId === entry.id ? restoreStatus : null;
              const statusColor = STATUS_COLORS[entry.status] ?? theme.sub;
              const canRestore = !!entry.snapshotId;

              return (
                <div key={entry.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s", background: rs?.status === "success" ? theme.accent + "0a" : rs?.status === "error" ? "#ef44440a" : "transparent" }}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    style={{ padding: "0.55rem 1rem", cursor: "pointer", userSelect: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {/* Type icon */}
                      <span style={{ fontSize: "0.75rem", opacity: 0.7, flexShrink: 0, color: entry.type === "rollback" ? "#f59e0b" : entry.type === "system" ? theme.sub : theme.accent }}>
                        {TYPE_ICONS[entry.type] ?? "•"}
                      </span>
                      {/* Action */}
                      <span style={{ fontSize: "0.6rem", color: theme.fg, opacity: 0.85, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {friendlyAction(entry.action)}
                      </span>
                      {/* Status dot */}
                      <span style={{ fontSize: "0.45rem", color: statusColor, flexShrink: 0 }}>●</span>
                      {/* Time */}
                      <span style={{ fontSize: "0.5rem", color: theme.sub, opacity: 0.5, flexShrink: 0 }} title={new Date(entry.timestamp).toISOString()}>
                        {timeAgo(entry.timestamp)}
                      </span>
                      {/* Expand arrow */}
                      <span style={{ fontSize: "0.5rem", color: theme.sub, opacity: 0.4, flexShrink: 0 }}>
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    </div>

                    {/* Path */}
                    <div style={{ marginTop: "0.15rem", fontSize: "0.5rem", color: theme.sub, opacity: 0.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "1.25rem" }}>
                      {entry.details.targetPath ?? entry.contextPath}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: "0.5rem 1rem 0.65rem 1.25rem", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {/* Detail grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "0.2rem 0.5rem", fontSize: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{ color: theme.sub, opacity: 0.5 }}>hora</span>
                        <span style={{ color: theme.fg, opacity: 0.7 }}>{formatTs(entry.timestamp)} · {new Date(entry.timestamp).toLocaleDateString("es-AR")}</span>

                        <span style={{ color: theme.sub, opacity: 0.5 }}>tipo</span>
                        <span style={{ color: theme.accent, opacity: 0.7 }}>{entry.type}</span>

                        <span style={{ color: theme.sub, opacity: 0.5 }}>estado</span>
                        <span style={{ color: statusColor, opacity: 0.85 }}>{entry.status}</span>

                        {entry.contextPath && (
                          <>
                            <span style={{ color: theme.sub, opacity: 0.5 }}>contexto</span>
                            <span style={{ color: theme.fg, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.contextPath}</span>
                          </>
                        )}

                        {entry.details.description && (
                          <>
                            <span style={{ color: theme.sub, opacity: 0.5 }}>desc</span>
                            <span style={{ color: theme.fg, opacity: 0.65 }}>{entry.details.description}</span>
                          </>
                        )}

                        {entry.details.error && (
                          <>
                            <span style={{ color: "#ef4444", opacity: 0.7 }}>error</span>
                            <span style={{ color: "#fca5a5", opacity: 0.85, wordBreak: "break-all" }}>{entry.details.error}</span>
                          </>
                        )}

                        {entry.transactionId && (
                          <>
                            <span style={{ color: theme.sub, opacity: 0.5 }}>tx</span>
                            <span style={{ color: theme.sub, opacity: 0.4, fontFamily: "monospace", fontSize: "0.45rem" }}>{entry.transactionId}</span>
                          </>
                        )}

                        {entry.snapshotId && (
                          <>
                            <span style={{ color: theme.sub, opacity: 0.5 }}>snap</span>
                            <span style={{ color: theme.sub, opacity: 0.4, fontFamily: "monospace", fontSize: "0.45rem" }}>{entry.snapshotId}</span>
                          </>
                        )}
                      </div>

                      {/* Restore action */}
                      {canRestore && (
                        <div style={{ marginTop: "0.35rem" }}>
                          {rs?.status === "loading" ? (
                            <span style={{ fontSize: "0.52rem", color: theme.sub, opacity: 0.6 }}>Restaurando…</span>
                          ) : rs?.status === "success" ? (
                            <span style={{ fontSize: "0.52rem", color: "#22c55e", opacity: 0.85 }}>✓ {rs.message}</span>
                          ) : rs?.status === "error" ? (
                            <span style={{ fontSize: "0.52rem", color: "#ef4444", opacity: 0.85 }}>✗ {rs.message}</span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
                              style={{
                                padding: "3px 10px", fontSize: "0.58rem",
                                fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
                                color: theme.accent, background: "transparent",
                                border: "1px solid " + theme.accent + "55",
                                borderRadius: "5px", cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              ↩ Restaurar snapshot
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {!showAll && entries.length >= 60 && (
              <div style={{ padding: "0.6rem 1rem", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowAll(true)}
                  style={{ fontSize: "0.52rem", color: theme.accent, background: "transparent", border: "1px solid " + theme.accent + "44", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}
                >
                  Cargar mas entradas
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
