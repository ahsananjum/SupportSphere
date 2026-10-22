import { expect, it } from 'vitest';
import { readRunEvidence } from '../../lib/ai/evidence';
function client(results: { data: unknown; error: unknown }[]) {
  return {
    from() {
      const result = results.shift();
      const chain = new Proxy(
        {},
        {
          get(_, key) {
            return key === 'then'
              ? Promise.resolve(result).then.bind(Promise.resolve(result))
              : () => chain;
          },
        },
      );
      return chain;
    },
  } as never;
}
it('UP-U3-03: unavailable evidence differs from empty/deleted sources and keeps recorded snippets', async () => {
  expect(
    await readRunEvidence(
      client([{ data: null, error: { message: 'private' } }]),
      'w',
      'r',
    ),
  ).toEqual({ error: true, citations: [] });
  const citation = {
    id: 'c',
    source_id: 's',
    chunk_id: null,
    ordinal: 1,
    snippet: 'Recorded',
    score: 0.9,
  };
  const result = await readRunEvidence(
    client([
      { data: [citation], error: null },
      { data: null, error: { message: 'private' } },
    ]),
    'w',
    'r',
  );
  expect(result).toMatchObject({
    error: false,
    citations: [{ ...citation, source: null, sourceLoadFailed: true }],
  });
  expect(JSON.stringify(result)).not.toContain('private');
  expect(
    await readRunEvidence(client([{ data: [], error: null }]), 'w', 'r'),
  ).toEqual({ error: false, citations: [] });
});
