# P01 handoff

Status: COMPLETE (2026-10-01). P01 acceptance and full phase gate passed against Supabase project `xviumgygixcklrbuynoh`.

## Implemented

- Real Supabase authentication: signup, login, logout, confirmation, recovery/reset, Google OAuth, protected routes, callback, and safe redirects.
- Five tenant tables, RLS policies, read-only grants, atomic membership and invitation RPCs, last-owner protection, and audit logs. Applied migrations `20260930201144_p01_identity_tenancy.sql` and `20260930201423_restrict_rls_event_trigger.sql`.
- Live-generated database types and typed Supabase clients.
- Workspace creation/switching, role controls, onboarding foundation, invitation send/accept/resend/revoke/expiry, and Brevo delivery.
- Responsive forms and states for auth and invitations, with labels, validation, keyboard and focus behavior.

## Verified

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 unit tests), `pnpm test:e2e` (4 browser tests), `pnpm build`, and `git diff --check` passed.
- Hosted live security suite passed cross-tenant read/write, forged workspace ID, viewer/admin escalation, last-owner, invitation reuse, and audit isolation checks. Temporary data was removed.
- Brevo SMTP delivered confirmation and recovery mail. Fresh-browser links, password update/login, and reused-link rejection passed. Brevo invitation mail was delivered and accepted through real Google OAuth.
- Supabase MCP confirmed two migration versions, five RLS tables, five tenant policies, and no remaining app schema/RLS security advisor findings.
- Active invite and valid reset screens passed mobile widths 320/390/768/1440; browser suite covered auth widths 320–1440, keyboard skip link, and public navigation.
- MANUAL-001 through MANUAL-004 are VERIFIED. The verification workspace and temporary users were removed. One real Google user remains with no workspace.

Detailed evidence is in `.agent/QA.md`.

## Remaining provider note

Supabase security advisor reports provider-level leaked password protection disabled. Supabase documents this control for Pro plans and above; it is outside P01 acceptance. Performance advisor reports the invitation expiry index unused on the now-empty project; retain it for future expiry queries.

## Next phase

The owner explicitly deferred P02. Do not begin P02 public routes, legal/contact backend, pricing, or analytics until asked. The owner supplied `ahsananjum170@gmail.com` as a future public contact email; production domain is pending. No P01 owner action remains pending.

## Current-page design refinement — 2026-10-01

`DESIGN.md` and `tokens.css` now define the paper, ink, and mint visual system. Existing home, auth, invite, workspace, and team surfaces were refreshed; real P01 logic was preserved. Source-owned Motion Primitives provide text, group, view, and navigation motion with a local MIT notice and reduced-motion behavior. SEO now includes metadata, canonical home URL, local noindex, private-route exclusions, sitemap, robots, favicon, Open Graph image, and custom 404. Only the current home route is eligible for indexing when a public domain is configured.

Verification: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 passed; one opt-in remote test skipped), `pnpm test:e2e` (8 passed), and `pnpm build` passed. Browser checks include mobile navigation, public links, SEO files, responsive auth/invite, and reduced-motion hydration. Reviewed full-page home screenshots at desktop and 390px mobile plus auth/invite screenshots. See `.agent/QA.md` for details.
