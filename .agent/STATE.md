# Current State
Active phase: P13
Status: BLOCKED_MANUAL
Last updated: 2026-10-13
Current branch: master
Last known completed-phase commit: 315c76c

## Objective
Deploy and prove SupportSphere as a reproducible portfolio product, then complete the P13 release gate.

## Completed in this phase
- [x] Repository truth loaded: RULES, PHASES P13, PRD, ARCHITECTURE, DESIGN, and all `.agent/*.md` files.
- [x] Added idempotent real-database demo seed `scripts/seed-demo.mjs`, `pnpm seed:demo`, and `docs/demo-seed.md`; no UI fake data or seeded AI output.
- [x] Replaced the P00 README with the P13 portfolio package and added a reviewed production landing screenshot under `docs/screenshots/`.
- [x] Added and applied migration `20261012163227_p13_reproducibility_trigger_hardening`; both automation/webhook trigger functions are JSON-safe after the full local migration order.
- [x] Supabase MCP inspection: project `xviumgygixcklrbuynoh` is ACTIVE_HEALTHY, all 39 public tables have RLS, three Edge workers are active, five cron jobs are active, and advisors show only the documented INFO/WARN set.
- [x] Read-only production smoke passed public routes, SEO/canonical/robots/sitemap, keyboard, console, custom 404, six widths, OAuth initiation, and widget loader.
- [x] TypeScript, ESLint, Prettier, Vitest 52/3 skipped, elevated webpack build, focused P12 public E2E 5/5, diff check, node seed syntax, and tracked-file secret scan passed.

## Remaining
- [ ] Owner executes TESTING_GUIDE.md using supplied synthetic inputs and records results in docs/owner-test-results.md; developer verifies/reconciles the source-level requirement gaps in its section 19.
- [ ] Rotate credentials exposed during the P13 `.env` inspection (MANUAL-010).
- [ ] Connect Vercel inspection, confirm deployment commit parity, configure/validate production-only env values, and rerun deployment smoke (MANUAL-011).
- [ ] Resolve the existing Gemini model/quota gate and verify all ten real-provider scenarios (MANUAL-008).
- [ ] Run the demo seed in a dedicated owner-approved workspace and execute the full deployed golden journey, including knowledge indexing, widget message, realtime inbox, AI evidence/handoff, human reply, ticket, analytics, and role denial.
- [ ] Re-run the complete phase gate, consolidate/commit the coherent tree, then set VERIFYING → COMPLETE.

## Schema/integrations
- Supabase production project: `xviumgygixcklrbuynoh`, region `ap-south-1`, status ACTIVE_HEALTHY.
- Remote migrations through `20261012163227_p13_reproducibility_trigger_hardening`; Edge functions `knowledge-worker` v9, `ai-worker` v13, `webhook-worker` v5 active.
- Optional analytics is intentionally off. Stripe is unselected. P07 Gemini real-provider verification remains blocked by owner quota/model setup.
- Vercel MCP is not installed/available in this session; browser verification of the recorded deployment is the current runtime evidence.

## Known failures / blockers
- The 2026-10-13 documentation review found unproven/missing PRD UI paths and evaluation/migration-parity concerns listed in TESTING_GUIDE.md section 19. These are source-based findings, not newly executed production test results; do not claim full requirements coverage from earlier UI passes.
- MANUAL-010 is blocking because credential values were printed during the earlier 2026-10-12 ignored `.env` inspection; never print or commit them. The 2026-10-13 documentation pass did not read env values.
- MANUAL-011 is blocking production commit/env parity and Vercel runtime inspection.
- The full Playwright command stalled before reporting on this Windows host; the focused P12 public file and dedicated production smoke passed. Re-run the complete suite in a reliable host before final phase completion.
- The current production deployment may predate the committed P12/P13 package; do not claim the deployed app includes the intended commit until Vercel metadata proves it.

## Next exact actions
1. Owner completes MANUAL-010 and confirms rotation without sharing secrets.
2. Owner connects Vercel, redeploys the current tree with production env parity, and shares only URL/commit metadata.
3. Verify metadata-only Supabase access, Edge workers, Vercel logs, Brevo links, OAuth callback, and deployment parity.
4. Run the dedicated demo seed and full deployed golden journey after Gemini quota/model verification.
5. Re-run the full phase gate, commit coherent changes, and only then set VERIFYING → COMPLETE.
