/**
 * markdown.tsx — mini renderer casero.
 *
 * T-045: renderizar markdown básico en los mensajes del chat.
 * No usamos librería externa. Soporta:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - `code` → <code>
 * - # headings → <h1..h4>
 * - listas (- item) → <ul><li>
 * - links [text](url) → <a>
 * - párrafos
 *
 * NOTA: regex simple, no es 100% spec-compliant. Pero es seguro para
 * mensajes de chat sin riesgo de XSS (no usamos dangerouslySetInnerHTML,
 * todo se construye con React.createElement o JSX).
 */

import { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  // Procesa inline de izquierda a derecha. Cada match consume su rango exacto.
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Procesamos por orden de aparición, escaneando una vez con regex union.
  // Estrategia simple: regex única que captura los 4 tipos.
  const inlineRe = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = inlineRe.exec(remaining)) !== null) {
    // Texto previo al match
    if (m.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, m.index));
    }

    if (m[1] !== undefined) {
      // **bold**
      parts.push(<strong key={key++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      // *italic*
      parts.push(<em key={key++}>{m[2]}</em>);
    } else if (m[3] !== undefined) {
      // `code`
      parts.push(<code key={key++} style={{
        background:  "rgba(255,255,255,0.1)",
        padding:     "1px 5px",
        borderRadius: "3px",
        fontFamily:  "'Courier New', monospace",
        fontSize:    "0.9em",
      }}>{m[3]}</code>);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      // [text](url)
      parts.push(<a key={key++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "underline" }}>{m[4]}</a>);
    }

    lastIndex = m.index + m[0].length;
  }

  // Resto del texto
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts;
}

/**
 * Renderiza un texto markdown básico. Retorna JSX.
 */
export function renderMarkdown(text: string): ReactNode {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const h4 = line.match(/^####\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);

    if (h4) { blocks.push(<h4 key={key++}>{renderInline(h4[1])}</h4>); i++; continue; }
    if (h3) { blocks.push(<h3 key={key++}>{renderInline(h3[1])}</h3>); i++; continue; }
    if (h2) { blocks.push(<h2 key={key++}>{renderInline(h2[1])}</h2>); i++; continue; }
    if (h1) { blocks.push(<h1 key={key++}>{renderInline(h1[1])}</h1>); i++; continue; }

    // Lista
    if (/^\s*-\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(<li key={key++}>{renderInline(lines[i].replace(/^\s*-\s+/, ""))}</li>);
        i++;
      }
      blocks.push(<ul key={key++} style={{ margin: "0.3rem 0", paddingLeft: "1.4rem" }}>{items}</ul>);
      continue;
    }

    // Línea vacía → separador
    if (line.trim() === "") {
      blocks.push(<div key={key++} style={{ height: "0.4rem" }} />);
      i++;
      continue;
    }

    // Párrafo
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^#+\s+/.test(lines[i]) && !/^\s*-\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(<p key={key++} style={{ margin: "0.3rem 0" }}>{renderInline(paraLines.join(" "))}</p>);
    }
  }

  return <div className="arkmind-markdown">{blocks}</div>;
}