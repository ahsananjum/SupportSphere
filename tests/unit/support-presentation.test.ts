import { describe, expect, it } from 'vitest';
import {
  aiOutcomeLabel,
  messageAuthorLabel,
} from '../../lib/support/presentation';

describe('UP-U0-03 truthful authorship and terminal outcomes', () => {
  it('reserves You for the current persisted author and keeps notes private in their label', () => {
    expect(
      messageAuthorLabel({ sender_type: 'agent', sender_user_id: 'me' }, 'me'),
    ).toBe('You');
    expect(
      messageAuthorLabel(
        { sender_type: 'agent', sender_user_id: 'other' },
        'me',
      ),
    ).toBe('Teammate');
    expect(
      messageAuthorLabel({ sender_type: 'agent', sender_user_id: null }, 'me'),
    ).toBe('Support agent');
    expect(
      messageAuthorLabel(
        { sender_type: 'customer', sender_user_id: null },
        'me',
      ),
    ).toBe('Customer');
    expect(
      messageAuthorLabel(
        { sender_type: 'note', sender_user_id: 'other' },
        'me',
      ),
    ).toBe('Internal note · Teammate');
  });
  it('gives failed/skipped states precedence over stale decisions', () => {
    expect(
      aiOutcomeLabel({
        status: 'completed',
        decision: 'skipped',
        run_type: 'triage',
      }),
    ).toBe('AI triage complete');
    for (const status of ['failed', 'skipped'])
      for (const decision of [null, 'draft', 'escalated'])
        expect(aiOutcomeLabel({ status, decision })).toBe(`AI run ${status}`);
    expect(aiOutcomeLabel({ status: 'queued', decision: null })).toBe(
      'AI run queued',
    );
    expect(aiOutcomeLabel({ status: 'completed', decision: null })).toBe(
      'AI run completed',
    );
    expect(aiOutcomeLabel({ status: 'processing', decision: null })).toBe(
      'AI is processing',
    );
  });
});
