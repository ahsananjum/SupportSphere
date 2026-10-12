# SupportSphere verification runbook

This is the repeatable procedure for proving what SupportSphere currently implements. It is written from the repository, migrations, tests, and recorded production evidence. A green UI is not enough: each check below proves a different layer of the product.

The runbook has two modes:

- **Local/repository verification** proves code, types, validation, UI states, migrations, and tests.
- **Live/deployed verification** proves provider configuration, real Auth, real email, real Supabase data, workers, deployment parity, and the production golden journey.

The current phase is **P13 / BLOCKED_MANUAL**. The public deployment and Supabase project have been verified, but credential rotation, Vercel environment/commit inspection, and the Gemini quota gate still prevent a complete release claim. Never report a blocked check as passed.

## 1. Understand the release boundary

SupportSphere is a Next.js App Router application. The browser talks to Next.js, Supabase Auth/Postgres/Storage/Realtime, Redis-compatible REST coordination, Brevo email, and scheduled Supabase Edge workers. Postgres is the source of truth; RLS and server-side role checks protect workspaces; background work is durable and leased; AI is deterministic and human-gated.

Truthful current limitations:

- Gemini real-provider verification is blocked by model/quota availability. Keep AI mode off in demo data until the gate passes.
- Stripe is intentionally unselected; do not test or claim billing.
- Optional analytics is intentionally disabled; the cookie notice says so.
- URL and DOCX knowledge inputs are intentionally unavailable.
- The current public origin is https://support-sphere-psi.vercel.app.
- Vercel MCP is not connected in this session, so public reachability is proven but deployment commit and server-only environment parity still need owner verification.



## 2. Safety rules before testing

1. Use a dedicated test/demo workspace. Never use a real customer workspace for destructive tests.
2. Keep server keys, passwords, OAuth secrets, Brevo keys, Redis tokens, job tokens, and AI keys in an ignored env file or provider secret manager.
3. Do not paste env files, authorization headers, email tokens, customer text, or secret values into chat, source, screenshots, or logs.
4. Do not enable AI auto-send for real customers while Gemini verification is incomplete.
5. Live scripts create disposable users/workspaces and should clean them in finally blocks. If a script stops unexpectedly, inspect Supabase for retained p## fixtures and remove only the named test rows.
6. Use the exact project ref xviumgygixcklrbuynoh when a live script requires one. Never point SupportSphere tests at an unrelated Supabase project.



## 3. Prepare the machine

Required versions are Node.js 22.17+ and pnpm 11.25.0. From the repository root:

    node --version
    pnpm --version
    pnpm install --frozen-lockfile

The frozen install prevents a local dependency resolver from silently changing the lockfile before verification.

Create an ignored local file from the placeholders:

    Copy-Item .env.example .env.local

For local public/auth work, configure at minimum:

    NEXT_PUBLIC_APP_URL=http://localhost:3000
    NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

For server-backed local work, add the server-only values required by that path. Do not add them to NEXT_PUBLIC variables. The complete variable inventory is in .env.example and lib/validation/env.ts.



## 4. Start and smoke-test the local app

Start the app:

    pnpm dev

Open http://localhost:3000 and verify:

1. The landing page has one semantic H1, working header/footer links, cookie notice, FAQ disclosure, and signup CTAs.
2. /features, /ai-support, /knowledge-base, /integrations, /pricing, /security, /about, /contact, /privacy, /terms, and /cookies render their intended content.
3. An unknown URL shows the branded 404 and a working home CTA.
4. /login, /signup, /forgot-password, /reset-password, and /invite/<invalid-token> show safe auth/error states.
5. /app/* redirects to login when there is no session.
6. /widget/unavailable has a labelled main, semantic H1, and truthful fallback copy.

This smoke catches broken route modules, missing metadata, dead navigation, missing auth protection, and server errors before deeper testing.



## 5. Run the repository quality gate

Run each command from the repository root:

    pnpm typecheck
    pnpm lint
    pnpm format:check
    pnpm test
    pnpm build

Expected results:

- pnpm typecheck: Next route type generation and strict TypeScript pass.
- pnpm lint: no ESLint violations.
- pnpm format:check: every tracked source/document uses repository formatting.
- pnpm test: the current baseline is 52 passing tests and 3 opt-in skips. Skips are provider/live gates, not silent production successes.
- pnpm build: webpack production build compiles all routes and generates static assets.

On this Windows host, the first sandboxed build may fail with an .next directory EPERM. Rerun the exact build with elevated filesystem access; do not change source to mask that host permission issue.

After every code change, run:

    git diff --check
    git status --short

A final release requires an understandable, clean working tree and no tracked secrets.



## 6. Understand what the unit/security tests prove

pnpm test discovers unit and security tests under tests/.

| Test file | What it proves |
| --- | --- |
| tests/unit/env.test.ts | Provider URL/key validation, server-secret requirements, and Stripe test-mode-only validation. |
| tests/unit/auth-security.test.ts | Auth validation, recovery/rate-limit behavior, and safe auth failure handling. |
| tests/unit/workspace-validation.test.ts | Workspace/onboarding input limits and accepted enums. |
| tests/unit/knowledge-pipeline.test.ts | Text normalization, chunking, content limits, and ingestion decisions. |
| tests/unit/ai-workflow.test.ts | Deterministic AI policy/evidence/sensitive escalation decisions; this does not prove Gemini availability. |
| tests/unit/automation.test.ts | Validated automation triggers/actions, dedupe, and retry decisions. |
| tests/unit/redis-workflows.test.ts | Namespaced Redis keys, TTL/lock behavior, and fallback policy. |
| tests/unit/webhooks.test.ts | Webhook lifecycle, retries, terminal errors, and state transitions. |
| tests/unit/webhook-signature.test.ts | HMAC signature format, timestamp/replay checks, and tamper rejection. |
| tests/security/p01-attacks.test.ts | Auth/tenant isolation and role boundary attacks. |
| tests/security/p03-attacks.test.ts | Workspace/member/settings/notification authorization attacks. |
| tests/security/p04-attacks.test.ts | Customer/conversation/message/ticket IDOR, viewer mutation, dedupe, and numbering safety. |

A passing unit test proves a deterministic rule in isolation. It does not prove an external provider, deployment, browser, or live RLS policy.



## 7. Run the browser E2E suite

Install Chromium once if needed:

    pnpm exec playwright install chromium

Run the full suite:

    pnpm test:e2e

The Playwright config starts a direct Next webpack dev server on 127.0.0.1:3100, uses one worker for Windows compiler stability, and covers auth, design surfaces, security headers, protected routes, public metadata, canonical links, SEO assets, mobile behavior, cookie consent, focus, widget fallback, and custom 404.

If the full command stalls on Windows before producing a report, run the focused route file and record the limitation instead of claiming the full suite:

    pnpm exec playwright test tests/e2e/p12-public.spec.ts --reporter=line

The current focused baseline is 5 passed. The previous P12 gate recorded 19 passed for the complete browser suite.



## 8. Inspect and apply Supabase migrations safely

SupportSphere uses imperative migrations under supabase/migrations/. Never edit an already-applied migration to repair production. Add a new migration, review it, apply it, regenerate types, and rerun advisors.

Before applying anything, inspect the actual project through Supabase MCP or the CLI:

    npx supabase migration list --project-ref xviumgygixcklrbuynoh

Apply the reviewed migration using the project connection:

    npx supabase db push --db-url "$env:SUPABASE_DB_URL"
    npx supabase gen types typescript --project-id xviumgygixcklrbuynoh > lib/supabase/database.types.ts

The P13 production state includes migration 20261012163227_p13_reproducibility_trigger_hardening. It reapplies JSON-safe automation/webhook trigger functions after later P10 migrations, preventing a fresh-clone ordering regression.

After a migration, verify:

1. The migration appears in remote history.
2. Every new tenant table has RLS and reviewed policies.
3. Composite tenant foreign keys and common query indexes exist.
4. Generated types match the remote schema.
5. Security and performance advisors show no new high-severity findings.
6. A focused live insert/update/delete probe exercises the changed function or table.

Current Supabase evidence is ACTIVE_HEALTHY, 39 public tables with RLS, active knowledge/AI/automation/webhook workers, and five active cron jobs. Existing advisor notices are documented in .agent/QA.md; do not silently dismiss a new finding as expected.



## 9. Run the real demo seed

Read docs/demo-seed.md first. The seed writes real data through Supabase Auth, role-checked RPCs, RLS tables, widget configuration, and the knowledge ingestion queue. It does not insert fake AI output or fake analytics.

Create a private .env.demo.local with the normal Supabase variables plus:

    DEMO_OWNER_EMAIL=demo-owner@example.com
    DEMO_OWNER_PASSWORD=<private 16+ character password>
    DEMO_WORKSPACE_SLUG=ss-demo-supportsphere
    DEMO_WEBSITE_ORIGIN=https://the-real-widget-host.example
    ALLOW_DEMO_SEED=1

Run it explicitly:

    node --env-file=.env.demo.local scripts/seed-demo.mjs

The script should report a workspace slug/id and widget key without printing secrets. It is idempotent for the named workspace and refuses a slug owned by another account.

Verify the resulting records in the application and, if needed, with read-only Supabase queries:

- Workspace is complete and AI mode is off.
- Widget config has the exact configured origin.
- Customer, widget conversation, customer message, agent reply, and follow-up ticket appear.
- Knowledge source is queued and later reaches ready with documents/chunks.
- No AI response was seeded. The seeded agent reply must not be described as AI output.



## 10. Run the live phase suites

Live suites are opt-in because they create real Supabase/Auth records and may send provider traffic. Set only the named non-secret project ref/base URL and load secrets from a private env file. Never run these against unrelated projects.

| Script | Scope | Required live setup |
| --- | --- | --- |
| tests/live/p01-auth-mail.mjs | Confirmation/reset email delivery, absolute links, and Brevo path. | P01_LIVE_TEST_PROJECT_REF, P01_LIVE_TEST_EMAIL, Supabase service key, Brevo key, configured app URL. |
| tests/live/p01-invite-ui.mjs | Invitation creation, delivery, acceptance, expiry/revoke behavior. | P01_LIVE_TEST_PROJECT_REF, owner email/workspace slug, Supabase keys. |
| tests/live/p02-production.mjs | Public routes, metadata, canonical URLs, robots/sitemap, links, console, keyboard, 404, six widths. | P02_PRODUCTION_ORIGIN. |
| tests/live/p02-auth-origin.mjs | Google OAuth initiation and exact /auth/callback?next=/app redirect. | P02_PRODUCTION_ORIGIN, P02_LIVE_TEST_PROJECT_REF. |
| tests/live/p02-contact-ui.mjs | Real contact validation, persistence, delivery receipt, and mobile behavior. | P02_LIVE_TEST_EMAIL, P02_LIVE_TEST_PROJECT_REF, Supabase service key, local/deployed base URL. |
| tests/live/p03-app-ui.mjs | Onboarding persistence, workspace settings, notifications, navigation, and responsive app shell. | P03_LIVE_TEST_PROJECT_REF, Supabase keys, optional P03_LIVE_BASE_URL. |
| tests/live/p04-app-ui.mjs | Customer to conversation to messages/notes to ticket workflow and mobile states. | P04_LIVE_TEST_PROJECT_REF, Supabase keys, optional P04_LIVE_BASE_URL. |
| tests/live/p05-widget.mjs | Host page to widget bootstrap to customer message to realtime inbox to reply, plus hostile origin/session/rate/storage checks. | P05_LIVE_TEST_PROJECT_REF, Supabase keys, optional P05_LIVE_BASE_URL, host server. |
| tests/live/p06-app-ui.mjs | Knowledge paste/upload UI, indexing status, enable/disable/delete, validation, and mobile behavior. | P06_LIVE_TEST_PROJECT_REF, Supabase keys, optional P06_LIVE_BASE_URL. |
| tests/live/p06-knowledge.mjs | Ingestion success/failure, malformed/oversized files, retry/recovery, content hash, storage/RLS. | P06_LIVE_TEST_PROJECT_REF, Supabase keys. |
| tests/live/p07-app-ui.mjs | AI settings, draft/handoff UI, run inspector, feedback, and responsive states. | P07_LIVE_TEST_PROJECT_REF, Supabase keys, optional P07_LIVE_BASE_URL. |
| tests/live/p07-ai.mjs | Controlled AI graph, RLS, policy modes, citations, handoff, retry, and terminal failure. | P07_LIVE_TEST_PROJECT_REF, Supabase keys, configured worker. |
| tests/live/p07-gemini.mjs | Ten real Gemini provider scenarios using synthetic fixtures. | P07_GEMINI_TEST_PROJECT_REF, Supabase keys, real Gemini secrets/quota. This remains blocked until MANUAL-008 passes. |
| tests/live/p08-app-ui.mjs | Real automation creation, toggle/delete confirmation, run state, responsive UI. | P08_LIVE_TEST_PROJECT_REF, Supabase keys, optional P08_LIVE_BASE_URL. |
| tests/live/p09-app-ui.mjs | Analytics date ranges, empty/populated states, evaluation action, and mobile layout. | P09_LIVE_TEST_PROJECT_REF, Supabase keys, optional P09_LIVE_BASE_URL. |
| tests/live/p10-app-ui.mjs | Webhook endpoint create/edit/rotate/test/revoke/history, real state, role checks, and mobile UI. | P10_LIVE_TEST_PROJECT_REF, Supabase keys, optional P10_LIVE_BASE_URL. |
| tests/live/p12-app-audit.mjs | 153-check authenticated route/control/role/overflow/console audit with disposable fixtures. | P12_LIVE_TEST_PROJECT_REF, Supabase keys, optional P12_LIVE_BASE_URL. |

Typical local invocation after starting the correct app server:

    node --env-file=.env.live.local tests/live/p04-app-ui.mjs

For every live script, save only safe evidence: pass count, status codes, entity counts, error classes, and cleanup counts. Never save message bodies, tokens, passwords, or provider secrets.



## 11. Verify authentication, email, and OAuth manually

Use a disposable email address and the configured real sender.

### Password signup/login/logout

1. Open /signup.
2. Submit invalid email, short password, and mismatched confirmation; verify field-level errors and no account is created.
3. Submit a valid account; verify the confirmation email arrives through the configured path.
4. Open the confirmation link in a separate browser session; verify /auth/callback completes without a PKCE/token-hash error.
5. Create a workspace and complete onboarding.
6. Log out; verify protected /app routes redirect to /login.
7. Log back in; verify the workspace and onboarding stage persist.

### Password recovery

1. Open /forgot-password and submit a valid/unknown address.
2. Verify the response does not reveal whether an account exists.
3. Open the reset email in a separate session.
4. Verify invalid/expired reset links show a safe recovery state.
5. Set a new password, log in with it, and confirm the old password fails.

### Google OAuth

1. On /login, activate Continue with Google.
2. Confirm the provider request uses the production origin and exact /auth/callback?next=%2Fapp redirect.
3. Complete the provider flow in the configured account.
4. Verify the callback creates or loads the correct user and reaches /app.
5. Verify provider failure/cancel returns a safe error and does not create a partial workspace.

The read-only automated check is tests/live/p02-auth-origin.mjs; it proves initiation, while a real callback requires the owner-configured OAuth client.



## 12. Verify onboarding and workspace roles

1. Create a workspace through the UI; refresh after every onboarding step.
2. Confirm each step is persisted server-side: identity, origin, team, knowledge, AI, complete.
3. Invite an admin, agent, and viewer using real email delivery.
4. Accept an invitation, then test expired, revoked, already-member, and invalid-token states.
5. As owner/admin, verify settings/team/knowledge/automation/integration controls are available.
6. As agent, verify support operations work but owner-only configuration is blocked.
7. As viewer, verify reads/analytics are available but send, invite, settings, automation, integration, and destructive controls are absent or rejected server-side.
8. Attempt direct RPC/API mutations as viewer and as a different workspace member; expect safe permission errors and no changed rows.
9. Attempt to remove/change the last owner; expect the database safety rule to reject it.
10. Confirm sensitive role/membership mutations create audit rows.



## 13. Verify the support operating slice

1. Add a customer with name/email/company; reload and verify persistence.
2. Start a conversation with a subject and channel.
3. Send a customer message through the widget or live fixture.
4. Confirm the message appears in the team inbox and unread state updates.
5. Send an agent reply; verify success feedback, reload reconciliation, and the widget transcript.
6. Send an internal note; verify it is visible only to the team and never in the customer widget.
7. Change status, priority, and assignee; verify server validation and role checks.
8. Create a ticket from the conversation; update status/priority/category/assignee; verify its timeline.
9. Retry the same message with the same client id; verify idempotent behavior rather than a duplicate.
10. Test empty, search-no-results, loading, error, retry, and viewer read-only states.

The strongest automated proof is tests/live/p04-app-ui.mjs plus tests/security/p04-attacks.test.ts.



## 14. Verify the external widget

Use tests/widget-host/index.html and tests/widget-host/server.mjs as the external host pattern. The widget is isolated in a SupportSphere iframe; the host origin must match the workspace exact allowed origin.

1. Configure one exact HTTPS host origin in widget settings.
2. Copy the generated public widget snippet to the host page. Do not put a secret in the snippet.
3. Start the host test server and open it in a browser.
4. Confirm the loader fetches config only for the allowed origin.
5. Confirm the iframe loads, resizes, traps focus correctly, and closes/reopens with keyboard controls.
6. Send a customer message and verify it creates the scoped customer/conversation/message.
7. Open the team inbox in another session and verify the message arrives through Realtime or reconciliation fallback.
8. Reply as an agent and reload both sides; verify the database is the source of truth.
9. Try a guessed key, foreign origin, missing bootstrap proof, expired session, oversized message, and rate-limit burst; expect 404/401/429-safe behavior.
10. Confirm internal notes never cross the iframe boundary and no service key appears in browser bundles.

Run node --env-file=.env.live.local tests/live/p05-widget.mjs for the complete hostile and golden widget suite.



## 15. Verify knowledge ingestion and RAG preparation

1. Open /app/knowledge as owner/admin.
2. Paste a small source with a visible name; verify queued feedback.
3. Wait for the durable worker to move it through queued/processing/ready.
4. Open the source detail page; verify document/chunk counts, preview, last-indexed timestamp, and no raw provider error leakage.
5. Disable and re-enable the source; verify retrieval eligibility changes.
6. Reindex unchanged content; verify content-hash/dedupe behavior.
7. Upload a supported TXT/MD/text PDF under the size limit; verify indexing.
8. Upload an oversized, malformed, unsupported, or empty file; verify actionable validation/permanent-error states.
9. Delete the source; verify private Storage objects and tenant rows are removed safely.
10. Attempt a foreign storage path, foreign source ID, and cross-tenant retrieval; expect denial/not-found behavior.
11. Confirm the scheduled worker has bounded retries, abandoned-upload recovery, and terminal failed state.

Use tests/live/p06-app-ui.mjs, tests/live/p06-knowledge.mjs, tests/unit/knowledge-pipeline.test.ts, and docs/knowledge.md together. A ready source without documents/chunks is not valid evidence.



## 16. Verify AI safely

AI has three separate proofs:

1. Decision proof: unit/live controlled tests prove policy, evidence, citation, sensitive escalation, retry, and final-send gates.
2. UI proof: settings, draft/handoff, run inspector, feedback, empty/error states, and role behavior.
3. Provider proof: real Gemini calls with synthetic fixtures, model/quota evidence, worker logs, citations, and cleanup.

Run the first two with:

    pnpm test
    node --env-file=.env.live.local tests/live/p07-ai.mjs
    node --env-file=.env.live.local tests/live/p07-app-ui.mjs

For the real provider gate, do not paste the Gemini key. The owner must configure server-side AI_PROVIDER, AI_API_KEY, and the three model names in Supabase Edge Function Secrets, then run:

    node --env-file=.env.gemini.local tests/live/p07-gemini.mjs

Verify all ten synthetic scenarios: grounded answer, no evidence, sensitive request, injection attempt, low confidence, quality failure, provider outage/rate limit, draft-only mode, off mode, and successful transactional send/handoff. Inspect decisions, citations, steps, message rows, handoff reason, retry counts, and safe Edge logs. Clean every fixture. Do not display an AI accuracy percentage or claim real customer traffic is safe until all scenarios pass.



## 17. Verify automations and durable jobs

1. Create a validated automation rule with a supported trigger/action.
2. Confirm invalid trigger, condition, action, and oversized input errors are visible.
3. Trigger the rule with a real conversation/message/ticket event.
4. Verify one durable run is created with an idempotency key.
5. Wait for the scheduled worker to claim, execute, and finish it.
6. Replay the same event; verify duplicate suppression.
7. Force a transient failure in a disposable fixture; verify bounded retry and backoff.
8. Force terminal failure; verify safe error state and one owner notification.
9. Verify self-trigger loops are suppressed.
10. Toggle and delete the rule with confirmation; verify the UI and direct mutation both enforce role checks.

Use tests/live/p08-app-ui.mjs, tests/unit/automation.test.ts, tests/unit/redis-workflows.test.ts, docs/workflows.md, and Supabase cron/log inspection.



## 18. Verify webhooks/integrations

Stripe and Slack are not selected for this release. The implemented integration is outgoing signed webhooks.

1. As owner/admin, create an HTTPS endpoint with selected supported events and a one-time signing secret.
2. Verify the UI shows pending, not fabricated connected.
3. Send a test delivery to a disposable HTTPS receiver.
4. Verify the receiver checks the exact JSON body, t=,v1= HMAC, timestamp window, and replay identity.
5. Confirm a 2xx delivery becomes succeeded and promotes the endpoint to connected.
6. Return 408/429/5xx and verify bounded retry/backoff and safe error codes.
7. Return permanent/blocked errors and verify terminal failed state and endpoint error state.
8. Edit the endpoint; verify queued deliveries are cancelled safely.
9. Rotate the secret; verify old secret references are deleted and the new secret is shown only once.
10. Revoke the endpoint; verify queued work is cancelled while safe history remains.
11. Test viewer/agent denial and HTTPS/private-IP/redirect/DNS validation.

Run node --env-file=.env.live.local tests/live/p10-app-ui.mjs, tests/unit/webhooks.test.ts, and tests/unit/webhook-signature.test.ts. Never log response bodies or endpoint secrets.



## 19. Verify analytics and evaluation

1. Open /app/analytics with an empty workspace; verify a truthful empty state.

2. Choose valid and invalid date ranges; verify field/action feedback.
3. Confirm metrics derive from real conversations/messages/tickets/AI runs and show sample/denominator text.
4. Verify workspace timezone boundaries, inclusive dates, and no cross-tenant rows.
5. As owner/admin, start the persisted evaluation run; verify cases/results come from real inputs and runs.
6. Confirm missing AI evidence becomes an explicit result rather than fabricated accuracy.
7. As viewer, inspect analytics but verify mutation/evaluation permissions.
8. Verify no optional marketing analytics request runs before/without consent; current product choice is analytics off.

Use tests/live/p09-app-ui.mjs, tests/unit/analytics.test.ts, and docs/p12-route-control-inventory.md.



## 20. Verify SEO, accessibility, responsive behavior, and errors

### Public SEO

Run:

    $env:P02_PRODUCTION_ORIGIN='https://support-sphere-psi.vercel.app'
    node tests/live/p02-production.mjs

Verify every public route has one H1, unique title/description, canonical URL, Open Graph metadata, valid internal links, and intended index/noindex behavior. Verify these assets:

    https://support-sphere-psi.vercel.app/robots.txt
    https://support-sphere-psi.vercel.app/sitemap.xml
    https://support-sphere-psi.vercel.app/icon.svg
    https://support-sphere-psi.vercel.app/opengraph-image

### Accessibility

At each public and app route:

1. Press Tab from the top; skip-link focus should be visible.
2. Operate mobile navigation and disclosures with keyboard only.
3. Confirm every form control has a visible label and field errors are associated.
4. Confirm status is communicated by text/icon, not color alone.
5. Test Escape on mobile drawers/dialogs and verify focus returns to the opener.
6. Enable prefers-reduced-motion and verify no essential action depends on animation.
7. Use a screen reader or browser accessibility tree to confirm landmarks and headings.

### Responsive checks

Test widths 320, 360, 390, 768, 1024, and 1440 pixels. At each width verify no document horizontal overflow, no off-screen modal, no covered composer/CTA, usable tables, readable filters, and touch targets of at least 44px. The P12 authenticated audit and P02 production smoke cover these checks.

### Error/loading/empty/success checks

For every async surface, deliberately test first load/skeleton, no-data/empty copy, validation error, permission denied, provider/network failure, retry path, and successful completion with refresh persistence. A spinner that never reaches an error state is a failed test.



## 21. Verify production deployment

The production deployment must be checked after the current tree is redeployed.

Owner-controlled setup:

1. Connect/install the Vercel integration for project support-sphere.
2. Confirm the production deployment commit equals the intended repository commit.
3. Configure production-only environment variables in Vercel; never put server secrets in browser variables.
4. Confirm NEXT_PUBLIC_APP_URL=https://support-sphere-psi.vercel.app and the Supabase Auth Site URL/callback allow-list match exactly.
5. Confirm Redis, durable worker, Brevo, and AI values are present by names/status, never by exposing values.
6. Redeploy and inspect build/runtime logs for errors.

Read-only browser proof:

    $env:P02_PRODUCTION_ORIGIN='https://support-sphere-psi.vercel.app'
    $env:P02_LIVE_TEST_PROJECT_REF='xviumgygixcklrbuynoh'
    node tests/live/p02-production.mjs
    node tests/live/p02-auth-origin.mjs

The public smoke proves reachability and browser behavior. It cannot prove hidden Vercel secrets or deployment commit parity; that is why the Vercel connector/manual step is required.



## 22. Execute the full deployed golden journey

Use a dedicated demo owner/workspace and the exact deployed origin. Record a timestamp, safe result, fixture IDs if non-sensitive, and cleanup result in .agent/QA.md.

1. Landing: open the public origin; verify no console errors, one H1, CTA, cookie behavior, and mobile layout.
2. Signup/login: create or use the disposable owner; verify real Auth and safe redirects.
3. Onboarding: create a workspace; complete identity, origin, team, knowledge, and AI preference with refreshes between steps.
4. Knowledge source: paste/upload a supported source; wait for real worker indexing to ready; verify documents/chunks.
5. Widget: load the widget from the exact allowed external origin; verify scoped bootstrap/session.
6. Customer message: send a message as the customer; verify customer/conversation/message rows and rate-limit behavior.
7. Realtime inbox: open the team inbox in another session; verify Realtime event/reconciliation and unread state.
8. AI evidence/draft: when MANUAL-008 passes, verify a real synthetic provider run has citations, trace steps, decision, confidence/evidence, and safe output. While blocked, verify explicit AI-off behavior instead.
9. Sensitive escalation: send a sensitive request; verify deterministic handoff and no automatic unsafe reply.
10. Human response: reply as owner/admin/agent; verify widget transcript and internal-note isolation.
11. Ticket: create/update a ticket; verify ticket number, timeline, assignment, status, and analytics source rows.
12. Analytics: reload analytics; verify metrics update from these records and evaluation never invents accuracy.
13. Role denial: repeat a mutation as viewer or foreign workspace member; verify server denial and unchanged data.
14. Cleanup: remove only disposable fixtures, storage files, queues, and test users; verify no test residue remains.

Do not mark the journey complete if the AI step is replaced by a fake row, a hardcoded response, or an unverified provider stub.



## 23. Inspect observability and provider state

Use Supabase MCP or the dashboard to inspect, without exposing secrets:

- migration history,
- Edge Function versions/status,
- cron job schedules and active flags,
- worker execution logs and safe error codes,
- RLS/security/performance advisors,
- retained test rows/files/jobs after cleanup.

Safe logs may contain route/job type, status, duration, correlation/request ID, provider status, and safe entity IDs. They must not contain passwords, reset/invitation tokens, service keys, full auth headers, private knowledge content, or full customer message bodies.

For Vercel, inspect deployment status, commit SHA, build logs, function errors, and runtime logs through the connected Vercel integration. If the integration is unavailable, record that limitation; do not infer healthy server configuration from a successful landing page alone.



## 24. Run the final security and secret checks

Check tracked files only:

    git grep -n -I -E 'sk_live_|xkeysib-|sb_secret_|SUPABASE_SERVICE_ROLE_KEY=|AI_API_KEY=|BREVO_API_KEY=' -- ':!tests/unit/env.test.ts'

Review expected test/placeholder matches manually. Also inspect the built browser bundle for server-only names and keys, and run the dependency audit used by P11:

    pnpm audit --prod --audit-level high

Then verify:

- no service-role/secret key in client code or NEXT_PUBLIC variables,
- no fake connected/analytics/AI state,
- all tenant tables have reviewed RLS,
- viewer cannot mutate,
- uploads are bounded/private,
- widget origin/session/rate limits hold,
- webhook signatures/replay/idempotency hold,
- AI tools cannot run arbitrary SQL/shell/HTTP,
- no high-severity dependency/advisor finding is unreviewed.



## 25. Troubleshooting guide

### Build fails with .next EPERM on Windows

Stop stale Next/Node processes, rerun node_modules/.bin/next build --webpack with the required filesystem permission, and do not delete source or migrations to work around it.

### Full Playwright stalls

Run the focused file:

    pnpm exec playwright test tests/e2e/p12-public.spec.ts --reporter=line

Record the full-suite limitation and use the dedicated live production smoke. Re-run the full suite on a host where the configured web server starts reliably before phase completion.

### Supabase RPC returns permission denied

Confirm the browser session belongs to the expected workspace/member, the user role is allowed, the function grant exists, and RLS policies are present. Do not add a broad grant or service role to the browser.

### Knowledge source stays queued

Inspect the source/job row, worker cron, Edge Function status, and safe logs. Confirm the project-specific worker secret/config exists. Do not mark the source ready manually.

### AI returns provider/model/rate-limit errors

Classify the safe error code, inspect provider quota/model availability, and keep the workspace AI mode off/draft-only. Do not replace the provider call with a fake response.

### Email link points to localhost or fails cross-browser

Check NEXT_PUBLIC_APP_URL, Supabase Auth URL Configuration, Brevo sender/template, and token-hash callback templates. Test in a separate browser session and never paste the full link/token into chat.

### Widget returns 404 or 401

Compare the host page exact Origin with the saved widget origin, verify the public widget key, bootstrap proof, referrer, and session lifetime, then inspect safe route logs. Do not broaden origin matching.



## 26. Completion checklist

Set .agent/STATE.md to VERIFYING only when every box below is objectively proven:

- [ ] Static typecheck, lint, format, unit/security tests, production build pass.
- [ ] Complete Playwright suite passes or a documented reliable-host rerun is complete.
- [ ] Supabase migrations/types/RLS/advisors are current and reviewed.
- [ ] Vercel deployment commit/environment/runtime are inspected.
- [ ] Supabase, Redis, durable jobs, Brevo, OAuth, and production origin are verified.
- [ ] Credential rotation/manual gates are resolved.
- [ ] Demo seed runs against the approved real project and cleanup is verified.
- [ ] Full deployed golden journey passes with real records.
- [ ] Real Gemini provider scenarios pass, or AI remains explicitly disabled and P13 is not claimed complete.
- [ ] Robots, sitemap, canonical URLs, 404, console, mobile, keyboard, and reduced-motion checks pass.
- [ ] Final secret/dependency/advisor scan is clean.
- [ ] Repository is clean and the release commit is recorded.
- [ ] .agent/QA.md, .agent/HANDOFF.md, .agent/MANUAL_ACTIONS.md, and .agent/STATE.md describe the same truth.

Only after the final gate passes should status change to COMPLETE. Until then, the correct status is BLOCKED_MANUAL or VERIFYING, never mostly complete.



## 27. Evidence recording template

Append one dated entry to .agent/QA.md after each meaningful pass:

    ## Verification pass — YYYY-MM-DD

    Environment: local/preview/production
    Commit:
    Workspace/fixture scope:

    Commands:
    - command — PASS/FAIL

    Live checks:
    - route/provider/flow — PASS/FAIL

    Expected vs actual:
    - ...

    Cleanup:
    - users/workspaces/files/jobs removed: yes/no

    Remaining blockers:
    - ...

The guide is complete only when the evidence files, code, schema, and deployed behavior agree.
