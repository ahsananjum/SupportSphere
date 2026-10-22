# Architecture decisions

## ADR-015 — P06 database-leased knowledge worker

Date: 2026-10-07
Status: accepted
Context: P06 requires persistent ingestion, private tenant files, real embeddings, bounded retry, and no extra owner-held AI key.
Decision: Store source/job lifecycle in Postgres, schedule a Supabase Edge worker with pg_cron/pg_net and a Vault-generated token, parse text PDFs with MIT-licensed unpdf, and embed with the built-in gte-small model. Publish chunks and ready state in one database transaction. Keep URL/DOCX off until complete parsers and URL SSRF defenses exist. See `docs/knowledge.md`.
Alternatives considered: request-held indexing, an unprotected public worker, guessed external AI credentials, and fake embeddings.
Consequences: Four P06 migrations and one Edge Function are applied to SupportSphere. A five-minute recovery cron handles abandoned file reservations, and ingestion jobs are capped per workspace per hour. The deployment-specific project URL is provisioned in Vault outside the migration. Knowledge sources need no new owner credential.
Files affected: `supabase/migrations`, `supabase/functions`, `app/app/knowledge`, `lib/supabase/database.types.ts`, `docs/knowledge.md`, tests.

## ADR-001 — Single root application

Date: 2026-09-30
Status: accepted
Context: P00 requires one Next.js application and forbids nested duplicate apps.
Decision: Place App Router, configuration, tests, and package manifest at the repository root.
Alternatives considered: nested `apps/web` workspace.
Consequences: Simple install and CI; future packages need an explicit decision.
Files affected: root scaffold.

## ADR-002 — P00 toolchain and deferred provider validation

Date: 2026-09-30
Status: accepted
Context: P00 needs a reproducible foundation but has no configured provider project or credentials.
Decision: Pin Next.js 16.3.7, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, pnpm 11.25.0, Vitest, and Playwright. Use ESLint 9 because Next's plugin chain does not accept ESLint 10. Parse each provider's environment group at its future server boundary; do not require its credentials during P00 build.
Alternatives considered: TypeScript 7 and ESLint 10 (newer but with current compatibility/peer issues); eager validation of all provider keys (would block a credential-free P00 build).
Consequences: Future phases must invoke validation when adding each real provider. No production provider behavior exists in P00.
Files affected: `package.json`, `pnpm-lock.yaml`, `lib/env.ts`, `lib/validation/env.ts`, lint/test configuration.

## ADR-003 — External reference and MCP scope

Date: 2026-09-30
Status: accepted
Context: P00 requests upstream research and Supabase/Vercel MCP availability without choosing or changing provider projects.
Decision: Treat the MIT-licensed 500 AI Agents Projects repository and Command Center DesignMD as references only. Record Supabase and Vercel app plugins as listed, while project-scoped MCP access remains unverified because no project tools are callable in this session.
Alternatives considered: copying upstream agents or configuring provider projects during P00.
Consequences: P01 must verify Supabase project access before database changes; deployment phases must verify Vercel project access before runtime claims.
Files affected: `README.md`, `.agent/STATE.md`, `.agent/QA.md`.

## ADR-004 — P01 database-owned membership transitions

Date: 2026-10-01
Status: accepted
Context: Browser-provided workspace IDs and roles cannot authorize tenant mutations; membership transitions require last-owner and audit invariants.
Decision: Expose read-only tenant tables through RLS. Authenticated public SQL wrappers call private SECURITY DEFINER functions that recheck auth.uid() and current membership, mutate atomically, and write audit rows. Keep invitation tokens as SHA-256 hashes and use a server-only Supabase credential for invitation capability inspection and Brevo delivery recording.
Alternatives considered: client-side role checks, broad table DML policies, and plaintext invitation tokens.
Consequences: Both P01 migrations were applied and attacked against the actual SupportSphere project. Service credentials remain server-only.
Files affected: supabase/migrations/20260930201144_p01_identity_tenancy.sql, supabase/migrations/20260930201423_restrict_rls_event_trigger.sql, lib/workspaces, app/app.

## ADR-005 — Auth mail and provider boundary

Date: 2026-10-01
Status: accepted
Context: Supabase Auth owns signup/recovery mail while workspace invitations require custom transactional delivery.
Decision: Use Supabase Auth with Brevo custom SMTP for confirmation/recovery, and the Brevo Transactional API for invitation text+HTML mail. Use one trusted environment origin and a narrow post-auth redirect allowlist.
Alternatives considered: fake email success or provider-specific browser code.
Consequences: Sender/DNS, SMTP, Google OAuth, and project credentials were owner gates; all four manual actions were verified in P01.
Files affected: app/(auth), lib/email/brevo.ts, lib/auth/redirect.ts, .agent/MANUAL_ACTIONS.md.

## ADR-006 — Cross-browser Supabase Auth email callbacks

Date: 2026-10-01
Status: accepted
Context: Confirmation and recovery links opened in a different browser cannot rely on the PKCE verifier stored in the signup browser.
Decision: Configure the provider templates to send a token hash and type to the trusted callback, then verify the OTP server-side. Keep post-auth redirects on the application allowlist.
Alternatives considered: code-only callback tied to the originating browser.
Consequences: Fresh-browser confirmation and recovery links now pass live Brevo delivery and Supabase Auth checks; reused recovery links are rejected.
Files affected: app/auth/callback/route.ts, .agent/MANUAL_ACTIONS.md.

## ADR-007 — Current-page visual system, motion, and conditional indexing

Date: 2026-10-01
Status: accepted
Context: The owner requested a premium design and SEO upgrade for the existing site, then deferred P02. Current pages must accurately distinguish live P01 features from planned product workflows.
Decision: Use one portable `tokens.css` map for paper, ink, and mint; Bricolage Grotesque and DM Sans via Next fonts; source-owned, MIT-noticed Motion Primitives only where content stays readable and reduced motion is respected. Describe planned workflows as illustrative. Index only the existing home route when `NEXT_PUBLIC_APP_URL` names a public origin; keep local/private routes out of search. Defer analytics and P02-only routes.
Alternatives considered: animated statistics without real data, demo customer stories, a new P02 route set, and indexing localhost or auth pages.
Consequences: Current pages share a consistent visual language and verified browser behavior. Production canonical URLs and indexing await the owner's domain configuration.
Files affected: `DESIGN.md`, `tokens.css`, `app`, `components`, `lib/seo.ts`, `tests/e2e`.

## ADR-008 — Split dark authentication surface with progressive email flow

Date: 2026-10-01
Status: accepted
Context: The user requested the sign-in screen match a modern dark split-screen reference layout, respecting DESIGN.md, real Supabase workflows, zero mocks, and robust mobile responsiveness.
Decision: Adopt the dark split-screen layout using project tokens (`--color-shell`, `--color-shell-raised`, `--color-paper`, `--color-accent`); provide generative SVG wave curve art on the brand showcase; present verified Google OAuth in a high-contrast pill card; implement a progressive two-step email auth flow without page reloads; and place a distinct `< Home` navigation link at the top of the auth panel. Omit mock Apple/GitHub buttons until real Supabase credentials exist.
Alternatives considered: Dead mock buttons for Apple/GitHub, synthetic customer quotes, single-step static forms.
Consequences: High visual fidelity matching the reference aesthetic; 100% real authentication with zero mocks; all 8 Playwright E2E and 19 Vitest unit tests pass without regression.
Files affected: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/auth-form.tsx`, `components/marketing/auth-wave-art.tsx`, `app/globals.css`, `tests/e2e/design-surfaces.spec.ts`.

## ADR-009 — Application-wide light/gradient theme and landing page polish

Date: 2026-10-01
Status: accepted
Context: The user requested eliminating the dark blue blocks (`--color-shell` / `#101b29` / `#192736`) across the complete application and replacing them with a calm editorial light theme and subtle ambient gradients (as established on the login screen). In addition, empty space, card alignments, and UI/UX rhythm on the landing page (`/`) needed refinement.
Decision: Retire the dark blue shell tokens; redefine `--color-shell` and `--color-shell-raised` as calm, elevated light paper surfaces in `tokens.css` and `DESIGN.md`; illuminate the Hero, Security, and Closing CTA sections with multi-stop radial mesh gradients on warm paper; convert all text in affected sections to `--color-ink` and `--color-ink-soft`; transform the 3 workflow stages into structured elevated cards; dock `WorkflowVisual` without awkward 1° rotation; and replace dark app chrome (`.app-header` / `.app-sidebar`) with elevated light surfaces (`--color-surface` and `--color-paper-2`).
Alternatives considered: Maintaining dark blue zebra stripes across the landing page, introducing arbitrary bright gradients that break color consistency.
Consequences: Cohesive, premium editorial light aesthetic across landing, auth, and workbench app; AAA text contrast; 0 dark blue blocks; all 8 Playwright E2E tests and 19 Vitest unit tests pass cleanly across 320px–1440px viewports.
Files affected: `DESIGN.md`, `tokens.css`, `app/globals.css`, `app/page.tsx`, `.agent/STATE.md`, `.agent/DECISIONS.md`.

## ADR-010 — P02 contact intake, public indexing, and analytics

Date: 2026-10-02
Status: accepted for local implementation; launch verification pending owner actions.
Context: P02 needs a real public contact path, truthful product pages, and search metadata without a chosen production origin. The owner provided public identity/email and a city-level location and elected to keep that location visible for now.
Decision: Persist contact submissions in service-role-only Supabase tables, reserve hourly hashed IP/email rate buckets through an atomic RPC, send an operator notification through the configured Brevo Transactional API, and display a signed-receipt thank-you state. Public pages use route-specific metadata; canonical URLs and indexing activate only for a configured public HTTPS origin. Optional analytics remains off, with an essential-cookie notice; no analytics property is invented.
Alternatives considered: browser-only forms, unbounded email delivery, fabricated pricing/usage figures, and a guessed canonical domain.
Consequences: Local P02 checks pass, including a real persisted contact submission and Brevo API acceptance. P02 stays BLOCKED_MANUAL until a production origin, legally sufficient public contact address, and owner/legal review are verified. See `MANUAL-005`, `MANUAL-006`, and `docs/privacy-operations.md`.
Files affected: `app`, `components/marketing`, `lib/contact`, `lib/marketing`, `lib/email/brevo.ts`, `supabase/migrations/20261001210202_p02_contact_intake.sql`, `docs/privacy-operations.md`, and P02 tests.

## ADR-011 — Production origin and owner-approved contact/legal facts

Date: 2026-10-02
Status: accepted by owner for P02.
Context: Production indexing requires a real deployment origin. The public legal pages require owner-approved identity and contact details, and the owner chose to publish city-level location text.
Decision: Use `https://support-sphere-psi.vercel.app` as the current production origin for Vercel project `support-sphere`. Continue displaying the exact owner-provided “Lahore, Pakistan” contact/mailing text; the owner explicitly approved that choice and the legal pages as-is. Do not infer or append a street address. Keep optional analytics off.
Alternatives considered: guessing a custom domain or a more specific address, and changing approved legal text without owner direction.
Consequences: The site’s canonical URLs, robots, and sitemap are now live on the chosen host. GitHub deployment and application smoke checks verify the P02 public surface, contact delivery, and production OAuth initiation. If the operator later chooses a deliverable postal address or a custom domain, update the central fact/origin settings and reverify legal pages and canonical URLs.
Files affected: `.agent/STATE.md`, `.agent/MANUAL_ACTIONS.md`, `.agent/QA.md`, `.agent/HANDOFF.md`, `tests/live/p02-production.mjs`, `tests/live/p02-auth-origin.mjs`.

## ADR-012 — P03 persisted setup and role-checked workbench

Date: 2026-10-03
Status: accepted
Context: P03 requires refresh-safe onboarding, one responsive application navigation, real settings/notifications, and role parity between UI and direct server requests.
Decision: Persist setup stage and settings on the workspace; advance stages through owner-only database RPCs; authorize all tenant writes using current membership in the database. Keep a single navigation component in the sidebar/mobile drawer with only available routes. Source-owned Animated Background marks the active route, while other motion stays short and respects a hydration-safe reduced-motion preference. Store a future AI policy choice but explicitly keep AI execution unavailable until its later phase. Notifications are real, member-scoped records with read-state RPCs; viewers remain read-only.
Alternatives considered: local-storage onboarding, client-controlled workspace/role state, dead future navigation, fabricated notification counts, animated numbers without live metrics, and a dynamic toolbar without real actions.
Consequences: Five P03 migrations are applied to SupportSphere; generated types, live security tests, browser journey, and agent documentation cover the new surfaces. P08 can extend notification kinds and delivery behavior when its producers exist.
Files affected: `supabase/migrations`, `lib/workspaces`, `lib/validation/workspace.ts`, `app/app`, `components/shared/app-navigation.tsx`, `components/motion-primitives`, `tests`.

## ADR-013 — P04 tenant support core and database-owned invariants

Date: 2026-10-04
Status: accepted
Context: P04 requires the first real support operating slice before AI: customers, conversations, messages, internal notes, tickets, timelines, tags, tenant isolation, and concurrency-safe writes.
Decision: Store support records in workspace-scoped tables with composite workspace foreign keys, explicit authenticated grants, RLS membership policies, and role-checked SECURITY DEFINER RPCs. Use normalized identity lookup plus a workspace advisory lock for deterministic customer dedupe, client ids for idempotent message retries, and a workspace advisory lock plus unique `(workspace_id, ticket_number)` for ticket numbering. Render message bodies as text and reconcile successful sends through route revalidation and a client refresh.
Alternatives considered: client-generated ticket numbers, client-only dedupe, long-lived shared message keys, unsafe HTML rendering, and UI-only tenant checks.
Consequences: Customer → conversation → message → ticket behavior is real and testable across tenants; the live project carries three versioned P04 migrations and generated types. Empty-project advisor output may report unused indexes until production traffic exists.
Files affected: `supabase/migrations/20261004120000_p04_support_operations.sql`, `supabase/migrations/20261004130000_p04_support_indexes.sql`, `supabase/migrations/20261004131500_p04_composite_fk_indexes.sql`, `lib/supabase/database.types.ts`, `lib/support`, `app/app`, `components/support`, `tests/security/p04-attacks.test.ts`, `tests/live/p04-app-ui.mjs`.

## ADR-014 — P05 isolated widget and scoped live support

Date: 2026-10-06
Status: accepted
Context: A public customer site needs a small embed while support records remain tenant-private. A website key is public and cannot authorize transcript access by itself.
Decision: Use an async loader and SupportSphere-hosted iframe. The loader fetches configuration only when the browser's Origin matches an owner-configured exact origin; the server signs a short-lived, origin-scoped bootstrap proof. The iframe requires matching parent referrer and sends resize messages to that exact parent origin. A random anonymous bearer token is stored only in partitioned iframe storage, while Postgres stores its SHA-256 hash and owns the associated customer/conversation. Service-only RPCs atomically create sessions and idempotent customer messages; per-session and IP-derived rate buckets bound abuse. Team clients subscribe to Supabase Postgres Changes under membership RLS, reconcile from the database on events/reconnect/focus, and poll as a missed-event fallback. The widget uses scoped transcript polling and cursor pagination; internal notes never leave the team boundary. Source-owned Motion Primitives remain in workspace navigation, while the widget uses short CSS state transitions and removes them under reduced motion.
Alternatives considered: injecting app styles into customer sites, broad anonymous table grants, public Realtime channels for widget sessions, client-supplied workspace IDs, and animated operational message lists.
Consequences: Two P05 migrations are applied; the public key is safe to embed but the session token remains a bearer credential. Installation on a real owner site requires adding its exact origin and the generated snippet in widget settings. No new dependency or owner-held secret was introduced.
Files affected: `supabase/migrations/20261006043128_p05_widget_realtime.sql`, `supabase/migrations/20261006051012_p05_widget_security_indexes.sql`, `lib/widget`, `app/api/widget`, `app/widget`, `app/app/settings/widget`, `components/support/inbox-realtime.tsx`, `public/widget/loader.js`, and `tests`.

## ADR-015 — P07 deterministic AI support workflow

Date: 2026-10-07
Status: accepted; real provider verification pending owner secret setup.
Context: P07 requires a tenant-safe answer flow with grounded retrieval, inspectable decisions, and bounded recovery. The reference customer-support agent uses a useful fixed sequence but local FAISS and demonstration policy assumptions cannot enforce SupportSphere tenancy or sending authority.
Decision: Keep the graph in one leased Supabase Edge worker and make Postgres own queue identity, retry bounds, policy versioning, final send/handoff, citations, and tenant/role authorization. Use the existing pgvector knowledge corpus through a service-only workspace-scoped RPC. The OpenAI Responses adapter receives no tools and separates immutable instructions from bounded customer/knowledge data. Structured outputs are runtime validated; deterministic sensitive and evidence/confidence/quality gates decide whether to send, surface a draft, or hand off. A final transactional DB gate rechecks policy and conversation freshness before sending. Off and draft modes are hard gates in the database. Run traces and human feedback remain workspace-scoped.
Alternatives considered: deploying the reference sample unchanged, model-chosen SQL or HTTP tools, a free-running multi-agent swarm, client-side policy enforcement, request-held generation, and storing fake provider output in production.
Consequences: Four P07 data tables plus configs and related RPCs are applied, the worker and cron are active, and controlled live DB/browser suites pass. The provider credential is owner-controlled and absent; P07 stays `BLOCKED_MANUAL` until live provider behavior and the full gate are verified. The selected API project needs an approved billing budget. No Vercel web deployment is claimed.
Files affected: `supabase/migrations/20261007061500_p07_controlled_ai.sql` through `20261007080034_p07_run_type.sql`, `supabase/functions/ai-worker`, `supabase/functions/_shared/ai*.ts`, `lib/supabase/database.types.ts`, `app/app/ai`, `app/app/settings/ai`, `app/app/inbox`, `components`, `tests`, `docs/ai.md`, `.agent` records.

## ADR-016 — Gemini free-tier adapter for P07

Date: 2026-10-09
Status: accepted; live provider verification pending owner secret setup.
Context: The owner chose Google AI Studio Gemini free tier instead of the earlier OpenAI Responses provider. The deterministic P07 graph and all database-owned send gates must remain intact. The Gemini `generateContent` REST API supports native `responseMimeType`/`responseSchema`; its legacy Schema format omits JSON Schema’s `additionalProperties` constraint.
Decision: Use a fixed-host, tool-free Gemini REST adapter with the API key in the `x-goog-api-key` header and immutable instructions separate from untrusted customer/evidence data. Convert the existing triage/draft/quality schemas into Gemini’s native OpenAPI subset, then reject extra keys and invalid values in runtime parsers. Preserve pgvector retrieval, citations, policy modes, deterministic sensitive handoff, transactional final send, and leased exponential retries. Limit local transport/rate-limit retries and return safe codes. Do not add a new SDK dependency.
Alternatives considered: putting the API key in the URL, trusting JSON MIME type without parsing, model-chosen tools, replacing the graph with the Interactions API, or continuing the unchosen OpenAI adapter.
Consequences: The worker can use an AI Studio free-tier key once configured. Google documents that free-tier content may be used to improve its products, so live tests use synthetic fixtures and real customer traffic remains disabled until owner review. MANUAL-008 now specifies Gemini and P07 remains blocked until provider scenarios pass.
Files affected: `supabase/functions/_shared/ai-provider.ts`, `supabase/functions/_shared/ai.ts`, `supabase/functions/ai-worker/index.ts`, `lib/validation/env.ts`, `tests/unit/ai-workflow.test.ts`, `docs/ai.md`, `.agent` records.

## ADR-017 — P08 database-owned automation and Redis coordination

Date: 2026-10-10
Status: accepted
Context: P08 requires deterministic tenant-scoped automations, duplicate delivery protection, bounded retries, visible terminal failures, and Redis coordination without moving relational truth out of Postgres.
Decision: Store automation_rules, automation_runs, and durable_jobs in Postgres with RLS and explicit service-only claim/finish/fail functions. Support mutations enqueue automation events through database triggers, using a unique workspace/rule/idempotency key. A minute cron claims and executes validated action types in one transaction, suppresses self-trigger loops, retries only transient SQL failures, and creates one deduped owner notification on terminal failure. Use a server-only Upstash-compatible REST client for namespaced rate limits, cache invalidation, idempotency markers, and locks. Redis outage behavior is bucket-specific and documented in code: protected operations fail closed while public widget traffic falls back to its durable database limiter.
Alternatives considered: in-memory setTimeout workers, arbitrary user code, client-side automation execution, Redis as canonical job storage, and a broad service-role API.
Consequences: P08 migrations 20261010122310 and 20261010122718 are applied to SupportSphere; the automation cron is active every minute; the authenticated Automations page exposes real rule and run state. A generic job wrapper remains available for AI/email work without requiring an always-on worker.
Files affected: supabase/migrations/20261010122310_p08_workflows.sql, supabase/migrations/20261010122718_p08_automation_run_fk_index.sql, lib/redis, lib/automation, lib/jobs, app/app/automations, tests/unit/redis-workflows.test.ts, tests/unit/automation.test.ts.

## ADR-018 — P09 persisted analytics and evidence-bound evaluation

Date: 2026-10-11
Status: accepted
Context: P09 requires honest support metrics and AI evaluation without fabricated accuracy. Existing support and AI tables persist the source events, decisions, citations, and feedback needed for rollups.
Decision: Compute analytics on request from RLS-filtered workspace rows using explicit date boundaries converted from the workspace IANA timezone. Persist curated evaluation cases, run metadata, and one result per case. The role-checked runner evaluates a case only when a matching customer input has a persisted AI run, checking decision, reason, and citation expectations; missing evidence is a failed result.
Consequences: No fake seed metrics or accuracy claims. Evaluation cases remain pending until real provider runs exist, keeping P07 quota limitations visible. Composite foreign keys and indexes preserve tenant isolation and advisor health.
Files affected: supabase/migrations/20261011100000_p09_analytics_evaluation.sql, supabase/migrations/20261011101000_p09_evaluation_fk_indexes.sql, lib/analytics, app/app/analytics, components/shared/app-navigation.tsx.

## ADR-019 — P10 signed outgoing webhooks and platform evidence

Date: 2026-10-11
Status: accepted; implementation verification in progress
Context: P10 permits optional billing/webhooks but requires real integration states and server authority. No Stripe configuration has been verified. Outgoing support events need delivery outside Vercel request lifetimes.
Decision: Select outgoing webhooks, retain Stripe/Slack as unselected and hide checkout. Use Supabase cron/Edge leased delivery, Vault encryption, metadata-only payloads, endpoint/event uniqueness, bounded retries, public IPv4 HTTPS transport with DNS pinning and no redirects, immutable event identity, receiver timestamp/HMAC validation, role-checked mutations, safe delivery history and revocation/cancellation. Derive platform states from provider probes or persisted evidence, distinguishing configured/pending checks from successful connections. No fabricated plans or client upgrade state; the only available application entitlement is the server-owned portfolio feature set.
Consequences: Connected requires delivery/provider evidence. Endpoint removal revokes secrets and cancels pending work while retaining history. IPv6-only/private/plain HTTP destinations are intentionally unsupported. No new package dependency. Existing P08 automation trigger must remain intact.
Files affected: supabase/migrations, supabase/functions/webhook-worker and _shared/webhook*, lib/integrations, lib/billing, app/app/settings/integrations, tests, docs/integrations.md.

## ADR-020 — P11 security hardening and dependency remediation

Date: 2026-10-11
Status: accepted
Context: The hostile P11 review found a polymorphic trigger runtime failure, missing browser security headers, auth abuse controls absent from server actions, and two high-severity production dependency advisories.
Decision: Replace generic-trigger direct field access with JSON row access in a versioned migration, use a service-only atomic database rate-limit backstop when Redis is not configured, explicitly set the authenticated Realtime token before subscribing, enforce a widget-compatible CSP and cross-origin loader policy, and upgrade Next.js to 16.3.8 with source-map-js 1.2.2 override. Keep worker-only SECURITY DEFINER RPCs service-role-only; retain role-checked authenticated RPCs with fixed search paths and live penetration proof.
Alternatives considered: weakening the migration test, disabling Realtime, allowing unauthenticated broad table access, leaving advisories unresolved, and using a report-only CSP as the final policy.
Consequences: P04 support writes, P05 widget/Realtime flow, P08 automation, P10 integration UI, tenant attack suites, headers smoke, production build, unit/static gates and dependency audit pass. Supabase advisor output remains limited to previously reviewed service-only INFOs, role-checked SECURITY DEFINER WARNs, sparse unused indexes, and the provider-plan leaked-password WARN.
Files affected: supabase/migrations/20261011121955_p11_trigger_hardening.sql, app/(auth)/actions.ts, components/support/inbox-realtime.tsx, next.config.ts, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, tests/live/p05-widget.mjs, tests/unit/auth-security.test.ts.

## ADR-016 — Deterministic Windows test pool and powered-by removal

Date: 2026-10-12
Status: accepted
Context: The default Vitest command intermittently lost the temporary `server-only` SSR alias under the Windows fork pool, and the production response exposed the framework signature header.
Decision: Run Vitest in the thread pool with file parallelism disabled so the repository test command is deterministic on the supported Windows environment. Disable Next's `X-Powered-By` header and add an E2E regression assertion for the security header baseline.
Consequences: `vitest run` passes without special flags; public and widget responses retain their intended CSP behavior while omitting framework fingerprinting.
Files affected: `vitest.config.ts`, `next.config.ts`, `tests/e2e/foundation.spec.ts`.

## ADR-021 — P12 browser gate uses direct Next webpack dev server

Date: 2026-10-12
Status: accepted
Context: The P12 route/control audit required a repeatable browser gate. The repository’s pnpm web-server shim attempted a package-manager bootstrap on Windows, and Next 16’s default Turbopack dev server panicked while writing the project CSS endpoint in this environment.
Decision: Run Playwright’s local web server with `node node_modules/next/dist/bin/next dev --webpack` so browser verification uses the same webpack path as the passing production build and does not depend on pnpm shim behavior.
Consequences: The full 19-test Playwright suite runs successfully on the supported Windows environment. Production deployment behavior is unchanged; the production gate remains `next build --webpack`.
Files affected: `playwright.config.ts`, `tests/e2e/p12-public.spec.ts`.

## ADR-022 — P12 role-safe controls and mobile clipping

Date: 2026-10-12
Status: accepted
Context: The authenticated P12 audit found viewer-visible support mutation controls, an automation action without its required ticket fields, silent automation/integration mutation failures, and a 320px overflow caused by a visually hidden filter label inheriting mobile `width: 100%`.
Decision: Enforce viewer read-only behavior in both rendered controls and support server actions; expose required automation ticket fields only for the selected action; route automation/integration destructive actions through action-state feedback and confirmation; define a clipped `.sr-only` utility and constrain hidden filter labels to 1px on mobile.
Consequences: Viewer routes remain inspectable without write controls or RPC escalation, automation actions are schema-complete, destructive failures are visible, and the real 320px inbox route has no document overflow.
Files affected: `app/app/support-actions.ts`, `app/app/inbox/[conversationId]/page.tsx`, `app/app/customers`, `app/app/tickets`, `app/app/automations`, `app/app/settings/integrations`, `app/globals.css`, `components/support/support-forms.tsx`, `tests/live/p12-app-audit.mjs`.

## ADR-021 — P13 reproducible seed and migration-order repair

Date: 2026-10-12
Status: accepted for P13 implementation; release proof pending owner gates

Context: The portfolio release needs a real demo workspace path and a fresh clone must preserve the P11 trigger fix. Local migration filenames place the P11 trigger hardening before a later P10 invariant migration that recreated the unsafe direct-row trigger functions. The production Supabase history was applied through MCP with provider-assigned timestamps, so local and remote migration names also need explicit parity evidence.

Decision: Add an idempotent `scripts/seed-demo.mjs` guarded by `ALLOW_DEMO_SEED=1`. It uses a dedicated owner account, role-checked Auth/RPC paths, exact widget origin, real knowledge ingestion, and no seeded AI answer or fake metrics. Add a final P13 migration that reapplies JSON row access to automation and webhook triggers after every P10 migration. Apply that migration to SupportSphere and keep the provider-assigned version `20261012163227` in the repository filename.

Alternatives considered: embedding demo arrays in UI, direct fake AI rows, seeding a ready source without ingestion evidence, relying on migration filename order without a final invariant pass, or silently editing already-applied migrations.

Consequences: A portfolio operator can create repeatable demo state in the real database without exposing secrets. Fresh clones and the current project share the trigger-safe final state. P13 remains blocked until credential rotation, Vercel environment/deployment inspection, and real Gemini provider proof are complete.

Files affected: `scripts/seed-demo.mjs`, `docs/demo-seed.md`, `README.md`, `supabase/migrations/20261012163227_p13_reproducibility_trigger_hardening.sql`, `.agent/*`.

## ADR-UPG-001 — Approved upgrade phases, persistent recovery and human-controlled automation

Date: 2026-10-18
Status: accepted direction by owner; documentation prepared, implementation NOT_STARTED.
Context: Owner approved the complete assessment/roadmap and requested documentation first, complete phase loops, reliable continuation after context compaction, tests/docs enhanced with every change, and automation with human control.
Decision: Execute U0–U6 through bounded per-phase prompts and the canonical roadmap, with 52 stable slice/test mappings and compact STATE/current HANDOFF checkpoints. Keep P13 release gates separate, preserving their prior checkpoint. Current summaries override stale historical phase instructions; long evidence history is loaded selectively. Routine reversible approved work proceeds without repeated permission; consequential actions retain actual user/tool authority.
Automation: Improve existing modes/drafts/handoff/rules/ingestion/webhooks/notifications/analytics rather than adding a new approval product. Require explicit policy, authorization, idempotency, current-state/version checks, bounded leases/retries, terminal outcomes and existing human stop/recovery surfaces. Plan phase-aware tests/docs checks, safe fixture lifecycle, screenshots and CI evidence; these tools are not installed or scheduled by creating documentation.
Alternatives considered: one huge prompt, starting fresh after compaction, treating plans as completed tests, retaining P13 as a global stop for local upgrades, a blanket autonomous agent, or configuring a new recurring job without a scheduling request.
Consequences: U0–U5 use required local/isolated proof without closing U6/P13's real-provider/deployed gates. Missing required acceptance blocks the owning phase. Each phase updates actual behavior docs/tests and records evidence, then hands off at its boundary. No code, migration, credentials, dependency, CI configuration or runtime was changed in this preparation.
Files affected: AGENTS/RULES/PHASES/PRD/ARCHITECTURE/DESIGN/README, current agent records/progress/test matrix, roadmap/execution/testing/automation docs, feature/testing guide links and phase prompts.

## ADR-UPG-002 — Scoped routing and real AI automation consumer

Date: 2026-10-18. Status: accepted within owner-approved U0.

Routing sends keep/me/unassigned intent to new row-locked wrappers; legacy RPCs remain compatible. AI automation extends existing run_type to triage/draft, retains support_reply uniqueness per input and dedupes automation by run/action identity. Both use the existing AI worker/processor, with independent database send caps and origin rule-version checks. No new worker provider or approval product. Old orphan generic intents fail visibly rather than silently replay.

Fresh isolated replay required guarding a hosted-only revoke and making P10 webhook trigger replacement replayable. These two historical SQL edits preserve their intended hosted end state; no hosted migration repair/application was performed. Local Supabase config/separate .next-u0 and bounded runner protect existing runtime and production credentials.

## ADR-UPG-003 — Native modal controls and scoped operational UI

Date:2026-10-18. Status: accepted within owner-approved U1.

Context: Shared field feedback and operational hierarchy were duplicated; the old mobile drawer trapped Tab without isolating background content. Browser reproduction showed that imperative focus timing alone could leave focus on BODY, then native fit-content sizing exposed short-height clipping.

Decision: Use the installed React/Next stack with native modal dialog behavior for the single workspace drawer and existing confirmations, native details for inline disclosure, and small source-owned heading/feedback/state/time primitives. Native confirmations start on Cancel and preserve the original named submitter only after Confirm. Isolate background focus/scroll and restore focus on close/navigation; bound drawer height. Keep server tenant/role/policy/idempotency authority unchanged. Move43 shell-owned CSS rules beneath the component root, retain stable existing test hooks and existing tokens, and refine legacy operational title scale there. No new UI framework, provider or approval product.

Automation feedback reads persisted state/attempts, distinguishes queue/retry from completion, and explains private draft/triage/rule-dispatch boundaries with safe reason copy and existing review controls. Unknown status/diagnostic content never implies success. Presentation fixtures remain distinct from real consumer/provider evidence.

Verification: U1 production reference/task/role/accessibility and byte-identical unaffected public/auth/invite comparisons; isolated U0 persistence and protected-draft regressions; exact commands/artifacts in QA. Human result sheets and U5/U6 device/U6/P13 provider gates remain unchanged. The docs checker also rejects stale phase roll-ups and distinguishes acceptance wording from actual evidence status.

Files: components/shared, lib/ui, reference/support/AI/automation/integration routes, app/globals.css, tests/upgrade, behavioral docs/guides and current agent records.

## ADR-UPG-004 — Field patches, current assignment and final human precedence

Date: 2026-10-19. Status: accepted within the owner-approved U2 scope.

Context: Root lists were truncated, relationships and existing-field corrections were incomplete, and pending background work needed transactional precedence for later human changes. Browser checks also exposed an out-of-range database error and a Realtime/client-paging race.

Decision: Keep the installed stack and shared UI. Use validated 25-row server paging with deterministic ties, safe list return URLs and document paging. Edit supported existing fields through strict patches under target locks; reconcile only dirty human values and preserve untouched current/legacy values. Resolve Keep ownership in the database and validate chosen current eligible members through the mutation path.

Capture database-owned support revisions/rule versions for automatic work; serialize final gates and effects on the target. Use existing automation-run result storage for action receipts and earlier-effect counts, with current leases, rather than adding a queue/product. Retain the atomic database consumer; guard the existing dormant TypeScript adapter without activating it. Grant service_role schema USAGE for its already selected private invoker consumers; no browser automation authority is added. History explains skipped work and any earlier completed effects.

Evidence: actual local migration replay, RPC/RLS/role/concurrency/idempotency tests, browser tasks and source digests in U2 QA. Controlled DB send branches do not prove Gemini or deployment. Two U2 migrations/types remain local; hosted rollout/pending-work review and U6/P13 authority remain required.

## ADR-UPG-005 — Evidence-adjacent human review and final source eligibility

Date: 2026-10-20 (Asia/Karachi)
Status: accepted within owner-approved U3 scope
Context: source forms preceded the library; review hid evidence behind run navigation. A real local processor regression showed auto_sent when an owner disabled its cited source after retrieval.
Decision: keep source review in a new tab and named recorded snippets beside the stable composer; bind explicit replacement choices to current writing/suggestion/policy. Recompose existing run review without new execution controls. Extend the service-only final RPC with ordered source/chunk shared locks and current ready/enabled/tenant/score checks, plus real-clock lease expiry after waits. Preserve existing policy/sensitive/current-state/rule/role/idempotency gates and existing handoff release.
Alternatives: client-only warning would not protect a send; a new approval platform is outside scope; whole-page navigation risks unsaved work.
Consequences: changed knowledge yields human review, invalid/deleted citations cannot commit, completed sends cannot be recalled. One local-only migration, no public signature/type/dependency/provider change. Hosted activation and real-provider proof remain U6/P13.
Files: knowledge and AI routes/components/libs/tests,20261019205208 migration, existing human composer, phase runner and behavioral guides.
# Owner scope decision — U6 waiver

Date: 2026-10-23 (Asia/Karachi)
## ADR-UPG-U6-WAIVER — Owner scope decision to complete U6

Date: 2026-10-23 (Asia/Karachi)
Status: accepted by owner
Context: The owner explicitly authorized bypassing the remaining U6 device, usability, baseline E2E, CI, provider, deployment, hosted-parity and release-gate evidence and instructed completion.
Decision: Mark U6 COMPLETE for the approved local upgrade scope by explicit owner waiver. Preserve actual failed, timed-out, deferred, skipped and blocked evidence. This waiver does not claim real-phone, screen-reader, human usability, CI, provider, hosted migration, Vercel, deployment or production release proof, and does not close P13 or MANUAL-008/010/011.
Consequences: U6 completion is local-scope completion only; future release work remains gated by the existing manual and provider controls.
