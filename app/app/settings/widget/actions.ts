'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { logEvent } from '../../../../lib/observability/log';
import { invalidateCacheSafe } from '../../../../lib/redis/cache';
import type { FormState } from '../../../../lib/action-state';

const origin = z
  .url()
  .max(255)
  .refine((value) => {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && url.hostname === 'localhost'))
    );
  }, 'Use an exact HTTPS origin or localhost for testing.');

export async function saveWidget(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = String(formData.get('origins') ?? '');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = z.array(origin).min(1).max(10).safeParse(lines);
  if (!parsed.success)
    return {
      message: 'Add 1–10 valid website origins, one per line.',
      values: { origins: raw },
    };
  const origins = [
    ...new Set(parsed.data.map((value) => new URL(value).origin)),
  ];
  const { supabase, active } = await getWorkspaceContext();
  if (
    !active ||
    !active.onboardingCompletedAt ||
    !['owner', 'admin'].includes(active.role)
  )
    return {
      message: 'Your role cannot change widget settings.',
      values: { origins: raw },
    };
  const { error } = await supabase.rpc('configure_widget', {
    p_workspace_id: active.id,
    p_origins: origins,
    p_enabled: formData.get('enabled') === 'on',
  });
  if (error) {
    logEvent('widget.configure', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return {
      message: 'Could not save widget settings. Check the origins and retry.',
      values: { origins: raw },
    };
  }
  logEvent('widget.configure', 'succeeded', { workspaceId: active.id });
  await invalidateCacheSafe('widget-config', active.id);
  revalidatePath('/app/settings/widget');
  return { success: 'Widget settings saved.' };
}
