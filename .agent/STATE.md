# Current State

Active phase: P07
Status: BLOCKED_MANUAL
Last updated: 2026-10-07
Current branch: master
Last known good commit: d22db44 (P06 complete)

## Objective

Complete the deterministic, tenant-safe AI support graph from customer message to triage, policy, pgvector retrieval, grounded draft, quality gate, and send/draft/handoff, with persistent inspection and feedback.

## Completed in P07

- [x] Loaded mandatory repository and installed Next.js guidance; inspected actual prior implementation, live Supabase, git state, reference support/RAG pattern and MIT license.
- [x] Applied five P07 migrations through `20261007080034_p07_run_type.sql`; regenerated live database types. AI tables have RLS and tenant ownership; indexes satisfy the live FK advisor.
- [x] Deployed active `ai-worker` v3 and verified minute cron. Implemented OpenAI Responses adapter, versioned prompts, bounded workspace retrieval, structured outputs, deterministic gates, safe retry/handoff, and transactional final send.
- [x] Built owner/admin policy settings, conversation draft/handoff, run list/inspector, feedback, navigation, and mobile/accessibility states.
- [x] Controlled ten-scenario unit suite, live DB/RLS suite, authenticated production-build UI journey, responsive and keyboard checks, regression suite, typecheck/lint/tests/build all pass. Temporary P07 fixtures are cleaned.
- [x] Documented architecture and precise owner action in `docs/ai.md`, `.agent/DECISIONS.md`, `.agent/QA.md`, and `.agent/MANUAL_ACTIONS.md`.

## Remaining

- [ ] Owner configures OpenAI project key and Responses structured-output model IDs in Supabase Edge Function Secrets (MANUAL-008). No AI secret names are present now.
- [ ] Agent verifies secret names without reading values, runs all ten P07 scenarios through the **real** provider in an isolated workspace, including outage/injection behavior, and cleans fixtures.
- [ ] Agent sets VERIFYING, repeats full P07 static/browser/security/mobile gate and advisor review, then sets COMPLETE and updates handoff only if every criterion is proven.

## Current schema/migrations

Remote SupportSphere project `xviumgygixcklrbuynoh` matches local history through P07 version `20261007080034`. P07 tables: `ai_agent_configs`, `ai_runs`, `ai_run_steps`, `ai_citations`, `ai_feedback`. AI worker cron is active each minute. No P07 test workspaces or queued/processing runs remained at last check.

## Current integrations

Supabase database and AI Edge worker are live. The Next.js app is verified as a local production build; no P07 Vercel deployment is claimed and Vercel MCP is unavailable. OpenAI credentials/models are **not configured** in Supabase. The worker refuses to claim runs and returns 503 while unconfigured.

## Known failures or blockers

- MANUAL-008 owner credential/billing setup is required. Controlled outputs in tests cannot prove real model grounding or injection resistance.
- Supabase advisor includes intentionally role-checked authenticated SECURITY DEFINER RPC warnings and preexisting service-only RLS/Auth notices; details in QA.
- Local sandbox helper fails setup; approved escalated PowerShell works.

## Next exact actions

1. Wait for owner to complete MANUAL-008 without sharing any secret; remain in P07.
2. Inspect Supabase AI secret **names**, then exercise real-provider ten-scenario suite through isolated live messages and inspect persisted runs/citations/messages/notifications; clean all fixtures.
3. Re-read P07 acceptance, recheck code/schema, set VERIFYING, run final typecheck/lint/format/unit/E2E/build/live/browser/advisor/security checks, repair failures, then set COMPLETE and update handoff.
