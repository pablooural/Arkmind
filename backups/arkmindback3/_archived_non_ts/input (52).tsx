/**
 * ResizableDivider Component
 * Divisor redimensionable para vistas de división
 * 
 * Props:
 * - direction: "vertical" | "horizontal"
 * - onRatioChange: (ratio: number) => void
 * - accent: string (color)
 */

import { useRef, useState, useCallback } from "react";

interface ResizableDividerProps {
  direction: "vertical" | "horizontal";
  onRatioChange: (ratio: number) => void;
  accent: string;
}

export function ResizableDivider({ direction, onRatioChange, accent }: ResizableDividerProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      dragging.current = true;
      setActive(true);

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!dragging.current) return;

        const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
        const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
        const parent = divRef.current?.parentElement;

        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const r =
          direction === "vertical"
            ? Math.min(0.85, Math.max(0.15, (cx - rect.left) / rect.width))
            : Math.min(0.85, Math.max(0.15, (cy - rect.top) / rect.height));

        onRatioChange(r);
      };

      const onEnd = () => {
        dragging.current = false;
        setActive(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [direction, onRatioChange]
  );

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    startDrag(cx, cy);
  };

  const isV = direction === "vertical";

  return (
    <div
      ref={divRef}
      onMouseDown={handleDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleDown}
      style={{
        position: "relative",
        flexShrink: 0,
        width: isV ? "8px" : "100%",
        height: isV ? "100%" : "8px",
        cursor: isV ? "col-resize" : "row-resize",
        background: active ? `${accent}b0` : hovered ? `${accent}40` : "rgba(255,255,255,0.08)",
        transition: "background 0.2s",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: isV ? "column" : "row", gap: "4px", opacity: hovered || active ? 1 : 0.4, transition: "opacity 0.2s" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: active ? accent : "#94a3b8",
            }}
          />
        ))}
      </div>
    </div>
  );
}
