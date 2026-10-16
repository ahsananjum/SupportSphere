# P01 handoff

Status: COMPLETE (2026-10-01). P01 acceptance and full phase gate passed against Supabase project `xviumgygixcklrbuynoh`.

## Implemented

- Real Supabase authentication: signup, login, logout, confirmation, recovery/reset, Google OAuth, protected routes, callback, and safe redirects.
- Five tenant tables, RLS policies, read-only grants, atomic membership and invitation RPCs, last-owner protection, and audit logs. Applied migrations `20260930201144_p01_identity_tenancy.sql` and `20260930201423_restrict_rls_event_trigger.sql`.
- Live-generated database types and typed Supabase clients.
- Workspace creation/switching, role controls, onboarding foundation, invitation send/accept/resend/revoke/expiry, and Brevo delivery.
- Responsive forms and states for auth and invitations, with labels, validation, keyboard and focus behavior.

## Verified

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 unit tests), `pnpm test:e2e` (4 browser tests), `pnpm build`, and `git diff --check` passed.
- Hosted live security suite passed cross-tenant read/write, forged workspace ID, viewer/admin escalation, last-owner, invitation reuse, and audit isolation checks. Temporary data was removed.
- Brevo SMTP delivered confirmation and recovery mail. Fresh-browser links, password update/login, and reused-link rejection passed. Brevo invitation mail was delivered and accepted through real Google OAuth.
- Supabase MCP confirmed two migration versions, five RLS tables, five tenant policies, and no remaining app schema/RLS security advisor findings.
- Active invite and valid reset screens passed mobile widths 320/390/768/1440; browser suite covered auth widths 320–1440, keyboard skip link, and public navigation.
- MANUAL-001 through MANUAL-004 are VERIFIED. The verification workspace and temporary users were removed. One real Google user remains with no workspace.

Detailed evidence is in `.agent/QA.md`.

## Remaining provider note

Supabase security advisor reports provider-level leaked password protection disabled. Supabase documents this control for Pro plans and above; it is outside P01 acceptance. Performance advisor reports the invitation expiry index unused on the now-empty project; retain it for future expiry queries.

## Next phase

The owner explicitly deferred P02. Do not begin P02 public routes, legal/contact backend, pricing, or analytics until asked. The owner supplied `ahsananjum170@gmail.com` as a future public contact email; production domain is pending. No P01 owner action remains pending.

## Current-page design refinement — 2026-10-01

`DESIGN.md` and `tokens.css` now define the paper, ink, and mint visual system. Existing home, auth, invite, workspace, and team surfaces were refreshed; real P01 logic was preserved. Source-owned Motion Primitives provide text, group, view, and navigation motion with a local MIT notice and reduced-motion behavior. SEO now includes metadata, canonical home URL, local noindex, private-route exclusions, sitemap, robots, favicon, Open Graph image, and custom 404. Only the current home route is eligible for indexing when a public domain is configured.

Verification: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 passed; one opt-in remote test skipped), `pnpm test:e2e` (8 passed), and `pnpm build` passed. Browser checks include mobile navigation, public links, SEO files, responsive auth/invite, and reduced-motion hydration. Reviewed full-page home screenshots at desktop and 390px mobile plus auth/invite screenshots. See `.agent/QA.md` for details.

## P02 handoff — 2026-10-02

Status: **BLOCKED_MANUAL**; remain in P02. The prior P01 handoff above is historical and its instruction to defer P02 is superseded by the owner's current P02 request.

Implemented all required public routes, responsive navigation/footer, interactive workflow and route-specific diagrams, reduced-motion behavior, unique public metadata, conditional canonical/index strategy, icons/robots/sitemap, contact form, server validation and hourly abuse protection, live Supabase persistence with RLS, Brevo notification, signed thank-you state, legal pages using owner-supplied facts, and a documented privacy request procedure. The P02 migration `20261001210202` is applied to project `xviumgygixcklrbuynoh`, and database types were regenerated from that project. No optional analytics is running.

The full local phase gate passed: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 passed, one remote opt-in skipped), `pnpm test:e2e` (13 passed), `pnpm build`, and `git diff --check`. Browser checks cover every public route, 320–1440 px widths, links, headings/metadata, console errors, keyboard/focus, and reduced motion. A live browser contact submission reached the true thank-you state, persisted in Supabase, and Brevo accepted the notification; the QA row was removed. See `.agent/QA.md` for the exact evidence.

Open owner actions: `MANUAL-005` chooses/configures the exact Vercel production origin and Supabase callback, then enables live canonical/index verification. `MANUAL-006` resolves the city-only mailing-address limitation and approves/edits legal templates before commercial use. The owner explicitly requested displaying “Lahore, Pakistan” for now, so no address was invented. No Vercel MCP capability was available in this session; production deployment has not been inspected. After owner confirmation, verify the live provider/application behavior, repeat the P02 gate, then set `VERIFYING` and `COMPLETE`. Do not start P03 beforehand.

## P02 completion — 2026-10-02

Status: **COMPLETE**. The prior blocked handoff above is historical. The owner supplied Vercel project `support-sphere`, production origin `https://support-sphere-psi.vercel.app`, approved “Lahore, Pakistan” as the public address text, and approved the legal pages as-is. No street address or analytics property was invented; optional analytics remains off. `MANUAL-005` and `MANUAL-006` are verified.

Commit `7681bd5` was pushed to `origin/master` and deployed to Vercel Production (GitHub deployment `6796535046`, success). The live site passed a 12-page metadata and sitemap audit, 14 internal targets, custom 404, required widths 320–1440, cookie/CTA noncollision, keyboard and console checks. A real production contact form submission reached the signed thank-you state and persisted with Brevo API acceptance; the QA row was removed. Google OAuth initiated through Supabase with the exact production callback and provider redirect. Supabase MCP confirmed P02 migration history, RLS/grants, and expected advisor state.

Final local gate: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 pass, one intentionally skipped remote opt-in), `pnpm test:e2e` (13 pass), `pnpm build`, and `git diff --check` all passed. Production probes are in `tests/live/p02-production.mjs`, `tests/live/p02-contact-ui.mjs`, and `tests/live/p02-auth-origin.mjs`. Exact evidence is in `.agent/QA.md`. No P03 implementation was started.

## P03 handoff — 2026-10-03

Status: **COMPLETE**. Implementation commit `9fb2ae9` contains P03; acceptance and the final phase gate passed. See `.agent/QA.md` for exact commands and evidence.

Implemented a persisted setup sequence (workspace creation, identity, origin/sender status, team invitation, explicit knowledge skip, AI policy preference), a single desktop/mobile app navigation with a focus-managed drawer, server-validated workspace switching, role-aware team/settings routes, real general settings, owner security/audit view, and a member-scoped notification read surface. Existing P01 invitation/member actions remain the real team backend. Last-owner controls are hidden when unusable, and database RPCs now deny agent/viewer self-removal and viewer notification writes. Source-owned Motion Primitives use a hydration-safe reduced-motion hook.

Applied five P03 migrations to Supabase project `xviumgygixcklrbuynoh`: `20261002205848`, `20261002211804`, `20261002214802`, `20261002215444`, `20261002220242`. Generated TypeScript types were refreshed. Notifications have RLS and a workspace FK index. Security/performance advisors show no P03 findings; existing P02 contact-table INFO, older unused-index INFO, and provider leaked-password-protection WARN remain unchanged.

Final checks: typecheck, lint, format, 21 unit tests, 13 ordinary browser tests, production build, P01 and P03 live security suites, and the authenticated P03 production-build browser journey all passed. Browser coverage includes refresh at every setup step, direct route guards, multi-workspace switching, role-aware controls for owner/admin/agent/viewer, notification read, settings save/reload, 320–1440 px no-overflow, and mobile drawer keyboard behavior. Temporary Supabase workspaces/users were cleaned to zero. Ignored screenshots under `test-results/p03-visual/` were inspected at mobile and desktop sizes.

No P03 manual owner action is pending. P03 app code is local; the existing Vercel production site still serves P02 until a deployment is requested/performed. The P03 schema changes are backward compatible with the deployed P02 code. No P04 work has begun.

## P04 handoff — 2026-10-04

Status: **COMPLETE**. P04 is verified against the live Supabase project, including migration history, RLS/security behavior, concurrency, and the authenticated responsive browser journey. See `.agent/QA.md` and `MANUAL_ACTIONS.md` MANUAL-007.

### Implemented

- `supabase/migrations/20261004120000_p04_support_operations.sql`: customers, deterministic identities, conversations, messages, tickets, ticket events, tags, join tables, tenant RLS/select grants, composite workspace foreign keys, indexes, role-checked RPCs, message idempotency, customer advisory locking, ticket number locking, assignment membership checks, and audit events.
- `lib/supabase/database.types.ts`: regenerated from the live P04 schema.
- `lib/support/queries.ts` and `lib/validation/support.ts`: explicit workspace-scoped reads, search/filter/range pagination, and runtime validation.
- `app/app/inbox`, `app/app/customers`, and `app/app/tickets`: real DB-backed list/detail routes with empty/error/success states.
- `components/support/support-forms.tsx` and `app/app/support-actions.ts`: customer creation, conversation creation, message/internal note send with bounded retry key, ticket create/update, and status/priority/assignment actions.
- `components/shared/app-navigation.tsx` and `app/globals.css`: support navigation and responsive workbench styles.

### Verification

- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm format:check` — PASS.
- `pnpm test` — PASS, 21 tests; opt-in live security suites also passed (P01/P03/P04, 3 tests).
- `pnpm build` — PASS; P04 routes generated.
- `git diff --check` — PASS.
- `tests/live/p04-app-ui.mjs` — PASS; authenticated customer → conversation → reply → internal note → ticket → resolved journey and 320–1440px no-overflow checks.
- Supabase migration list — PASS; P04 versions `20261004120000`, `20261004130000`, and `20261004131500` match remote history.
- Live P04 concurrency — PASS; concurrent conversation and ticket updates serialized without errors, with ticket numbers remaining `1..8` and timeline events retained.
- Supabase security/performance advisors and linked schema lint — PASS for P04; only preexisting/expected notices remain.

### Next exact actions

P04 is complete. Preserve the applied migration history and verification evidence when starting the next phase.

## P05 handoff — 2026-10-06

Status: **COMPLETE**. P05 was implemented and verified against the live SupportSphere Supabase project and a separate local external host. No production Vercel deployment or installation on an owner's real website is claimed.

### Implementation

- `20261006043128_p05_widget_realtime.sql` and `20261006051012_p05_widget_security_indexes.sql` are applied remotely. They add owner-configured public keys/origins, private hashed anonymous sessions, atomic widget conversation/message RPCs, rate buckets, Realtime publication, and reviewed indexes/security wrappers. `lib/supabase/database.types.ts` was regenerated from the live schema.
- `/app/settings/widget` lets an owner/admin configure exact allowed origins and obtain the real async embed snippet. `public/widget/loader.js` inserts the SupportSphere iframe, and `/widget` provides the isolated customer UI. Server routes handle origin-scoped bootstrap, session restore, bounded message send, and paginated transcript reads.
- Inbox list/detail subscribe to tenant-filtered Supabase Postgres Changes, dedupe event IDs, and reconcile from the persisted database on subscription/reconnect/focus and a four-second missed-event fallback. The widget polls only its authorized session while open. Internal notes stay private.
- `tests/widget-host` is a separate local website. `tests/live/p05-widget.mjs` creates real temporary users/workspaces, runs the seven-step golden journey, checks hostile/guessed access, rate limits and visible 429, idempotent retry, foreign Realtime isolation, offline draft, long-history pagination, mobile widths, Escape focus, and reduced motion. It cleans fixtures in `finally`.

### Verification

- Formal gate while STATE was `VERIFYING`: typecheck, lint, format, 21 unit tests, 13 Playwright tests, production build, and diff check all passed.
- The opt-in P05 live production-build browser journey passed after the gate; screenshot review confirmed the open 390px panel. The initial clipped iframe was repaired by using a relative frame path tied to the loader script origin.
- MCP confirmed both P05 migration versions, `messages`/`conversations` Realtime publication, and zero `p05-%` test workspaces after the last run. Security advisor shows no new P05 WARN; private no-policy INFOs are intentional. Performance advisor has no unindexed P05 foreign keys; unused-index INFOs reflect sparse traffic. Provider leaked-password protection WARN predates P05.

### Next actions

P05 is complete. Continue to P06 only when requested. For a real customer site, the workspace owner should add its exact HTTPS origin in widget settings and paste the generated snippet into that site's page; no secret belongs in the page. Production deployment remains a separate release action.

## P06 handoff — 2026-10-07

Status: **COMPLETE**. Knowledge ingestion is implemented and verified against the live SupportSphere Supabase project and a local production build. No P07 work or P06 web deployment to Vercel is claimed.

### Implementation

- Four migrations through `20261007031612_p06_abandoned_upload_recovery.sql` are applied remotely. They create tenant-scoped sources/documents/chunks/jobs with RLS, private exact-path Storage policies, HNSW/full-text indexes, role-checked RPCs, a leased worker cron, a recovery cron for abandoned uploads, and source/job rate limits. Live database types were regenerated.
- The deployed `knowledge-worker` Edge Function extracts UTF-8 TXT/MD and selectable text PDFs, normalizes and splits documents, deterministically chunks, embeds with Supabase `gte-small`, and commits all chunks plus `ready` in one transaction. It retries transient errors at most three times. `docs/knowledge.md` documents content hashes, limits, recovery, errors, and environment setup.
- `/app/knowledge` and its detail route provide real upload/paste, lifecycle status, preview, retry/reindex, enable/disable, deletion, pagination, pending/empty/error/success states, and mobile/keyboard behavior. Permanent extraction and incomplete-upload failures give a correction path rather than a retry button. The onboarding knowledge step links to the real page.
- URL and DOCX inputs are not shown because their parser/security paths are not implemented. No owner-held AI key or manual setup is required for this phase; the Vault token was generated in the migration, and the project-specific worker URL was configured in Vault.

### Verification

- The final gate passed: typecheck, lint, format, 23 unit tests (3 unrelated opt-in skips), 13 Playwright tests, production build, and diff check.
- The opt-in P06 live suite passed text PDF success, malformed PDF failure, oversized file, foreign Storage path, cross-tenant vector denial, unchanged-hash reindex, transient embedding retry on attempt two, and both abandoned-upload paths. The authenticated production-build browser test passed real paste/upload/toggle/delete, visible permanent error, 320–1024px layout, menu Escape/focus, and no page errors. A solo rerun had a clean server log.
- Supabase MCP confirmed all P06 migrations, four RLS tables, both active knowledge crons, and no remaining P06 test rows/files. Advisor findings are recorded in `.agent/QA.md`. The browser test's 390px screenshot was visually reviewed.

### Next actions

P06 is complete. Continue with P07 only when requested. Deployment of the P06 web code to Vercel is a separate release action; the Edge worker and database migrations are already live.

## P07 blocked handoff — 2026-10-07

Status: **BLOCKED_MANUAL** in P07. The owner must complete MANUAL-008; do not advance to P08 or claim real-provider success.

Implementation: Five migrations `20261007061500` through `20261007080034` are applied to SupportSphere Supabase. They add AI policy/runs/steps/citations/feedback, tenant RLS, worker lease and cron, service-only retrieval, transactional send/handoff and retries, and FK indexes. `ai-worker` v3 is deployed and active. The OpenAI Responses adapter, deterministic gates, settings, inbox draft/handoff, run inspector, feedback, tests, and `docs/ai.md` are in source. Generated DB types match remote. The web app was tested from a local production build; no P07 Vercel deployment is claimed.

Verification: Ten controlled unit scenarios passed; the live database suite passed off, tenant/RLS, draft, quality, auto-send/citation/trace/feedback, no evidence/handoff, and outage terminal paths. Authenticated browser journey passed settings/draft/inspector/feedback at 320–1024 px; both settled 390px screenshots were inspected, and menu Escape returned focus. Static gates passed after formatting two files and rerunning `pnpm format:check`; `git diff --check` passed. Final commands/results are in `.agent/QA.md`. Supabase advisors, active cron/function, and zero P07 fixtures were checked.

Manual gate: Supabase has no `AI_*` Edge Function secrets. The owner must create a private OpenAI project key with approved billing and set `AI_PROVIDER`, `AI_API_KEY`, and three structured-output model IDs in Supabase Edge Function Secrets. Exact steps and prohibited secret sharing are in `.agent/MANUAL_ACTIONS.md` MANUAL-008.

Next: After owner confirmation, verify secret names, run all ten real-provider scenarios in isolated live workspace, inspect output/citations/handoff/logs and clean fixtures, then set `VERIFYING` and repeat the full P07 gate. Set `COMPLETE` only after objective real-provider proof. No provider key should enter chat, source, logs, or browser.

## P07 Gemini blocked handoff — 2026-10-09

Status: **BLOCKED_MANUAL**, still P07. Owner superseded the OpenAI provider choice with Google AI Studio Gemini Free Tier. The worker adapter and environment validation now accept `gemini` only. `ai-worker` v4 is deployed with fixed-host Gemini `generateContent` REST calls, native JSON `responseSchema`, exact-key runtime validation, bounded 429/transport retry, token accounting, and no model tools. The database graph, migrations, RLS, prompt version, citations, policy modes, final send gate, and UI remain intact.

Verification: Gemini adapter tests, all ten controlled decision scenarios, full static/browser build gate, live database/RLS suite, and authenticated P07 browser journey passed. Supabase advisors and execution logs were reviewed. Secret-name-only verification now finds all five `AI_*` names. The first `gemini-3.8-flash` verification reached Google and produced one grounded auto-send, a safe no-evidence escalation, and a safe rate-limit terminal handoff. Later suite runs exhausted free-tier quota and returned `PROVIDER_RATE_LIMIT`, so remaining model scenarios are not claimed. Zero P07 test workspaces and queued/processing runs remain; no P07 web deployment to Vercel is claimed.

Owner action: MANUAL-008 now gives the exact Google AI Studio and Supabase Dashboard steps, including restoring free-tier quota or supplying a project/key with quota. The owner should save the key only in Supabase Edge Function Secrets and share only the chosen non-secret model IDs. Google’s free-tier data-use terms should be reviewed before real customer traffic is enabled; synthetic fixtures are used for verification.

Next: Verify secret names, then run the ten real Gemini scenarios through the scheduled worker, inspect run/citation/step/message/log evidence, clean fixtures, set VERIFYING, repeat the full phase gate, and set COMPLETE only if every criterion passes. Keep P07 active meanwhile.

## P07 Gemini verification pass — 2026-10-09

- Verified only secret names: `AI_API_KEY`, `AI_MODEL_QUALITY`, `AI_MODEL_SUPPORT`, `AI_MODEL_TRIAGE`, `AI_PROVIDER`; values were never read.
- Redeployed repository `ai-worker`; Supabase reports it active and both worker crons active every minute.
- Added `tests/live/p07-gemini.mjs`, which uses real ingestion, scheduled-worker polling, run/step/citation/message/handoff assertions, safe logs, and cleanup. It does not print customer text or secrets.
- Real smoke reached Google Gemini but `gemini-2.5-flash` returned HTTP 404, classified as `PROVIDER_MODEL`; the run safely failed/escalated and no message was sent. All retained synthetic workspaces/users were deleted.
- P07 remains `BLOCKED_MANUAL`. Owner must choose an available structured-output Gemini model in AI Studio and update all three model secrets, then rerun the suite.

## P08 final handoff — 2026-10-10

Status: **COMPLETE**. P08 reliable workflow infrastructure is implemented, applied, and verified. The active Supabase migrations are `20261010122310_p08_workflows`, `20261010122718_p08_automation_run_fk_index`, `20261010123000_p08_named_rpc_args` (remote 20261010131332), and `20261010132500_p08_automation_rule_fk_index_order` (remote 20261010132605); the automation worker cron runs every minute.

The final authenticated production-build smoke created a real automation through `/app/automations`, confirmed the success state and no page errors, and passed 320/360/390/768/1024px overflow checks. Static gates passed with 45 unit tests and 3 opt-in skips, ESLint, Prettier, TypeScript, route type generation, production build, 13 Playwright tests, and diff check. Supabase live probes proved duplicate trigger suppression, notification dedupe, RLS, cron, cleanup, and no unindexed foreign-key advisor findings. P07 remains blocked on its existing Gemini manual gate; that does not block this P08 handoff.

Continue with P07 MANUAL-008 only when the owner provides the required non-secret model/quota confirmation. For P08, no manual action remains.

## P09 implementation handoff — 2026-10-11

Status: VERIFYING. Analytics and persisted AI evaluation are implemented and live in Supabase. The final phase gate is waiting on the known Playwright webServer/pnpm Windows shim limitation being rerun in a host where pnpm can start, although the dedicated authenticated P09 smoke passed.

Changed: `app/app/analytics`, `lib/analytics`, `components/shared/app-navigation.tsx`, `app/globals.css`, generated Supabase types, P09 migrations, unit/live tests, and agent records.

Live schema: Supabase MCP applied P09 migrations (remote versions `20261011055252` and `20261011060612`), with evaluation tables RLS-enabled, role-checked `ensure_evaluation_cases`/`run_ai_evaluation`, and evaluation FK indexes. The authenticated smoke created five curated cases and one stored run with five explicit `NO_MATCHING_INPUT` results, then removed all fixtures; MCP confirmed zero retained evaluation rows.

Verification: TypeScript, ESLint, Prettier, 48 unit tests, elevated webpack production build, Supabase advisors, migration history, `git diff --check`, and authenticated 320/360/390/768/1024px analytics smoke passed. Full Playwright could not start because its configured `pnpm dev` webServer hit the Windows pnpm shim EPERM; do not claim that suite passed.

Next: rerun `node_modules/.bin/playwright test` where `pnpm dev` starts successfully. If it passes and no criterion regresses, update QA, set STATE to `COMPLETE`, and keep P07 Gemini quota blocker separate. If host limitation persists, retain VERIFYING and record it.

## P09 final handoff — 2026-10-11

Status: COMPLETE. Workspace analytics and persisted evidence-bound evaluation are implemented and verified.

Changed: `app/app/analytics` (page/actions/loading/error), `lib/analytics`, analytics navigation/styles, generated Supabase types, P09 migrations and FK indexes, analytics unit/live tests, and agent records.

The analytics page reads real RLS-filtered conversations, messages, tickets, AI runs, citations, and feedback. It supports timezone-aware inclusive date ranges, text summaries, empty/error/loading states, and responsive mobile layout. Metric definitions and denominators live in `lib/analytics/definitions.ts`.

The evaluation harness stores curated cases, run metadata, and per-case results in Supabase. Owner/admin role checks run the harness; it only matches real customer messages to persisted AI runs and citations. Missing runs are explicit failures, and no fabricated accuracy is shown.

Verification passed: TypeScript, ESLint, Prettier, 48 unit tests, 13 Playwright E2E tests, elevated webpack build, Supabase migrations/RLS/advisors, live evaluation persistence/cleanup, mobile widths, and diff check. P07’s Gemini quota blocker remains recorded separately and is not reclassified by P09.

## P10 handoff — 2026-10-11

Status: COMPLETE. P10 selected outgoing webhooks; Stripe/Slack remain deliberately unselected until a real provider configuration and server entitlement path are verified.

Implementation: `/app/settings/integrations` now manages real owner/admin webhook endpoints with HTTPS validation, event selection, pending/connected/disconnected/error state, edit, test, revoke, confirmation, one-time secret display, Vault-backed secret rotation, delivery history, loading/empty/error/success states, and mobile-safe controls. The server does not trust client roles or endpoint ownership.

Data/runtime: Local P10 migrations through `20261011141000` add tenant-scoped connection/endpoints/deliveries, RLS and column grants, idempotent queue/lease/finalizer functions, Vault secret refs, revocation/cancellation, status evidence, P08-safe support-event triggers, worker token and minute cron; Supabase reports the latest applied remote version as `20261011114641`. `webhook-worker` v5 is active and uses exact-body HMAC signatures, HTTPS/no-redirect delivery, DNS A-record/private-range rejection, bounded timeout/retries, safe error codes, and no response-body logging. `lib/integrations/signature.ts` and `docs/integrations.md` document strict receiver verification.

Evidence: authenticated P10 UI smoke passed at 320/360/390/768/1024px; full 13-test Playwright suite passed; TypeScript, ESLint, Prettier, 51 unit tests, webpack build, diff check, live idempotency/success/retry/error/RLS/schema/advisor/log probes passed. A real httpbin delivery returned HTTP 200 and promoted pending to connected. P10 fixtures and Vault secrets were cleaned to zero.

Credential hygiene: MANUAL-009 is verified. The owner rotated the exposed credentials; a metadata-only server query and the authenticated P10 smoke succeeded with the replacement configuration. No credential values were read or printed.


Final invariant pass: `20261011140000_p10_final_invariants.sql` restores P08 triggers and adds an independent P10 trigger, composite tenant FK/index, Vault cleanup trigger, endpoint/test rate limits, manual retry, active lease checks, lease exhaustion terminalization, and provider state synchronization. `20261011141000_p10_webhook_visibility.sql` grants only the safe `revoked_at` metadata column needed by the authenticated UI. `webhook-worker` v5 validates public DNS A records immediately before HTTPS delivery, rejects private/reserved/test ranges and redirects, and uses the JSON claim contract. Final live probes passed HTTP 200 success and HTTP 500 bounded retry (`attempts=2`, `HTTP_500`); cleanup counts for P10 endpoints/deliveries/Vault secrets are zero.

P10 has no remaining manual blocker. The prior ignored `.env` inspection exposure was rotated and verified without reading or printing replacement values. P07 Gemini quota remains a separate phase blocker.

## P11 handoff — 2026-10-11

Status: COMPLETE (2026-10-11). P11 repaired the live polymorphic automation/webhook trigger regression in `20261011121955_p11_trigger_hardening`, added auth abuse limits with a service-only atomic database fallback, explicit authenticated Realtime initialization, enforced CSP/security headers that preserve the cross-origin widget, and patched Next.js/source-map-js high advisories.

Live evidence: P01/P03/P04 tenant attack suites passed; P05 widget golden host, strict Realtime event, origin/session/rate/storage checks passed; P08 automation and P10 integration UI passed at 320/360/390/768/1024px; Supabase MCP migration/policies/advisors inspected; headers smoke passed; `pnpm audit --prod --audit-level high` reports no known vulnerabilities. Static gate passed with TypeScript, ESLint, Prettier, 52 unit tests, elevated Next 16.3.8 webpack build, and diff check.

Findings retained for the final P11 review: P07 Gemini real-provider injection suite remains blocked by its existing owner quota gate; Supabase leaked-password protection is a provider-plan WARN; webhook DNS validation still has a theoretical DNS rebinding window after immediate public-A validation. These are documented in `.agent/QA.md`; no application high-severity advisor finding remains.

Next exact actions: preserve the P11 evidence and keep P07 MANUAL-008 as a separate provider/quota gate; do not reclassify that prior blocker as a P11 finding.

## P11 verification update — 2026-10-12

Status: COMPLETE.

This pass repaired repository-level verification reliability by pinning Vitest to the Windows-safe thread pool and disabling file-level parallelism. It also removed the `X-Powered-By` fingerprinting header and added a Playwright regression for public/widget security headers.

Verification passed: `node_modules/.bin/vitest run` (52 passed / 3 skipped), `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint .`, `node_modules/.bin/prettier --check .`, elevated `node_modules/.bin/next build --webpack`, `pnpm audit --prod --audit-level high`, client bundle secret scan, `node_modules/.bin/playwright test` (14 passed), Supabase security/performance advisors, and `git diff --check`.

No new migration or manual owner action was introduced. P07 MANUAL-008 Gemini quota/provider verification remains separately blocked and must not be represented as a P11 failure.

## P12 final handoff — 2026-10-12

Status: COMPLETE.

P12 completed the exhaustive route/control, accessibility, responsive, SEO, performance, and permission audit. `docs/p12-route-control-inventory.md` records every public, auth, app, widget, and API family with expected content and state behavior. The real authenticated audit `tests/live/p12-app-audit.mjs` passed 153 checks against disposable Supabase fixtures: all app/detail routes, empty/populated/error/validation/success states, support writes, field errors, automation ticket actions/toggle/confirmed delete, settings persistence, knowledge transitions, owner/admin/agent/viewer behavior, keyboard focus, console, cleanup, and 320/360/390/768/1024/1440px overflow.

P12 repaired the widget fallback semantic heading/metadata, added role-safe support controls and server checks, added automation action fields and surfaced mutation errors, added destructive confirmations, fixed the hidden mobile filter-label overflow, and stabilized Playwright on Windows with the direct Next webpack server and one worker. The full browser suite passed 19/19; the production webpack build, TypeScript, ESLint, Prettier, Vitest (52 passed / 3 skipped), diff check, and Supabase MCP RLS/advisor/migration inspection passed. No P12 migration or manual owner action was required. Vercel MCP was unavailable; production origin/canonical behavior remains covered by the owner-configured P02 record. P07 MANUAL-008 remains a separate Gemini provider/quota gate.

## P13 in-progress handoff — 2026-10-12

Status: BLOCKED_MANUAL.\r\n\r\nCommitted as `315c76c` (`feat(release): package P13 deployment proof`); working tree is clean.

Implemented this pass: replaced the P00 README with the actual SupportSphere portfolio/reproducibility package; added `docs/demo-seed.md` and idempotent `scripts/seed-demo.mjs`; added `pnpm seed:demo`; generated and visually reviewed `docs/screenshots/production-home.png`; added final migration `supabase/migrations/20261012163227_p13_reproducibility_trigger_hardening.sql` and applied it to Supabase; recorded ADR-021 and P13 QA evidence.

Supabase evidence: project `xviumgygixcklrbuynoh` is ACTIVE_HEALTHY; migration `20261012163227` is applied; both automation/webhook trigger functions are JSON-safe; all five cron workers are active; advisor findings remain the documented intentional INFO/WARN set. Generated-types MCP call completed; no schema type changes were introduced.

Production evidence: `https://support-sphere-psi.vercel.app` served the public site; read-only P02 production smoke passed public pages, SEO/canonical/robots/sitemap, keyboard, console, six widths, 404, and internal-link checks; OAuth initiation smoke passed the exact production callback; the widget loader returned 200. The screenshot is linked from README.

Static evidence: TypeScript, ESLint, Prettier, 52 unit tests / 3 skipped, elevated webpack build, diff check, node seed syntax, and tracked-file secret scan passed. The full Playwright command stalled before a report on Windows and was stopped; focused `tests/e2e/p12-public.spec.ts` passed 5/5, prior P12 had 19/19, and the dedicated production smoke passed.

Manual blockers: MANUAL-010 requires rotation of the credentials exposed in this session's `.env` inspection. MANUAL-011 requires Vercel connector installation/inspection, current production deployment commit and environment parity, and production OAuth/email runtime verification. Existing MANUAL-008 still blocks real Gemini provider scenarios because of quota/model availability. Do not mark P13 complete or claim the full golden journey.

Next exact actions:

1. Owner rotates MANUAL-010 values and confirms without sharing secrets.
2. Owner connects Vercel and redeploys the current tree with production-only env values; share only URL/commit metadata.
3. Verify metadata-only Supabase access, Edge workers, Vercel runtime/logs, Brevo links, OAuth callback, and production commit parity.
4. Run `node --env-file=.env.demo.local scripts/seed-demo.mjs` in a dedicated demo workspace, wait for indexing, then execute and record the full deployed golden journey.
5. Re-run the full static/browser/mobile/security/secret gate; commit coherent P12/P13 changes; only then set VERIFYING → COMPLETE.

The complete testing guide is now at `docs/verification-runbook.md` and linked from README. It is documentation-only, passed formatting/diff/credential-pattern checks, and was committed as `485a82e`. P13 remains BLOCKED_MANUAL for the previously recorded owner gates.

## Owner follow-along guide handoff — 2026-10-13

Status: BLOCKED_MANUAL. Active phase remains P13.

Owner requested a guide with every test input provided, requiring only following steps and observing behaviour. TESTING_GUIDE.md is now the primary owner entry point: 65 identified checks covering public/auth/onboarding/support/tickets/knowledge/widget/team/notifications/automations/AI/webhooks/analytics/tenant isolation/mobile/accessibility/providers, plus expected outcomes, explanations, negatives, troubleshooting, and cleanup. docs/owner-test-results.md contains matching blank result rows. docs/test-inputs/ contains the exact reusable TXT/Markdown upload fixtures. The only owner substitutions are private emails/passwords, generated keys/URLs, and the tested origin. README and the technical runbook link the new guide.

No application code, migration, database records, or provider configuration changed. Targeted formatting, 29 local links, all 65 test IDs, fixture consistency, blank results, credential-like pattern scan, and diff checks passed. Application test suites were not rerun for this documentation-only change. No .env values were read and no production behaviour was newly tested.

Source review findings are in guide section 19; they include missing UI paths, list limits without pagination, incomplete filters/tags/assignment/edit controls, evaluation-case/policy mismatches, and unproven full migration replay. Treat them as required reconciliation work rather than silently marking them complete. Prior deployed trigger inspection does not prove the full migration chain works from an empty database.

Next exact actions:

1. Owner resolves existing MANUAL-010/011 before authenticated production testing; MANUAL-008 remains necessary for real AI proof.
2. Owner follows TESTING_GUIDE.md from R01 with a fresh empty QA workspace and fills the results sheet; do not run demo seed before onboarding/empty tests.
3. Developer reproduces reported failures, reconciles section 19 with the root requirements, and verifies direct backend/RLS/provider/security evidence in the same P13 phase.
4. Verify isolated migration replay and deployment commit parity; finish the real deployed golden journey and full release gate before changing phase status.

## AI-only owner testing guide — 2026-10-17

Status: BLOCKED_MANUAL. Active phase: P13.

Owner reports AI enabled and requested a complete AI-only from-scratch guide with all prerequisites and inputs. Added AI_TESTING_GUIDE.md (42 primary tests), docs/ai-test-results.md (125 blank primary/subcase rows), and six synthetic knowledge files in docs/test-inputs/ai/. Includes account/workspace/onboarding, knowledge readiness, external widget/customer sessions, modes, structured triage variations, real cited draft/auto-send, human review/handoff/release, feedback, retrieval/source lifecycle, sensitive cases, stale-send guards, injection/redaction, quality/provider failures, quotas/dedupe, AI automations, notifications/tickets, analytics/evaluation, roles/isolation, mobile/accessibility, backend/operator checks, requirement mapping, cleanup. Only private emails/passwords and generated app values require owner substitution. README, general guide, and docs/ai.md link the new guide.

Read-only Supabase MCP: project healthy, migrations through 20261012163227, knowledge-worker v10 / ai-worker v14 / webhook-worker v6 active, five cron jobs active, ten inspected AI/knowledge/evaluation tables RLS-enabled. Deployed AI entrypoint/shared files match local source after newline normalization. No AI runs created since 2026-10-13 were present, so real provider enablement was not newly proven or disproven. Security advisor categories/remediation links recorded in the guide. No Vercel tool available; current web commit parity remains unverified. No app code, migration, DB rows, credentials, or provider configuration changed; no .env values were read.

Validation: focused AI Vitest 15/15 passed; explicit Markdown Prettier check passed; 50 local links and 10 heading links resolve; all 42 primary IDs match results rows; 125 rows blank; five inline fixtures match supplied text; six fixtures total; credential-like scan of 13 files found no matches; git diff --check passed. Full app/build/browser/live-provider suites were not rerun for documentation-only edits.

MANUAL-008 now PENDING_VERIFICATION: owner-reported enabled, not another presumed setup request. MANUAL-010/011 remain unresolved in repository truth. New source-based concerns are explicitly testable: generic AI automation jobs lack a demonstrated consumer; handoff priority changes can suppress escalation-trigger automations; evaluation refund/reason expectations need policy alignment. No new production mutation reproduced those concerns in this pass.

Next exact actions:

1. Owner uses AI_TESTING_GUIDE.md from AI01 with fresh synthetic accounts/workspace and fills docs/ai-test-results.md. Follow private-value substitutions; do not seed or send greetings before each test input.
2. Verify a real grounded Gemini draft and assisted reply, then Off/Draft-only/sensitive/unknown/injection/handoff/feedback/role/tenant results and conditional subcases. Close MANUAL-008 only with actual scenario evidence.
3. Developer verifies direct backend/race/security proof, downstream automation consumption, Normal-priority escalation events, and evaluation-policy alignment; repair confirmed required gaps in P13.
4. Resolve other manual release gates, prove deployment parity and isolated migration replay, execute the deployed golden journey, and run the full phase gate before VERIFYING/COMPLETE.
