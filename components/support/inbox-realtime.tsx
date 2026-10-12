'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../lib/supabase/database.types';

export function InboxRealtime({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId?: string;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    let disposed = false;
    const refresh = () => router.refresh();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (disposed) return;
      if (data.session?.access_token)
        supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`inbox:${workspaceId}:${conversationId ?? 'list'}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (event) => {
            const row = event.new as { id?: string; conversation_id?: string };
            if (conversationId && row.conversation_id !== conversationId)
              return;
            if (row.id && seen.current.has(row.id)) return;
            if (row.id) seen.current.add(row.id);
            if (seen.current.size > 300) seen.current.clear();
            refresh();
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (event) => {
            const row = event.new as { id?: string };
            if (!conversationId || row.id === conversationId) refresh();
          },
        )
        .subscribe((status) => {
          setConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') refresh();
        });
    })();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 4000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [workspaceId, conversationId, router]);
  return (
    <p className="inbox-live-status" role="status">
      <span
        className={connected ? 'live-dot' : 'live-dot live-dot-off'}
        aria-hidden="true"
      />
      {connected ? 'Live updates on' : 'Reconnecting · refresh stays available'}
    </p>
  );
}
