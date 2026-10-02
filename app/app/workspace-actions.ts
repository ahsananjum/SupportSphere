'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import {
  generalSettingsSchema,
  identitySchema,
  originSchema,
  aiModeSchema,
} from '../../lib/validation/workspace';
import { uuidSchema } from '../../lib/validation/auth';
import { logEvent } from '../../lib/observability/log';
import type { FormState } from '../../lib/action-state';

function fieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}

function dbMessage(message = '') {
  if (message.includes('duplicate key'))
    return 'This workspace URL slug is already in use.';
  if (message.includes('FORBIDDEN'))
    return 'Your role does not allow this change.';
  if (message.includes('STEP_CONFLICT'))
    return 'Setup moved to another step. Refresh and continue from there.';
  if (message.includes('IDENTITY_REQUIRED'))
    return 'Save your support identity before continuing.';
  return 'We could not save this change. Review the details and try again.';
}

export async function saveGeneralSettings(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(
    [
      'name',
      'slug',
      'timezone',
      'companyName',
      'supportName',
      'supportEmail',
      'websiteOrigin',
    ].map((key) => [key, String(formData.get(key) ?? '')]),
  );
  const parsed = generalSettingsSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const { supabase, active } = await getWorkspaceContext();
  if (
    !active ||
    !['owner', 'admin'].includes(active.role) ||
    !active.onboardingCompletedAt
  )
    return { message: 'Your role does not allow this change.', values };
  const { error } = await supabase.rpc('update_workspace_general', {
    p_workspace_id: active.id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_timezone: parsed.data.timezone,
    p_company_name: parsed.data.companyName,
    p_support_name: parsed.data.supportName,
    p_support_email: parsed.data.supportEmail,
    p_website_origin: parsed.data.websiteOrigin,
  });
  if (error) {
    logEvent('workspace.settings', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return { message: dbMessage(error.message), values };
  }
  logEvent('workspace.settings', 'succeeded', { workspaceId: active.id });
  revalidatePath('/app', 'layout');
  return { success: 'Workspace settings saved.' };
}

export async function saveOnboardingIdentity(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(
    ['companyName', 'supportName', 'supportEmail'].map((key) => [
      key,
      String(formData.get(key) ?? ''),
    ]),
  );
  const parsed = identitySchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const { supabase, active } = await getWorkspaceContext();
  if (
    !active ||
    active.role !== 'owner' ||
    active.onboardingStep !== 'identity'
  )
    return {
      message: 'This setup step is unavailable. Refresh to resume.',
      values,
    };
  const { error } = await supabase.rpc('update_workspace_general', {
    p_workspace_id: active.id,
    p_name: active.name,
    p_slug: active.slug,
    p_timezone: active.timezone,
    p_company_name: parsed.data.companyName,
    p_support_name: parsed.data.supportName,
    p_support_email: parsed.data.supportEmail,
    p_website_origin: active.websiteOrigin ?? '',
  });
  if (error) return { message: dbMessage(error.message), values };
  const advanced = await supabase.rpc('advance_onboarding', {
    p_workspace_id: active.id,
    p_expected: 'identity',
    p_next: 'origin',
  });
  if (advanced.error)
    return { message: dbMessage(advanced.error.message), values };
  logEvent('onboarding.identity', 'succeeded', { workspaceId: active.id });
  revalidatePath('/app', 'layout');
  redirect('/app/onboarding');
}

export async function saveOnboardingOrigin(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { websiteOrigin: String(formData.get('websiteOrigin') ?? '') };
  const parsed = originSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || active.role !== 'owner' || active.onboardingStep !== 'origin')
    return {
      message: 'This setup step is unavailable. Refresh to resume.',
      values,
    };
  const { error } = await supabase.rpc('update_workspace_general', {
    p_workspace_id: active.id,
    p_name: active.name,
    p_slug: active.slug,
    p_timezone: active.timezone,
    p_company_name: active.companyName ?? '',
    p_support_name: active.supportName ?? '',
    p_support_email: active.supportEmail ?? '',
    p_website_origin: parsed.data.websiteOrigin,
  });
  if (error) return { message: dbMessage(error.message), values };
  const advanced = await supabase.rpc('advance_onboarding', {
    p_workspace_id: active.id,
    p_expected: 'origin',
    p_next: 'team',
  });
  if (advanced.error)
    return { message: dbMessage(advanced.error.message), values };
  logEvent('onboarding.origin', 'succeeded', { workspaceId: active.id });
  revalidatePath('/app', 'layout');
  redirect('/app/onboarding');
}

export async function continueOnboarding(formData: FormData) {
  const expected = String(formData.get('expected') ?? '');
  const next =
    expected === 'team' ? 'knowledge' : expected === 'knowledge' ? 'ai' : null;
  if (!next) redirect('/app/onboarding?error=step');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || active.role !== 'owner' || active.onboardingStep !== expected)
    redirect('/app/onboarding?error=step');
  const { error } = await supabase.rpc('advance_onboarding', {
    p_workspace_id: active.id,
    p_expected: expected,
    p_next: next,
  });
  if (error) redirect('/app/onboarding?error=save');
  logEvent('onboarding.advance', 'succeeded', { workspaceId: active.id });
  revalidatePath('/app', 'layout');
  redirect('/app/onboarding');
}

export async function finishOnboarding(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const mode = aiModeSchema.safeParse(formData.get('aiMode'));
  if (!mode.success)
    return { fields: { aiMode: 'Choose a setup preference.' } };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || active.role !== 'owner' || active.onboardingStep !== 'ai')
    return { message: 'This setup step is unavailable. Refresh to resume.' };
  const { error } = await supabase.rpc('finish_onboarding', {
    p_workspace_id: active.id,
    p_ai_mode: mode.data,
  });
  if (error) return { message: dbMessage(error.message) };
  logEvent('onboarding.finish', 'succeeded', { workspaceId: active.id });
  revalidatePath('/app', 'layout');
  redirect('/app');
}

export async function markNotificationRead(formData: FormData) {
  const id = uuidSchema.safeParse(formData.get('notificationId'));
  if (!id.success) redirect('/app/notifications?error=invalid');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !active.onboardingCompletedAt) redirect('/app/onboarding');
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', id.data)
    .eq('workspace_id', active.id)
    .maybeSingle();
  if (!data) redirect('/app/notifications?error=unavailable');
  const { error } = await supabase.rpc('mark_notification_read', {
    p_id: id.data,
  });
  if (error) redirect('/app/notifications?error=unavailable');
  revalidatePath('/app/notifications');
  redirect('/app/notifications?notice=read');
}
