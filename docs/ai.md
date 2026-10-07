# Controlled AI support workflow (P07)

P07 remains blocked until an owner configures a real OpenAI credential and the live provider scenarios pass. The database and Edge worker are deployed to SupportSphere Supabase project `xviumgygixcklrbuynoh`; the web UI has been verified from a local production build, not deployed to Vercel.

## Flow

A customer message enqueues one `support_reply` run when workspace AI mode is enabled. A minute cron calls the authenticated `ai-worker` Edge Function. The worker leases a run, checks current policy and conversation state, triages into a strict schema, applies a deterministic sensitive-request gate, embeds the bounded query with Supabase `gte-small`, and searches only ready/enabled knowledge chunks in the same workspace. It drafts from numbered evidence, gets a structured quality decision, then requests auto-send, a human draft, or escalation. `finish_ai_run` rechecks the policy, message freshness, conversation handoff/assignment, citations, and thresholds inside one database transaction before any auto-send. Team members inspect steps and citations on `/app/ai/runs` and can submit feedback. A human can release a handoff.

Modes: `off` enqueues nothing; `draft_only` never auto-sends; `assisted` sends only `how_to` or `product_info` replies that pass all gates. Billing, security, privacy, legal, and account changes always require human review. Explicit human requests and sensitive phrases trigger deterministic handoff without a model call. Missing evidence, unsafe content, repeated provider failure, or exhausted leases generate a visible human handoff. Low confidence and quality uncertainty leave a human draft.

## Evidence and safety

Vector similarity from the existing 384-dimensional pgvector index is converted to a 0–1 score. The workspace evidence threshold defaults to 0.75; no result below it enters the prompt. Up to five 1000-character chunks and six recent 2000-character conversation messages enter the draft prompt. Retrieval is a service-only fixed RPC with a workspace ID from the leased run; the model cannot choose SQL, tools, URLs, or tenants. Provider input uses `instructions` for safety rules and serialized customer/evidence/style data as lower-priority `input`. A prompt-injection detector quarantines matching knowledge chunks and escalates. All retrieved documents remain untrusted, even when they do not match that detector. Secrets in customer/knowledge text are redacted before provider input and snippets.

The OpenAI Responses adapter uses strict JSON schemas and runtime validation for triage, draft, and quality. It sets `store:false`, has a 14-second request timeout and one retry for transport/429/5xx failures. Database jobs allow at most three leased attempts with 15/30-second backoff and a terminal visible failure/handoff. The active cron calls the worker once per minute, so the queue is durable but not immediate. Runs, steps, citations, token usage when provided, latency, error codes, feedback, and policy/prompt versions persist. The worker logs run and workspace IDs plus safe error codes; it does not log customer text or provider credentials.

## Configuration and verification

The worker requires Supabase Edge Function secrets `AI_PROVIDER=openai`, `AI_API_KEY`, and `AI_MODEL_TRIAGE`, `AI_MODEL_SUPPORT`, `AI_MODEL_QUALITY` naming a Responses model with structured output support. These are server-side project secrets, not browser variables. See `.agent/MANUAL_ACTIONS.md` for the owner action. The provider is currently unconfigured; the worker returns 503 before claiming a job, so enabled modes cannot produce a real reply until configured.

Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, then opt in to `tests/live/p07-ai.mjs` and `tests/live/p07-app-ui.mjs` with the exact project ref. Automated unit tests use controlled test outputs only. After the owner configures a provider, run the real-provider P07 scenario suite before marking the phase complete. Never put a real API key or service role key into test output, chat, Git, or the browser.
