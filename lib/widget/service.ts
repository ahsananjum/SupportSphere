import 'server-only';
import { createAdminClient } from '../supabase/admin';
import { hashToken } from './security';

export async function getWidgetConfig(key: string, origin: string) {
  if (!/^wgt_[a-f0-9]{32}$/.test(key)) return null;
  const admin = createAdminClient();
  const { data: config, error } = await admin
    .from('widget_configs')
    .select('widget_key,workspace_id,allowed_origins,enabled')
    .eq('widget_key', key)
    .eq('enabled', true)
    .maybeSingle();
  if (error || !config || !config.allowed_origins.includes(origin)) return null;
  const { data: workspace } = await admin
    .from('workspaces')
    .select('support_name,company_name,onboarding_completed_at')
    .eq('id', config.workspace_id)
    .maybeSingle();
  if (!workspace?.onboarding_completed_at) return null;
  return {
    key: config.widget_key,
    name: workspace.support_name || workspace.company_name || 'Support',
    origin,
  };
}

export async function reserveRate(
  key: string,
  signal: string,
  kind: 'open' | 'send',
) {
  const admin = createAdminClient();
  const bucket = hashToken(`${kind}:${key}:${signal}`);
  const { data, error } = await admin.rpc('reserve_widget_rate', {
    p_bucket_key: bucket,
    p_limit: kind === 'send' ? 12 : 20,
    p_window_seconds: 60,
  });
  if (error) throw new Error('RATE_UNAVAILABLE');
  return data === true;
}

export async function getSession(key: string, token: string) {
  if (!/^wgt_[a-f0-9]{32}$/.test(key) || !/^[A-Za-z0-9_-]{40,100}$/.test(token))
    return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('widget_sessions')
    .select('workspace_id,conversation_id,origin,expires_at')
    .eq('widget_key', key)
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (error || !data || new Date(data.expires_at).getTime() <= Date.now())
    return null;
  const config = await getWidgetConfig(key, data.origin);
  return config ? { ...data, config } : null;
}

export async function getTranscript(
  workspaceId: string,
  conversationId: string,
  before?: { createdAt: string; id: string },
) {
  const admin = createAdminClient();
  let query = admin
    .from('messages')
    .select('id,body,sender_type,created_at,client_id')
    .eq('workspace_id', workspaceId)
    .eq('conversation_id', conversationId)
    .in('sender_type', ['customer', 'agent'])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(101);
  if (before)
    query = query.or(
      `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
    );
  const { data, error } = await query;
  if (error) throw new Error('TRANSCRIPT_UNAVAILABLE');
  const rows = data ?? [];
  return { messages: rows.slice(0, 100).reverse(), hasMore: rows.length > 100 };
}
