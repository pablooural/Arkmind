/**
 * SecretsDialog Component
 * Ventana para ingresar claves API de Supabase y Mistral
 * 
 * NUEVO:
 * - Input para Supabase Project URL
 * - Input para Supabase API Key
 * - Input para Mistral API Key\n * - Selector de modelo Mistral
 * - Validación de campos
 */

import { useState } from "react";
import { AIConfig, SupabaseConfig, MistralModel } from "@/core";
import { Theme } from "@/types/theme";

interface SecretsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (aiConfig: AIConfig, supabaseConfig: SupabaseConfig) => void;
  theme: Theme;
}

export function SecretsDialog({ open, onClose, onSave, theme }: SecretsDialogProps) {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [mistralKey, setMistralKey] = useState("");
  const [selectedModel, setSelectedModel] = useState<MistralModel>("mistral-small-latest");
  const [error, setError] = useState<string | null>(null);

  const models: Array<{ id: MistralModel; name: string }> = [
    { id: "mistral-small-latest",  name: "Mistral Small (gratuito)"  },
    { id: "open-mistral-7b",       name: "Mistral 7B (gratuito)"     },
    { id: "open-mixtral-8x7b",     name: "Mixtral 8x7B (gratuito)"   },
    { id: "mistral-large-latest",  name: "Mistral Large (pago)"      },
  ];

  const handleSave = () => {
    setError(null);

    // Validar campos
    if (!supabaseUrl.trim()) {
      setError("Ingresa la URL del proyecto Supabase");
      return;
    }
    if (!supabaseKey.trim()) {
      setError("Ingresa la API Key de Supabase");
      return;
    }
    if (!mistralKey.trim()) {
      setError("Ingresa la API Key de Mistral");
      return;
    }

    // Crear configuraciones
    const aiConfig: AIConfig = {
      provider: "mistral",
      model: selectedModel,
      apiKey: mistralKey.trim(),
      temperature: 0.7,
      maxTokens: 1024,
    };

    const supabaseConfig: SupabaseConfig = {
      projectUrl: supabaseUrl.trim(),
      apiKey: supabaseKey.trim(),
      enabled: true,
    };

    onSave(aiConfig, supabaseConfig);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.bg,
          border: `1px solid ${theme.accent}30`,
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: `0 20px 60px rgba(0,0,0,0.3)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 style={{ margin: "0 0 1.5rem 0", color: theme.text, fontSize: "1.2rem" }}>
          Configurar Claves API
        </h2>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "0.8rem",
              borderRadius: "8px",
              background: "#ff6b6b30",
              border: `1px solid #ff6b6b44`,
              color: "#ff6b6b",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Supabase URL */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", color: theme.text, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
            URL del Proyecto Supabase
          </label>
          <input
            type="text"
            placeholder="https://xxxxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Supabase API Key */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", color: theme.text, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
            API Key Supabase (anon)
          </label>
          <input
            type="password"
            placeholder="eyJhbGc..."
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Mistral API Key */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", color: theme.text, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
            API Key Mistral
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={mistralKey}
            onChange={(e) => setMistralKey(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Selector de Modelo */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", color: theme.text, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
            Modelo Mistral Predeterminado
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as MistralModel)}
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              background: `${theme.accent}15`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              background: theme.accent,
              border: "none",
              color: theme.bg,
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            Guardar
          </button>
        </div>

        {/* Info */}
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "8px",
            background: `${theme.accent}10`,
            border: `1px solid ${theme.accent}20`,
            fontSize: "0.8rem",
            color: theme.sub,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "500", color: theme.accent }}>
            ℹ️ Dónde obtener las claves:
          </p>
          <p style={{ margin: "0.3rem 0" }}>
            <strong>Supabase:</strong> Dashboard → Settings → API
          </p>
          <p style={{ margin: "0.3rem 0" }}>
            <strong>Mistral:</strong> console.mistral.ai → API Keys
          </p>
        </div>
      </div>
    </div>
  );
}
