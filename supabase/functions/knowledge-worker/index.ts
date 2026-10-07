import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { extractText, getDocumentProxy } from 'npm:unpdf@1.8.1';
import {
  chunkKnowledgeText,
  hashDocuments,
  normalizeKnowledgeText,
  type ExtractedDocument,
} from '../_shared/knowledge.ts';

type Job = {
  job_id: string;
  source_id: string;
  workspace_id: string;
  lease_token: string;
  attempt: number;
};
type Source = {
  id: string;
  workspace_id: string;
  name: string;
  source_type: 'paste' | 'txt' | 'md' | 'pdf';
  input_text: string | null;
  storage_path: string | null;
};

class IngestionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const model = new Supabase.ai.Session('gte-small');

async function extract(source: Source): Promise<ExtractedDocument[]> {
  if (source.source_type === 'paste') {
    const content = normalizeKnowledgeText(source.input_text ?? '');
    if (!content)
      throw new IngestionError(
        'EMPTY_TEXT',
        'This source has no readable text. Add text and retry.',
        false,
      );
    return [{ title: source.name, page: null, content }];
  }
  if (!source.storage_path)
    throw new IngestionError(
      'FILE_MISSING',
      'The uploaded file is missing. Delete this source and upload it again.',
      false,
    );
  const { data: blob, error } = await admin.storage
    .from('knowledge-private')
    .download(source.storage_path);
  if (error || !blob)
    throw new IngestionError(
      'STORAGE_UNAVAILABLE',
      'The uploaded file could not be read right now. Retry this source.',
      true,
    );
  if (blob.size > 5_242_880)
    throw new IngestionError(
      'FILE_TOO_LARGE',
      'Use a file smaller than 5 MB.',
      false,
    );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (source.source_type === 'pdf') {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
      throw new IngestionError(
        'INVALID_PDF',
        'This is not a valid text PDF. Export it as a PDF and upload again.',
        false,
      );
    try {
      const pdf = await getDocumentProxy(bytes);
      if (pdf.numPages > 80)
        throw new IngestionError(
          'TOO_MANY_PAGES',
          'Use a PDF with at most 80 pages.',
          false,
        );
      const result = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(result.text) ? result.text : [result.text];
      const documents = pages
        .map((value, index) => ({
          title: `${source.name} · page ${index + 1}`,
          page: index + 1,
          content: normalizeKnowledgeText(value),
        }))
        .filter((item) => item.content);
      if (!documents.length)
        throw new IngestionError(
          'PDF_NO_TEXT',
          'No selectable text was found. Use a text PDF; scanned images are not supported.',
          false,
        );
      return documents;
    } catch (error) {
      if (error instanceof IngestionError) throw error;
      throw new IngestionError(
        'INVALID_PDF',
        'This PDF could not be parsed. Export a text PDF and upload again.',
        false,
      );
    }
  }
  let value: string;
  try {
    value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new IngestionError(
      'INVALID_TEXT',
      'Save the file as UTF-8 text and upload again.',
      false,
    );
  }
  if (value.includes('\0'))
    throw new IngestionError(
      'INVALID_TEXT',
      'This file is not plain text. Upload a TXT or MD file.',
      false,
    );
  const content = normalizeKnowledgeText(value);
  if (!content)
    throw new IngestionError(
      'EMPTY_TEXT',
      'This file has no readable text. Add text and upload again.',
      false,
    );
  return [{ title: source.name, page: null, content }];
}

async function processJob(job: Job) {
  const { data: source, error } = await admin
    .from('knowledge_sources')
    .select('id,workspace_id,name,source_type,input_text,storage_path')
    .eq('id', job.source_id)
    .eq('workspace_id', job.workspace_id)
    .single();
  if (error || !source)
    throw new IngestionError(
      'SOURCE_MISSING',
      'Source no longer exists.',
      false,
    );
  const documents = await extract(source as Source);
  const total = documents.reduce((sum, doc) => sum + doc.content.length, 0);
  if (total > 80_000)
    throw new IngestionError(
      'TEXT_TOO_LARGE',
      'Use a source with at most 80,000 characters of text.',
      false,
    );
  const hash = await hashDocuments(documents);
  const prepared = [];
  let count = 0;
  for (const doc of documents) {
    const chunks = [];
    for (const chunk of chunkKnowledgeText(doc.content)) {
      if (++count > 200)
        throw new IngestionError(
          'TOO_MANY_CHUNKS',
          'Split this source into smaller files and upload again.',
          false,
        );
      let embedding: number[];
      try {
        embedding = (await model.run(chunk.content, {
          mean_pool: true,
          normalize: true,
        })) as number[];
      } catch {
        throw new IngestionError(
          'EMBEDDING_UNAVAILABLE',
          'Indexing is temporarily unavailable. We will retry automatically.',
          true,
        );
      }
      if (
        !Array.isArray(embedding) ||
        embedding.length !== 384 ||
        embedding.some((value) => !Number.isFinite(value))
      )
        throw new IngestionError(
          'EMBEDDING_INVALID',
          'Indexing is temporarily unavailable. We will retry automatically.',
          true,
        );
      chunks.push({ ...chunk, embedding });
    }
    prepared.push({
      title: doc.title,
      page: doc.page,
      content: doc.content,
      chunks,
    });
  }
  const result = await admin.rpc('finish_ingestion_job', {
    p_job_id: job.job_id,
    p_lease_token: job.lease_token,
    p_hash: hash,
    p_documents: prepared,
  });
  if (result.error)
    throw new IngestionError(
      'PERSIST_FAILED',
      'Indexing could not be saved. We will retry automatically.',
      true,
    );
  return { documents: documents.length, chunks: count };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });
  const token = request.headers.get('X-Worker-Token') ?? '';
  const authorized = await admin.rpc('knowledge_worker_authorized', {
    p_token: token,
  });
  if (authorized.error || authorized.data !== true)
    return new Response('Forbidden', { status: 403 });
  const claim = await admin.rpc('claim_ingestion_job');
  if (claim.error) return new Response('Worker unavailable', { status: 503 });
  const job = claim.data as Job | null;
  if (!job) return Response.json({ processed: false });
  try {
    const metrics = await processJob(job);
    console.info(
      JSON.stringify({
        event: 'knowledge.ingested',
        jobId: job.job_id,
        sourceId: job.source_id,
        attempt: job.attempt,
        ...metrics,
      }),
    );
    return Response.json({ processed: true, jobId: job.job_id });
  } catch (cause) {
    const failure =
      cause instanceof IngestionError
        ? cause
        : new IngestionError(
            'WORKER_ERROR',
            'Indexing failed. Retry this source.',
            true,
          );
    const result = await admin.rpc('fail_ingestion_job', {
      p_job_id: job.job_id,
      p_lease_token: job.lease_token,
      p_code: failure.code,
      p_message: failure.message,
      p_retry: failure.retry,
    });
    console.error(
      JSON.stringify({
        event: 'knowledge.failed',
        jobId: job.job_id,
        sourceId: job.source_id,
        attempt: job.attempt,
        code: failure.code,
        retry: failure.retry,
        updateFailed: Boolean(result.error),
      }),
    );
    return Response.json(
      { processed: true, failed: true, code: failure.code },
      { status: result.error ? 503 : 200 },
    );
  }
});
