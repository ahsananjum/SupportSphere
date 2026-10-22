import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import {
  GeminiGenerateContentProvider,
  ProviderError,
} from '../_shared/ai-provider.ts';

import { createAiProcessor, type Job } from '../_shared/ai-processor.ts';
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const embeddingModel = new Supabase.ai.Session('gte-small');
const processJob = createAiProcessor(admin, embeddingModel);
Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });
  const token = request.headers.get('x-worker-token') ?? '';
  const { data: authorized, error: authError } = await admin.rpc(
    'ai_worker_authorized',
    { p_token: token },
  );
  if (authError || authorized !== true)
    return new Response('Forbidden', { status: 403 });
  const apiKey = Deno.env.get('AI_API_KEY') ?? '';
  const providerName = Deno.env.get('AI_PROVIDER') ?? '';
  const models = {
    triage: Deno.env.get('AI_MODEL_TRIAGE') ?? '',
    support: Deno.env.get('AI_MODEL_SUPPORT') ?? '',
    quality: Deno.env.get('AI_MODEL_QUALITY') ?? '',
  };
  if (
    providerName !== 'gemini' ||
    !apiKey ||
    !models.triage ||
    !models.support ||
    !models.quality
  )
    return new Response('AI provider is not configured', { status: 503 });
  const { data, error } = await admin.rpc('claim_ai_run');
  if (error) return new Response('Claim failed', { status: 503 });
  if (!data) return Response.json({ processed: false });
  const job = data as Job;
  try {
    await processJob(job, new GeminiGenerateContentProvider(apiKey), models);
    console.info(
      JSON.stringify({
        event: 'ai.run.completed',
        runId: job.id,
        workspaceId: job.workspace_id,
        attempt: job.attempt,
      }),
    );
    return Response.json({ processed: true });
  } catch (error) {
    const code =
      error instanceof ProviderError
        ? error.code
        : error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : 'AI_WORKER_ERROR';
    const retry =
      error instanceof ProviderError
        ? error.retryable
        : [
            'RETRIEVAL_UNAVAILABLE',
            'HISTORY_UNAVAILABLE',
            'INPUT_UNAVAILABLE',
          ].includes(code);
    await admin.rpc('fail_ai_run', {
      p_run_id: job.id,
      p_lease_token: job.lease_token,
      p_error_code: code,
      p_retry: retry,
    });
    console.error(
      JSON.stringify({
        event: 'ai.run.failed',
        runId: job.id,
        workspaceId: job.workspace_id,
        attempt: job.attempt,
        code,
        retry,
      }),
    );
    return Response.json({ processed: false, error: code }, { status: 503 });
  }
});
