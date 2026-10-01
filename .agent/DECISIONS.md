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
