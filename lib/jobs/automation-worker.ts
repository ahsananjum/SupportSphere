import 'server-only';

import { createAdminClient } from '../supabase/admin';
import { logEvent } from '../observability/log';
import { executeAutomationRun } from '../automation/engine';

type ClaimedAutomationRun = {
  id: string;
  workspace_id: string;
  rule_id: string;
  trigger_type: string;
  trigger_entity_id: string | null;
  payload: Record<string, unknown>;
  attempt: number;
  lease_token: string;
};

function isRetryable(error: unknown) {
  return (
    error instanceof Error &&
    /(?:TIMEOUT|TEMPORARY|UNAVAILABLE|NETWORK)/.test(error.message)
  );
}

export async function runAutomationWorkerOnce() {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_automation_run');
  if (error) throw new Error('AUTOMATION_CLAIM_FAILED');
  if (!data) return { status: 'idle' as const };
  const run = data as unknown as ClaimedAutomationRun;
  try {
    const result = await executeAutomationRun(run);
    await admin.rpc('finish_automation_run', {
      p_run_id: run.id,
      p_lease_token: run.lease_token,
      p_result: result,
    });
    logEvent('automation.run', result.status, {
      runId: run.id,
      workspaceId: run.workspace_id,
    });
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AUTOMATION_FAILED';
    await admin.rpc('fail_automation_run', {
      p_run_id: run.id,
      p_lease_token: run.lease_token,
      p_error_code: message.slice(0, 60),
      p_error_message: 'Automation action could not be completed.',
      p_retry: isRetryable(error),
    });
    logEvent('automation.run', 'failed', {
      runId: run.id,
      errorClass: message.slice(0, 60),
    });
    return { status: 'failed' as const, errorCode: message };
  }
}
