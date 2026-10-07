export type ExtractedDocument = {
  title: string;
  page: number | null;
  content: string;
};
export type Chunk = { content: string; token_count: number };

export function normalizeKnowledgeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkKnowledgeText(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + 800, text.length);
    if (end < text.length) {
      const boundary = Math.max(
        text.lastIndexOf('\n', end),
        text.lastIndexOf(' ', end),
      );
      if (boundary > start + 500) end = boundary;
    }
    const content = text.slice(start, end).trim();
    if (content)
      chunks.push({
        content,
        token_count: Math.max(1, Math.ceil(content.length / 4)),
      });
    if (end === text.length) break;
    start = Math.max(start + 1, end - 100);
  }
  return chunks;
}

export async function hashDocuments(
  documents: ExtractedDocument[],
): Promise<string> {
  const joined = documents.map((item) => item.content).join('\n\f\n');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(joined),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
