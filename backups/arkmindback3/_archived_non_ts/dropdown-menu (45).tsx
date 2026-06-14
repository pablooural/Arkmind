/**
 * ConfigMenu Component
 * Menú de configuración con selector de paletas, colores y IA
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - theme: Theme
 * - onThemeChange: (theme: Theme) => void
 * - onOpenSecrets: () => void
 */

import { useState } from "react";
import { Theme, ThemeColors } from "@/types/theme";
import { COLOR_PRESETS } from "@/utils/colorSystem";
import { ColorWheel } from "./ColorWheel";
import { useAI } from "@/hooks/useAI";

interface ConfigMenuProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const COLOR_TARGETS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: "bg", label: "Fondo" },
  { key: "surface", label: "Panel" },
  { key: "accent", label: "Acento" },
  { key: "text", label: "Texto" },
];

type MenuSection = "main" | "personalizar" | "ai";

export function ConfigMenu({ open, onClose, theme, onThemeChange }: ConfigMenuProps) {
  const [section, setSection] = useState<MenuSection>("main");
  const [pickerTarget, setPickerTarget] = useState<keyof ThemeColors | null>(null);
  const [tempColor, setTempColor] = useState("#000000");
  const { currentModel, isConfigured, getAvailableModels, setModel } = useAI();

  const openPicker = (key: keyof ThemeColors) => {
    setTempColor(theme[key]);
    setPickerTarget(key);
  };

  const confirmPicker = () => {
    if (pickerTarget) {
      onThemeChange({ ...theme, [pickerTarget]: tempColor });
      setPickerTarget(null);
    }
  };

  const cancelPicker = () => setPickerTarget(null);

  const handleBackToMain = () => {
    setSection("main");
  };

  return (
    <>
      {/* Drawer principal */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "78vw",
          maxWidth: "300px",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          background: "rgba(5,10,20,0.97)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "#64748b", fontFamily: "'Courier New',monospace" }}>
            ≡ CONFIGURACIÓN
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "18px",
              padding: "2px 6px",
              lineHeight: 1,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ✕
          </button>
        </div>

        {/* Secciones principales */}
        {section === "main" && (
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {/* IA y Modelos */}
            <div
              onClick={() => setSection("ai")}
              style={{
                padding: "0.65rem 0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                color: isConfigured ? "#4ade80" : "#475569",
                fontSize: "0.82rem",
                fontFamily: "'Courier New',monospace",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "background 0.15s",
                marginBottom: "0.5rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ opacity: 0.8 }}>🤖</span> IA & Modelos
              <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.65rem" }}>
                {isConfigured ? "✓" : "○"}
              </span>
            </div>

            {["Perfil", "Cuenta", "Notificaciones"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "0.65rem 0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: "#475569",
                  fontSize: "0.82rem",
                  fontFamily: "'Courier New',monospace",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ opacity: 0.4 }}>○</span> {item}
                <span style={{ marginLeft: "auto", opacity: 0.25, fontSize: "0.7rem" }}>próx.</span>
              </div>
            ))}
          </div>
        )}

        {/* Personalizar */}
        {section === "main" && (
          <div style={{ padding: "1rem" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", color: "#334155", marginBottom: "0.8rem", fontFamily: "'Courier New',monospace" }}>
              PERSONALIZAR
            </div>

            {/* Botón Personalizar */}
            <div
              onClick={() => setSection("personalizar")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                padding: "0.8rem 0.6rem",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "8px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.02)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            >
              <span style={{ fontSize: "1rem" }}>⚙️</span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'Courier New',monospace" }}>
                Personalizar
              </span>
              <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#64748b" }}>›</span>
            </div>

            {/* Paletas predefinidas */}
            <div style={{ fontSize: "0.62rem", color: "#475569", marginBottom: "0.5rem", marginTop: "1rem", fontFamily: "'Courier New',monospace" }}>
              Paletas predefinidas
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "1.2rem" }}>
              {COLOR_PRESETS.map((p) => {
                const active = p.bg === theme.bg && p.accent === theme.accent;
                return (
                  <div
                    key={p.name}
                    onClick={() => onThemeChange(p)}
                    style={{
                      padding: "0.5rem 0.6rem",
                      border: active ? `1px solid ${p.accent}` : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "8px",
                      background: active ? `${p.bg}cc` : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      {[p.bg, p.surface, p.accent].map((c, i) => (
                        <div key={i} style={{ width: 8, height: 22, borderRadius: 3, background: c }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "0.68rem", color: active ? p.accent : "#64748b", fontFamily: "'Courier New',monospace", lineHeight: 1.2 }}>
                      {p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección Personalizar */}
        {section === "personalizar" && (
          <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", color: "#334155", marginBottom: "0.8rem", fontFamily: "'Courier New',monospace" }}>
              PERSONALIZAR
            </div>

            {/* Opción de Color */}
            <div
              onClick={() => {}}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                padding: "0.8rem 0.6rem",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "8px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.02)",
                transition: "background 0.15s",
                marginBottom: "1rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            >
              <span style={{ fontSize: "1rem" }}>🎨</span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'Courier New',monospace" }}>
                Color
              </span>
            </div>

            {/* Más opciones placeholder */}
            <div style={{ fontSize: "0.62rem", color: "#475569", marginBottom: "0.5rem", fontFamily: "'Courier New',monospace" }}>
              Más opciones
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
              {["Fuentes", "Animaciones", "Accesibilidad"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "0.65rem 0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    color: "#475569",
                    fontSize: "0.82rem",
                    fontFamily: "'Courier New',monospace",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ opacity: 0.4 }}>○</span> {item}
                  <span style={{ marginLeft: "auto", opacity: 0.25, fontSize: "0.7rem" }}>próx.</span>
                </div>
              ))}
            </div>

            {/* Botón volver */}
            <button
              onClick={handleBackToMain}
              style={{
                marginTop: "1rem",
                padding: "0.6rem 1rem",
                background: "rgba(255,255,255,0.1)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.75rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* Sección IA & Modelos */}
        {section === "ai" && (
          <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", color: "#334155", marginBottom: "0.8rem", fontFamily: "'Courier New',monospace" }}>
              IA & MODELOS
            </div>

            {/* Estado de configuración */}
            <div
              style={{
                padding: "0.8rem",
                borderRadius: "8px",
                background: isConfigured ? "#4ade8030" : "#ff6b6b30",
                border: `1px solid ${isConfigured ? "#4ade8044" : "#ff6b6b44"}`,
                marginBottom: "1rem",
                fontSize: "0.75rem",
                color: isConfigured ? "#4ade80" : "#ff6b6b",
              }}
            >
              {isConfigured ? "✓ Configurado" : "✗ No configurado"}
            </div>

            {/* Modelo actual */}
            {currentModel && (
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.4rem", fontFamily: "'Courier New',monospace" }}>
                  Modelo activo
                </div>
                <div
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "0.8rem",
                    color: "#4ade80",
                    fontFamily: "'Courier New',monospace",
                  }}
                >
                  {currentModel}
                </div>
              </div>
            )}

            {/* Modelos disponibles */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.4rem", fontFamily: "'Courier New',monospace" }}>
                Modelos disponibles — tocá para cambiar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {getAvailableModels().map((model) => {
                  const isActive = currentModel === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => setModel(model.id)}
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderRadius: "6px",
                        background: isActive ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.03)",
                        border: isActive ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.07)",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        fontFamily: "'Courier New',monospace",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    >
                      <div style={{ fontWeight: "500", color: isActive ? "#4ade80" : "#cbd5e1", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {isActive && <span style={{ fontSize: "0.6rem" }}>●</span>}
                        {model.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.2rem" }}>{model.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nota de configuración */}
            <div
              style={{
                padding: "0.7rem",
                borderRadius: "8px",
                background: "#4ade8030",
                border: "1px solid #4ade8044",
                fontSize: "0.75rem",
                color: "#4ade80",
                marginTop: "auto",
                textAlign: "center",
                fontFamily: "'Courier New',monospace",
              }}
            >
              ✓ Configurado en servidor
            </div>

            {/* Botón volver */}
            <button
              onClick={handleBackToMain}
              style={{
                marginTop: "0.5rem",
                padding: "0.6rem 1rem",
                background: "rgba(255,255,255,0.1)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.75rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
            >
              ← Volver
            </button>
          </div>
        )}
      </div>

      {/* Modal de color picker */}
      {pickerTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={cancelPicker}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "1.5rem",
              backdropFilter: "blur(16px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ColorWheel color={tempColor} onChange={setTempColor} />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={cancelPicker}
                style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(255,255,255,0.1)",
                  color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPicker}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#4ade80",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
