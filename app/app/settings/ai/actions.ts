'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { logEvent } from '../../../../lib/observability/log';
import { invalidateCacheSafe } from '../../../../lib/redis/cache';
import type { FormState } from '../../../../lib/action-state';

const schema = z.object({
  mode: z.enum(['off', 'draft_only', 'assisted']),
  tone: z.string().trim().min(3).max(120),
  confidence: z.coerce.number().min(0.7).max(0.99),
  evidence: z.coerce.number().min(0.6).max(0.95),
  instructions: z.string().max(1000),
  optionalExclusions: z
    .array(z.enum(['how_to', 'product_info', 'other']))
    .max(3),
});
const mandatory = ['billing', 'security', 'privacy', 'legal', 'account_change'];
export async function saveAiSettings(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    mode: formData.get('mode'),
    tone: formData.get('tone'),
    confidence: formData.get('confidence'),
    evidence: formData.get('evidence'),
    instructions: formData.get('instructions'),
    optionalExclusions: formData.getAll('exclude'),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: 'Check the AI mode, thresholds, and text limits.',
      fields: Object.fromEntries(
        parsed.error.issues.map((x) => [String(x.path[0]), x.message]),
      ),
      values: Object.fromEntries(
        Array.from(formData.entries()).filter(
          ([, v]) => typeof v === 'string',
        ) as [string, string][],
      ),
    };
  }
  const { supabase, active } = await getWorkspaceContext();
  if (
    !active ||
    !active.onboardingCompletedAt ||
    !['owner', 'admin'].includes(active.role)
  )
    return { message: 'Your role cannot change AI policy.' };
  const { error } = await supabase.rpc('update_ai_config', {
    p_workspace_id: active.id,
    p_mode: parsed.data.mode,
    p_tone: parsed.data.tone,
    p_confidence: parsed.data.confidence,
    p_evidence: parsed.data.evidence,
    p_custom_instructions: parsed.data.instructions,
    p_excluded_intents: [...mandatory, ...parsed.data.optionalExclusions],
  });
  if (error) {
    logEvent('ai.config', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return { message: 'AI policy could not be saved. Retry shortly.' };
  }
  logEvent('ai.config', 'succeeded', { workspaceId: active.id });
  await invalidateCacheSafe('workspace-ai-config', active.id);
  revalidatePath('/app/settings/ai');
  return {
    success: 'AI policy saved. New customer messages will follow this mode.',
  };
}
