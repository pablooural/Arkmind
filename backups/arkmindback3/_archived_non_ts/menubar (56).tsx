/**
 * SplitView Component
 * Vista de división con dos paneles redimensionables
 * 
 * Props:
 * - direction: "vertical" | "horizontal"
 * - panelA: React.ReactNode
 * - panelB: React.ReactNode
 * - accent: string (color)
 * - theme: Theme
 */

import { useState } from "react";
import { Theme } from "@/types/theme";
import { ResizableDivider } from "./ResizableDivider";

interface SplitViewProps {
  direction: "vertical" | "horizontal";
  panelA: React.ReactNode;
  panelB: React.ReactNode;
  accent: string;
  theme: Theme;
}

export function SplitView({ direction, panelA, panelB, accent, theme }: SplitViewProps) {
  const [ratio, setRatio] = useState(0.5);
  const isV = direction === "vertical";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isV ? "row" : "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "none",
          width: isV ? `${ratio * 100}%` : "100%",
          height: isV ? "100%" : `${ratio * 100}%`,
          overflow: "auto",
          background: theme.bg,
        }}
      >
        {panelA}
      </div>

      <ResizableDivider direction={direction} onRatioChange={setRatio} accent={accent} />

      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: theme.surface,
        }}
      >
        {panelB}
      </div>
    </div>
  );
}
