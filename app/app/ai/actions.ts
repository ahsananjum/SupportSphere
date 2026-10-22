'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import type { FormState } from '../../../lib/action-state';

export async function submitAiFeedback(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      runId: z.uuid(),
      rating: z.enum(['helpful', 'unhelpful']),
      reason: z.string().max(80),
      comment: z.string().max(500),
    })
    .safeParse({
      runId: formData.get('runId'),
      rating: formData.get('rating'),
      reason: formData.get('reason') ?? '',
      comment: formData.get('comment') ?? '',
    });
  if (!parsed.success)
    return {
      message:
        'Check the rating, reason (80 characters) and comment (500 characters).',
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin', 'agent'].includes(active.role))
    return { message: 'Your role cannot save AI feedback.' };
  const { error } = await supabase.rpc('submit_ai_feedback', {
    p_workspace_id: active.id,
    p_run_id: parsed.data.runId,
    p_rating: parsed.data.rating,
    p_reason: parsed.data.reason,
    p_comment: parsed.data.comment,
  });
  revalidatePath(`/app/ai/runs/${parsed.data.runId}`);
  return error
    ? {
        message:
          'Feedback could not be saved. Your comment is preserved; retry shortly.',
      }
    : { success: 'Feedback saved.' };
}
export async function releaseAiHandoff(formData: FormData) {
  const id = z.uuid().safeParse(formData.get('conversationId'));
  if (!id.success) redirect('/app/inbox?error=handoff');
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin', 'agent'].includes(active.role))
    redirect(`/app/inbox/${id.data}?error=permission`);
  const { error } = await supabase.rpc('release_ai_handoff', {
    p_workspace_id: active.id,
    p_conversation_id: id.data,
  });
  revalidatePath(`/app/inbox/${id.data}`);
  redirect(
    `/app/inbox/${id.data}?${error ? 'error=handoff' : 'notice=handoff'}`,
  );
}
