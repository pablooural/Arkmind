/**
 * useConfirm Hook
 *
 * T-046: hook minimalista para confirmar acciones destructivas
 * sin tener que abrir un modal full-screen.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Eliminar archivo?",
 *     message: "Se borrará App.tsx del workspace.",
 *     confirmLabel: "Eliminar",
 *     danger: true,
 *   });
 *   if (ok) { ... }
 *
 * Retorna un componente <ConfirmDialog /> que se monta en el árbol
 * (cerca del final, fuera de cualquier panel que pueda estar oculto).
 */

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";
import { Theme } from "@/types/theme";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContext {
  theme: Theme;
}

const ConfirmCtx = createContext<ConfirmContext>({ theme: { accent: "#7c3aed", bg: "#000", fg: "#fff", surface: "#1a1a1a", sub: "#888", name: "" } as Theme });

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
  id: number;
}

let _pending: PendingConfirm | null = null;
let _listeners: Array<(c: PendingConfirm | null) => void> = [];

function setPending(c: PendingConfirm | null) {
  _pending = c;
  _listeners.forEach((l) => l(c));
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    setPending({
      ...opts,
      confirmLabel: opts.confirmLabel ?? "Confirmar",
      cancelLabel:  opts.cancelLabel  ?? "Cancelar",
      danger:       opts.danger       ?? false,
      resolve,
      id: Date.now(),
    });
  });
}

/**
 * Componente para renderizar el modal. Se monta una sola vez
 * cerca del final del árbol (en DualPanelLayout).
 */
export function ConfirmDialog() {
  const [pending, setLocalPending] = useState<PendingConfirm | null>(_pending);
  const ctx = useContext(ConfirmCtx);

  useEffect(() => {
    const l = (c: PendingConfirm | null) => setLocalPending(c);
    _listeners.push(l);
    return () => {
      _listeners = _listeners.filter((x) => x !== l);
    };
  }, []);

  if (!pending) return null;

  const close = (ok: boolean) => {
    pending.resolve(ok);
    setPending(null);
  };

  // ESC cancela
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter")  close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  const accent = pending.danger ? "#ef4444" : ctx.theme.accent;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
      style={{
        position:        "fixed",
        inset:           0,
        background:      "rgba(0,0,0,0.6)",
        backdropFilter:  "blur(4px)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          9999,
        fontFamily:      "'Courier New', monospace",
      }}
    >
      <div style={{
        background:    ctx.theme.surface,
        border:        `1px solid ${accent}44`,
        borderRadius:  "10px",
        padding:       "1.4rem 1.6rem",
        minWidth:      "320px",
        maxWidth:      "480px",
        boxShadow:     "0 12px 32px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          fontSize:    "0.95rem",
          fontWeight:  "bold",
          color:       ctx.theme.fg,
          marginBottom: "0.4rem",
        }}>
          {pending.title}
        </div>
        <div style={{
          fontSize:    "0.78rem",
          color:       ctx.theme.sub,
          marginBottom: "1.2rem",
          lineHeight:  "1.4",
        }}>
          {pending.message}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            autoFocus
            onClick={() => close(false)}
            style={{
              padding:    "0.45rem 1rem",
              fontSize:   "0.72rem",
              fontFamily: "'Courier New', monospace",
              background: "transparent",
              color:      ctx.theme.sub,
              border:     `1px solid ${ctx.theme.sub}44`,
              borderRadius: "6px",
              cursor:     "pointer",
            }}
          >
            {pending.cancelLabel}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              padding:      "0.45rem 1rem",
              fontSize:     "0.72rem",
              fontFamily:   "'Courier New', monospace",
              background:   pending.danger ? "#ef444422" : `${accent}22`,
              color:        accent,
              border:       `1px solid ${accent}66`,
              borderRadius: "6px",
              cursor:       "pointer",
              fontWeight:   "bold",
            }}
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Provider que setea el tema del modal. Usar en DualPanelLayout.
 */
export function ConfirmThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ConfirmCtx.Provider value={{ theme }}>{children}</ConfirmCtx.Provider>;
}