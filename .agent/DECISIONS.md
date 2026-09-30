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
Consequences: The migration must be applied and attacked against the actual SupportSphere project before P01 can complete. Service credentials remain server-only.
Files affected: supabase/migrations/20260930182341_p01_identity_tenancy.sql, lib/workspaces, app/app.

## ADR-005 — Auth mail and provider boundary

Date: 2026-10-01
Status: accepted
Context: Supabase Auth owns signup/recovery mail while workspace invitations require custom transactional delivery.
Decision: Use Supabase Auth with Brevo custom SMTP for confirmation/recovery, and the Brevo Transactional API for invitation text+HTML mail. Use one trusted environment origin and a narrow post-auth redirect allowlist.
Alternatives considered: fake email success or provider-specific browser code.
Consequences: Sender/DNS, SMTP, Google OAuth, and project credentials are owner gates; P01 remains BLOCKED_MANUAL until verified.
Files affected: app/(auth), lib/email/brevo.ts, lib/auth/redirect.ts, .agent/MANUAL_ACTIONS.md.