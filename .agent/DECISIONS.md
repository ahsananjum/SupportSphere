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
