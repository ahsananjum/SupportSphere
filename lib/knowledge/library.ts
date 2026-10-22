import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { parseListParams, type ListParams } from '../support/list-navigation';

export const SOURCE_PAGE_SIZE = 25;
export function libraryFilters(params: ListParams) {
  const { page, query } = parseListParams(params, 'customers');
  return { page, query };
}
export function libraryHref(filters: { page: number; query: string }) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.page > 0) params.set('page', String(filters.page + 1));
  return '/app/knowledge' + (params.size ? '?' + params : '');
}
export async function listSources(
  client: SupabaseClient<Database>,
  workspaceId: string,
  filters: { page: number; query: string },
) {
  let query = client
    .from('knowledge_sources')
    .select(
      'id,name,source_type,status,enabled,document_count,chunk_count,last_indexed_at,error_code,error_message,created_at',
      { count: 'exact' },
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (filters.query) query = query.ilike('name', `%${filters.query}%`);
  let result = await query.range(
    filters.page * SOURCE_PAGE_SIZE,
    (filters.page + 1) * SOURCE_PAGE_SIZE - 1,
  );
  if (result.error?.code === 'PGRST103' && filters.page > 0) {
    const recovery = await query.range(0, 0);
    if (!recovery.error) result = { ...recovery, data: [] };
  }
  return result;
}
