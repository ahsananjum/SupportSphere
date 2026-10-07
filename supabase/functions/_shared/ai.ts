export const PROMPT_VERSION = 'support-v1';

export type Triage = {
  intent:
    | 'how_to'
    | 'product_info'
    | 'billing'
    | 'security'
    | 'privacy'
    | 'legal'
    | 'account_change'
    | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sentiment: 'positive' | 'neutral' | 'negative';
  language: string;
  escalate: boolean;
  confidence: number;
  summary: string;
  tags: string[];
};
export type Draft = {
  answer: string;
  citation_ordinals: number[];
  confidence: number;
};
export type Quality = {
  passed: boolean;
  grounded: boolean;
  safe: boolean;
  tone_ok: boolean;
  reason: string;
  confidence: number;
};
export type Policy = {
  mode: 'off' | 'draft_only' | 'assisted';
  tone: string;
  confidence_threshold: number;
  evidence_threshold: number;
  custom_instructions: string;
  excluded_intents: string[];
  version: number;
};
export type Evidence = {
  chunk_id: string;
  source_id: string;
  source_name: string;
  content: string;
  score: number;
  ordinal: number;
};
const intents = [
  'how_to',
  'product_info',
  'billing',
  'security',
  'privacy',
  'legal',
  'account_change',
  'other',
];
const priorities = ['low', 'normal', 'high', 'urgent'];
const sentiments = ['positive', 'neutral', 'negative'];
const sensitive: [RegExp, string][] = [
  [
    /\b(human|real person|live agent|speak to (someone|a person|an agent)|talk to (someone|a person|an agent))\b/i,
    'HUMAN_REQUEST',
  ],
  [
    /\b(dispute|chargeback|charged twice|unauthori[sz]ed charge|billing error|refund dispute)\b/i,
    'BILLING_DISPUTE',
  ],
  [
    /\b(data loss|lost my data|breach|hacked|security incident|privacy request|delete my account|lawsuit|legal action)\b/i,
    'SENSITIVE_REQUEST',
  ],
];
export function containsPromptInjection(text: string): boolean {
  return /\b(ignore (all |any )?(previous|prior|above) instructions|system prompt|developer message|reveal (the |your )?(secret|api key|credentials)|execute (sql|shell|code)|you are now (a|an)|override (the )?policy)\b/i.test(
    text,
  );
}
export function redactSecrets(text: string): string {
  return text
    .replace(
      /\b(sk-[A-Za-z0-9_-]{16,}|sb_secret_[A-Za-z0-9_-]{12,})\b/g,
      '[redacted key]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [redacted]')
    .replace(
      /\b(password|api[_ -]?key|secret)\s*[:=]\s*\S+/gi,
      '$1: [redacted]',
    );
}
export function deterministicHandoff(text: string): string | null {
  return sensitive.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_PROVIDER_OUTPUT');
  return value as Record<string, unknown>;
}
function bounded(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}
export function parseTriage(value: unknown): Triage {
  const x = record(value);
  if (
    !intents.includes(String(x.intent)) ||
    !priorities.includes(String(x.priority)) ||
    !sentiments.includes(String(x.sentiment)) ||
    typeof x.language !== 'string' ||
    !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(x.language) ||
    typeof x.escalate !== 'boolean' ||
    !bounded(x.confidence) ||
    typeof x.summary !== 'string' ||
    x.summary.length > 240 ||
    !Array.isArray(x.tags) ||
    x.tags.length > 5 ||
    x.tags.some((v) => typeof v !== 'string' || !/^[a-z_]{2,30}$/.test(v))
  ) {
    throw new Error('INVALID_TRIAGE');
  }
  return x as Triage;
}
export function parseDraft(value: unknown): Draft {
  const x = record(value);
  if (
    typeof x.answer !== 'string' ||
    x.answer.trim().length < 1 ||
    x.answer.length > 4000 ||
    !Array.isArray(x.citation_ordinals) ||
    x.citation_ordinals.length > 5 ||
    x.citation_ordinals.some((v) => !Number.isInteger(v) || v < 1 || v > 5) ||
    !bounded(x.confidence)
  ) {
    throw new Error('INVALID_DRAFT');
  }
  return x as Draft;
}
export function parseQuality(value: unknown): Quality {
  const x = record(value);
  if (
    typeof x.passed !== 'boolean' ||
    typeof x.grounded !== 'boolean' ||
    typeof x.safe !== 'boolean' ||
    typeof x.tone_ok !== 'boolean' ||
    typeof x.reason !== 'string' ||
    x.reason.length > 120 ||
    !bounded(x.confidence)
  )
    throw new Error('INVALID_QUALITY');
  return x as Quality;
}
export function chooseDecision(args: {
  policy: Policy;
  triage: Triage;
  draft: Draft;
  quality: Quality;
  evidence: Evidence[];
}): {
  decision: 'auto_sent' | 'draft' | 'escalated' | 'skipped';
  reason: string;
  confidence: number;
  evidenceScore: number;
} {
  const { policy, triage, draft, quality, evidence } = args;
  if (policy.mode === 'off')
    return {
      decision: 'skipped',
      reason: 'AI_OFF',
      confidence: 0,
      evidenceScore: 0,
    };
  const evidenceScore = Math.max(0, ...evidence.map((x) => x.score));
  const citationsValid =
    draft.citation_ordinals.length > 0 &&
    draft.citation_ordinals.every(
      (n) =>
        evidence.some((x) => x.ordinal === n) &&
        draft.answer.includes(`[${n}]`),
    );
  const confidence = Math.min(
    triage.confidence,
    draft.confidence,
    quality.confidence,
  );
  if (triage.escalate || policy.excluded_intents.includes(triage.intent))
    return {
      decision: 'escalated',
      reason: 'POLICY_ESCALATION',
      confidence,
      evidenceScore,
    };
  if (!evidence.length || evidenceScore < policy.evidence_threshold)
    return {
      decision: 'escalated',
      reason: 'NO_RELIABLE_EVIDENCE',
      confidence,
      evidenceScore,
    };
  if (evidence.some((x) => containsPromptInjection(x.content)))
    return {
      decision: 'escalated',
      reason: 'UNTRUSTED_EVIDENCE',
      confidence,
      evidenceScore,
    };
  if (!quality.safe)
    return {
      decision: 'escalated',
      reason: 'UNSAFE_DRAFT',
      confidence,
      evidenceScore,
    };
  if (
    !citationsValid ||
    !quality.passed ||
    !quality.grounded ||
    !quality.tone_ok
  )
    return {
      decision: 'draft',
      reason: 'QUALITY_REVIEW',
      confidence,
      evidenceScore,
    };
  if (
    policy.mode === 'assisted' &&
    ['how_to', 'product_info'].includes(triage.intent) &&
    confidence >= policy.confidence_threshold
  )
    return {
      decision: 'auto_sent',
      reason: 'GATES_PASSED',
      confidence,
      evidenceScore,
    };
  return {
    decision: 'draft',
    reason:
      confidence < policy.confidence_threshold
        ? 'LOW_CONFIDENCE'
        : 'DRAFT_POLICY',
    confidence,
    evidenceScore,
  };
}
export const triageSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'priority',
    'sentiment',
    'language',
    'escalate',
    'confidence',
    'summary',
    'tags',
  ],
  properties: {
    intent: { type: 'string', enum: intents },
    priority: { type: 'string', enum: priorities },
    sentiment: { type: 'string', enum: sentiments },
    language: { type: 'string' },
    escalate: { type: 'boolean' },
    confidence: { type: 'number' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
};
export const draftSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'citation_ordinals', 'confidence'],
  properties: {
    answer: { type: 'string' },
    citation_ordinals: { type: 'array', items: { type: 'integer' } },
    confidence: { type: 'number' },
  },
};
export const qualitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['passed', 'grounded', 'safe', 'tone_ok', 'reason', 'confidence'],
  properties: {
    passed: { type: 'boolean' },
    grounded: { type: 'boolean' },
    safe: { type: 'boolean' },
    tone_ok: { type: 'boolean' },
    reason: { type: 'string' },
    confidence: { type: 'number' },
  },
};
