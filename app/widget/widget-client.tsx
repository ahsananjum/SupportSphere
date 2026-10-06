'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  body: string;
  sender_type: string;
  created_at: string;
  client_id: string | null;
};
type Props = {
  bootstrap: string;
  widgetKey: string;
  hostOrigin: string;
  name: string;
};

function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

export function WidgetClient({
  bootstrap,
  widgetKey,
  hostOrigin,
  name,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'offline' | 'error'
  >('loading');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [token, setToken] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const retryId = useRef<string | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const skipScroll = useRef(false);
  const loadedOlder = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const storageKey = `supportsphere:${widgetKey}:${hostOrigin}`;
  const loadSession = useCallback(async () => {
    setStatus(navigator.onLine ? 'loading' : 'offline');
    if (!navigator.onLine) return;
    let existingToken = '';
    try {
      existingToken = localStorage.getItem(storageKey) ?? '';
    } catch {
      /* partitioned storage may be unavailable */
    }
    try {
      const response = await fetch('/api/widget/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrap, existingToken }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not open support.');
      setToken(result.token);
      setMessages(result.messages);
      setHasMore(result.hasMore === true);
      loadedOlder.current = false;
      try {
        localStorage.setItem(storageKey, result.token);
      } catch {
        /* current session remains usable */
      }
      setError('');
      setStatus('ready');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not open support.',
      );
      setStatus('error');
    }
  }, [bootstrap, storageKey]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSession]);
  useEffect(() => {
    window.parent.postMessage(
      { type: 'supportsphere:resize', open },
      hostOrigin,
    );
    if (open) {
      wasOpen.current = true;
      composer.current?.focus();
    } else if (wasOpen.current) launcher.current?.focus();
  }, [open, hostOrigin]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const refresh = useCallback(async () => {
    if (!token || !navigator.onLine) {
      if (!navigator.onLine) setStatus('offline');
      return;
    }
    try {
      const response = await fetch('/api/widget/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-widget-key': widgetKey,
        },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Messages unavailable.');
      setMessages((current) => mergeMessages(current, result.messages));
      if (!loadedOlder.current) setHasMore(result.hasMore === true);
      setStatus('ready');
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Messages unavailable.',
      );
      setStatus('error');
    }
  }, [token, widgetKey]);
  useEffect(() => {
    if (!open || !token) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 2500);
    const reconcile = () => void refresh();
    window.addEventListener('online', reconcile);
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', reconcile);
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, [open, token, refresh]);
  useEffect(() => {
    if (open && !skipScroll.current)
      transcriptEnd.current?.scrollIntoView({ behavior: 'instant' });
    skipScroll.current = false;
  }, [messages, open]);
  async function loadOlder() {
    if (!token || !messages.length || historyLoading) return;
    setHistoryLoading(true);
    try {
      const before = encodeURIComponent(
        `${messages[0].created_at}|${messages[0].id}`,
      );
      const response = await fetch(`/api/widget/messages?before=${before}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-widget-key': widgetKey,
        },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Could not load older messages.');
      skipScroll.current = true;
      loadedOlder.current = true;
      setMessages((current) => mergeMessages(current, result.messages));
      setHasMore(result.hasMore === true);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load older messages.',
      );
    } finally {
      setHistoryLoading(false);
    }
  }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !token || sending) return;
    setSending(true);
    setError('');
    const clientId = retryId.current ?? crypto.randomUUID();
    retryId.current = clientId;
    try {
      const response = await fetch('/api/widget/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-widget-key': widgetKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: draft, clientId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Message not sent. Retry.');
      setMessages((current) => mergeMessages(current, result.messages));
      setDraft('');
      retryId.current = null;
      setStatus('ready');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Message not sent. Retry.',
      );
      if (!navigator.onLine) setStatus('offline');
    } finally {
      setSending(false);
    }
  }
  if (!open)
    return (
      <button
        ref={launcher}
        type="button"
        className="widget-launcher"
        aria-label={`Open ${name} support`}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">✳</span>
        <span className="sr-only">Open support</span>
      </button>
    );
  return (
    <section
      className="widget-panel"
      aria-label={`${name} support conversation`}
    >
      <header className="widget-header">
        <div>
          <span className="widget-overline">SUPPORT / LIVE</span>
          <h1>{name}</h1>
          <p>Send a message. We’ll reply here.</p>
        </div>
        <button
          type="button"
          className="widget-close"
          aria-label="Close support"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </header>
      <div
        className="widget-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {hasMore && (
          <button
            type="button"
            className="widget-older"
            onClick={() => void loadOlder()}
            disabled={historyLoading}
          >
            {historyLoading ? 'Loading history…' : 'Load older messages'}
          </button>
        )}
        {status === 'loading' && (
          <div className="widget-loading" role="status">
            <span></span>
            <span></span>
            <p>Opening your conversation…</p>
          </div>
        )}
        {status !== 'loading' && messages.length === 0 && (
          <div className="widget-empty">
            <span aria-hidden="true">↗</span>
            <h2>How can we help?</h2>
            <p>Tell us what happened and we’ll take it from there.</p>
          </div>
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`widget-message ${message.sender_type === 'customer' ? 'widget-message-own' : ''}`}
          >
            <span>{message.sender_type === 'customer' ? 'You' : name}</span>
            <p>{message.body}</p>
            <time dateTime={message.created_at}>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </article>
        ))}
        <div ref={transcriptEnd} />
      </div>
      {(status === 'offline' || status === 'error' || error) && (
        <div className="widget-alert" role="alert">
          <span>
            {status === 'offline'
              ? 'You are offline. Your message is still here.'
              : error || 'Connection interrupted.'}
          </span>
          <button
            type="button"
            onClick={() => (token ? void refresh() : void loadSession())}
          >
            Retry
          </button>
        </div>
      )}
      <form className="widget-composer" onSubmit={send}>
        <label htmlFor="widget-message">Your message</label>
        <textarea
          ref={composer}
          id="widget-message"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (retryId.current) retryId.current = null;
          }}
          rows={2}
          maxLength={4000}
          placeholder="Write your message…"
          disabled={!token || status === 'offline'}
          required
        />
        <div className="widget-compose-bottom">
          <small>{draft.length} / 4000</small>
          <button
            type="submit"
            disabled={
              !token || !draft.trim() || sending || status === 'offline'
            }
          >
            {sending ? 'Sending…' : 'Send'} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
      <footer className="widget-footer">Powered by SupportSphere</footer>
    </section>
  );
}
