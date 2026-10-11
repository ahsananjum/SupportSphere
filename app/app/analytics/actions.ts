'use server';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { redirect } from 'next/navigation';

const workspaceSchema = z.string().uuid();
export async function runEvaluation() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    redirect('/app/analytics?error=permission');
  const workspaceId = workspaceSchema.parse(active.id);
  const ensured = await supabase.rpc('ensure_evaluation_cases', {
    p_workspace_id: workspaceId,
  });
  if (ensured.error) redirect('/app/analytics?error=cases');
  const result = await supabase.rpc('run_ai_evaluation', {
    p_workspace_id: workspaceId,
  });
  if (result.error) redirect('/app/analytics?error=evaluation');
  redirect(`/app/analytics?evaluated=${result.data}`);
}
