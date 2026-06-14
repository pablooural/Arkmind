import { useState } from "react";
import { useLocation } from "wouter";
import { authManager } from "@/core/auth";

type Mode = "login" | "register";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  color: "#cbd5e1",
  marginBottom: "0.4rem",
  fontFamily: "'Courier New', monospace",
};

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Completa todos los campos");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, confirmPassword };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error de autenticación");
      }

      authManager.saveSession(data.session);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              color: "#fff",
              margin: "0 0 0.5rem 0",
              fontWeight: "600",
            }}
          >
            UX Arquitecto
          </h1>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            marginBottom: "1.5rem",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "8px",
            padding: "4px",
          }}
        >
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: "0.5rem",
                background: mode === m ? "rgba(74, 222, 128, 0.15)" : "transparent",
                border: mode === m ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent",
                borderRadius: "6px",
                color: mode === m ? "#4ade80" : "#64748b",
                fontSize: "0.9rem",
                cursor: "pointer",
                fontWeight: mode === m ? "600" : "400",
                transition: "all 0.2s",
              }}
            >
              {m === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={inputStyle}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
            />
          </div>

          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {mode === "register" && (
            <div>
              <label style={labelStyle}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "0.75rem",
                background: "#ff6b6b30",
                border: "1px solid #ff6b6b44",
                borderRadius: "8px",
                color: "#ff6b6b",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem",
              background: "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s",
              marginTop: "0.25rem",
            }}
          >
            {loading
              ? mode === "login"
                ? "Iniciando..."
                : "Registrando..."
              : mode === "login"
              ? "Iniciar sesión"
              : "Crear cuenta"}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          {mode === "login" ? (
            <p style={{ margin: 0 }}>
              ¿No tienes cuenta?{" "}
              <span
                onClick={() => switchMode("register")}
                style={{ color: "#4ade80", cursor: "pointer" }}
              >
                Regístrate
              </span>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              ¿Ya tienes cuenta?{" "}
              <span
                onClick={() => switchMode("login")}
                style={{ color: "#4ade80", cursor: "pointer" }}
              >
                Inicia sesión
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
