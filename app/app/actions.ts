'use server';

import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getWorkspaceContext,
  activeWorkspaceCookie,
} from '../../lib/workspaces/context';
import {
  workspaceSchema,
  inviteSchema,
  uuidSchema,
} from '../../lib/validation/auth';
import { sendInvitationEmail } from '../../lib/email/brevo';
import { recordInvitationDelivery } from '../../lib/workspaces/invitations';
import { logEvent } from '../../lib/observability/log';
import type { FormState } from '../../lib/action-state';

function tokenPair() {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function safeDbMessage(message: string) {
  if (message.includes('ALREADY_MEMBER'))
    return 'This person is already a workspace member.';
  if (message.includes('RATE_LIMITED'))
    return 'Too many invitations. Try again later.';
  if (message.includes('LAST_OWNER'))
    return 'Assign another owner before removing the last owner.';
  if (message.includes('FORBIDDEN'))
    return 'You do not have permission to make this change.';
  if (message.includes('INVITATION_CLOSED'))
    return 'This invitation is no longer active.';
  if (message.includes('duplicate key'))
    return 'This slug or invitation is already in use.';
  return 'We could not save this change. Please try again.';
}

export async function createWorkspace(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = workspaceSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    timezone: formData.get('timezone'),
  });
  if (!parsed.success) {
    return {
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
      values: {
        name: String(formData.get('name') ?? ''),
        slug: String(formData.get('slug') ?? ''),
        timezone: String(formData.get('timezone') ?? ''),
      },
    };
  }
  const { supabase } = await getWorkspaceContext();
  const { data, error } = await supabase.rpc('create_workspace', {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_timezone: parsed.data.timezone,
  });
  if (error || !data) {
    logEvent('workspace.create', 'failed', {
      errorClass: error?.code ?? 'NoId',
    });
    return {
      message: safeDbMessage(error?.message ?? ''),
      values: parsed.data,
    };
  }
  (await cookies()).set(activeWorkspaceCookie, String(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/app',
    maxAge: 60 * 60 * 24 * 365,
  });
  logEvent('workspace.create', 'succeeded', { workspaceId: String(data) });
  redirect('/app');
}

export async function switchWorkspace(formData: FormData) {
  const parsed = uuidSchema.safeParse(formData.get('workspaceId'));
  if (!parsed.success) redirect('/app?error=workspace');
  const { memberships } = await getWorkspaceContext();
  if (!memberships.some((member) => member.id === parsed.data))
    redirect('/app?error=workspace');
  (await cookies()).set(activeWorkspaceCookie, parsed.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/app',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/app');
}

export async function createInvitation(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return {
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
      email: String(formData.get('email') ?? ''),
      values: { role: String(formData.get('role') ?? 'agent') },
    };
  }
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    return {
      message: 'You do not have permission to invite members.',
      email: parsed.data.email,
      values: { role: parsed.data.role },
    };
  const { token, hash } = tokenPair();
  const { data: invitationId, error } = await supabase.rpc(
    'create_invitation',
    {
      p_workspace_id: active.id,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
      p_token_hash: hash,
    },
  );
  if (error || !invitationId) {
    logEvent('invitation.create', 'failed', {
      workspaceId: active.id,
      errorClass: error?.code ?? 'NoId',
    });
    return {
      message: safeDbMessage(error?.message ?? ''),
      email: parsed.data.email,
      values: { role: parsed.data.role },
    };
  }
  const result = await sendInvitationEmail({
    to: parsed.data.email,
    workspaceName: active.name,
    role: parsed.data.role,
    token,
    invitationId: String(invitationId),
  });
  try {
    await recordInvitationDelivery(String(invitationId), active.id, result);
  } catch {
    logEvent('invitation.delivery_record', 'failed', {
      workspaceId: active.id,
      invitationId: String(invitationId),
    });
    return {
      message:
        'The email may have been sent, but its status could not be saved. Check the inbox before retrying.',
      email: parsed.data.email,
      values: { role: parsed.data.role },
    };
  }
  if (!result.ok)
    return {
      message:
        'Invitation saved, but the email was not delivered. Use Resend after checking email settings.',
      email: parsed.data.email,
      values: { role: parsed.data.role },
    };
  return { success: 'Invitation sent to ' + parsed.data.email + '.' };
}

export async function resendInvitation(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get('invitationId'));
  if (!id.success) redirect('/app/team?error=invalid');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    redirect('/app/team?error=forbidden');
  const { data: existing } = await supabase
    .from('workspace_invitations')
    .select('workspace_id')
    .eq('id', id.data)
    .eq('workspace_id', active.id)
    .maybeSingle();
  if (!existing) redirect('/app/team?error=invite');
  const { token, hash } = tokenPair();
  const { data, error } = await supabase.rpc('resend_invitation', {
    p_id: id.data,
    p_token_hash: hash,
  });
  const invitation = data?.[0];
  if (error || !invitation || invitation.workspace_id !== active.id)
    redirect('/app/team?error=invite');
  const result = await sendInvitationEmail({
    to: invitation.email_normalized,
    workspaceName: active.name,
    role: invitation.role,
    token,
    invitationId: id.data,
  });
  try {
    await recordInvitationDelivery(id.data, active.id, result);
  } catch {
    logEvent('invitation.delivery_record', 'failed', {
      workspaceId: active.id,
      invitationId: id.data,
    });
    redirect('/app/team?error=delivery-status');
  }
  redirect(result.ok ? '/app/team?notice=resent' : '/app/team?error=email');
}

export async function revokeInvitation(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get('invitationId'));
  if (!id.success || formData.get('confirm') !== 'on')
    redirect('/app/team?error=invalid');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    redirect('/app/team?error=forbidden');
  const { data: invitation } = await supabase
    .from('workspace_invitations')
    .select('workspace_id')
    .eq('id', id.data)
    .single();
  if (!invitation || invitation.workspace_id !== active.id)
    redirect('/app/team?error=invite');
  const { error } = await supabase.rpc('revoke_invitation', { p_id: id.data });
  if (error) redirect('/app/team?error=invite');
  redirect('/app/team?notice=revoked');
}

export async function changeMemberRole(formData: FormData) {
  const userId = uuidSchema.safeParse(formData.get('userId'));
  const role = inviteSchema.shape.role.safeParse(formData.get('role'));
  if (!userId.success || !role.success) redirect('/app/team?error=invalid');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    redirect('/app/team?error=forbidden');
  const { error } = await supabase.rpc('change_member_role', {
    p_workspace_id: active.id,
    p_user_id: userId.data,
    p_role: role.data,
  });
  if (error) redirect('/app/team?error=role');
  redirect('/app/team?notice=role');
}

export async function removeMember(formData: FormData) {
  const userId = uuidSchema.safeParse(formData.get('userId'));
  if (!userId.success || formData.get('confirm') !== 'on')
    redirect('/app/team?error=invalid');
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app/team?error=forbidden');
  const { error } = await supabase.rpc('remove_member', {
    p_workspace_id: active.id,
    p_user_id: userId.data,
  });
  if (error)
    redirect(
      '/app/team?error=' +
        (error.message.includes('LAST_OWNER') ? 'last-owner' : 'member'),
    );
  redirect('/app/team?notice=removed');
}
