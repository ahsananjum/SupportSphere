import { aiOutcomeLabel } from '../support/presentation';

export type AutomatedAction = {
  status: string;
  attempt?: number;
  decision?: string | null;
  run_type?: string;
  reason_code?: string | null;
  result?: unknown;
};
export type ActionKind = 'ai' | 'automation' | 'delivery';
const reasons: Record<string, string> = {
  HUMAN_OVERRIDE:
    'A teammate or newer message changed this record. Pending work was stopped; review the latest conversation.',
  NO_RELIABLE_EVIDENCE:
    'Reliable supporting evidence was not available. Review the conversation and knowledge sources.',
  UNTRUSTED_EVIDENCE:
    'Evidence failed a safety check. Human review is required.',
  POLICY_ESCALATION: 'The policy requires human review.',
  BILLING_DISPUTE: 'A billing request requires a human decision.',
  SENSITIVE_REQUEST: 'A sensitive request requires a human decision.',
  SUPERSEDED:
    'Newer input replaced this request. Review the latest conversation.',
  STALE_INPUT:
    'The input changed before execution. Review the latest conversation.',
  INACTIVE_CONVERSATION:
    'The conversation is no longer eligible for this action.',
  AI_OFF: 'AI is off under the current policy.',
  POLICY_OFF: 'AI is off under the current policy.',
  DRAFT_MODE:
    'The current policy requires a teammate to review and send the answer.',
  DRAFT_POLICY:
    'The current policy requires a teammate to review and send the answer.',
  EVIDENCE_CHANGED:
    'Supporting knowledge changed or is no longer eligible. Review the current source and answer with a human.',
  LOW_CONFIDENCE:
    'The answer did not meet the confidence threshold. A teammate must review it.',
  QUALITY_REVIEW: 'The answer needs a human quality review before sending.',
  QUALITY_FAILED:
    'The answer did not pass quality review. A teammate must review it.',
  UNSAFE_DRAFT: 'The draft failed a safety check. A teammate must respond.',
  INVALID_CITATIONS: 'The answer did not identify valid supporting citations.',
  HUMAN_REQUEST: 'The customer asked for a human. A teammate must respond.',
  DB_GATE_DOWNGRADE:
    'The latest policy, conversation, or evidence did not permit an automatic reply. Review it as human work.',
  GATES_PASSED:
    'The recorded reply passed the required gates at execution time.',
  PROVIDER_UNAVAILABLE:
    'The provider could not complete this work. A teammate must respond; review the failure before retrying.',
  RETRY_EXHAUSTED:
    'The bounded attempts were exhausted. A teammate must review the conversation.',
  RULE_DISABLED: 'The originating rule was disabled.',
  RULE_CHANGED: 'The originating rule changed before execution.',
  TRIAGE_COMPLETE: 'Classification finished without sending a customer reply.',
  RETRIEVAL_UNAVAILABLE:
    'Evidence retrieval was unavailable. Review the run before retrying.',
  INPUT_UNAVAILABLE: 'Required conversation input was unavailable.',
  HISTORY_UNAVAILABLE: 'Conversation history was unavailable.',
  ENDPOINT_REVOKED:
    'The endpoint was revoked. No further delivery is authorized.',
  LEASE_EXHAUSTED:
    'The worker lease expired after the retry limit. Inspect the endpoint before retrying.',
  ENDPOINT_DISABLED:
    'The endpoint is disabled or revoked. Re-enable it before retrying.',
};
export function safeActionReason(code: string | null | undefined) {
  return code
    ? (reasons[code] ??
        'A reason was recorded. Review the existing details for context.')
    : null;
}
export function automatedActionPresentation(
  kind: ActionKind,
  run: AutomatedAction,
) {
  const result =
    run.result && typeof run.result === 'object' && !Array.isArray(run.result)
      ? (run.result as Record<string, unknown>)
      : {};
  const state =
    run.status === 'queued' && (run.attempt ?? 0) > 0
      ? 'retrying'
      : run.status === 'succeeded'
        ? 'completed'
        : run.status;
  const titles: Record<string, string> = {
    queued: 'Queued',
    processing: 'Processing',
    retrying: 'Retrying',
    completed: 'Completed',
    skipped: 'Skipped',
    failed: 'Failed',
  };
  let title = titles[state] ?? 'Status unavailable';
  if (kind === 'ai')
    title =
      state === 'retrying'
        ? 'AI run retrying'
        : aiOutcomeLabel({ ...run, decision: run.decision ?? null });
  let detail = 'Review the existing details before deciding what to do next.';
  if (state === 'queued')
    detail = 'Waiting for a worker. No completed result is confirmed yet.';
  if (state === 'processing')
    detail =
      'A worker is processing this request. No completed result is confirmed yet.';
  if (state === 'retrying')
    detail =
      'A previous attempt did not finish successfully. A bounded retry is queued.';
  if (state === 'failed')
    detail =
      'No successful result is confirmed. Review the reason and affected record before an eligible retry.';
  if (state === 'skipped')
    detail =
      'This request did not execute. Review its reason and the current policy or record.';
  if (
    kind === 'automation' &&
    state === 'skipped' &&
    typeof result.actionsApplied === 'number' &&
    Number.isInteger(result.actionsApplied) &&
    result.actionsApplied > 0 &&
    result.actionsApplied <= 20
  )
    detail = `${result.actionsApplied} earlier action${result.actionsApplied === 1 ? '' : 's'} completed before later work stopped. Completed effects cannot be recalled.`;
  if (state === 'completed') {
    detail =
      kind === 'automation'
        ? 'Rule actions finished. Any queued AI work has a separate result in AI runs.'
        : kind === 'delivery'
          ? 'The endpoint accepted this delivery. Review the recorded response in Recent attempts.'
          : run.run_type === 'triage'
            ? 'Classification finished. This triage run did not send a customer reply.'
            : run.decision === 'draft'
              ? 'Review the suggestion and evidence. Adopt it explicitly; sending remains a separate human action.'
              : run.decision === 'escalated'
                ? 'Human review is required. Use the existing conversation and handoff controls.'
                : run.decision === 'auto_sent'
                  ? 'A reply is recorded as sent. Review the conversation and evidence.'
                  : 'Processing finished. Review the recorded outcome before taking further action.';
  }
  return {
    state,
    title,
    detail,
    reason: safeActionReason(
      kind === 'automation' && typeof result.reason === 'string'
        ? result.reason
        : run.reason_code,
    ),
  };
}

export function automationRunContext(run: {
  ruleName?: string | null;
  triggerType: string;
  triggerEntityId?: string | null;
  completedAt?: string | null;
}) {
  const rule = run.ruleName?.trim() || 'Deleted or unavailable rule';
  const trigger = run.triggerType.replaceAll('_', ' ');
  const record = run.triggerEntityId
    ? ` · record ${run.triggerEntityId.slice(0, 8)}`
    : '';
  return `${rule} · ${trigger}${record}${run.completedAt ? ' · terminal outcome recorded' : ' · awaiting terminal outcome'}`;
}

export function auditActorLabel(
  actorUserId: string | null,
  profile?: {
    display_name?: string | null;
    email_normalized?: string | null;
  } | null,
) {
  if (!actorUserId) return 'System action';
  return profile?.display_name || profile?.email_normalized || 'Former member';
}
