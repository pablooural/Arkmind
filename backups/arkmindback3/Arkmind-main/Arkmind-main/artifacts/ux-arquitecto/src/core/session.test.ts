import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session';
import type { StructuredMessage } from './types';

describe('SessionManager.forkSession', () => {
  let mgr: SessionManager;

  beforeEach(() => {
    mgr = new SessionManager();
    // avoid touching IndexedDB during tests
    (mgr as any).persist = async () => {};
  });

  it('Fork sin opciones → copia todo el historial', () => {
    const sess = mgr.createSession('panelA', '/ctx', {
      contextPath: '/ctx',
      goal: 'exploration' as any,
      focusSummary: 'focus',
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    }, {
      panelId: 'panelA',
      contextPath: '/ctx',
      persistent: { openResources: [], viewMode: 'code' },
      transient: { lastInteraction: Date.now() },
    });

    const msgs: StructuredMessage[] = [];
    for (let i = 0; i < 5; i++) {
      const m: StructuredMessage = {
        id: `m${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        type: 'text',
        content: `msg ${i}`,
        timestamp: Date.now() + i,
      } as any;
      mgr.addMessage(sess.id, m);
      msgs.push(m);
    }

    const forked = mgr.forkSession(sess.id);
    expect(forked).not.toBeNull();
    expect(forked!.messages.length).toBe(5);
    expect(forked!.messages.map((m) => (m as any).content)).toEqual(
      msgs.map((m) => (m as any).content)
    );
  });

  it('Fork con fromMessageIndex → corta correctamente', () => {
    const sess = mgr.createSession('panelB', '/ctxB', {
      contextPath: '/ctxB',
      goal: 'exploration' as any,
      focusSummary: 'focusB',
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    }, {
      panelId: 'panelB',
      contextPath: '/ctxB',
      persistent: { openResources: [], viewMode: 'code' },
      transient: { lastInteraction: Date.now() },
    });

    for (let i = 0; i < 6; i++) {
      mgr.addMessage(sess.id, {
        id: `mb${i}`,
        role: 'user',
        type: 'text',
        content: `msgb ${i}`,
        timestamp: Date.now() + i,
      } as any);
    }

    const forked = mgr.forkSession(sess.id, { fromMessageIndex: 2 });
    expect(forked).not.toBeNull();
    expect(forked!.messages.length).toBe(3);
    expect((forked!.messages[0] as any).id).toBe('mb0');
    expect((forked!.messages[2] as any).id).toBe('mb2');
  });

  it('Verificar que messages del fork y del original no comparten referencias', () => {
    const sess = mgr.createSession('panelC', '/ctxC', {
      contextPath: '/ctxC',
      goal: 'exploration' as any,
      focusSummary: 'focusC',
      insights: [],
      openQuestions: [],
      constraints: [],
      lastUpdated: Date.now(),
    }, {
      panelId: 'panelC',
      contextPath: '/ctxC',
      persistent: { openResources: [], viewMode: 'code' },
      transient: { lastInteraction: Date.now() },
    });

    const originalMsg = {
      id: 'orig1',
      role: 'user',
      type: 'text',
      content: { text: 'hello' },
      timestamp: Date.now(),
    } as any;

    mgr.addMessage(sess.id, originalMsg);

    const forked = mgr.forkSession(sess.id);
    expect(forked).not.toBeNull();

    // mutate forked message
    (forked!.messages[0] as any).content.text = 'changed';

    // original should remain unchanged
    const orig = mgr.getMessages(sess.id)[0] as any;
    expect(orig.content.text).toBe('hello');
  });
});
