# Controlled AI support workflow (P07)

**Approved upgrade contract (18 October 2026):** [human-controlled automation](automation-and-human-control.md) and U0/U2/U3 in [the roadmap](upgrade-roadmap.md) require protected human drafts, deliberate adoption, named evidence, clear terminal state and transactional stale/override checks. These are implementation targets; existing safety authority must not be broadened. Enhance matching AI tests and both testing guides with each implemented change. Real-provider proof remains assigned to U6/P13.

Owner update, 17 October 2026: AI is reported enabled. Use [AI_TESTING_GUIDE.md](../AI_TESTING_GUIDE.md) and [the AI results sheet](ai-test-results.md) to verify actual model output from scratch. Read-only MCP confirms active knowledge-worker v10 / ai-worker v14 and scheduled jobs, with deployed AI source matching the repo. No runs created since 13 October were present in the metadata query; provider success after enablement has not yet been exercised by this documentation pass. MANUAL-008 awaits scenario evidence rather than another assumed setup request.

Historical P07 verification was blocked on model access/quota. The database/worker are deployed to Supabase project `xviumgygixcklrbuynoh`. Web deployment parity and the full real-provider release gate remain separately unproven; the old local-UI evidence does not establish the current Vercel commit.

## Flow

A customer message enqueues one `support_reply` run when workspace AI mode is enabled. A minute cron calls the authenticated `ai-worker` Edge Function. The worker leases a run, checks current policy and conversation state, triages into a strict schema, applies a deterministic sensitive-request gate, embeds the bounded query with Supabase `gte-small`, and searches only ready/enabled knowledge chunks in the same workspace. It drafts from numbered evidence, gets a structured quality decision, then requests auto-send, a human draft, or escalation. `finish_ai_run` rechecks the policy, message freshness, conversation handoff/assignment, citations, and thresholds inside one database transaction before any auto-send. Team members inspect steps and citations on `/app/ai/runs` and can submit feedback. A human can release a handoff.

Modes: `off` enqueues nothing; `draft_only` never auto-sends; `assisted` sends only `how_to` or `product_info` replies that pass all gates. Billing, security, privacy, legal, and account changes always require human review. Explicit human requests and sensitive phrases trigger deterministic handoff without a model call. Missing evidence, unsafe content, repeated provider failure, or exhausted leases generate a visible human handoff. Low confidence and quality uncertainty leave a human draft.

## Evidence and safety

Vector similarity from the existing 384-dimensional pgvector index is converted to a 0–1 score. The workspace evidence threshold defaults to 0.75; no result below it enters the prompt. Up to five 1000-character chunks and six recent 2000-character conversation messages enter the draft prompt. Retrieval is a service-only fixed RPC with a workspace ID from the leased run; the model cannot choose SQL, tools, URLs, or tenants. Provider input places safety rules in Gemini `systemInstruction` and serialized customer/evidence/style data in lower-priority `contents`. A prompt-injection detector quarantines matching knowledge chunks and escalates. All retrieved documents remain untrusted, even when they do not match that detector. Secrets in customer/knowledge text are redacted before provider input and snippets.

The Gemini `generateContent` REST adapter sends immutable safety instructions in `systemInstruction` and untrusted customer/evidence data in `contents`. It requests `application/json` with native `responseSchema`, then validates every required field, type, bound, and exact key set in application code. It never supplies tools. The API key goes in the server-only `x-goog-api-key` header, never the URL or logs. Each call has a 14-second timeout and one bounded 1-second backoff retry for transport/408/429/5xx failures; the database supplies further 15/30-second exponential job retries. Jobs allow at most three leased attempts before terminal visible failure and handoff. The active cron calls the worker once per minute, so the queue is durable but not immediate. Runs, steps, citations, token usage when provided, latency, error codes, feedback, and policy/prompt versions persist. The worker logs run and workspace IDs plus safe error codes; it does not log customer text or provider credentials.

## Configuration and verification

The worker requires Supabase Edge Function secrets `AI_PROVIDER=gemini`, `AI_API_KEY`, and `AI_MODEL_TRIAGE`, `AI_MODEL_SUPPORT`, `AI_MODEL_QUALITY` naming a Gemini `generateContent` model with structured output support. These are server-side project secrets, not browser variables. See `.agent/MANUAL_ACTIONS.md` for the owner action. The Gemini provider secrets were absent by name on 2026-10-09; the worker returns 503 before claiming a job, so enabled modes cannot produce a real reply until configured.

Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, then opt in to `tests/live/p07-ai.mjs` and `tests/live/p07-app-ui.mjs` with the exact project ref. Automated unit tests use controlled test outputs only. After the owner configures Gemini, run the real-provider P07 scenario suite before marking the phase complete. Google documents that [free-tier content may be used to improve its products](https://ai.google.dev/gemini-api/docs/pricing), so live verification uses synthetic fixture customers and articles. Review the provider data terms before enabling AI for real customer traffic. Never put a real API key or service role key into test output, chat, Git, or the browser.

### U0 draft/state correction (local implementation)

Composer identity follows the conversation, not the latest AI run. Suggestions require explicit Use this draft with a protected replacement choice for existing writing; new runs never replace human writing. Failed/skipped status takes precedence over any persisted decision. Missing author identity is not labelled You. U0 local acceptance is recorded in QA; current provider/deployed proof remains U6/P13.

## U0 scoped automation requests

Existing ai_runs.run_type now distinguishes support_reply, triage and draft. Triage automation classifies only; draft automation cannot auto-send. Both use the same processor, policy/sensitive checks, leases and bounded failure paths as support replies. The final database write independently caps automation send authority and rechecks the origin rule/version. Successful local controlled-provider fixtures prove wiring and persisted outcomes, not current Gemini/provider/deployed execution. See [inventory](automation-inventory.md).

## U1 shared review presentation

AI lists, inspectors and conversation suggestions use [shared automated-action feedback](ui-foundation.md#automated-action-feedback--u17). A failed/skipped/unknown state cannot become completed because of a stored decision. Queued retries are visibly distinct from initial queueing. Safe reasons point to existing review controls; drafts remain explicit, editable human work. No AI send authority or mode gate changed. U0 local acceptance is complete; current U1 proof and remaining release limits are in STATE/QA.

## U2 support-state protection

Pending AI work captures the support revision. Claim, finish and failure paths recheck and lock the latest target before changing it; manual assignment/note/reply/handoff or newer input stops stale effects with a safe HUMAN_OVERRIDE reason. Composer audience and private note action are explicit, and human text remains independent of AI-run identity. Controlled local tests include a fully eligible cited database send and rejected stale/duplicate finalizations; they do not prove the current provider or deployment. Hosted rollout must review pending work before activating the new local-only schema.

## U3.3 — Named evidence during review

Conversation suggestions and the run inspector show numbered recorded snippets with the current authorized source name and readiness. Open source links use a separate tab so the unsaved conversation reply stays mounted. Removed or inaccessible sources have no source link; their recorded snippet is explicitly historical. A missing original chunk is also identified as historical. Failed citation/source queries are distinct from no evidence and have Refresh review, which refreshes server data without navigating away or resetting the composer. Current readiness never changes the historical run outcome.

## U3.4 — Deliberate draft use

Use this draft only copies text into the current composer; it never sends, saves, changes audience, or authorizes automation. An empty composer adopts directly and returns focus to Reply. With existing writing, choose Keep my writing or Replace with reviewed draft. Replacement is bound to the displayed suggestion identity/content and the existing composer text; a newer suggestion or changed human text disables that choice until Use this draft is deliberately selected again. AI/realtime updates cannot replace human text. The existing send/note action remains a separate role-checked durable mutation.

## U3.5 — Run review hierarchy

The run review leads with the saved outcome/safe reason, Next action, Answer and named evidence. Triage/quality use Passed / Did not pass / Not recorded instead of raw booleans. Technical details contains the original execution facts, reason/error codes, versions, usage, explicit workspace timestamps and optional step JSON. A failed trace or feedback query does not hide the answer/evidence; each failed section can refresh independently. Recorded policy is distinguished from the latest policy/version and changed policy never authorizes new work. Human feedback preserves comment/rating on rejected saves, shows pending/status feedback and uses the existing per-user/run upsert.

## U3.6 — Policy and handoff consequences

AI policy explains all three modes and their effects on new and pending work. Confidence alone is not permission to send. Sensitive actions remain mandatory human work; assignment/closed/handoff/evidence/quality/version gates still apply. Field errors are associated with controls; pending disables the editable fieldset, errors preserve inputs/exclusions and uncertain network saves ask you to inspect the stored policy before retrying. Unsaved changes are visible. Policy mode labels come from the same vocabulary in run review and conversation handoff.

Release AI handoff opens a named confirmation describing future eligible messages. Cancel does nothing. Confirm clears only the existing handoff latch, with the existing role check/audit; it neither sends/replays old questions nor clears assignment/status. Human reply/note text survives. Draft replacement choices include the policy identity delivered by the latest server refresh, so a changed loaded policy invalidates an open choice. Final automatic-send authority always uses current database policy. This remains human editing, not automatic-send authorization.

Trace review uses readable Triage/Policy check/Evidence retrieval/Draft generation/Quality review/Decision labels and Passed/Failed/Skipped step status. A missing completion timestamp is Not recorded, distinct from the saved terminal state. Technical details retains reason/error codes, citation IDs/scores and step metadata JSON.
