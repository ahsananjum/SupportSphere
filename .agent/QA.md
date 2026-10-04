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

## P02 production verification — 2026-10-02

The owner supplied Vercel project `support-sphere`, origin `https://support-sphere-psi.vercel.app`, approved public “Lahore, Pakistan” contact detail, and approved the legal pages as-is. GitHub `origin/master` initially held pre-P02 commit `43eb828`, which explained live 404s on all new routes. Commit `7681bd5` was pushed; GitHub deployment `6796535046` reported Production success, and the public alias then served the new routes. Vercel MCP and authenticated Vercel CLI were unavailable; GitHub deployment status and live HTTP/browser behavior are the provider evidence.

| Production criterion | Actual proof | Result |
| --- | --- | --- |
| Routes, links, and 404 | `tests/live/p02-production.mjs` visited all 12 indexable pages, checked 14 internal targets, and asserted the branded 404 and thank-you/auth utility pages. | PASS |
| Metadata and indexing | Every indexable route had a unique title/description, one H1, exact production canonical, OG title/description, and index/follow. Live robots excludes utility/API paths; sitemap contains all 12 indexable routes and excludes thank-you. Favicon resolved. | PASS |
| Responsive/accessibility/console | Live browser checked 320, 360, 390, 768, 1024, and 1440 px, no document overflow, cookie/sticky CTA noncollision, keyboard skip link and mobile-menu Escape behavior, and no unexpected console/page errors. | PASS |
| Owner legal/contact facts | Live `/contact`, `/privacy`, `/terms`, and `/cookies` contain Ahsan Anjum, owner-approved “Lahore, Pakistan,” and `ahsananjum170@gmail.com`. Owner approved pages as-is on 2026-10-02. | PASS by owner decision |
| Contact vertical slice | Browser submitted a real request on the production origin, reached signed-receipt thank-you state, and live Supabase row showed Brevo API acceptance (`sent`). QA row `b5a4483e-e5cc-4105-af77-cc2e13229e4a` was deleted after verification. | PASS |
| Production OAuth origin | `tests/live/p02-auth-origin.mjs` triggered Google OAuth from live login, asserted the exact production `/auth/callback?next=%2Fapp` redirect, and received Supabase 302 to Google. No personal login was performed in this P02 check; real Google sign-in was verified in P01. | PASS for production callback initiation |
| Database/migrations/advisors | Supabase project `xviumgygixcklrbuynoh` is ACTIVE_HEALTHY; migration history includes `20261001210202`. Security advisor only reports expected INFO for service-role-only no-policy contact tables and preexisting provider-level leaked password protection WARN. Performance advisor only reports unused-index INFO on the nearly empty project. | PASS for P02 schema |

Production smoke command: `P02_PRODUCTION_ORIGIN=https://support-sphere-psi.vercel.app node tests/live/p02-production.mjs` — PASS. Production contact command: set `P02_LIVE_BASE_URL` to that origin plus exact Supabase project-ref/email opt-ins and run `node --env-file=.env tests/live/p02-contact-ui.mjs` — PASS. Production OAuth command: set the production origin/project-ref opt-ins and run `node tests/live/p02-auth-origin.mjs` — PASS. No provider secret was printed or committed. The required final local gate follows below.

## P02 final phase gate — 2026-10-02

- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm format:check` — PASS.
- `pnpm test` — PASS, 19 tests; one intentionally skipped opt-in remote security suite already verified in P01.
- `pnpm test:e2e` — PASS, 13 browser tests, including required widths, links, metadata, keyboard, reduced motion, 404, and contact validation.
- `pnpm build` — PASS, Next.js 16.3.7 production build generated 27 pages.
- `git diff --check` — PASS.
- Live P02 production smoke, real contact submit, and OAuth origin probes — PASS; QA contact row removed.
- Supabase MCP migration/RLS/advisor check — PASS for P02; contact tables are RLS-enabled, anon/auth DML denied, service-role insert allowed. Advisor notices are informational for intentionally service-role-only tables and unused indexes; the preexisting provider-level [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains outside P02.

All P02 acceptance criteria in `PHASES.md` are checked. The owner explicitly approved the city-level “Lahore, Pakistan” public address choice and legal pages as-is; this decision is recorded in ADR-011 and the verified manual-action entries. Optional analytics remains off, so no analytics property or non-essential tracking consent is required in P02. P02 is complete; no P03 work is claimed.

## P03 verification — 2026-10-03

Status: COMPLETE. Final gate passed after the last owner-control polish.

| P03 criterion | Evidence | Result |
| --- | --- | --- |
| Persisted onboarding and direct routes | Production-build `tests/live/p03-app-ui.mjs`: refresh at identity, origin/sender, team, knowledge, and AI stages; incomplete team/settings/notifications routes return to setup; completed setup route returns to app. | PASS |
| Workspace context and switching | `getWorkspaceContext` resolves active workspace from current RLS-visible membership; switch action rechecks membership server-side. Live browser switched to an incomplete second workspace and back. | PASS |
| Viewer/agent/admin/owner permissions | Opt-in live `tests/security/p03-attacks.test.ts` passed forged/cross-tenant settings, step, member, and notification writes. Viewer and agent self-removal denied; admin settings allowed, owner-only setup/security enforced. Browser checked all four role surfaces. | PASS |
| Member and invitation management | Existing P01 invite/role/remove RPCs and team forms reused; last owner protection retained and unusable controls hidden. P03 denies agent/viewer self-removal; opt-in P01 live regression suite passed after the RPC change. | PASS |
| Settings, security, notifications | General settings persist with validation, audit and save feedback; security page shows real member count/audit; notification table has RLS, real completion event, and read RPC. Live browser saved/reloaded settings and read notification. | PASS |
| Loading/empty/error/success | App loading/error boundaries retained; onboarding/settings forms show field and server errors/pending; team/invitation and notification pages show empty/error/success states. | PASS by code and browser |
| Mobile/accessibility/visual | Live browser checked 320, 360, 390, 768, 1024, 1280, 1440 widths with no overflow; Escape/focus in drawer. Screenshots inspected for 320 setup, 390 team/general/security, 1280 team. | PASS |
| Motion and reduced motion | Motion Primitives Animated Background highlights active navigation; native/CSS drawer motion stays short. Shared `useSyncExternalStore` preference fixed server/client mismatch; focused and full reduced-motion browser test passed. | PASS |
| Schema/RLS/advisors | P03 migration versions `20261002205848`, `20261002211804`, `20261002214802`, `20261002215444`, `20261002220242` applied. Generated types updated. Supabase advisor reports no P03 security or performance finding. | PASS |

Initial full gate: `pnpm typecheck` PASS; `pnpm lint` PASS; `pnpm format:check` PASS; `pnpm test` 21 PASS/2 opt-in SKIPPED; `pnpm test:e2e` 13 PASS; `pnpm build` PASS; `git diff --check` PASS. The production-build live browser journey and P03 live security suite passed after the initial gate. A final repeat follows the last team/security UI wording changes.

### P03 final phase gate — 2026-10-03

- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm format:check` — PASS.
- `pnpm test` — PASS, 21 tests; P01/P03 remote suites intentionally skipped in ordinary run and each passed separately with the exact SupportSphere project-ref opt-in.
- `pnpm test:e2e` — PASS, 13 browser tests against the final production build, including reduced-motion hydration and public-route regression checks.
- `pnpm build` — PASS, Next.js 16.3.7; authenticated `/app`, `/app/onboarding`, `/app/team`, `/app/notifications`, `/app/settings/general`, `/app/settings/security` routes generated.
- `git diff --check` — PASS; source scan found no P03 TODO, fake data, or console-only actions.
- Opt-in live `tests/security/p03-attacks.test.ts` — PASS after strict viewer/agent permission migration. Existing `tests/security/p01-attacks.test.ts` — PASS after membership RPC change.
- `tests/live/p03-app-ui.mjs` against final production build — PASS: refresh every setup step, completed/incomplete direct-route redirects, two-workspace switching, settings persistence, notification read, owner/admin/agent/viewer UI, last-owner control, drawer Escape/focus, no overflow at 320/360/390/768/1024/1280/1440.
- Screenshot review — PASS for 320 onboarding, 390 team/general/security, and 1280 team. Screenshots are ignored under `test-results/p03-visual/`.
- Supabase MCP — P03 migration history and generated types match; `notifications` has RLS and one select policy, workspace FK index exists, no P03 advisor findings. Test cleanup query returned zero `p03-%` workspaces and users.

No new owner action is required. P03 source is not yet deployed to Vercel; deployment is a separate release step, and the local production build plus live Supabase behavior are the phase gate evidence.

Existing advisor notices: [service-role-only contact tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) INFO, [unused older indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) INFO, and [provider leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) WARN. These predate P03 and do not represent a new tenant policy gap.

## P04 final verification — 2026-10-04

P04 is **COMPLETE**. The migration, live security checks, authenticated browser journey, and final quality gates all passed against SupportSphere project `xviumgygixcklrbuynoh`.

| Requirement | Automated proof | Manual/live proof | Status | Notes |
| --- | --- | --- | --- | --- |
| Support schema, constraints, indexes, RLS | Three P04 migrations are in remote history; linked schema lint passed; RLS, grants, composite workspace FKs, and indexes reviewed | `20261004120000`, `20261004130000`, and `20261004131500` applied through Supabase CLI using the ignored local token | PASS | No P04 security advisor findings or unindexed foreign keys |
| Generated types and services | `lib/supabase/database.types.ts`, `lib/support/queries.ts`, and typed RPC calls compile | Types regenerated from the live project; `pnpm typecheck` and build passed | PASS | Live RPC signatures are represented in generated types |
| Customer dedupe | RPC uses normalized email/identity lookup and workspace-scoped advisory lock | Live concurrent dedupe test passed with one customer id | PASS | Deterministic behavior is database-owned |
| Conversations/messages/internal notes | Real routes, server actions, plain-text rendering, retry-preserving per-message idempotency, and client refresh reconciliation | Live suite and browser journey passed reply, retry key, and internal note behavior | PASS | Unsafe HTML is never rendered |
| Tickets/timeline/number race | RPC uses workspace advisory transaction lock, unique `(workspace_id,ticket_number)`, row locks, event inserts, and assignment membership checks | Live concurrent ticket test passed numbers 1–8; concurrent conversation/ticket updates serialized successfully; resolved timeline persisted | PASS | Foreign assignee and tenant IDs rejected |
| Search/filter/pagination | Inbox/customer/ticket queries use real workspace filters, search, and range/limit | Browser journey and route checks used real rows; empty/error states render from query results | PASS | No counters or records are hardcoded |
| Mobile/accessibility/motion | CSS supports 320–1440 widths, no global horizontal overflow, labeled forms, plain-text messages, and reduced-motion-safe app motion | Authenticated browser flow passed no-overflow checks at 320, 360, 390, 768, 1024, and 1440px | PASS | Mobile inbox remains a usable single-column flow |
| Static quality gates | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (21 passed, 3 opt-in remote suites run separately), `pnpm build`, and `git diff --check` | n/a | PASS | Production build generated all P04 routes |
| Live security/concurrency | `tests/security/p01-attacks.test.ts`, `p03-attacks.test.ts`, and `p04-attacks.test.ts` | All three files passed; temporary users/workspaces/rows cleaned | PASS | Includes forged workspace/foreign ID and viewer escalation checks |
| Authenticated browser journey | `tests/live/p04-app-ui.mjs` | Customer → conversation → reply → note → ticket → resolved flow passed with responsive checks | PASS | Stable local server used; no production deployment claimed |

### Database advisor notes

- Security advisor: only existing contact-table service-role-only INFO notices and the provider leaked-password-protection WARN; no P04 finding.
- Performance advisor: no unindexed foreign keys; unused-index INFOs are expected while the project is nearly empty, including new tag/ticket indexes.
- Linked schema lint: passed with one preexisting P03 warning for an unused local variable in `update_workspace_general`.
