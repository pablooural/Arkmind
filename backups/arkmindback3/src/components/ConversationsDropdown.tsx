import React, { useEffect, useRef } from 'react';
import ConversationNode from './ConversationNode';

interface Props {
  sessions: any[];
  onActivate?: (id: string) => void;
  open: boolean;
  onClose?: () => void;
}

export default function ConversationsDropdown({ sessions = [], onActivate, open, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose?.();
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  // Build tree: roots are sessions without metadata.forkOf
  const roots = sessions.filter((s) => !s.metadata?.forkOf);
  const childrenMap = new Map<string, any[]>();
  sessions.forEach((s) => {
    const parent = s.metadata?.forkOf;
    if (parent) {
      const arr = childrenMap.get(parent) || [];
      arr.push(s);
      childrenMap.set(parent, arr);
    }
  });

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-2 left-2 w-80 bg-background border border-border rounded-lg shadow-lg p-3 transition-all duration-150"
      style={{ minWidth: 280 }}
    >
      <ul className="list-none m-0 p-0">
        {roots.map((r) => (
          <ConversationNode key={r.id} session={r} childrenNodes={childrenMap.get(r.id) || []} onActivate={onActivate} />
        ))}
      </ul>
    </div>
  );
}
