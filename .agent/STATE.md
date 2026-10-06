# Current State

Active phase: P05
Status: COMPLETE
Last updated: 2026-10-06
Current branch: master
Last known good implementation commit: pending P05 commit (formal gate passed)

## Objective

Complete P05 customer website widget and customer ↔ team support loop with real persistence, tenant-safe Realtime, and verified external-host behavior.

## Completed in P03

- [x] Loaded binding project, design, Next.js, and agent guidance; inspected clean baseline and prior commits.
- [x] Applied P03 Supabase migrations, including RLS, role-checked RPCs, completion invariants, notifications, and indexes. Live types regenerated.
- [x] Implemented resumable setup, current-membership workspace context, single responsive navigation, settings, security/audit view, and notification read state.
- [x] Reused and audited P01 invitation/member flows; prohibited agent/viewer self-removal and viewer notification writes at the database boundary.
- [x] Fixed source-owned Motion Primitives reduced-motion hydration mismatch.
- [x] Live security attacks passed; production-build authenticated browser journey passed across 320–1440 px and owner/admin/agent/viewer UI; temporary rows/users cleaned.
- [x] Inspected mobile onboarding, team, general/security settings, and desktop team screenshots.
- [x] Supabase security/performance advisors reviewed; new notification table/index have no findings.

## Completed in P04 implementation pass

- [x] Added migration for customers, identities, conversations, messages, tickets, ticket events, tags, and join tables with tenant RLS, indexes, composite workspace FKs, and deterministic ticket number/customer locks.
- [x] Added workspace-checked RPCs for customer dedupe, conversation creation/update, idempotent message send/internal notes, ticket create/update, assignment membership, and audit events.
- [x] Added generated database type entries for P04 tables and RPCs.
- [x] Added real DB-backed inbox, conversation detail/composer, customer list/detail, and ticket list/detail routes with loading/error/empty/success states and mobile layouts.
- [x] Added retry-safe composer client key, plain-text message rendering, filters, pagination range, and responsive support navigation.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (21 passed, 2 opt-in skipped), `pnpm build`, and `git diff --check` pass.

## P04 final verification — 2026-10-04

- [x] Applied `20261004120000_p04_support_operations.sql`, `20261004130000_p04_support_indexes.sql`, and `20261004131500_p04_composite_fk_indexes.sql` to project `xviumgygixcklrbuynoh` with the local environment token; no credential was printed or committed.
- [x] Regenerated `lib/supabase/database.types.ts` from the live project.
- [x] Live P04 security/concurrency suite passed: deterministic customer dedupe, tenant isolation, forged IDs, viewer write denial, message retry idempotency, concurrent conversation/ticket updates, assignment validation, ticket timeline, and concurrent ticket numbers.
- [x] Authenticated browser journey passed through customer → conversation → reply → internal note → ticket → resolved timeline, with responsive no-overflow checks at 320–1440px.
- [x] Supabase security/performance advisors and linked schema lint completed; P04 has no security findings or unindexed foreign keys. Remaining INFO/WARN items are preexisting or expected on empty tables/provider configuration.
- [x] Final gates passed: typecheck, lint, format, 21 unit tests (3 opt-in remote tests run separately), production build, and diff check.

## Current schema/migrations

SupportSphere project `xviumgygixcklrbuynoh` has P04 and P05 migrations applied through `20261006051012`; generated types were refreshed from the live schema. P05 adds widget configuration, opaque session hashes, service-only rate buckets, atomic widget RPCs, and Realtime publication for messages/conversations.

## Current integrations

Supabase is connected. P01 verified Brevo auth/invitation delivery; P02 verified Vercel production origin `https://support-sphere-psi.vercel.app`. P03 changes are currently local plus applied Supabase migration; deployment was not requested in this phase.

## Known notes

- Default command sandbox has setup-refresh errors; approved escalated shell works.
- Supabase advisor has expected service-only no-policy INFO notices for widget sessions/rate buckets, unused-index INFO notices on the sparse project, and the preexisting provider-level leaked-password-protection WARN. No P05 security-definer warning or unindexed FK remains.
- No new owner-controlled credential or dashboard step is required for the local P05 golden test.

## P05 execution checklist

- [x] Add widget configuration, session, rate limit and origin enforcement schema with RLS and generated types.
- [x] Add async iframe loader, public config handshake, session and messaging API, and customer UI.
- [x] Add tenant-scoped inbox Realtime and reconnect reconciliation.
- [x] Add external test host and abuse/golden tests, including long history, keyboard, mobile, reduced motion, offline draft, and retry dedupe.
- [x] Apply migrations and inspect live schema, RLS, publication, advisors, and cleanup.
- [x] Run the final phase gate after entering VERIFYING, update QA/HANDOFF, and mark COMPLETE.

## P05 final verification — 2026-10-06

- [x] Live golden flow passed: external host → iframe → customer message → inbox and authorized Realtime event → agent reply → widget → reload history.
- [x] Hostile origin, guessed key/token, oversized message, flood 429 UX, retry dedupe, and cross-workspace Realtime/RLS attacks passed.
- [x] Long transcript pagination, offline draft, Escape focus, reduced motion, and mobile widths 320–1024 passed; mobile screenshot inspected.
- [x] Remote P05 migrations and generated types match; advisors have no new P05 WARN or missing FK indexes; final test cleanup returned zero P05 workspaces.
- [x] Formal typecheck, lint, format, unit, Playwright, build, and diff gate passed. Exact evidence is in `.agent/QA.md`.

## Next exact actions

P05 is complete. Preserve the applied schema and verification record; begin P06 only on a new request. Production deployment and installation on a real owner site are separate release actions.
