# P01 handoff

Status: BLOCKED_MANUAL (2026-10-01). P01 has not exited.

## Changed

- Added pinned Supabase SSR/SDK/CLI dependencies and versioned identity/tenancy SQL migration.
- Added real Supabase auth/session/callback, Google OAuth entry, password recovery state, protected app routes, workspace/team/invitation actions and UI, and Brevo invitation adapter.
- Added invite lifecycle and role/last-owner rules in atomic database functions, with RLS and audit rows.
- Added security unit/live attack tests and responsive auth Playwright coverage.
- Recorded owner actions and QA evidence. No production mock data or credentials added.

## Migration

supabase/migrations/20260930182341_p01_identity_tenancy.sql is local only and unverified against Postgres. Do not apply it to BookPro. Review and apply it only to the designated SupportSphere project. Generate actual TS types afterward.

## Verification

Local typecheck, lint, format, 19 unit tests, three Playwright tests, build, and git diff check pass. One live security test is skipped because a dedicated local Supabase endpoint is unavailable. No real auth, mail, OAuth, or RLS claim has been made.

## Manual steps pending

See MANUAL-001 to MANUAL-003 in .agent/MANUAL_ACTIONS.md: connect SupportSphere Supabase, configure Google OAuth, verify Brevo sender/API and custom SMTP. Store keys in ignored .env.local/server-only deployment secrets. Never paste them into chat/source.

## Next commands/actions

1. Verify SupportSphere project ref through Supabase MCP and inspect current migrations/tables.
2. Apply the reviewed migration, generate lib/supabase/database.types.ts from that actual schema, and type all Supabase clients.
3. Run security advisors and a dedicated local/test instance with P01_TEST_SUPABASE_URL, P01_TEST_SUPABASE_PUBLISHABLE_KEY, and P01_TEST_SUPABASE_SERVICE_ROLE_KEY; run pnpm test and confirm the security test executes.
4. Test real signup, login, logout, reset mail, Google OAuth, invitation delivery/accept/revoke/resend, audit, and mobile reset/invite screens.
5. Repair findings, rerun full P01 gate, then set VERIFYING and COMPLETE only if every acceptance criterion is proven.

## Unresolved risks

Migration syntax/policy behavior, email delivery, OAuth configuration, and database-generated types are unverified. Docker Desktop process exists but its daemon did not respond during this session.