/**
 * ColorWheel Component
 * Rueda de colores HSV interactiva
 * 
 * Props:
 * - color: string (hex color)
 * - onChange: (color: string) => void
 */

import { useRef, useState, useCallback, useEffect } from "react";

interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorWheel({ color, onChange }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"wheel" | "slider" | null>(null);

  // TODO: Implementar lógica de rueda de colores
  // - Dibujar rueda HSV en canvas
  // - Manejar interacciones de mouse/touch
  // - Actualizar color mediante onChange

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      {/* Rueda de colores */}
      <div style={{ position: "relative", width: "160px", height: "160px" }}>
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          style={{
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            cursor: "crosshair",
            display: "block",
          }}
        />
      </div>

      {/* Slider de brillo */}
      <div style={{ width: "160px" }}>
        <div style={{ fontSize: "0.6rem", color: "#64748b", marginBottom: "4px", fontFamily: "'Courier New',monospace" }}>
          BRILLO
        </div>
        <div
          ref={sliderRef}
          style={{
            position: "relative",
            height: "18px",
            borderRadius: "9px",
            cursor: "pointer",
            background: "linear-gradient(to right, #000, #fff)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
      </div>

      {/* Preview hex */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: color,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        />
        <span style={{ fontFamily: "'Courier New',monospace", fontSize: "0.75rem", color: "#94a3b8" }}>
          {color.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
