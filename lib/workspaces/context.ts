import 'server-only';
import { cookies } from 'next/headers';
import { requireActor } from '../auth/actor';

export const activeWorkspaceCookie = 'ss_active_workspace';

export async function getWorkspaceContext() {
  const { supabase, user } = await requireActor('/app');
  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      'workspace_id,role,workspaces(id,name,slug,timezone,company_name,support_name,support_email,website_origin,ai_mode,onboarding_step,onboarding_completed_at)',
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });
  if (error) throw new Error('Unable to load workspaces');
  const memberships = (data ?? []).flatMap((entry) => {
    const workspace = Array.isArray(entry.workspaces)
      ? entry.workspaces[0]
      : entry.workspaces;
    return workspace
      ? [
          {
            id: entry.workspace_id as string,
            role: entry.role as string,
            name: workspace.name as string,
            slug: workspace.slug as string,
            timezone: workspace.timezone as string,
            companyName: workspace.company_name as string | null,
            supportName: workspace.support_name as string | null,
            supportEmail: workspace.support_email as string | null,
            websiteOrigin: workspace.website_origin as string | null,
            aiMode: workspace.ai_mode as string,
            onboardingStep: workspace.onboarding_step as string,
            onboardingCompletedAt: workspace.onboarding_completed_at as
              string | null,
          },
        ]
      : [];
  });
  const selected = (await cookies()).get(activeWorkspaceCookie)?.value;
  const active =
    memberships.find((item) => item.id === selected) ?? memberships[0] ?? null;
  return { supabase, user, memberships, active };
}
