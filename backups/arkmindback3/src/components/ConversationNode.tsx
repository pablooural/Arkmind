import React, { useState } from 'react';

interface Props {
  session: any;
  childrenNodes?: any[];
  onActivate?: (id: string) => void;
}

export default function ConversationNode({ session, childrenNodes = [], onActivate }: Props) {
  const [open, setOpen] = useState(false);
  const handleToggle = () => setOpen((s) => !s);
  const handleDoubleClick = () => onActivate?.(session.id);

  return (
    <li className="mb-1">
      <div
        onClick={handleToggle}
        onDoubleClick={handleDoubleClick}
        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted hover:text-muted-foreground transition-colors cursor-pointer select-none"
        title={session.title || session.id}
      >
        {childrenNodes.length > 0 && (
          <span className={`w-4 inline-block transform transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
            ▶
          </span>
        )}

        <div className="flex-1">
          <div className="font-semibold text-sm leading-tight">{session.title || `Conversation ${session.id.slice(-6)}`}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{getRelativeTime(session.lastActive)}</div>
        </div>
      </div>

      <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-200 origin-top ${open ? 'max-h-60 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'}`}>
        {childrenNodes.length > 0 && (
          <ul className="pl-4 mt-2 space-y-1">
            {childrenNodes.map((c) => (
              <ConversationNode key={c.id} session={c} onActivate={onActivate} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function getRelativeTime(ts?: number) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}
