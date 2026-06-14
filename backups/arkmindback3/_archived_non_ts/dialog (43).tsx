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
 *
 * T-011 (Mavis@cloud, 2026-06-08): menú hamburguesa con historial de sesiones.
 * - Icono 3 líneas en el header del chat
 * - Dropdown con 3 secciones: Activas / Recientes / Archivadas
 * - Click en una sesión → cambia el activeSessionId interno
 * - Si el padre pasa onSessionChange, también lo notifica
 * - State interno activeSessionId inicializado con la prop sessionId
 * - Si la prop sessionId cambia externamente, sincroniza (useEffect)
 * - Scope: solo ChatPanel.tsx + nuevos componentes UI si hace falta
 * - NO modifica session.ts (los métodos ya existen: getAllSessions, setState)
 * - NO modifica useSession (lee sessionManager directo desde core)
 *
 * T-010 (Mavis@cloud, 2026-06-10): acción "Enviar a LLM" sobre mensajes.
 * - Botón aparece al lado de "Copiar al chat" en el mismo hover group
 * - Crea una nueva sesión (mismo panelId/contextPath) y le inserta el contenido
 *   como primer mensaje de la nueva conversación
 * - Navega a la nueva sesión: cambia activeSessionId y notifica onSessionChange
 * - Helper `createSessionWithInitialMessage` agregado en session.ts
 *   (1 método nuevo, sin tocar los existentes)
 * - Scope: ChatPanel.tsx + 1 método nuevo en session.ts
 * - NO modifica types.ts ni ia-context-bridge.ts ni useSession
 */

import { useState, useRef, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { useAI } from "@/hooks/useAI";
import { StructuredMessage, sessionManager, AIContextSession } from "@/core";
import { Theme } from "@/types/theme";
import { AlertCircle, CheckCircle, XCircle, Copy, Check, Menu, X, Send } from "lucide-react";
import { visualManager } from "@/core/visual";

interface ChatPanelProps {
  theme: Theme;
  sessionId: string | null;
  /** T-011: callback opcional cuando el usuario cambia de sesión desde el menú */
  onSessionChange?: (newSessionId: string) => void;
}

export function ChatPanel({ theme, sessionId, onSessionChange }: ChatPanelProps) {
  // T-011: state interno para la sesión activa. Inicializado con la prop.
  // Si la prop cambia, sincronizamos con useEffect más abajo.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId);
  const { session, messages, isLoading: sessionLoading, error: sessionError, sendMessage: sendSessionMessage } = useSession(activeSessionId);
  const { sendMessage: sendAIMessage, isLoading: aiLoading, error: aiError, isConfigured } = useAI();
  const [input, setInput] = useState("");
  // T-009: id del mensaje cuyo botón "Copiado" se está mostrando. null = ninguno.
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  // T-011: estado del menú de historial (abierto/cerrado)
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLoading = sessionLoading || aiLoading;
  const error = sessionError || aiError;

  // T-011: sincronizar activeSessionId con cambios externos de la prop
  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  // T-011: handler para elegir una sesión del menú
  const handleSelectSession = (newId: string) => {
    setActiveSessionId(newId);
    setHistoryOpen(false);
    if (onSessionChange) {
      onSessionChange(newId);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!activeSessionId) return;

    // Si AI está configurado, enviar a Mistral
    if (isConfigured) {
      await sendAIMessage(activeSessionId, input);
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

  // T-009: extraer el contenido textual de un mensaje, mismo formato que T-009.
  // Si el tipo no es copiable, devuelve null.
  const extractMessageContent = (msg: StructuredMessage): string | null => {
    if (msg.type === "text") return msg.content;
    if (msg.type === "code") return msg.path ? `// ${msg.path}\n${msg.content}` : msg.content;
    if (msg.type === "diff") return `// ${msg.path}\n// Antes:\n${msg.before}\n// Después:\n${msg.after}`;
    return null;
  };

  // T-010: handler de "Enviar a LLM". Crea una nueva sesión con el contenido
  // del mensaje como primer mensaje, y navega hacia ella.
  const handleSendToLLM = (msg: StructuredMessage) => {
    const content = extractMessageContent(msg);
    if (!content) return;

    // Necesitamos una sesión fuente de la cual derivar panelId / contextPath /
    // cognitiveContext. Si no hay activa, buscamos la primera activa.
    let source = activeSessionId ? sessionManager.getSession(activeSessionId) : undefined;
    if (!source) {
      source = sessionManager.getAllSessions().find((s) => s.state === "active");
    }
    if (!source) return; // sin sesión fuente, no se puede crear

    // Reconstruir un VisualContext mínimo a partir de la sesión fuente.
    // Solo necesitamos el panelId y el persistent state (visualManager ya lo tiene).
    const persistent = visualManager.getPersistentState(source.panelId);
    const visualContext = {
      panelId: source.panelId,
      contextPath: source.contextPath,
      persistent: persistent ?? {
        openResources: [],
        viewMode: "code" as const,
      },
      transient: {
        lastInteraction: Date.now(),
      },
    };

    // Crear el mensaje inicial. Tipo "text" porque es lo más general; el
    // contenido es lo que el usuario quería delegar.
    const initialMessage: StructuredMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: "user",
      type: "text",
      content,
      timestamp: Date.now(),
    };

    // Crear la nueva sesión.
    const newSession = sessionManager.createSessionWithInitialMessage(
      source.id,
      initialMessage,
      visualContext
    );
    if (!newSession) return;

    // Navegar a la nueva sesión.
    setActiveSessionId(newSession.id);
    if (onSessionChange) {
      onSessionChange(newSession.id);
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

  // T-010: helper que renderiza el botón "Enviar a LLM" (al lado del de copiar).
  // Misma condición que T-009: solo si el mensaje tiene contenido textual.
  const renderSendToLLMButton = (msg: StructuredMessage) => {
    if (msg.type !== "text" && msg.type !== "code" && msg.type !== "diff") {
      return null;
    }
    return (
      <button
        onClick={() => handleSendToLLM(msg)}
        title="Crear nueva conversación con este contenido y abrirla"
        aria-label="Enviar a LLM"
        style={{
          marginTop: "0.3rem",
          marginLeft: "0.4rem",
          padding: "0.2rem 0.5rem",
          borderRadius: "4px",
          background: "transparent",
          border: `1px solid ${theme.accent}30`,
          color: theme.sub,
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
        <Send size={11} />
        Enviar a LLM
      </button>
    );
  };

  const renderMessage = (msg: StructuredMessage) => {
    const isUser = msg.role === "user";
    const copyButton = renderCopyButton(msg);
    // T-010: botón "Enviar a LLM" al lado del de copiar. Misma condición.
    const sendToLLMButton = renderSendToLLMButton(msg);

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
            {sendToLLMButton}
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
            {sendToLLMButton}
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
            {sendToLLMButton}
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

  // T-011: helper para agrupar y ordenar sesiones
  const groupedSessions = (() => {
    const all: AIContextSession[] = sessionManager.getAllSessions();
    const active: AIContextSession[] = [];
    const recent: AIContextSession[] = [];
    const archived: AIContextSession[] = [];

    for (const s of all) {
      if (s.state === "archived") {
        archived.push(s);
      } else if (s.state === "active") {
        active.push(s);
      } else {
        // idle, forked, summarized, restoring → recientes
        recent.push(s);
      }
    }

    // Ordenar por lastActive DESC
    const byLastActive = (a: AIContextSession, b: AIContextSession) => b.lastActive - a.lastActive;
    active.sort(byLastActive);
    recent.sort(byLastActive);
    archived.sort(byLastActive);

    return { active, recent, archived };
  })();

  // T-011: helper para truncar un path a algo legible
  const truncatePath = (path: string, max: number = 40): string => {
    if (path.length <= max) return path;
    return "…" + path.slice(-(max - 1));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div
        style={{
          padding: "0.8rem",
          borderBottom: `1px solid ${theme.accent}20`,
          background: `${theme.bg}cc`,
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}
      >
        {/* T-011: botón hamburguesa */}
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          title={historyOpen ? "Cerrar historial" : "Abrir historial"}
          aria-label={historyOpen ? "Cerrar historial de chats" : "Abrir historial de chats"}
          style={{
            background: "transparent",
            border: `1px solid ${theme.accent}30`,
            borderRadius: "6px",
            padding: "0.35rem 0.45rem",
            cursor: "pointer",
            color: theme.sub,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.text;
            e.currentTarget.style.borderColor = theme.accent + "60";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.sub;
            e.currentTarget.style.borderColor = theme.accent + "30";
          }}
        >
          {historyOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
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
      </div>

      {/* T-011: Dropdown de historial (condicional) */}
      {historyOpen && (
        <HistoryDropdown
          theme={theme}
          currentSessionId={activeSessionId}
          grouped={groupedSessions}
          truncatePath={truncatePath}
          onSelect={handleSelectSession}
        />
      )}

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

/**
 * T-011: HistoryDropdown
 * Subcomponente que renderiza el menú de historial de sesiones.
 * Se renderiza dentro del ChatPanel cuando `historyOpen === true`.
 *
 * Props:
 *   - theme: el tema actual (colores)
 *   - currentSessionId: id de la sesión actualmente activa (para highlight)
 *   - grouped: sesiones ya agrupadas en {active, recent, archived}
 *   - truncatePath: helper para acortar paths largos
 *   - onSelect: callback al elegir una sesión
 *
 * Scope: privado a este archivo, no se exporta. Si en el futuro se necesita
 * en otros componentes, mover a su propio archivo en components/ui/.
 */
interface HistoryDropdownProps {
  theme: Theme;
  currentSessionId: string | null;
  grouped: {
    active: AIContextSession[];
    recent: AIContextSession[];
    archived: AIContextSession[];
  };
  truncatePath: (path: string, max?: number) => string;
  onSelect: (sessionId: string) => void;
}

function HistoryDropdown({
  theme,
  currentSessionId,
  grouped,
  truncatePath,
  onSelect,
}: HistoryDropdownProps) {
  const renderSessionItem = (s: AIContextSession) => {
    const isCurrent = s.id === currentSessionId;
    return (
      <button
        key={s.id}
        onClick={() => onSelect(s.id)}
        title={s.contextPath}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "0.5rem 0.7rem",
          background: isCurrent ? `${theme.accent}22` : "transparent",
          border: "none",
          borderLeft: isCurrent ? `3px solid ${theme.accent}` : "3px solid transparent",
          color: theme.text,
          fontSize: "0.78rem",
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => {
          if (!isCurrent) e.currentTarget.style.background = `${theme.accent}10`;
        }}
        onMouseLeave={(e) => {
          if (!isCurrent) e.currentTarget.style.background = "transparent";
        }}
      >
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: isCurrent ? "600" : "400",
          }}
        >
          {truncatePath(s.contextPath)}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: theme.sub,
            marginTop: "0.15rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <span>{s.state}</span>
          <span>·</span>
          <span>{s.messages.length} mensajes</span>
        </div>
      </button>
    );
  };

  const renderSection = (title: string, sessions: AIContextSession[], emptyMsg: string) => {
    if (sessions.length === 0) {
      return (
        <div style={{ padding: "0.4rem 0.7rem", fontSize: "0.7rem", color: theme.sub, fontStyle: "italic" }}>
          {emptyMsg}
        </div>
      );
    }
    return (
      <>
        <div
          style={{
            padding: "0.4rem 0.7rem 0.2rem",
            fontSize: "0.65rem",
            fontWeight: "600",
            color: theme.sub,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title} ({sessions.length})
        </div>
        {sessions.map(renderSessionItem)}
      </>
    );
  };

  return (
    <div
      style={{
        borderBottom: `1px solid ${theme.accent}20`,
        background: `${theme.surface}ee`,
        maxHeight: "320px",
        overflowY: "auto",
      }}
    >
      {renderSection("Activas", grouped.active, "No hay sesiones activas")}
      {renderSection("Recientes", grouped.recent, "No hay sesiones recientes")}
      {renderSection("Archivadas", grouped.archived, "No hay sesiones archivadas")}
    </div>
  );
}
