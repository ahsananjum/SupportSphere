import { expect, it } from 'vitest';
import {
  sourceReadiness,
  canRetryIngestion,
} from '../../lib/knowledge/readiness';
it('UP-U3-02: only ready/enabled/indexed content is usable; permanent failures explain corrected re-upload', () => {
  const source = {
    status: 'ready',
    enabled: true,
    chunk_count: 2,
    error_code: null,
  };
  expect(sourceReadiness(source).usable).toBe(true);
  for (const patch of [
    { enabled: false },
    { status: 'queued' },
    { status: 'processing' },
    { status: 'failed' },
    { chunk_count: 0 },
  ])
    expect(sourceReadiness({ ...source, ...patch }).usable).toBe(false);
  expect(
    sourceReadiness({ ...source, status: 'failed', error_code: 'PDF_NO_TEXT' })
      .detail,
  ).toContain('corrected');
  expect(canRetryIngestion('PDF_NO_TEXT')).toBe(false);
  expect(canRetryIngestion('WORKER_TIMEOUT')).toBe(true);
  expect(sourceReadiness({ ...source, status: 'future' }).label).toBe(
    'Readiness unavailable',
  );
});
