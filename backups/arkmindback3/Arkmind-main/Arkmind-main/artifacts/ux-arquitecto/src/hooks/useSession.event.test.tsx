import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSession } from './useSession';
import { sessionManager } from '@/core';

function TestComp() {
  const { session } = useSession(null as any);
  return <div data-testid="session">{session ? session.id : 'none'}</div>;
}

describe('useSession - session:activate event', () => {
  beforeEach(() => {
    // clear any existing sessions and stub persistence to avoid IndexedDB access
    (sessionManager as any).sessions = new Map();
    (sessionManager as any).persist = async () => {};
  });

  it('activates session on event', async () => {
    const sess = sessionManager.createSession('panel_t', '/ctx_t', {
      contextPath: '/ctx_t',
      goal: 'exploration' as any,
      focusSummary: 'f',
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    }, {
      panelId: 'panel_t',
      contextPath: '/ctx_t',
      persistent: { openResources: [], viewMode: 'code' },
      transient: { lastInteraction: Date.now() },
    });

    render(<TestComp />);

    expect(screen.getByTestId('session').textContent).toBe('none');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('session:activate', { detail: { id: sess.id } }));
      // give event loop a tick
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(screen.getByTestId('session').textContent).toBe(sess.id);
  });
});
