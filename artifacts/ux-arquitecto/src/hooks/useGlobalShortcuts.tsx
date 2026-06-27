/**
 * useGlobalShortcuts
 *
 * T-041: hook + provider para atajos de teclado globales.
 *
 * Cualquier componente puede registrar un shortcut mediante
 * `useShortcut("esc", () => ...)` y se desregistra automáticamente al
 * desmontarse. Los shortcuts se ejecutan en orden de registro.
 *
 * Por ahora, los atajos implementados son:
 * - Esc → cerrar overlays (chat history, snapshots, dropdowns)
 * - Ctrl/Cmd+K → abrir command palette (placeholder, no implementado aún)
 * - Ctrl/Cmd+/ → toggle explorador lateral (solo en DualPanelLayout)
 *
 * El futuro:
 * - Cmd+S → guardar archivo activo (EditorPanel)
 * - Cmd+Shift+P → command palette
 */

import { useEffect, useRef, useCallback, createContext, useContext, ReactNode } from "react";

export type ShortcutId = string;

interface ShortcutMap {
  [id: string]: {
    /** Descripción para el command palette futuro */
    description: string;
    /** Handler a ejecutar */
    handler: (e: KeyboardEvent) => void;
  };
}

interface ShortcutsContextValue {
  register: (id: string, opts: { description: string; handler: (e: KeyboardEvent) => void }) => void;
  unregister: (id: string) => void;
  list: () => Array<{ id: string; description: string }>;
}

const ShortcutsCtx = createContext<ShortcutsContextValue | null>(null);

export function useShortcutsProvider() {
  const map = useRef<ShortcutMap>({});

  const register = useCallback((id, opts) => {
    map.current[id] = opts;
  }, []);

  const unregister = useCallback((id) => {
    delete map.current[id];
  }, []);

  const list = useCallback(() => {
    return Object.entries(map.current).map(([id, v]) => ({ id, description: v.description }));
  }, []);

  return { register, unregister, list, map };
}

/**
 * Escucha global de teclas y dispara el handler si matchea.
 * - Esc: cierra el último overlay abierto (lo gestiona el propio panel con useEffect).
 *   Por simplicidad, también disparamos un evento 'arkmind:esc' que cualquier
 *   componente puede escuchar.
 * - Ctrl/Cmd+K: disparamos 'arkmind:open-palette'.
 * - Ctrl/Cmd+/: disparamos 'arkmind:toggle-explorer'.
 */
function GlobalKeyListener({ mapRef }: { mapRef: React.MutableRefObject<ShortcutMap> }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Esc → evento global (cualquier panel lo cierra)
      if (e.key === "Escape") {
        const ev = new CustomEvent("arkmind:esc");
        window.dispatchEvent(ev);
        return;
      }

      // Cmd/Ctrl+K → command palette (futuro, por ahora solo evento)
      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const ev = new CustomEvent("arkmind:open-palette");
        window.dispatchEvent(ev);
        return;
      }

      // Cmd/Ctrl+/ → toggle explorador lateral (futuro, por ahora solo evento)
      if (cmdOrCtrl && e.key === "/") {
        e.preventDefault();
        const ev = new CustomEvent("arkmind:toggle-explorer");
        window.dispatchEvent(ev);
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapRef]);

  return null;
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const ctx = useShortcutsProvider();
  const mapRef = useRef<ShortcutMap>(ctx.map.current);

  return (
    <ShortcutsCtx.Provider value={{ register: ctx.register, unregister: ctx.unregister, list: ctx.list }}>
      <GlobalKeyListener mapRef={mapRef} />
      {children}
    </ShortcutsCtx.Provider>
  );
}

/**
 * Registra un shortcut. Limpia al desmontar.
 *
 * Uso:
 *   useShortcut("close-history", {
 *     description: "Cerrar panel de historial",
 *     handler: () => setShowHistory(false),
 *   });
 */
export function useShortcut(
  id: string,
  opts: { description: string; handler: (e: KeyboardEvent) => void },
  deps: any[] = []
) {
  const ctx = useContext(ShortcutsCtx);
  const handlerRef = useRef(opts.handler);
  handlerRef.current = opts.handler;

  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, { description: opts.description, handler: (e) => handlerRef.current(e) });
    return () => ctx.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
}

/**
 * Escucha el evento global 'arkmind:esc' y ejecuta el handler.
 * Por convención, todos los overlays (dropdowns, modals, paneles laterales)
 * que se cierran con Esc, escuchan este evento.
 */
export function useEscapeKey(handler: () => void, active: boolean = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const onEsc = () => handlerRef.current();
    window.addEventListener("arkmind:esc", onEsc as EventListener);
    return () => window.removeEventListener("arkmind:esc", onEsc as EventListener);
  }, [active]);
}