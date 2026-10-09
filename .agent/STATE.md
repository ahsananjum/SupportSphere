# Current State

Active phase: P07
Status: BLOCKED_MANUAL
Last updated: 2026-10-09
Current branch: master
Last known completed-phase commit: d22db44 (P06); P07 implementation baseline: f4a7590

## Objective

Complete the deterministic tenant-safe AI workflow with Google Gemini `generateContent` Free Tier, retaining triage → policy → pgvector retrieval → draft → quality → send/draft/handoff and inspectable runs.

## Completed in P07

- [x] Reloaded RULES, P07, applicable PRD/ARCHITECTURE/DESIGN, all agent records, git status/history, existing implementation, and live Supabase schema/function/cron before edits. Read current official Gemini API and Supabase guidance.
- [x] Existing five P07 migrations through `20261007080034` remain applied; live RLS, worker lease, search and final send gates remain unchanged.
- [x] Replaced OpenAI with Gemini REST adapter on a fixed host. The key is sent only as server-side `x-goog-api-key`; no model tools are provided. Gemini native JSON schema is paired with exact-key runtime validation. Bounded 408/429/5xx and transport retry feeds the existing 15/30-second leased job backoff.
- [x] Preserved all P07 graph, mode, citation, handoff, and inspector behavior. Deployed active Gemini `ai-worker` v4; minute cron remains active.
- [x] Gemini wire/error tests and ten controlled scenarios pass. Live DB/RLS policy suite and authenticated production-build browser journey pass; 320–1024px and keyboard checks pass. Static gate: 38 unit tests, 13 E2E tests, typecheck/lint/format/build pass. Supabase advisors reviewed; zero P07 fixtures and queued/processing runs remain.
- [x] Updated Gemini provider documentation, ADR, and owner manual action.

## Remaining

- [x] MANUAL-008: owner reported `gemini-3.8-flash`; secret-name-only CLI check found all five `AI_*` names. Values were not read. The model is reachable, but subsequent real runs hit free-tier `PROVIDER_RATE_LIMIT` and safely escalated.
- [ ] Run all ten scenarios through the real configured Gemini provider in an isolated synthetic workspace after quota is available. Real grounded auto-send, safe no-evidence escalation, and safe rate-limit recovery have been observed; remaining model scenarios are quota-blocked.
- [ ] Set VERIFYING only after free-tier quota permits all ten real scenarios; repeat the full phase/security/mobile gate, repair failures, then set COMPLETE and update handoff.

## Current schema/migrations

Remote SupportSphere project `xviumgygixcklrbuynoh` matches local P07 migration history through `20261007080034`. AI tables have tenant RLS. No schema migration was needed for the provider change. The `supportsphere-ai-worker` cron is active every minute.

## Current integrations

Gemini `ai-worker` is active; `gemini-3.8-flash` reached Google, with later requests safely classified as free-tier rate limits. The Next.js app was verified as a local production build; no P07 Vercel deployment is claimed, and Vercel MCP is unavailable.

## Known failures or blockers

- Secret names are present; the selected model is reachable, but free-tier quota is exhausted or rate-limited. Remaining scenario behavior remains unverified until quota is available.
- Supabase security advisor continues to show intentional role-checked SECURITY DEFINER warnings plus preexisting service-only RLS/Auth notices; performance advisor reports unused indexes only.
- The local sandbox helper fails setup; approved escalated PowerShell works.

## Next exact actions

1. Redeploy/check `ai-worker` from repository code and verify provider behavior using synthetic fixtures. Never print the key.
2. After the owner restores Gemini quota or supplies a project/key with quota, run the remaining real scenarios through synthetic records and the scheduled worker. Inspect run/citation/step/log outcomes and clean all fixtures.
3. Re-read P07 acceptance and code/schema, set VERIFYING, rerun full typecheck/lint/format/unit/E2E/build/live/browser/advisor/security checks, repair failures, then set COMPLETE and update HANDOFF.
