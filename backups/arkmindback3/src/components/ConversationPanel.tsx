import * as React from "react";
import ConversationsDropdown from "@/components/ConversationsDropdown";
import { sessionManager } from "@/core";

export function ConversationPanel() {
  const [open, setOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<any[]>(() => sessionManager.getAllSessions?.() ?? []);

  const refresh = () => setSessions(sessionManager.getAllSessions?.() ?? []);

  const handleActivate = (id: string) => {
    const s = sessionManager.getSession?.(id);
    if (s) {
      window.dispatchEvent(new CustomEvent('session:activate', { detail: { id } }));
      refresh();
      setOpen(false);
    }
  };

  const handleNew = () => {
    const cognitiveContext = {
      contextPath: '',
      goal: 'exploration',
      focusSummary: 'New conversation',
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    };
    const visualContext = {
      panelId: 'panel_conversation',
      contextPath: '',
      persistent: { openResources: [], viewMode: 'code' },
      transient: { lastInteraction: Date.now() },
    };

    const ns = sessionManager.createSession?.('panel_conversation', '', cognitiveContext as any, visualContext as any);
    if (ns) {
      (ns as any).title = 'Nueva conversación';
      refresh();
      handleActivate(ns.id);
    }
  };

  const handleFork = () => {
    const all = sessionManager.getAllSessions?.() ?? [];
    if (all.length === 0) return;
    const active = all.sort((a: any, b: any) => (b.lastActive || 0) - (a.lastActive || 0))[0];
    const fromIndex = (active.messages || []).length - 1;
    const forked = sessionManager.forkSession?.(active.id, { fromMessageIndex: fromIndex });
    refresh();
    if (forked) handleActivate(forked.id);
  };

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground transition-colors"
          aria-haspopup="true"
        >
          <span className="text-lg">💬</span>
          <span>Conversaciones ▾</span>
        </button>

        <button
          onClick={handleFork}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground transition-colors"
        >
          <span className="text-lg">⑂</span>
          <span>Bifurcar</span>
        </button>

        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground transition-colors"
        >
          <span className="text-lg">+</span>
          <span>Nueva</span>
        </button>
      </div>

      <ConversationsDropdown sessions={sessions} open={open} onClose={() => setOpen(false)} onActivate={handleActivate} />

    </div>
  );
}

export default ConversationPanel;
