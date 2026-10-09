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

Verification: Gemini adapter tests, all ten controlled decision scenarios, full static/browser build gate, live database/RLS suite, and authenticated P07 browser journey passed. Supabase advisors and execution logs were reviewed. Secret-name-only verification now finds all five `AI_*` names. The first scheduled real-provider smoke reached Google, but `gemini-2.5-flash` returned safe `PROVIDER_MODEL` (HTTP 404), so no model-backed answer or injection canary is claimed. Zero P07 test workspaces and queued/processing runs remain; no P07 web deployment to Vercel is claimed.

Owner action: MANUAL-008 now gives the exact Google AI Studio and Supabase Dashboard steps, including selecting a model available to this API key. The owner should save the key only in Supabase Edge Function Secrets and share only the chosen non-secret model IDs. Google’s free-tier data-use terms should be reviewed before real customer traffic is enabled; synthetic fixtures are used for verification.

Next: Verify secret names, then run the ten real Gemini scenarios through the scheduled worker, inspect run/citation/step/message/log evidence, clean fixtures, set VERIFYING, repeat the full phase gate, and set COMPLETE only if every criterion passes. Keep P07 active meanwhile.

## P07 Gemini verification pass — 2026-10-09

- Verified only secret names: `AI_API_KEY`, `AI_MODEL_QUALITY`, `AI_MODEL_SUPPORT`, `AI_MODEL_TRIAGE`, `AI_PROVIDER`; values were never read.
- Redeployed repository `ai-worker`; Supabase reports it active and both worker crons active every minute.
- Added `tests/live/p07-gemini.mjs`, which uses real ingestion, scheduled-worker polling, run/step/citation/message/handoff assertions, safe logs, and cleanup. It does not print customer text or secrets.
- Real smoke reached Google Gemini but `gemini-2.5-flash` returned HTTP 404, classified as `PROVIDER_MODEL`; the run safely failed/escalated and no message was sent. All retained synthetic workspaces/users were deleted.
- P07 remains `BLOCKED_MANUAL`. Owner must choose an available structured-output Gemini model in AI Studio and update all three model secrets, then rerun the suite.
