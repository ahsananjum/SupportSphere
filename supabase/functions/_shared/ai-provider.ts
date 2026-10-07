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
export class OpenAIResponsesProvider implements SupportProvider {
  constructor(private readonly apiKey: string) {}
  async structured<T>(
    prompt: Prompt,
    model: string,
    name: string,
    schema: Schema,
    parse: (value: unknown) => T,
  ): Promise<ProviderResult<T>> {
    const start = Date.now();
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            instructions: prompt.instructions,
            input: prompt.input,
            store: false,
            max_output_tokens: 700,
            text: {
              format: { type: 'json_schema', name, schema, strict: true },
            },
          }),
          signal: AbortSignal.timeout(14000),
        });
      } catch {
        if (attempt === 0) continue;
        throw new ProviderError('PROVIDER_TIMEOUT', true);
      }
      if (!response.ok) {
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt === 0
        )
          continue;
        throw new ProviderError(
          response.status === 429
            ? 'PROVIDER_RATE_LIMIT'
            : response.status >= 500
              ? 'PROVIDER_UNAVAILABLE'
              : 'PROVIDER_REJECTED',
          response.status === 429 || response.status >= 500,
        );
      }
      let payload: Record<string, unknown>;
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        throw new ProviderError('PROVIDER_INVALID', false);
      }
      const output = Array.isArray(payload.output) ? payload.output : [];
      const text = output
        .flatMap((item: unknown) => {
          if (!item || typeof item !== 'object') return [];
          const content = (item as Record<string, unknown>).content;
          return Array.isArray(content) ? content : [];
        })
        .find(
          (item: unknown) =>
            item &&
            typeof item === 'object' &&
            (item as Record<string, unknown>).type === 'output_text',
        ) as Record<string, unknown> | undefined;
      if (payload.status !== 'completed' || typeof text?.text !== 'string')
        throw new ProviderError('PROVIDER_INCOMPLETE', true);
      let value: T;
      try {
        value = parse(JSON.parse(text.text));
      } catch {
        throw new ProviderError('PROVIDER_SCHEMA', false);
      }
      const usage = (
        payload.usage && typeof payload.usage === 'object' ? payload.usage : {}
      ) as Record<string, unknown>;
      return {
        value,
        model,
        latencyMs: Date.now() - start,
        usage: {
          input_tokens:
            typeof usage.input_tokens === 'number' ? usage.input_tokens : null,
          output_tokens:
            typeof usage.output_tokens === 'number'
              ? usage.output_tokens
              : null,
        },
      };
    }
    throw new ProviderError('PROVIDER_UNAVAILABLE', true);
  }
  triage(prompt: Prompt, model: string) {
    return this.structured(
      prompt,
      model,
      'support_triage_v1',
      triageSchema,
      parseTriage,
    );
  }
  draft(prompt: Prompt, model: string) {
    return this.structured(
      prompt,
      model,
      'support_draft_v1',
      draftSchema,
      parseDraft,
    );
  }
  quality(prompt: Prompt, model: string) {
    return this.structured(
      prompt,
      model,
      'support_quality_v1',
      qualitySchema,
      parseQuality,
    );
  }
}
