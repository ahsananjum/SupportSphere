import { describe, expect, it } from 'vitest';
import { mergeMessages } from '../../app/widget/widget-client';

const message = (id: string, created_at: string, body = id) => ({
  id,
  body,
  sender_type: 'customer',
  created_at,
  client_id: null,
});

describe('widget transcript presentation', () => {
  it('deduplicates refreshed messages while preserving chronological order', () => {
    expect(
      mergeMessages(
        [message('b', '2026-01-02T00:00:00Z', 'old')],
        [
          message('a', '2026-01-01T00:00:00Z'),
          message('b', '2026-01-02T00:00:00Z', 'updated'),
        ],
      ),
    ).toEqual([
      message('a', '2026-01-01T00:00:00Z'),
      message('b', '2026-01-02T00:00:00Z', 'updated'),
    ]);
  });
});
