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

- [x] MANUAL-008: owner reported Gemini setup; secret-name-only CLI check found all five `AI_*` names on 2026-10-09. Values were not read. Real provider smoke reached Google but the configured model returned safe HTTP 404 (`PROVIDER_MODEL`); the selected model is unavailable to this key.
- [ ] Run all ten scenarios through the real configured Gemini provider in an isolated synthetic workspace, inspect citations/steps/messages/Edge logs, and clean fixtures. Adapter 429/outage tests are currently controlled; a real provider response has not been observed.
- [ ] Set VERIFYING only after the manual gate is resolved, repeat the full phase/security/mobile gate, repair failures, then set COMPLETE and update handoff.

## Current schema/migrations

Remote SupportSphere project `xviumgygixcklrbuynoh` matches local P07 migration history through `20261007080034`. AI tables have tenant RLS. No schema migration was needed for the provider change. The `supportsphere-ai-worker` cron is active every minute.

## Current integrations

Gemini `ai-worker` is active after repository redeployment; real-provider smoke reached Google and safely classified the configured model as unavailable. The Next.js app was verified as a local production build; no P07 Vercel deployment is claimed, and Vercel MCP is unavailable.

## Known failures or blockers

- Secret names are present; the selected model is unavailable to this key. Real grounding and scenario behavior remain unverified until an available model ID is configured.
- Supabase security advisor continues to show intentional role-checked SECURITY DEFINER warnings plus preexisting service-only RLS/Auth notices; performance advisor reports unused indexes only.
- The local sandbox helper fails setup; approved escalated PowerShell works.

## Next exact actions

1. Redeploy/check `ai-worker` from repository code and verify provider behavior using synthetic fixtures. Never print the key.
2. After the owner updates the three model IDs to an available Gemini model, run the real ten-scenario suite through synthetic customer/knowledge records and the scheduled worker. Inspect run/citation/step/log outcomes and clean all fixtures.
3. Re-read P07 acceptance and code/schema, set VERIFYING, rerun full typecheck/lint/format/unit/E2E/build/live/browser/advisor/security checks, repair failures, then set COMPLETE and update HANDOFF.
