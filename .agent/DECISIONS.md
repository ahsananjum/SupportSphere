# Architecture decisions

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


