# SupportSphere

SupportSphere is being built as a multi-tenant customer support platform. This repository is in phase P00: a verified application foundation. Product features begin in later phases and are defined in [PRD.md](PRD.md) and [PHASES.md](PHASES.md).

## Local setup

Use Node.js 22.17 or newer and pnpm 11.25.0. CI uses Node.js 24. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. P00 does not need provider credentials. Copy `.env.example` to `.env.local` only when developing a later integration; never commit local env files. Provider configuration is validated at its server boundary in `lib/env.ts`.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

The Playwright test starts its own local server on port 3100. CI runs the same checks with a frozen lockfile.

## Structure and sources

The single Next.js App Router application lives at the repository root. `app/` contains routes; `components/` UI; `lib/` provider boundaries and shared code; `server/` trusted services and repositories; `supabase/` migrations and seeds; `tests/` checks. The detailed layout and future service rules are in [ARCHITECTURE.md](ARCHITECTURE.md). Agent execution state is in `.agent/`.

UI direction comes from [DESIGN.md](DESIGN.md), an original SupportSphere adaptation of the [Command Center DesignMD source](https://designmd.ai/frknaykc/command-center). The [500 AI Agents Projects repository](https://github.com/ashishpatel26/500-AI-Agents-Projects) is a research reference (MIT licensed at inspection time); no code or dependencies were copied into P00.

Supabase and Vercel app plugins were listed in this session, but callable project tools were not exposed, so no project connection or deployment has been claimed. See `.agent/STATE.md` and `.agent/QA.md` for current evidence.
