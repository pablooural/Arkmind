/**
 * ChatPanel Component (Panel A)
 * Panel de chat con sesiones IA contextuales
 *
 * CAMBIOS CAPA 6:
 * - Conectado con useSession hook
 * - Renderiza StructuredMessage con 7 tipos
 * - Propuestas con botones Aceptar/Rechazar
 * - Mantiene estilo visual original
 *
 * T-009 (Mavis@cloud, 2026-06-06): agregar acción "Copiar al chat" sobre mensajes.
 * - Botón aparece al hacer hover sobre un mensaje (o siempre en mobile)
 * - Pega el contenido del mensaje en el input del chat (no lo envía)
 * - Feedback visual de "Copiado" 1.5s
 * - Scope: solo ChatPanel.tsx, sin tocar core/ ni hooks/
 */

import { useState, useRef, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { useAI } from "@/hooks/useAI";
import { StructuredMessage } from "@/core";
import { Theme } from "@/types/theme";
import { AlertCircle, CheckCircle, XCircle, Copy, Check } from "lucide-react";

interface ChatPanelProps {
  theme: Theme;
  sessionId: string | null;
}

export function ChatPanel({ theme, sessionId }: ChatPanelProps) {
  const { session, messages, isLoading: sessionLoading, error: sessionError, sendMessage: sendSessionMessage } = useSession(sessionId);
  const { sendMessage: sendAIMessage, isLoading: aiLoading, error: aiError, isConfigured } = useAI();
  const [input, setInput] = useState("");
  // T-009: id del mensaje cuyo botón "Copiado" se está mostrando. null = ninguno.
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = sessionLoading || aiLoading;
  const error = sessionError || aiError;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!sessionId) return;

    // Si AI está configurado, enviar a Mistral
    if (isConfigured) {
      await sendAIMessage(sessionId, input);
    } else {
      // Si no, solo agregar a la sesión
      await sendSessionMessage(input);
    }
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // T-009: handler de "Copiar al chat". Pega el contenido del mensaje en el input.
  // NO envía, deja al usuario editar antes. Funciona con text/code/diff.
  const handleCopyToChat = (msg: StructuredMessage) => {
    // Solo ciertos tipos tienen contenido copiable como texto plano
    if (msg.type !== "text" && msg.type !== "code" && msg.type !== "diff") {
      return;
    }

    let contentToCopy = "";
    if (msg.type === "text") {
      contentToCopy = msg.content;
    } else if (msg.type === "code") {
      // code.path es opcional; si existe, lo agregamos como comentario arriba
      contentToCopy = msg.path ? `// ${msg.path}\n${msg.content}` : msg.content;
    } else {
      // diff.path es obligatorio en el tipo diff
      contentToCopy = `// ${msg.path}\n// Antes:\n${msg.before}\n// Después:\n${msg.after}`;
    }

    // Pegar en el input. Si ya hay algo, agregar nueva línea.
    setInput((prev: string) => (prev ? `${prev}\n${contentToCopy}` : contentToCopy));
    // Feedback visual
    setCopiedMessageId(msg.id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  // T-009: helper que renderiza el botón "Copiar al chat" si el mensaje lo soporta
  const renderCopyButton = (msg: StructuredMessage) => {
    // Solo ciertos tipos tienen contenido copiable como texto
    if (msg.type !== "text" && msg.type !== "code" && msg.type !== "diff") {
      return null;
    }
    const isCopied = copiedMessageId === msg.id;
    return (
      <button
        onClick={() => handleCopyToChat(msg)}
        title={isCopied ? "Copiado al input" : "Copiar al chat"}
        aria-label={isCopied ? "Copiado al input" : "Copiar al chat"}
        style={{
          marginTop: "0.3rem",
          padding: "0.2rem 0.5rem",
          borderRadius: "4px",
          background: isCopied ? `${theme.accent}30` : "transparent",
          border: `1px solid ${theme.accent}30`,
          color: isCopied ? theme.accent : theme.sub,
          fontSize: "0.7rem",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          opacity: 0.7,
          transition: "opacity 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        {isCopied ? <Check size={11} /> : <Copy size={11} />}
        {isCopied ? "Copiado" : "Copiar al chat"}
      </button>
    );
  };

  const renderMessage = (msg: StructuredMessage) => {
    const isUser = msg.role === "user";
    const copyButton = renderCopyButton(msg);

    switch (msg.type) {
      case "text":
        return (
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "80%" }}>
            <div
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                background: isUser ? `${theme.accent}22` : `${theme.surface}cc`,
                border: `1px solid ${isUser ? theme.accent + "44" : theme.accent + "18"}`,
                color: theme.text,
                fontSize: "0.82rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content}
            </div>
            {copyButton}
          </div>
        );

      case "code":
        return (
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "85%" }}>
            <div
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                background: "#1e1e1e",
                border: `1px solid ${theme.accent}30`,
                fontFamily: "'Courier New', monospace",
                fontSize: "0.75rem",
                color: "#d4d4d4",
                overflow: "auto",
              }}
            >
              {msg.path && (
                <div style={{ fontSize: "0.7rem", color: "#858585", marginBottom: "0.5rem" }}>
                  {msg.path}
                </div>
              )}
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {msg.content}
              </pre>
            </div>
            {copyButton}
          </div>
        );

      case "diff":
        return (
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "85%" }}>
            <div
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "8px",
                background: "#1e1e1e",
                border: `1px solid ${theme.accent}30`,
                fontFamily: "'Courier New', monospace",
                fontSize: "0.75rem",
                overflow: "auto",
              }}
            >
              {msg.path && (
                <div style={{ fontSize: "0.7rem", color: "#858585", marginBottom: "0.5rem" }}>
                  {msg.path}
                </div>
              )}
              <div style={{ color: "#f48771", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>Antes:</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.before}
                </pre>
              </div>
              <div style={{ color: "#6a9955" }}>
                <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>Después:</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.after}
                </pre>
              </div>
            </div>
            {copyButton}
          </div>
        );

      case "warning":
        const bgColor =
          msg.severity === "high"
            ? `${theme.accent}30`
            : msg.severity === "medium"
              ? "#ffd70030"
              : "#4a90e230";
        const textColor =
          msg.severity === "high"
            ? "#ff6b6b"
            : msg.severity === "medium"
              ? "#ffd700"
              : "#4a90e2";

        return (
          <div
            style={{
              maxWidth: "80%",
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              background: bgColor,
              border: `1px solid ${textColor}44`,
              color: textColor,
              fontSize: "0.82rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span>{msg.content}</span>
          </div>
        );

      case "proposal":
        return (
          <div
            style={{
              maxWidth: "80%",
              padding: "0.8rem",
              borderRadius: "8px",
              background: `${theme.accent}15`,
              border: `1px solid ${theme.accent}44`,
              color: theme.text,
            }}
          >
            <p style={{ fontSize: "0.82rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Propuesta: {msg.summary}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => console.log("Aceptar:", msg.proposalId)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  background: "#6a9955",
                  border: "none",
                  color: "white",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <CheckCircle size={14} /> Aceptar
              </button>
              <button
                onClick={() => console.log("Rechazar:", msg.proposalId)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  background: `${theme.accent}30`,
                  border: `1px solid ${theme.accent}44`,
                  color: theme.text,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <XCircle size={14} /> Rechazar
              </button>
            </div>
          </div>
        );

      case "snapshot":
        return (
          <div
            style={{
              maxWidth: "80%",
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              background: "#8b5cf630",
              border: `1px solid #8b5cf644`,
              color: "#d8b4fe",
              fontSize: "0.82rem",
            }}
          >
            <p style={{ fontWeight: "500", marginBottom: "0.3rem" }}>Snapshot: {msg.snapshotId}</p>
            <p style={{ fontSize: "0.75rem" }}>{msg.description}</p>
          </div>
        );

      case "action":
        return (
          <div
            style={{
              maxWidth: "85%",
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              border: `1px solid ${theme.accent}30`,
              color: theme.text,
              fontSize: "0.82rem",
            }}
          >
            <p style={{ fontWeight: "500", marginBottom: "0.5rem" }}>Acción: {msg.action}</p>
            <pre
              style={{
                fontSize: "0.7rem",
                fontFamily: "'Courier New', monospace",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#a0a0a0",
              }}
            >
              {JSON.stringify(msg.payload, null, 2)}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: theme.sub,
          fontFamily: "Georgia, serif",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <p>No hay sesión activa</p>
        {!isConfigured && (
          <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>
            Configura las claves API en el menú ⚙️
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div
        style={{
          padding: "0.8rem",
          borderBottom: `1px solid ${theme.accent}20`,
          background: `${theme.bg}cc`,
        }}
      >
        <h2 style={{ fontSize: "0.9rem", fontWeight: "600", color: theme.text, margin: 0 }}>
          Chat - {session.contextPath}
        </h2>
        <p
          style={{
            fontSize: "0.7rem",
            color: theme.sub,
            margin: "0.3rem 0 0 0",
          }}
        >
          Goal: {session.cognitiveContext.goal}
        </p>
      </div>

      {/* Mensajes */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.8rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: theme.sub,
              fontSize: "0.82rem",
            }}
          >
            <p>Inicia una conversación</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role !== "user" && (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: `${theme.accent}22`,
                    border: `1px solid ${theme.accent}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    marginRight: "0.5rem",
                    marginTop: "2px",
                    color: theme.accent,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  AI
                </div>
              )}
              {renderMessage(msg)}
            </div>
          ))
        )}

        {isLoading && (
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              background: `${theme.surface}cc`,
              color: theme.sub,
              fontSize: "0.82rem",
              animation: "pulse 1.5s infinite",
            }}
          >
            Procesando...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "8px",
              background: "#ff6b6b30",
              border: "1px solid #ff6b6b44",
              color: "#ff6b6b",
              fontSize: "0.82rem",
            }}
          >
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "0.6rem 0.8rem",
          borderTop: `1px solid ${theme.accent}20`,
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-end",
          background: `${theme.bg}cc`,
          flexShrink: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribí algo..."
          rows={1}
          style={{
            flex: 1,
            background: `${theme.surface}cc`,
            border: `1px solid ${theme.accent}30`,
            borderRadius: "10px",
            padding: "0.55rem 0.75rem",
            color: theme.text,
            fontSize: "0.82rem",
            fontFamily: "Georgia, serif",
            resize: "none",
            outline: "none",
            lineHeight: 1.4,
            maxHeight: "100px",
            overflowY: "auto",
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            flexShrink: 0,
            background: input.trim() && !isLoading ? theme.accent : `${theme.accent}30`,
            border: "none",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            color: input.trim() && !isLoading ? theme.bg : theme.sub,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
