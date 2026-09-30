import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '../supabase/admin';

export async function inspectInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token))
    return { status: 'invalid' as const };
  const hash = createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workspace_invitations')
    .select(
      'id,workspace_id,email_normalized,role,expires_at,accepted_at,revoked_at,workspaces(name)',
    )
    .eq('token_hash', hash)
    .maybeSingle();
  if (error || !data) return { status: 'invalid' as const };
  if (data.revoked_at) return { status: 'revoked' as const };
  if (data.accepted_at) return { status: 'used' as const };
  if (new Date(data.expires_at).getTime() <= Date.now())
    return { status: 'expired' as const };
  const workspace = Array.isArray(data.workspaces)
    ? data.workspaces[0]
    : data.workspaces;
  return {
    status: 'active' as const,
    email: data.email_normalized as string,
    role: data.role as string,
    workspaceName: workspace?.name as string,
  };
}
export async function recordInvitationDelivery(
  invitationId: string,
  workspaceId: string,
  result: { ok: boolean; code?: string },
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('workspace_invitations')
    .update({
      delivery_status: result.ok ? 'sent' : 'failed',
      last_sent_at: new Date().toISOString(),
      last_error_code: result.ok
        ? null
        : (result.code ?? 'SEND_FAILED').slice(0, 50),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId);
  if (error) throw new Error('Unable to record invitation delivery');
}
