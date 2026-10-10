import 'server-only';

import { createAdminClient } from '../supabase/admin';
import { logEvent } from '../observability/log';
import { claimIdempotency } from '../redis/coordination';
import type { Json } from '../supabase/database.types';

export type DurableJobInput = {
  workspaceId: string;
  jobType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  maxAttempts?: number;
};

export async function enqueueDurableJob(input: DurableJobInput) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('enqueue_durable_job', {
    p_workspace_id: input.workspaceId,
    p_job_type: input.jobType,
    p_entity_id: (input.entityId ?? null) as unknown as string,
    p_payload: (input.payload ?? {}) as Json,
    p_idempotency_key: input.idempotencyKey,
    p_max_attempts: input.maxAttempts ?? 3,
  });
  if (error || !data) {
    logEvent('job.enqueue', 'failed', { errorClass: error?.code ?? 'UNKNOWN' });
    throw new Error('JOB_ENQUEUE_FAILED');
  }
  return data;
}

export async function reserveJobDedupe(input: DurableJobInput) {
  try {
    return await claimIdempotency(
      'job',
      `${input.jobType}:${input.idempotencyKey}`,
    );
  } catch {
    // Postgres uniqueness remains the durable source of truth when Redis is down.
    return true;
  }
}
