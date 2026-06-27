/**
 * useSessionSummary — React hook para resúmenes manuales de sesión
 *
 * Expone:
 *   - summary: texto actual (o "" si no hay)
 *   - isEditing: true cuando el input está abierto
 *   - draft: texto en el input mientras se edita
 *   - wordCount, maxWords, overLimit: helpers para el contador visual
 *   - startEdit, save, cancelEdit, onKeyDown: handlers para el input
 *
 * Flujo:
 *   1. Al montar o cambiar sessionId → leer del store y setear summary
 *   2. Click en el pill → startEdit() → isEditing=true, draft=summary actual
 *   3. Usuario escribe → setDraft(), wordCount recalculado
 *   4. Enter → save() → set/delete en store, isEditing=false
 *   5. Esc → cancelEdit() → descarta draft, isEditing=false
 */

import { useState, useCallback, useEffect } from "react";
import { sessionSummaryStore } from "@/core/sessionSummary";

export function useSessionSummary(sessionId: string | null) {
  const [summary, setSummary] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  // Cargar el summary cuando cambia sessionId
  useEffect(() => {
    if (!sessionId) {
      setSummary("");
      return;
    }
    const stored = sessionSummaryStore.get(sessionId);
    setSummary(stored ?? "");
    setIsEditing(false);
    setDraft("");
  }, [sessionId]);

  const wordCount = sessionSummaryStore.countWords(draft);
  const maxWords = sessionSummaryStore.maxWords;
  const overLimit = wordCount > maxWords;

  const startEdit = useCallback(() => {
    setDraft(summary);
    setIsEditing(true);
  }, [summary]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft("");
  }, []);

  const save = useCallback(async () => {
    if (!sessionId || overLimit) return;
    const trimmed = draft.trim();
    if (trimmed === "") {
      await sessionSummaryStore.delete(sessionId);
      setSummary("");
    } else {
      await sessionSummaryStore.set(sessionId, trimmed);
      setSummary(trimmed);
    }
    setIsEditing(false);
    setDraft("");
  }, [sessionId, draft, overLimit]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [save, cancelEdit]
  );

  return {
    summary,
    isEditing,
    draft,
    setDraft,
    wordCount,
    maxWords,
    overLimit,
    startEdit,
    save,
    cancelEdit,
    onKeyDown,
  };
}