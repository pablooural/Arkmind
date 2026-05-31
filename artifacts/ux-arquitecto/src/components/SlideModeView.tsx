/**
 * SlideModeView Component
 * Vista de modo lateral con panel deslizable
 * 
 * Props:
 * - sideOpen: boolean
 * - setSideOpen: (open: boolean) => void
 * - sideContent: React.ReactNode
 * - fixedContent: React.ReactNode
 * - flipping: boolean
 * - theme: Theme
 */

import { useRef, useState, useCallback } from "react";
import { Theme } from "@/types/theme";

interface SlideModeViewProps {
  sideOpen: boolean;
  setSideOpen: (open: boolean) => void;
  sideContent: React.ReactNode;
  fixedContent: React.ReactNode;
  flipping: boolean;
  theme: Theme;
}

export function SlideModeView({
  sideOpen,
  setSideOpen,
  sideContent,
  fixedContent,
  flipping,
  theme,
}: SlideModeViewProps) {
  const dragging = useRef(false);
  const [sideWidth, setSideWidth] = useState(280);
  const [edgeActive, setEdgeActive] = useState(false);
  const [edgeHovered, setEdgeHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((clientX: number) => {
    dragging.current = true;
    setEdgeActive(true);

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;

      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const container = containerRef.current;

      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newW = Math.min(rect.width * 0.85, Math.max(rect.width * 0.2, cx - rect.left));
      setSideWidth(newW);
    };

    const onEnd = () => {
      dragging.current = false;
      setEdgeActive(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  const handleEdgeDown = (e: React.MouseEvent | React.TouchEvent) => {
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    startDrag(cx);
  };

  return (
    <div ref={containerRef} style={{ display: "flex", height: "100%", position: "relative" }}>
      {/* Panel lateral */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: sideWidth,
          transform: sideOpen ? "translateX(0)" : "translateX(-100%)",
          transition: dragging.current ? "none" : "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          background: `${theme.bg}f8`,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>{sideContent}</div>

        {/* Borde arrastrable - siempre disponible */}
        <div
          onMouseDown={handleEdgeDown}
          onMouseEnter={() => setEdgeHovered(true)}
          onMouseLeave={() => setEdgeHovered(false)}
          onTouchStart={handleEdgeDown}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "8px",
            cursor: "col-resize",
            background: edgeActive ? `${theme.accent}b0` : edgeHovered ? `${theme.accent}40` : "rgba(255,255,255,0.08)",
            transition: "background 0.2s",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: sideOpen ? 1 : 0,
            pointerEvents: sideOpen ? "auto" : "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", opacity: edgeHovered || edgeActive ? 1 : 0.35, transition: "opacity 0.2s" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: edgeActive ? theme.accent : "#94a3b8",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pestaña flecha - siempre visible */}
      <div
        onClick={() => setSideOpen(!sideOpen)}
        style={{
          position: "absolute",
          left: sideOpen ? sideWidth - 1 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          transition: dragging.current ? "none" : "opacity 0.2s, left 0.35s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 25,
          width: "22px",
          height: "56px",
          background: `${theme.bg}f8`,
          border: "1px solid rgba(255,255,255,0.13)",
          borderLeft: sideOpen ? "1px solid rgba(255,255,255,0.13)" : "none",
          borderRadius: "0 8px 8px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: theme.accent,
          fontSize: "13px",
          userSelect: "none" as const,
          WebkitTapHighlightColor: "transparent",
          boxShadow: "2px 0 8px rgba(0,0,0,0.4)",
          opacity: sideOpen ? 1 : 0.6,
        }}
      >
        {sideOpen ? "‹" : "›"}
      </div>

      {/* Panel principal */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          animation: flipping ? "flipPanel 0.42s ease" : "none",
        }}
      >
        {fixedContent}
      </div>

      <style>{`
        @keyframes flipPanel {
          0%   { transform: rotateY(0deg);   opacity: 1; }
          40%  { transform: rotateY(90deg);  opacity: 0.1; }
          60%  { transform: rotateY(-90deg); opacity: 0.1; }
          100% { transform: rotateY(0deg);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
