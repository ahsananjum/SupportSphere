import 'server-only';
import { cookies } from 'next/headers';
import { requireActor } from '../auth/actor';

export const activeWorkspaceCookie = 'ss_active_workspace';

export async function getWorkspaceContext() {
  const { supabase, user } = await requireActor('/app');
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id,role,workspaces(id,name,slug)')
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
          },
        ]
      : [];
  });
  const selected = (await cookies()).get(activeWorkspaceCookie)?.value;
  const active =
    memberships.find((item) => item.id === selected) ?? memberships[0] ?? null;
  return { supabase, user, memberships, active };
}
