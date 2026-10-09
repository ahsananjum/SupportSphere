import type { Triage, Draft, Quality } from './ai.ts';
import {
  triageSchema,
  draftSchema,
  qualitySchema,
  parseTriage,
  parseDraft,
  parseQuality,
} from './ai.ts';

type Schema = Record<string, unknown>;
export type Prompt = { instructions: string; input: string };
type Usage = { input_tokens: number | null; output_tokens: number | null };
export type ProviderResult<T> = {
  value: T;
  usage: Usage;
  model: string;
  latencyMs: number;
};
export class ProviderError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
  }
}
export interface SupportProvider {
  triage(prompt: Prompt, model: string): Promise<ProviderResult<Triage>>;
  draft(prompt: Prompt, model: string): Promise<ProviderResult<Draft>>;
  quality(prompt: Prompt, model: string): Promise<ProviderResult<Quality>>;
}

// generateContent.responseSchema accepts Gemini's OpenAPI subset, not JSON Schema's
// additionalProperties. The existing parsers enforce the missing strictness.
export function toGeminiSchema(schema: Schema): Schema {
  const type = schema.type;
  if (
    typeof type !== 'string' ||
    !['object', 'array', 'string', 'number', 'integer', 'boolean'].includes(
      type,
    )
  )
    throw new ProviderError('PROVIDER_SCHEMA_CONFIG', false);
  const converted: Schema = { type: type.toUpperCase() };
  if (Array.isArray(schema.enum)) converted.enum = schema.enum;
  if (type === 'object') {
    const properties = schema.properties;
    if (
      !properties ||
      typeof properties !== 'object' ||
      Array.isArray(properties)
    )
      throw new ProviderError('PROVIDER_SCHEMA_CONFIG', false);
    const entries = Object.entries(properties as Schema);
    converted.properties = Object.fromEntries(
      entries.map(([name, value]) => [name, toGeminiSchema(value as Schema)]),
    );
    converted.required = schema.required;
    converted.propertyOrdering = entries.map(([name]) => name);
  }
  if (type === 'array')
    converted.items = toGeminiSchema(schema.items as Schema);
  return converted;
}

const modelName = /^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$/;
const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const tokenCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;

export class GeminiGenerateContentProvider implements SupportProvider {
  constructor(private readonly apiKey: string) {}

  async structured<T>(
    prompt: Prompt,
    model: string,
    schema: Schema,
    parse: (value: unknown) => T,
  ): Promise<ProviderResult<T>> {
    if (!modelName.test(model))
      throw new ProviderError('PROVIDER_MODEL_CONFIG', false);
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: prompt.instructions }] },
      contents: [{ role: 'user', parts: [{ text: prompt.input }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(schema),
        temperature: 0,
        maxOutputTokens: 2048,
      },
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(14000),
        });
      } catch {
        if (attempt === 0) {
          await pause(1000);
          continue;
        }
        throw new ProviderError('PROVIDER_TIMEOUT', true);
      }
      if (!response.ok) {
        const retryable =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        if (retryable && attempt === 0) {
          await pause(1000);
          continue;
        }
        throw new ProviderError(
          response.status === 429
            ? 'PROVIDER_RATE_LIMIT'
            : response.status === 401 || response.status === 403
              ? 'PROVIDER_AUTH'
              : response.status === 404
                ? 'PROVIDER_MODEL'
                : retryable
                  ? 'PROVIDER_UNAVAILABLE'
                  : 'PROVIDER_REJECTED',
          retryable,
        );
      }
      let payload: Record<string, unknown>;
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        throw new ProviderError('PROVIDER_INVALID', false);
      }
      const candidate = Array.isArray(payload.candidates)
        ? payload.candidates[0]
        : null;
      if (!candidate || typeof candidate !== 'object')
        throw new ProviderError('PROVIDER_BLOCKED', false);
      const result = candidate as Record<string, unknown>;
      if (result.finishReason !== 'STOP')
        throw new ProviderError(
          result.finishReason === 'MAX_TOKENS'
            ? 'PROVIDER_INCOMPLETE'
            : 'PROVIDER_BLOCKED',
          false,
        );
      const content = result.content;
      const parts =
        content && typeof content === 'object'
          ? (content as Record<string, unknown>).parts
          : null;
      const text = Array.isArray(parts)
        ? parts
            .map((part) =>
              part && typeof part === 'object'
                ? (part as Record<string, unknown>).text
                : null,
            )
            .filter((part): part is string => typeof part === 'string')
            .join('')
        : '';
      if (!text || text.length > 20000)
        throw new ProviderError('PROVIDER_INVALID', false);
      let value: T;
      try {
        value = parse(JSON.parse(text));
      } catch {
        throw new ProviderError('PROVIDER_SCHEMA', false);
      }
      const usage =
        payload.usageMetadata && typeof payload.usageMetadata === 'object'
          ? (payload.usageMetadata as Record<string, unknown>)
          : {};
      return {
        value,
        model,
        latencyMs: Date.now() - start,
        usage: {
          input_tokens: tokenCount(usage.promptTokenCount),
          output_tokens: tokenCount(usage.candidatesTokenCount),
        },
      };
    }
    throw new ProviderError('PROVIDER_UNAVAILABLE', true);
  }

  triage(prompt: Prompt, model: string) {
    return this.structured(prompt, model, triageSchema, parseTriage);
  }
  draft(prompt: Prompt, model: string) {
    return this.structured(prompt, model, draftSchema, parseDraft);
  }
  quality(prompt: Prompt, model: string) {
    return this.structured(prompt, model, qualitySchema, parseQuality);
  }
}
