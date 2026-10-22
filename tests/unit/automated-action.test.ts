import { describe, expect, it } from 'vitest';
import {
  automationRunContext,
  auditActorLabel,
  automatedActionPresentation as present,
  safeActionReason,
} from '../../lib/ui/automated-action';

describe('UP-U1-07 terminal truth and human review', () => {
  it('separates initial queue, processing and a persisted retry from completion', () => {
    expect(present('ai', { status: 'queued', attempt: 0 }).state).toBe(
      'queued',
    );
    expect(present('ai', { status: 'queued', attempt: 1 }).state).toBe(
      'retrying',
    );
    expect(
      present('delivery', { status: 'processing', attempt: 2 }).state,
    ).toBe('processing');
    expect(present('automation', { status: 'queued' }).detail).toContain(
      'No completed result',
    );
  });
  it('never lets a stale decision or unknown state imply a successful AI outcome', () => {
    expect(
      present('ai', { status: 'failed', decision: 'auto_sent' }).title,
    ).toBe('AI run failed');
    expect(present('ai', { status: 'skipped', decision: 'draft' }).title).toBe(
      'AI run skipped',
    );
    expect(
      present('ai', { status: 'new_internal_state', decision: 'auto_sent' })
        .title,
    ).toBe('AI status unavailable');
  });
  it('distinguishes rule dispatch from downstream generation and triage from sending', () => {
    expect(present('automation', { status: 'succeeded' }).detail).toContain(
      'separate result in AI runs',
    );
    expect(
      present('ai', {
        status: 'completed',
        run_type: 'triage',
        decision: 'draft',
      }).detail,
    ).toContain('did not send');
    expect(
      present('ai', { status: 'completed', decision: 'draft' }).detail,
    ).toContain('sending remains a separate human action');
  });
  it('uses safe actionable reasons without echoing unknown diagnostic content', () => {
    expect(safeActionReason('POLICY_ESCALATION')).toContain('human review');
    expect(safeActionReason('arbitrary_private_content')).not.toContain(
      'arbitrary_private_content',
    );
    expect(safeActionReason(null)).toBeNull();
  });
});

it('UP-U2-09: a stopped partial run discloses earlier completed effects and a safe override reason', () => {
  const state = present('automation', {
    status: 'skipped',
    result: { reason: 'HUMAN_OVERRIDE', actionsApplied: 1 },
  });
  expect(state.detail).toBe(
    '1 earlier action completed before later work stopped. Completed effects cannot be recalled.',
  );
  expect(state.reason).toContain('Pending work was stopped');
});

describe('UP-U4 terminal history and recovery', () => {
  it('shows rule, record and whether execution reached a terminal outcome', () => {
    expect(
      automationRunContext({
        ruleName: 'Escalations',
        triggerType: 'escalation',
        triggerEntityId: '12345678-rest',
        completedAt: null,
      }),
    ).toContain('awaiting terminal outcome');
  });
  it('keeps transient delivery failure actionable without treating queueing as success', () => {
    expect(
      present('delivery', {
        status: 'failed',
        attempt: 2,
        reason_code: 'RETRY_EXHAUSTED',
      }).state,
    ).toBe('failed');
    expect(
      present('delivery', { status: 'queued', attempt: 2 }).detail,
    ).toContain('bounded retry');
  });
  it('labels deleted actors without exposing a raw identifier', () => {
    expect(auditActorLabel('deleted-user')).toBe('Former member');
    expect(auditActorLabel(null)).toBe('System action');
    expect(auditActorLabel('user', { display_name: 'A teammate' })).toBe(
      'A teammate',
    );
  });
});
