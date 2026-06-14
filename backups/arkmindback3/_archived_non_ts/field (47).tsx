/**
 * EditorPanel Component
 *
 * Muestra el contenido de un archivo seleccionado desde el ResourceExplorer.
 * Permite editar y guardar con transacción automática.
 *
 * Comportamiento:
 * - Sin archivo seleccionado → pantalla de bienvenida
 * - Archivo de texto/código → editor con textarea
 * - Carpeta → no abre nada (solo el explorador navega)
 * - Archivo binario → aviso amigable
 *
 * Integración:
 * - Lee con filesystemManager.readFile()
 * - Guarda con filesystemManager.writeFile() (incluye transacción + snapshot)
 * - Muestra estado: loading / error / dirty (cambios sin guardar)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ResourceNode } from "@/core/types";
import { filesystemManager } from "@/core/filesystem";
import { Theme } from "@/types/theme";
import { File, Save, RotateCcw, AlertTriangle, FileCode } from "lucide-react";

// ─── Extensiones editables ────────────────────────────────────────────────────

const EDITABLE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "json", "css", "html", "htm",
  "md", "txt", "yaml", "yml", "sh", "env", "toml", "xml",
  "py", "rs", "go", "java", "c", "cpp", "h", "cs", "rb",
  "gitignore", "prettierrc", "eslintrc", "babelrc",
]);

const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "pdf", "zip", "tar", "gz", "woff", "woff2", "ttf", "eot",
  "mp3", "mp4", "mov", "avi", "webm", "wasm",
]);

function getExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isEditable(name: string): boolean {
  const ext = getExt(name);
  if (!ext) return true; // archivos sin extensión probablemente son texto
  return EDITABLE_EXTS.has(ext);
}

function isBinary(name: string): boolean {
  return BINARY_EXTS.has(getExt(name));
}

function getLanguage(name: string): string {
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", css: "css", html: "html", htm: "html",
    md: "markdown", yaml: "yaml", yml: "yaml", sh: "bash",
    py: "python", rs: "rust", go: "go",
  };
  return map[getExt(name)] ?? "text";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorPanelProps {
  theme: Theme;
  resource: ResourceNode | null;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EditorPanel({ theme, resource }: EditorPanelProps) {
  const [content, setContent]     = useState<string>("");
  const [original, setOriginal]   = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saveOk, setSaveOk]       = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = content !== original;
  const isFolder = resource?.type === "folder";
  const canEdit = resource && !isFolder && isEditable(resource.name);
  const isBin = resource && isBinary(resource.name);

  // ── Carga del archivo ───────────────────────────────────────────────────

  useEffect(() => {
    if (!resource || isFolder || isBin) {
      setContent("");
      setOriginal("");
      setError(null);
      return;
    }

    if (!canEdit) {
      setContent("");
      setOriginal("");
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSaveOk(false);

    filesystemManager.readFile(resource.path).then((result) => {
      if (cancelled) return;
      if (result.success && result.content !== undefined) {
        setContent(result.content);
        setOriginal(result.content);
      } else {
        setError(result.error ?? "No se pudo leer el archivo");
      }
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [resource?.path]);

  // ── Guardar ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!resource || !isDirty || isSaving) return;
    setIsSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const result = await filesystemManager.writeFile(resource.path, content);
      if (result.success) {
        setOriginal(content);
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 2000);
      } else {
        setError(result.error ?? "Error al guardar");
      }
    } finally {
      setIsSaving(false);
    }
  }, [resource, content, isDirty, isSaving]);

  // ── Descartar cambios ───────────────────────────────────────────────────

  const handleDiscard = useCallback(() => {
    setContent(original);
    setError(null);
  }, [original]);

  // ── Ctrl+S / Cmd+S ──────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  // ── Renders de estado ───────────────────────────────────────────────────

  // Sin archivo
  if (!resource) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: "0.75rem",
        color: theme.sub, fontFamily: "'Courier New', monospace",
      }}>
        <FileCode size={28} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: "0.72rem", opacity: 0.45 }}>
          seleccioná un archivo para editar
        </span>
      </div>
    );
  }

  // Carpeta
  if (isFolder) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: "0.5rem",
        color: theme.sub, fontFamily: "'Courier New', monospace",
      }}>
        <span style={{ fontSize: "0.72rem", opacity: 0.4 }}>
          📁 carpeta — navegá desde el explorador
        </span>
      </div>
    );
  }

  // Binario
  if (isBin) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: "0.75rem",
        color: theme.sub, fontFamily: "'Courier New', monospace",
      }}>
        <AlertTriangle size={24} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: "0.72rem", opacity: 0.5 }}>
          archivo binario — no editable
        </span>
        <span style={{ fontSize: "0.65rem", opacity: 0.3 }}>
          {resource.name}
        </span>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", fontFamily: "'Courier New', monospace",
      background: theme.bg,
    }}>

      {/* Header */}
      <div style={{
        padding: "0.5rem 0.9rem",
        borderBottom: `1px solid ${theme.accent}18`,
        background: `${theme.surface}cc`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <File size={13} style={{ color: theme.accent, opacity: 0.7, flexShrink: 0 }} />

        <span style={{
          flex: 1, fontSize: "0.75rem", color: theme.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {resource.name}
          {isDirty && (
            <span style={{ color: theme.accent, marginLeft: "0.4rem", fontSize: "0.65rem" }}>
              ●
            </span>
          )}
        </span>

        <span style={{ fontSize: "0.6rem", color: theme.sub, opacity: 0.45, flexShrink: 0 }}>
          {getLanguage(resource.name)}
        </span>

        {/* Botones */}
        {isDirty && (
          <button
            onClick={handleDiscard}
            title="Descartar cambios"
            style={{
              background: "transparent",
              border: `1px solid ${theme.sub}44`,
              borderRadius: "5px",
              color: theme.sub,
              cursor: "pointer",
              padding: "0.2rem 0.4rem",
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.65rem",
              flexShrink: 0,
            }}
          >
            <RotateCcw size={11} />
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          title="Guardar (Ctrl+S)"
          style={{
            background: isDirty ? theme.accent : "transparent",
            border: `1px solid ${isDirty ? theme.accent : theme.sub + "33"}`,
            borderRadius: "5px",
            color: isDirty ? theme.bg : theme.sub,
            cursor: isDirty ? "pointer" : "default",
            padding: "0.2rem 0.55rem",
            display: "flex", alignItems: "center", gap: "0.3rem",
            fontSize: "0.65rem",
            fontFamily: "'Courier New', monospace",
            fontWeight: isDirty ? 600 : 400,
            opacity: isSaving ? 0.6 : 1,
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          <Save size={11} />
          {isSaving ? "guardando..." : saveOk ? "guardado ✓" : "guardar"}
        </button>
      </div>

      {/* Path */}
      <div style={{
        padding: "0.3rem 0.9rem",
        borderBottom: `1px solid ${theme.accent}10`,
        fontSize: "0.6rem",
        color: theme.sub,
        opacity: 0.45,
        flexShrink: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {resource.path}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "0.5rem 0.9rem",
          background: "#ff6b6b18",
          borderBottom: `1px solid #ff6b6b33`,
          color: "#ff6b6b",
          fontSize: "0.7rem",
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Editor */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: theme.sub, fontSize: "0.75rem", opacity: 0.4,
          }}>
            cargando...
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              padding: "0.9rem",
              background: "transparent",
              color: theme.text,
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "0.78rem",
              lineHeight: 1.65,
              boxSizing: "border-box",
              caretColor: theme.accent,
              tabSize: 2,
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{
        padding: "0.25rem 0.9rem",
        borderTop: `1px solid ${theme.accent}10`,
        fontSize: "0.58rem",
        color: theme.sub,
        opacity: 0.4,
        flexShrink: 0,
        display: "flex",
        gap: "1rem",
      }}>
        <span>{content.split("\n").length} líneas</span>
        <span>{content.length} caracteres</span>
        {resource.size !== undefined && (
          <span>{(resource.size / 1024).toFixed(1)} kb en disco</span>
        )}
        {isDirty && <span style={{ color: theme.accent, opacity: 0.8 }}>modificado</span>}
      </div>
    </div>
  );
}
