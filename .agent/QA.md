# P01 verification matrix

P01 live acceptance and full phase gate passed against SupportSphere project `xviumgygixcklrbuynoh`. The only remaining security advisor warning is provider-level leaked password protection, which Supabase documents as a Pro-plan feature.

| Requirement | Automated proof | Manual/live proof | Status | Notes |
| --- | --- | --- | --- | --- |
| Versioned schema, RLS, constraints, indexes | Two versioned migrations match remote history | Five tables have RLS; policy/grant query and live attack suite passed | PASS | Platform event-trigger execute grant fixed. |
| Generated TypeScript database types | Generated from live schema; all Supabase clients typed | `pnpm typecheck` passed | PASS | `lib/supabase/database.types.ts`. |
| Cross-tenant SELECT and mutation | Live attack suite passed | Separate real users/workspaces; direct DML blocked; cleanup verified | PASS | Explicit remote project-ref guard. |
| Forged workspace ID, viewer/admin escalation | Live attack suite passed | RPC role checks rejected all attempts | PASS | Includes admin self-promotion and owner mutation attempts. |
| Expired/revoked/reused invitations, last owner | Live attack suite and invite UI script passed | Active/revoked/expired/used/resend UI, already-member, last-owner checked | PASS | Active invite had no overflow at 320/390/768/1440. |
| Sign up/login/logout and protected route | Real browser and live Auth project | Confirmation, login, workspace creation, logout, and unauthenticated redirect passed | PASS | Test accounts/workspace cleaned. |
| Forgot/reset and invalid state | `tests/live/p01-auth-mail.mjs` passed | Brevo SMTP delivered; cross-browser link, update, new login, reused-link rejection | PASS | Exact mail tokens never printed; temporary account cleaned. |
| Google OAuth | Real owner browser sign-in | Provider callback succeeded; Google user created and protected app reached | PASS | Google account retained, with no test workspace. |
| Invitation email | Real app action and Brevo events | Message delivered; owner opened it, accepted through Google; DB status accepted | PASS | Brevo sender active and audit recorded. |
| Membership/role audit | Live attack and owner invite flows | `workspace.created`, `invitation.created`, `member.joined`, `member.role_changed`, `member.removed` observed | PASS | Audit isolation also tested. |
| Safe redirects | Unit allowlist cases pass | OAuth callback kept invite path; unsafe paths rejected in unit tests | PASS | Trusted origin and narrow post-login path allowlist. |
| Auth mobile, labels, validation, focus | Browser auth widths 320–1440; active invite and valid reset at 320/390/768/1440 | Field labels/errors/aria/focus and no overflow | PASS | Loading/error/success states inspected in code and exercised where applicable. |
| Typecheck/lint/format | Final full gate passed | n/a | PASS | See command log below. |
| Unit/security tests | 19 unit tests passed; live security test passed separately | Temporary rows and users removed | PASS | General `pnpm test` safely skips remote test without explicit opt-in. |
| Production build | Final full gate passed | n/a | PASS | Next.js 16.3.7 compiled and generated all app routes. |

## Exact command log — 2026-10-01

- pnpm typecheck — PASS.
- pnpm lint — PASS.
- pnpm format:check — PASS.
- pnpm test — PASS, 19 tests; one live security test SKIPPED for missing local Supabase test environment.
- pnpm test:e2e — PASS, 3 tests. Auth widths 320/360/390/768/1024/1280/1440; foundation 320/360/390/768/1024/1440.
- pnpm build — PASS, Next.js 16.3.7 production build.
- git diff --check — PASS.
- docker info and supabase start — no response from local daemon, interrupted; no database migration was applied.
- Supabase MCP list_projects — only BookPro visible. No SupportSphere migration/advisor/type generation attempted against BookPro.

## Live command and provider log — 2026-10-01

- Supabase MCP project ref `xviumgygixcklrbuynoh`: applied migrations `20260930201144` and `20260930201423`; five RLS tables/policies inspected; generated types from live schema.
- Live `tests/security/p01-attacks.test.ts` — PASS (twice, including role-change/removal audit assertions). Remote test requires the exact project-ref opt-in; all temporary rows/users cleaned.
- Brevo sender API — active. Brevo event API — signup confirmation, invitation, and recovery delivered.
- Real browser — login, workspace create, invitation send, logout, protected-route redirect passed. Owner accepted delivered invitation via Google; provider callback, member row and audit verified.
- `tests/live/p01-auth-mail.mjs` — PASS: confirmation/recovery delivered; each link opened in a fresh browser context; password update/login, reused-link rejection, valid reset mobile/focus; temporary account cleaned.
- `tests/live/p01-invite-ui.mjs` — PASS: already-member, active/revoked/expired/used/resend states and active invite mobile; test rows/users cleaned.
- Verification workspace/test owner removed. Live project now has zero workspaces/members/invitations/audit rows, one Google user, and zero test users.
- Supabase security advisor — only `auth_leaked_password_protection` WARN remains ([Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); feature is documented for Pro plans and above. No app schema/RLS findings.

## Final phase gate — 2026-10-01

- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm format:check` — PASS.
- `pnpm test` — PASS, 19 unit tests; remote security test intentionally skipped without explicit project-ref opt-in.
- Live `tests/security/p01-attacks.test.ts` with `P01_LIVE_TEST_PROJECT_REF=xviumgygixcklrbuynoh` — PASS, 1 live test executed; cleanup verified.
- `pnpm test:e2e` — PASS, 4 browser tests, including public link and keyboard skip-link smoke checks.
- `pnpm build` — PASS.
- `git diff --check` — PASS.
- Final Supabase MCP SQL — five RLS tables, five tenant policies, zero workspaces and temporary test users. One real Google user remains without a workspace.
- Supabase performance advisor — INFO for unused `workspace_invitations_expiry_idx` on the now-empty project; retained for expiry queries.

## Current-page design refinement — 2026-10-01

The owner requested a visual, motion, and SEO upgrade to the routes already present, then explicitly deferred P02. This pass changes no P01 database, auth, membership, invitation, or mail behavior and does not implement P02-only routes.

| Check | Result | Evidence |
| --- | --- | --- |
| Visual system | PASS | `DESIGN.md` and `tokens.css` define paper, ink, mint, Bricolage Grotesque, DM Sans, spacing, focus, and motion tokens. |
| Current-page UI | PASS | Home, auth shell/pages, invitation state, workspace overview, and team page use the same system; screenshots of home, login, and invalid invite reviewed at desktop/mobile sizes. |
| Motion and accessibility | PASS | Source-owned Motion Primitives with MIT notice; first-paint content remains readable; reduced-motion browser test verifies legibility and zero hydration errors. |
| SEO foundation | PASS | Home canonical/title/description/OG, favicon, robots, sitemap, 404, and private-route noindex. Localhost disallows indexing; only the existing home is listed when a public origin is configured. Browser checks resolve public links and SEO resources. |
| Mobile/keyboard | PASS | Existing P01 auth width/label/focus tests and new mobile navigation checks pass; screenshots reviewed for home, login, invalid invite. |
| Typecheck/lint/format | PASS | `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`. |
| Unit/browser/build | PASS | `pnpm test`: 19 passed, one remote security test skipped without explicit opt-in. `pnpm test:e2e`: 8 passed. `pnpm build`: Next.js 16.3.7 production build passed. |

Production domain is pending, so the canonical production origin and public indexing require launch configuration. Analytics remain deferred by owner choice. P02 acceptance is not claimed.

## P02 local verification — 2026-10-02

Status: **BLOCKED_MANUAL**. All local implementation checks below pass. Production-origin and legal/mailing gates remain open in `MANUAL-005` and `MANUAL-006`; P02 is not complete.

| P02 criterion | Evidence | Result |
| --- | --- | --- |
| Required public routes and custom 404 | Production build generated home, six story routes, pricing, contact, three legal pages, thank-you, and custom 404. Browser visited each public route and the missing-page state. | PASS locally |
| Public navigation/logo/CTAs | Per-route internal-link scan returned no 4xx; logo/home and mobile menu flow checked; hero CTA, secondary links, footer legal/contact navigation inspected. | PASS locally |
| Design and motion | Editorial paper/ink/mint system follows `DESIGN.md`; illustrative workflow and route-specific schematics are truthful; source-owned Motion Primitives use reduced-motion guards. Screenshots inspected at desktop/mobile. | PASS locally |
| Responsive, keyboard, focus | Playwright inspected 320, 360, 390, 768, 1024, and 1440 px with no document overflow. Cookie notice sits above sticky mobile CTA. Skip link, menu Escape/focus, workflow buttons, form error focus checked. | PASS locally |
| SEO and icons | Every public route has unique title, description, H1, Open Graph defaults, and explicit noindex on localhost; local canonical omitted. `robots.txt` disallows localhost indexing; `sitemap.xml` returns no local public URLs. Favicon and Open Graph image resolve. Auth/app utility routes are noindex. Informative images/ALT and decorative SVG hiding audited. | PASS locally; production host pending |
| Contact validation and safety | Browser client errors and server 422/cross-origin 403 checked. Server enforces payload cap, honeypot, hourly atomic Supabase rate buckets, service-role-only tables, signed receipt, and durable submission. | PASS |
| Real contact delivery | Direct API POST and opt-in `tests/live/p02-contact-ui.mjs` browser submit reached the true thank-you state; live Supabase rows recorded `delivery_status='sent'` after Brevo API accepted. Both QA rows were removed. No inbox-delivery claim beyond API acceptance. | PASS for configured local path |
| Schema, RLS, types | Applied remote migration `20261001210202`; generated types from live project. Both contact tables have RLS; anon/auth lack DML and RPC execute; service role can insert/call. Atomic rate-limit RPC tested and cleanup verified. | PASS |
| Legal/contact facts and privacy process | Owner facts appear on contact/footer/legal pages. Optional analytics is off, cookie notice describes essential behavior. `docs/privacy-operations.md` documents export/deletion handling. | PASS locally; owner review/address pending |
| Console/build/static gate | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (19 pass, one opt-in remote test skipped), `pnpm test:e2e` (13 pass), `pnpm build`, and `git diff --check` pass. Browser suite captured page/console errors for all public routes: none. | PASS |

Supabase security advisor reports only the existing provider-level leaked password protection warning (Pro-plan feature). New service-role-only contact tables receive informational `rls_enabled_no_policy` notices by design; no anon/auth access is granted. No Vercel MCP capability was available, and no production deployment was inspected. The owner chose to show “Lahore, Pakistan” for now; that city-level location is not a deliverable mailing address under the launch rule. The exact production origin and owner review of legal templates remain pending.

The live browser submit initially exposed a same-origin mismatch in local Next.js: `request.url` used `localhost` while the browser and Host header used `127.0.0.1`. The route now compares Origin with the incoming Host and forwarded protocol; a same-origin regression assertion was added. The repeated live browser submit passed and its QA row was deleted.

Final gate after that repair: `pnpm typecheck` PASS; `pnpm lint` PASS; `pnpm format:check` PASS; `pnpm test` 19 PASS and one opt-in remote suite SKIPPED; `pnpm test:e2e` 13 PASS; `pnpm build` PASS (27 generated pages); `git diff --check` PASS. A final source scan found no placeholder customer, metric, integration, or AI response content in the public implementation. The production-origin and owner/legal gates still require verification before phase completion.
