import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

export async function readRunEvidence(
  client: SupabaseClient<Database>,
  workspaceId: string,
  runId: string,
) {
  const citations = await client
    .from('ai_citations')
    .select('id,ordinal,score,snippet,source_id,chunk_id')
    .eq('workspace_id', workspaceId)
    .eq('run_id', runId)
    .order('ordinal');
  if (citations.error) return { citations: [], error: true };
  const ids = [
    ...new Set(
      (citations.data ?? []).flatMap((c) => (c.source_id ? [c.source_id] : [])),
    ),
  ];
  const sources = ids.length
    ? await client
        .from('knowledge_sources')
        .select('id,name,status,enabled,chunk_count,error_code')
        .eq('workspace_id', workspaceId)
        .in('id', ids)
    : { data: [], error: null };
  const byId = new Map((sources.data ?? []).map((s) => [s.id, s]));
  return {
    error: false,
    citations: (citations.data ?? []).map((c) => ({
      ...c,
      source: c.source_id ? (byId.get(c.source_id) ?? null) : null,
      sourceLoadFailed: Boolean(sources.error),
    })),
  };
}
export type RunEvidence = Awaited<ReturnType<typeof readRunEvidence>>;
