import { describe, expect, it } from 'vitest';
import {
  chunkKnowledgeText,
  hashDocuments,
  normalizeKnowledgeText,
} from '../../supabase/functions/_shared/knowledge';

describe('knowledge extraction contract', () => {
  it('normalizes equivalent text to the same content hash', async () => {
    const first = normalizeKnowledgeText(
      'Cafe\u0301\r\n\r\n\r\n  Help   center ',
    );
    const second = normalizeKnowledgeText('Café\n\nHelp center');
    expect(first).toBe(second);
    expect(
      await hashDocuments([{ title: 'A', page: null, content: first }]),
    ).toBe(await hashDocuments([{ title: 'B', page: null, content: second }]));
  });

  it('makes bounded deterministic overlapping chunks', () => {
    const text = Array.from({ length: 500 }, (_, index) => `word${index}`).join(
      ' ',
    );
    const first = chunkKnowledgeText(text);
    expect(first).toEqual(chunkKnowledgeText(text));
    expect(first.length).toBeGreaterThan(1);
    expect(
      first.every(
        (chunk) => chunk.content.length <= 800 && chunk.token_count > 0,
      ),
    ).toBe(true);
    expect(first[1].content).toContain(first[0].content.slice(-40));
  });
});
