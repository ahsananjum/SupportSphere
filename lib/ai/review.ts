import type { AutomatedAction } from '../ui/automated-action';
export function aiNextAction(run: AutomatedAction) {
  if (['queued', 'processing'].includes(run.status))
    return 'Wait for the saved result, then refresh this review. Queue acceptance is not a completed reply.';
  if (run.status === 'failed')
    return 'Open the conversation and let a teammate respond. Review the failure before retrying any work.';
  if (run.status === 'skipped' || run.decision === 'skipped')
    return 'Open the latest conversation and check current policy and ownership before requesting new work.';
  if (run.status !== 'completed')
    return 'Refresh this review before acting on an unrecognized status.';
  if (run.decision === 'draft')
    return 'Open the conversation, review the answer and evidence, then use the draft deliberately. Sending remains a separate human action.';
  if (run.decision === 'escalated')
    return 'A teammate must review and respond in the conversation. Releasing handoff only permits future eligible work.';
  if (run.decision === 'auto_sent')
    return 'Review the saved reply in the conversation. It has already been sent and cannot be recalled here.';
  return 'Review the conversation and recorded result. Classification alone does not send a reply.';
}
export function qualityLabel(value: unknown) {
  return value === true
    ? 'Passed'
    : value === false
      ? 'Did not pass'
      : 'Not recorded';
}
export function aiStepLabel(value: string) {
  return (
    (
      {
        triage: 'Triage',
        policy: 'Policy check',
        retrieve: 'Evidence retrieval',
        draft: 'Draft generation',
        quality: 'Quality review',
        decision: 'Decision',
        provider: 'Provider',
      } as Record<string, string>
    )[value] ?? value
  );
}
export function aiStepStatus(value: string) {
  return (
    (
      { passed: 'Passed', failed: 'Failed', skipped: 'Skipped' } as Record<
        string,
        string
      >
    )[value] ?? 'Status unavailable'
  );
}
