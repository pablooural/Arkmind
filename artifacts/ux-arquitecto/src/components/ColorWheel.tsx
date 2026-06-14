/**
   * ColorWheel Component
   * Rueda de colores HSV interactiva con selector de brillo
   *
   * Props:
   * - color: string (hex color)
   * - onChange: (color: string) => void
   */

  import { useRef, useState, useCallback, useEffect } from "react";
  import { hexToHsv, hsvToHex } from "@/utils/colorConversion";
  import { HSV } from "@/types/theme";

  interface ColorWheelProps {
    color: string;
    onChange: (color: string) => void;
  }

  const WHEEL_SIZE = 160;
  const WHEEL_RADIUS = WHEEL_SIZE / 2;

  /** Dibuja la rueda HSV en el canvas */
  function drawWheel(ctx: CanvasRenderingContext2D, value: number) {
    const cx = WHEEL_RADIUS;
    const cy = WHEEL_RADIUS;

    const imageData = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = imageData.data;

    for (let y = 0; y < WHEEL_SIZE; y++) {
      for (let x = 0; x < WHEEL_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > WHEEL_RADIUS) {
          // Transparente fuera del círculo
          const idx = (y * WHEEL_SIZE + x) * 4;
          data[idx + 3] = 0;
          continue;
        }

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const sat = (dist / WHEEL_RADIUS) * 100;

        // HSV → RGB
        const h = hue, s = sat / 100, v = value / 100;
        const f = (n: number) => {
          const k = (n + h / 60) % 6;
          return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        };

        const idx = (y * WHEEL_SIZE + x) * 4;
        data[idx]     = Math.round(f(5) * 255);
        data[idx + 1] = Math.round(f(3) * 255);
        data[idx + 2] = Math.round(f(1) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /** Calcula hue+sat desde coordenadas del canvas */
  function coordsToHS(x: number, y: number): { h: number; s: number } | null {
    const dx = x - WHEEL_RADIUS;
    const dy = y - WHEEL_RADIUS;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > WHEEL_RADIUS) return null;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = (dist / WHEEL_RADIUS) * 100;
    return { h, s };
  }

  /** Posición del dot en la rueda */
  function hsToDotPos(h: number, s: number): { x: number; y: number } {
    const angle = (h * Math.PI) / 180;
    const r = (s / 100) * WHEEL_RADIUS;
    return {
      x: WHEEL_RADIUS + r * Math.cos(angle),
      y: WHEEL_RADIUS + r * Math.sin(angle),
    };
  }

  export function ColorWheel({ color, onChange }: ColorWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const dragging = useRef<"wheel" | "slider" | null>(null);

    const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color || "#3b82f6"));
    const [hexInput, setHexInput] = useState(color || "#3b82f6");

    // Sync hacia afuera cuando cambia hsv
    const emitColor = useCallback((next: HSV) => {
      const hex = hsvToHex(next);
      setHexInput(hex);
      onChange(hex);
    }, [onChange]);

    // Redibuja la rueda cuando cambia el brillo
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawWheel(ctx, hsv.v);
    }, [hsv.v]);

    // Sync desde prop color
    useEffect(() => {
      if (!color) return;
      const parsed = hexToHsv(color);
      setHsv(parsed);
      setHexInput(color);
    }, [color]);

    // ── Wheel interaction ──────────────────────────────────────────────────────

    const handleWheelPointer = useCallback((clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * WHEEL_SIZE;
      const y = ((clientY - rect.top) / rect.height) * WHEEL_SIZE;
      const hs = coordsToHS(x, y);
      if (!hs) return;
      setHsv((prev) => {
        const next = { ...prev, h: hs.h, s: hs.s };
        emitColor(next);
        return next;
      });
    }, [emitColor]);

    const onWheelMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = "wheel";
      handleWheelPointer(e.clientX, e.clientY);
    }, [handleWheelPointer]);

    const onWheelTouchStart = useCallback((e: React.TouchEvent) => {
      dragging.current = "wheel";
      const t = e.touches[0];
      handleWheelPointer(t.clientX, t.clientY);
    }, [handleWheelPointer]);

    // ── Slider interaction ─────────────────────────────────────────────────────

    const handleSliderPointer = useCallback((clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHsv((prev) => {
        const next = { ...prev, v: pct * 100 };
        emitColor(next);
        return next;
      });
    }, [emitColor]);

    const onSliderMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = "slider";
      handleSliderPointer(e.clientX);
    }, [handleSliderPointer]);

    const onSliderTouchStart = useCallback((e: React.TouchEvent) => {
      dragging.current = "slider";
      const t = e.touches[0];
      handleSliderPointer(t.clientX);
    }, [handleSliderPointer]);

    // ── Global move/up ─────────────────────────────────────────────────────────

    useEffect(() => {
      const onMouseMove = (e: MouseEvent) => {
        if (dragging.current === "wheel") handleWheelPointer(e.clientX, e.clientY);
        if (dragging.current === "slider") handleSliderPointer(e.clientX);
      };
      const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (dragging.current === "wheel") handleWheelPointer(t.clientX, t.clientY);
        if (dragging.current === "slider") handleSliderPointer(t.clientX);
      };
      const onUp = () => { dragging.current = null; };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onUp);
      };
    }, [handleWheelPointer, handleSliderPointer]);

    // ── Hex input ──────────────────────────────────────────────────────────────

    const onHexCommit = useCallback(() => {
      const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        const parsed = hexToHsv(val);
        setHsv(parsed);
        onChange(val);
      }
    }, [hexInput, onChange]);

    // ── Dot position ───────────────────────────────────────────────────────────

    const dotPos = hsToDotPos(hsv.h, hsv.s);

    // ── Slider gradient ────────────────────────────────────────────────────────

    const hsvPureHex = hsvToHex({ h: hsv.h, s: hsv.s, v: 100 });

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        {/* Rueda de colores */}
        <div
          style={{ position: "relative", width: `${WHEEL_SIZE}px`, height: `${WHEEL_SIZE}px`, userSelect: "none" }}
          onMouseDown={onWheelMouseDown}
          onTouchStart={onWheelTouchStart}
        >
          <canvas
            ref={canvasRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            style={{
              width: `${WHEEL_SIZE}px`,
              height: `${WHEEL_SIZE}px`,
              borderRadius: "50%",
              cursor: "crosshair",
              display: "block",
            }}
          />
          {/* Dot selector */}
          <div
            style={{
              position: "absolute",
              left: dotPos.x - 7,
              top: dotPos.y - 7,
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid #fff",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)",
              background: hsvToHex(hsv),
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Slider de brillo */}
        <div style={{ width: `${WHEEL_SIZE}px` }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b", marginBottom: "4px", fontFamily: "'Courier New',monospace" }}>
            BRILLO
          </div>
          <div
            ref={sliderRef}
            onMouseDown={onSliderMouseDown}
            onTouchStart={onSliderTouchStart}
            style={{
              position: "relative",
              height: "18px",
              borderRadius: "9px",
              cursor: "pointer",
              background: `linear-gradient(to right, #000, ${hsvPureHex})`,
              border: "1px solid rgba(255,255,255,0.12)",
              userSelect: "none",
            }}
          >
            {/* Thumb */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${hsv.v}%`,
                transform: "translate(-50%, -50%)",
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: hsvToHex(hsv),
                border: "2px solid #fff",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Preview + input hex */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: hsvToHex(hsv),
              border: "1px solid rgba(255,255,255,0.2)",
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            value={hexInput.toUpperCase()}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={onHexCommit}
            onKeyDown={(e) => { if (e.key === "Enter") onHexCommit(); }}
            style={{
              fontFamily: "'Courier New',monospace",
              fontSize: "0.75rem",
              color: "#94a3b8",
              background: "transparent",
              border: "none",
              outline: "none",
              width: 72,
              cursor: "text",
            }}
          />
        </div>
      </div>
    );
  }
  