# Current State

Active phase: P01
Status: BLOCKED_MANUAL
Last updated: 2026-10-01
Current branch: master
Last known good commit: 290d20e

## Objective

Prove real Supabase authentication, tenant isolation, membership, Google OAuth, and Brevo invitation/password mail end to end.

## Completed in this phase

- [x] Loaded binding documents, all agent records, installed Next.js guides, current Supabase guidance, recent commits, and initial clean Git status.
- [x] Confirmed Supabase MCP lists only BookPro. No SupportSphere schema change was applied there.
- [x] Created versioned P01 identity/tenancy migration with profiles, workspaces, members, invitations, audit, private helpers, read RLS, atomic RPCs, last-owner safety, invite expiry/revoke/reuse logic, and bounded invitation creation.
- [x] Added Supabase SSR session handling, auth pages/actions/callback, Google OAuth entry, password recovery state, protected routes, and safe redirects.
- [x] Added workspace creation/switching, member roles/removal, invitation send/resend/revoke/accept, server-only Brevo adapter, and delivery recording.
- [x] Added responsive forms, loading/error/empty/success states, labels, focus/keyboard support, and security/browser tests.
- [x] Local gates pass: typecheck, lint, format, 19 unit tests, 3 Playwright tests, production build, diff whitespace.

## Remaining acceptance and verification

- [ ] Connect the actual SupportSphere Supabase project. Apply and inspect migration; refresh generated TypeScript types from its schema.
- [ ] Run RLS security advisors and the live attack test. Confirm cross-tenant SELECT/mutation, role escalation, forged IDs, revoked/expired/reused invites, and last-owner behavior against the actual database.
- [ ] Configure Brevo verified sender, transactional API, and Supabase custom SMTP. Test real invitation, signup confirmation, and password reset delivery/links.
- [ ] Configure Google OAuth client/provider and test sign-in/callback/logout.
- [ ] Verify all auth and invitation flows with real accounts, including mobile reset and active invitation states.
- [ ] Run the full P01 phase gate once live integration is available; only then set VERIFYING and COMPLETE.

## Current schema/migrations

Local migration: supabase/migrations/20260930182341_p01_identity_tenancy.sql. Not applied to a hosted project. Generated types are pending. Local Docker daemon did not respond, so local database execution was not possible.

## Current integrations

Supabase MCP account exposes only unrelated BookPro. No SupportSphere project, publishable/service key, verified Brevo sender/API/SMTP, or Google provider configuration is available in this workspace.

## Known failures

- No confirmed database execution or live auth/email/OAuth behavior. Security integration test is skipped without a dedicated local Supabase endpoint.
- Docker CLI is installed but daemon readiness and supabase start did not respond.
- Local command sandbox setup fails; approved outside-sandbox commands worked.

## Next exact actions

1. Owner completes MANUAL-001 through MANUAL-003 in .agent/MANUAL_ACTIONS.md; keep secrets out of chat/source.
2. Verify project ref via Supabase MCP, apply reviewed migration there, inspect tables/RLS/advisors, generate database types into lib/supabase/database.types.ts, and update clients to use them.
3. Run real account/mail/OAuth and security tests, repair findings, repeat the complete phase gate, then update QA/STATE/HANDOFF.