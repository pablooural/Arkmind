/**
 * ConversationPanel Component (Panel A)
 *
 * Context Runtime — panel de conversación contextual.
 *
 * CAMBIO: Cuando hay un archivo activo, lee su contenido y lo inyecta
 * en el contexto que se manda a Mistral. La IA ve el archivo real.
 *
 * Límite: solo archivos de texto/código (no binarios).
 * El contenido se trunca en el backend si es demasiado largo.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { useAI } from "@/hooks/useAI";
import { useMemory } from "@/hooks/useMemory";
import { StructuredMessage } from "@/core";
import { ResourceNode } from "@/core/types";
import { Theme } from "@/types/theme";
import { AlertCircle, CheckCircle, XCircle, Brain, FileCode } from "lucide-react";
import { ResourceContext } from "@/lib/aiApi";
import { filesystemManager } from "@/core/filesystem";

// Extensiones de texto que vale la pena mandar a la IA
const TEXT_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "json", "css", "html", "htm",
  "md", "txt", "yaml", "yml", "sh", "env", "toml", "xml",
  "py", "rs", "go", "java", "c", "cpp", "h", "cs", "rb",
  "gitignore", "prettierrc", "eslintrc",
]);

function isTextFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTS.has(ext) || !name.includes(".");
}

interface ConversationPanelProps {
  theme: Theme;
  sessionId: string | null;
  activeResource?: ResourceNode | null;
}

export function ConversationPanel({ theme, sessionId, activeResource }: ConversationPanelProps) {
  const { session, messages, isLoading: sessionLoading, error: sessionError, sendMessage: sendSessionMessage } = useSession(sessionId);
  const { propose: sendAIPropose, isLoading: aiLoading, error: aiError, isConfigured } = useAI();
  const memory = useMemory({ sessionId, contextPath: activeResource?.path ?? "/" });

  const [input, setInput]               = useState("");
  const [fileContent, setFileContent]   = useState<string | null>(null);
  const [fileLoading, setFileLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = sessionLoading || aiLoading;
  const error = sessionError || aiError;

  // ── Cargar contenido del archivo cuando cambia el recurso ─────────────

  useEffect(() => {
    setFileContent(null);

    if (!activeResource || activeResource.type === "folder") return;
    if (!isTextFile(activeResource.name)) return;
    if (!filesystemManager.isReady()) return;

    let cancelled = false;
    setFileLoading(true);

    filesystemManager.readFile(activeResource.path).then((result) => {
      if (cancelled) return;
      if (result.success && result.content !== undefined) {
        setFileContent(result.content);
      }
    }).finally(() => {
      if (!cancelled) setFileLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeResource?.path]);

  // ── Registrar recurso en Working Memory ───────────────────────────────

  useEffect(() => {
    if (activeResource && sessionId) {
      memory.trackResource(activeResource.path);
      if (!memory.workingMemory?.focus) {
        memory.setFocus(`Trabajando sobre "${activeResource.name}"`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResource?.path, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Enviar mensaje ────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId) return;

    const memBlock = await memory.buildMemoryBlock();
    
    // Construir bloque de contexto manual
    let contextStr = "";
    if (activeResource) {
      contextStr = `Recurso: ${activeResource.path}\n`;
      if (fileContent) {
        contextStr += `Contenido:\n${fileContent.slice(0, 5000)}`;
      }
    }

    if (isConfigured) {
      // USAR EL NUEVO FLUJO UNIFICADO (Manus@delta bridge)
      await sendAIPropose(sessionId, input, contextStr, memBlock || undefined);
    } else {
      await sendSessionMessage(input);
    }
    setInput("");
  }, [input, sessionId, activeResource, fileContent, memory, isConfigured, sendAIPropose, sendSessionMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render de mensajes ────────────────────────────────────────────────

  const renderMessage = (msg: StructuredMessage) => {
    const isUser = msg.role === "user";

    switch (msg.type) {
      case "text":
        return (
          <div style={{
            maxWidth: "80%",
            padding: "0.6rem 0.8rem",
            borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
            background: isUser ? `${theme.accent}22` : `${theme.surface}cc`,
            border: `1px solid ${isUser ? theme.accent + "44" : theme.accent + "18"}`,
            color: theme.text,
            fontSize: "0.82rem",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {msg.content}
          </div>
        );

      case "code":
        return (
          <div style={{
            maxWidth: "85%", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: "#1e1e1e", border: `1px solid ${theme.accent}30`,
            fontFamily: "'Courier New', monospace", fontSize: "0.75rem",
            color: "#d4d4d4", overflow: "auto",
          }}>
            {msg.path && (
              <div style={{ fontSize: "0.7rem", color: "#858585", marginBottom: "0.5rem" }}>
                {msg.path}
              </div>
            )}
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </pre>
          </div>
        );

      case "diff":
        return (
          <div style={{
            maxWidth: "85%", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: "#1e1e1e", border: `1px solid ${theme.accent}30`,
            fontFamily: "'Courier New', monospace", fontSize: "0.75rem", overflow: "auto",
          }}>
            {msg.path && (
              <div style={{ fontSize: "0.7rem", color: "#858585", marginBottom: "0.5rem" }}>
                {msg.path}
              </div>
            )}
            <div style={{ color: "#f48771", marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>Antes:</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.before}</pre>
            </div>
            <div style={{ color: "#6a9955" }}>
              <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>Después:</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.after}</pre>
            </div>
          </div>
        );

      case "warning": {
        const bgColor =
          msg.severity === "high"   ? `${theme.accent}30`
          : msg.severity === "medium" ? "#ffd70030"
          : "#4a90e230";
        const textColor =
          msg.severity === "high"   ? "#ff6b6b"
          : msg.severity === "medium" ? "#ffd700"
          : "#4a90e2";
        return (
          <div style={{
            maxWidth: "80%", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: bgColor, border: `1px solid ${textColor}44`,
            color: textColor, fontSize: "0.82rem",
            display: "flex", gap: "0.5rem", alignItems: "flex-start",
          }}>
            <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
            <span>{msg.content}</span>
          </div>
        );
      }

      case "proposal":
        return (
          <div style={{
            maxWidth: "80%", padding: "0.8rem", borderRadius: "8px",
            background: `${theme.accent}15`, border: `1px solid ${theme.accent}44`,
            color: theme.text,
          }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Propuesta: {msg.summary}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => console.log("Aceptar:", msg.proposalId)}
                style={{
                  padding: "0.4rem 0.8rem", borderRadius: "6px",
                  background: "#6a9955", border: "none", color: "white",
                  fontSize: "0.75rem", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}
              >
                <CheckCircle size={14} /> Aceptar
              </button>
              <button
                onClick={() => console.log("Rechazar:", msg.proposalId)}
                style={{
                  padding: "0.4rem 0.8rem", borderRadius: "6px",
                  background: `${theme.accent}30`, border: `1px solid ${theme.accent}44`,
                  color: theme.text, fontSize: "0.75rem", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}
              >
                <XCircle size={14} /> Rechazar
              </button>
            </div>
          </div>
        );

      case "snapshot":
        return (
          <div style={{
            maxWidth: "80%", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: "#8b5cf630", border: "1px solid #8b5cf644",
            color: "#d8b4fe", fontSize: "0.82rem",
          }}>
            <p style={{ fontWeight: "500", marginBottom: "0.3rem" }}>Snapshot: {msg.snapshotId}</p>
            <p style={{ fontSize: "0.75rem" }}>{msg.description}</p>
          </div>
        );

      case "action":
        return (
          <div style={{
            maxWidth: "85%", padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: `${theme.surface}cc`, border: `1px solid ${theme.accent}30`,
            color: theme.text, fontSize: "0.82rem",
          }}>
            <p style={{ fontWeight: "500", marginBottom: "0.5rem" }}>Acción: {msg.action}</p>
            <pre style={{
              fontSize: "0.7rem", fontFamily: "'Courier New', monospace",
              margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#a0a0a0",
            }}>
              {JSON.stringify(msg.payload, null, 2)}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Sin sesión ────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: theme.sub, fontFamily: "Georgia, serif",
        flexDirection: "column", gap: "1rem",
      }}>
        <p>No hay sesión activa</p>
        {!isConfigured && (
          <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>
            Configurá las claves API en el menú ⚙️
          </p>
        )}
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Georgia, serif" }}>

      {/* Header */}
      <div style={{
        padding: "0.6rem 0.9rem",
        borderBottom: `1px solid ${theme.accent}20`,
        background: `${theme.bg}cc`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            fontSize: "0.6rem", color: theme.sub,
            fontFamily: "'Courier New', monospace", opacity: 0.6, letterSpacing: "0.06em",
          }}>
            CONVERSACIÓN
          </span>
          {activeResource && (
            <span style={{
              fontSize: "0.58rem", color: theme.accent,
              fontFamily: "'Courier New', monospace",
              background: `${theme.accent}15`, border: `1px solid ${theme.accent}30`,
              borderRadius: "4px", padding: "0.1rem 0.4rem", letterSpacing: "0.04em",
            }}>
              {activeResource.type}
            </span>
          )}
          {/* Indicador de contenido cargado */}
          {fileContent && (
            <span
              title="Contenido del archivo cargado — la IA lo ve"
              style={{
                display: "flex", alignItems: "center", gap: "0.2rem",
                fontSize: "0.56rem", color: "#4ade80",
                fontFamily: "'Courier New', monospace", opacity: 0.85,
              }}
            >
              <FileCode size={9} />
              CTX
            </span>
          )}
          {fileLoading && (
            <span style={{
              fontSize: "0.56rem", color: theme.sub,
              fontFamily: "'Courier New', monospace", opacity: 0.5,
            }}>
              leyendo...
            </span>
          )}
          {memory.hasMemory && (
            <span
              title={`Memoria activa — ${memory.contextMemory ? "contexto persistente" : "working memory"}`}
              style={{
                display: "flex", alignItems: "center", gap: "0.2rem",
                fontSize: "0.56rem", color: "#4ade80",
                fontFamily: "'Courier New', monospace", opacity: 0.8,
              }}
            >
              <Brain size={9} />
              MEM
            </span>
          )}
        </div>
        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", fontWeight: "500", color: theme.text }}>
          {activeResource ? activeResource.name : session.contextPath}
        </p>
        <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.65rem", color: theme.sub, opacity: 0.6 }}>
          {activeResource ? activeResource.path : `contexto: ${session.cognitiveContext.goal}`}
        </p>
      </div>

      {/* Mensajes */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0.8rem",
        display: "flex", flexDirection: "column", gap: "0.7rem",
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: theme.sub, fontSize: "0.82rem",
            flexDirection: "column", gap: "0.5rem", opacity: 0.5,
          }}>
            <p style={{ margin: 0 }}>Iniciá una conversación</p>
            <p style={{ margin: 0, fontSize: "0.7rem" }}>
              {activeResource
                ? `sobre "${activeResource.name}"${fileContent ? " — la IA ya tiene el contenido" : ""}`
                : "sobre cualquier recurso"
              }
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              {msg.role !== "user" && (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: `${theme.accent}22`, border: `1px solid ${theme.accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", marginRight: "0.5rem", marginTop: "2px",
                  color: theme.accent, fontFamily: "'Courier New', monospace",
                }}>
                  AI
                </div>
              )}
              {renderMessage(msg)}
            </div>
          ))
        )}

        {isLoading && (
          <div style={{
            padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: `${theme.surface}cc`, color: theme.sub, fontSize: "0.82rem",
          }}>
            Procesando...
          </div>
        )}

        {error && (
          <div style={{
            padding: "0.6rem 0.8rem", borderRadius: "8px",
            background: "#ff6b6b30", border: "1px solid #ff6b6b44",
            color: "#ff6b6b", fontSize: "0.82rem",
          }}>
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "0.6rem 0.8rem",
        borderTop: `1px solid ${theme.accent}20`,
        display: "flex", gap: "0.5rem", alignItems: "flex-end",
        background: `${theme.bg}cc`, flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            activeResource
              ? fileContent
                ? `Preguntá sobre "${activeResource.name}"...`
                : `Escribí sobre "${activeResource.name}"...`
              : "Seleccioná un recurso o escribí..."
          }
          rows={1}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
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
            width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
            background: input.trim() && !isLoading ? theme.accent : `${theme.accent}30`,
            border: "none",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            color: input.trim() && !isLoading ? theme.bg : theme.sub,
            fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", WebkitTapHighlightColor: "transparent",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
