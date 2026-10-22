import type { SupabaseClient } from '@supabase/supabase-js';
import { checked } from './fixture';
import { hashDocuments } from '../../supabase/functions/_shared/knowledge';

export const syntheticText =
  'Open Settings, select Reports, then choose Export PDF. CSV export is unavailable.';
export const syntheticVector = [1, ...Array<number>(383).fill(0)];
/** Real local queue/lease/atomic finish, controlled documents/embedding; no parser/model proof. */
export async function indexedSource(
  admin: SupabaseClient,
  owner: SupabaseClient,
  workspace: string,
  name = 'Lunar export guide',
) {
  const id = checked(
    await owner.rpc('create_knowledge_source', {
      p_workspace_id: workspace,
      p_name: name,
      p_type: 'paste',
      p_text: syntheticText,
    }),
  ) as string;
  const job = checked(await admin.rpc('claim_ingestion_job')) as {
    source_id: string;
    job_id: string;
    lease_token: string;
  };
  if (job.source_id !== id)
    throw Error(
      'Unexpected pending ingestion work; stop instead of processing another source',
    );
  const documents = [{ title: name, page: null, content: syntheticText }];
  checked(
    await admin.rpc('finish_ingestion_job', {
      p_job_id: job.job_id,
      p_lease_token: job.lease_token,
      p_hash: await hashDocuments(documents),
      p_documents: documents.map((d) => ({
        ...d,
        chunks: [
          { content: d.content, token_count: 20, embedding: syntheticVector },
        ],
      })),
    }),
  );
  return id;
}
