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

## P02 handoff — 2026-10-02

Status: **BLOCKED_MANUAL**; remain in P02. The prior P01 handoff above is historical and its instruction to defer P02 is superseded by the owner's current P02 request.

Implemented all required public routes, responsive navigation/footer, interactive workflow and route-specific diagrams, reduced-motion behavior, unique public metadata, conditional canonical/index strategy, icons/robots/sitemap, contact form, server validation and hourly abuse protection, live Supabase persistence with RLS, Brevo notification, signed thank-you state, legal pages using owner-supplied facts, and a documented privacy request procedure. The P02 migration `20261001210202` is applied to project `xviumgygixcklrbuynoh`, and database types were regenerated from that project. No optional analytics is running.

The full local phase gate passed: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 passed, one remote opt-in skipped), `pnpm test:e2e` (13 passed), `pnpm build`, and `git diff --check`. Browser checks cover every public route, 320–1440 px widths, links, headings/metadata, console errors, keyboard/focus, and reduced motion. A live browser contact submission reached the true thank-you state, persisted in Supabase, and Brevo accepted the notification; the QA row was removed. See `.agent/QA.md` for the exact evidence.

Open owner actions: `MANUAL-005` chooses/configures the exact Vercel production origin and Supabase callback, then enables live canonical/index verification. `MANUAL-006` resolves the city-only mailing-address limitation and approves/edits legal templates before commercial use. The owner explicitly requested displaying “Lahore, Pakistan” for now, so no address was invented. No Vercel MCP capability was available in this session; production deployment has not been inspected. After owner confirmation, verify the live provider/application behavior, repeat the P02 gate, then set `VERIFYING` and `COMPLETE`. Do not start P03 beforehand.

## P02 completion — 2026-10-02

Status: **COMPLETE**. The prior blocked handoff above is historical. The owner supplied Vercel project `support-sphere`, production origin `https://support-sphere-psi.vercel.app`, approved “Lahore, Pakistan” as the public address text, and approved the legal pages as-is. No street address or analytics property was invented; optional analytics remains off. `MANUAL-005` and `MANUAL-006` are verified.

Commit `7681bd5` was pushed to `origin/master` and deployed to Vercel Production (GitHub deployment `6796535046`, success). The live site passed a 12-page metadata and sitemap audit, 14 internal targets, custom 404, required widths 320–1440, cookie/CTA noncollision, keyboard and console checks. A real production contact form submission reached the signed thank-you state and persisted with Brevo API acceptance; the QA row was removed. Google OAuth initiated through Supabase with the exact production callback and provider redirect. Supabase MCP confirmed P02 migration history, RLS/grants, and expected advisor state.

Final local gate: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 pass, one intentionally skipped remote opt-in), `pnpm test:e2e` (13 pass), `pnpm build`, and `git diff --check` all passed. Production probes are in `tests/live/p02-production.mjs`, `tests/live/p02-contact-ui.mjs`, and `tests/live/p02-auth-origin.mjs`. Exact evidence is in `.agent/QA.md`. No P03 implementation was started.

## P03 handoff — 2026-10-03

Status: **COMPLETE**. Implementation commit `9fb2ae9` contains P03; acceptance and the final phase gate passed. See `.agent/QA.md` for exact commands and evidence.

Implemented a persisted setup sequence (workspace creation, identity, origin/sender status, team invitation, explicit knowledge skip, AI policy preference), a single desktop/mobile app navigation with a focus-managed drawer, server-validated workspace switching, role-aware team/settings routes, real general settings, owner security/audit view, and a member-scoped notification read surface. Existing P01 invitation/member actions remain the real team backend. Last-owner controls are hidden when unusable, and database RPCs now deny agent/viewer self-removal and viewer notification writes. Source-owned Motion Primitives use a hydration-safe reduced-motion hook.

Applied five P03 migrations to Supabase project `xviumgygixcklrbuynoh`: `20261002205848`, `20261002211804`, `20261002214802`, `20261002215444`, `20261002220242`. Generated TypeScript types were refreshed. Notifications have RLS and a workspace FK index. Security/performance advisors show no P03 findings; existing P02 contact-table INFO, older unused-index INFO, and provider leaked-password-protection WARN remain unchanged.

Final checks: typecheck, lint, format, 21 unit tests, 13 ordinary browser tests, production build, P01 and P03 live security suites, and the authenticated P03 production-build browser journey all passed. Browser coverage includes refresh at every setup step, direct route guards, multi-workspace switching, role-aware controls for owner/admin/agent/viewer, notification read, settings save/reload, 320–1440 px no-overflow, and mobile drawer keyboard behavior. Temporary Supabase workspaces/users were cleaned to zero. Ignored screenshots under `test-results/p03-visual/` were inspected at mobile and desktop sizes.

No P03 manual owner action is pending. P03 app code is local; the existing Vercel production site still serves P02 until a deployment is requested/performed. The P03 schema changes are backward compatible with the deployed P02 code. No P04 work has begun.

## P04 handoff — 2026-10-04

Status: **COMPLETE**. P04 is verified against the live Supabase project, including migration history, RLS/security behavior, concurrency, and the authenticated responsive browser journey. See `.agent/QA.md` and `MANUAL_ACTIONS.md` MANUAL-007.

### Implemented

- `supabase/migrations/20261004120000_p04_support_operations.sql`: customers, deterministic identities, conversations, messages, tickets, ticket events, tags, join tables, tenant RLS/select grants, composite workspace foreign keys, indexes, role-checked RPCs, message idempotency, customer advisory locking, ticket number locking, assignment membership checks, and audit events.
- `lib/supabase/database.types.ts`: regenerated from the live P04 schema.
- `lib/support/queries.ts` and `lib/validation/support.ts`: explicit workspace-scoped reads, search/filter/range pagination, and runtime validation.
- `app/app/inbox`, `app/app/customers`, and `app/app/tickets`: real DB-backed list/detail routes with empty/error/success states.
- `components/support/support-forms.tsx` and `app/app/support-actions.ts`: customer creation, conversation creation, message/internal note send with bounded retry key, ticket create/update, and status/priority/assignment actions.
- `components/shared/app-navigation.tsx` and `app/globals.css`: support navigation and responsive workbench styles.

### Verification

- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm format:check` — PASS.
- `pnpm test` — PASS, 21 tests; opt-in live security suites also passed (P01/P03/P04, 3 tests).
- `pnpm build` — PASS; P04 routes generated.
- `git diff --check` — PASS.
- `tests/live/p04-app-ui.mjs` — PASS; authenticated customer → conversation → reply → internal note → ticket → resolved journey and 320–1440px no-overflow checks.
- Supabase migration list — PASS; P04 versions `20261004120000`, `20261004130000`, and `20261004131500` match remote history.
- Live P04 concurrency — PASS; concurrent conversation and ticket updates serialized without errors, with ticket numbers remaining `1..8` and timeline events retained.
- Supabase security/performance advisors and linked schema lint — PASS for P04; only preexisting/expected notices remain.

### Next exact actions

P04 is complete. Preserve the applied migration history and verification evidence when starting the next phase.
