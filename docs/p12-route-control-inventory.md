# P12 route and control inventory

Audit date: 2026-10-12. The route list comes from the Next production build manifest and `lib/marketing/pages.ts`.

## Public and utility routes

| Route | Expected content | Loading/error/permission proof | Links and controls | Responsive/console proof |
| --- | --- | --- | --- | --- |
| `/` | Product value proposition, workflow proof, security, FAQ, CTA | Static route; public shell and cookie state | Header/footer links, workflow stage buttons, FAQ disclosure, signup CTA | P12 + P02 Playwright at 320/360/390/768/1024/1440; no overflow/errors |
| `/features`, `/ai-support`, `/knowledge-base`, `/integrations`, `/security`, `/about` | Story hero, truthful roadmap/security content, sections, CTA | Static dynamic `[slug]` route with `dynamicParams=false`; root 404 for unknown slug | Header/footer, story CTA links, contact/signup links | P12 route/link/viewport audit passes |
| `/pricing` | Availability plans from `lib/marketing/plans.ts`; no invented pricing | Static route; no purchase control is rendered | Plan CTA and contact link | P12 route/link/viewport audit passes |
| `/contact` | Owner-approved contact identity and real contact form | Client validation, server validation, rate limit, API error envelope, redirect receipt | Labels, field errors, submit loading, privacy link | P02 contact validation and viewport tests pass |
| `/privacy`, `/terms`, `/cookies` | Legal and cookie policy content using `publicFacts` | Static legal pages; no authenticated permission required | Cross-links, mailto links, footer | P12 route/link/viewport audit passes |
| `/thank-you` | Receipt-aware success or safe fallback to contact | HttpOnly receipt verification; no fake success | Home/contact CTA and feature link | P02 metadata and route suite pass |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth forms with clear state | Auth action validation, rate limits, recovery cookie/invalid state | Password recovery, Google OAuth entry, home/logo links | Auth E2E and P01/P02 auth evidence pass |
| `/invite/[token]` | Invite acceptance or expired/invalid message | Token validation, safe no-membership state, auth redirect | Login/signup/accept controls as applicable | Invalid-token production smoke is safe |
| `/widget`, `/widget/unavailable` | Scoped widget iframe or truthful fallback | Bootstrap/origin proof; invalid request is 404; fallback has loading/error text | Widget controls are isolated and keyboard-labelled | P05 live widget suite; fallback H1/metadata fixed in P12 |
| Custom 404 | Branded message and home CTA | HTTP 404 for unmatched route | Clickable logo and return-home CTA | P12 and P02 route checks pass |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/icon.svg` | Crawl and share assets | Local no-origin mode disallows indexing; production origin enables public paths | No UI controls | P02 SEO asset checks pass |

## Authenticated application routes

All `/app/*` routes require a session. A production-build smoke visited each route without a session: each redirected to `/login` without a 5xx. Prior authenticated phase smokes cover the real workspace journey and responsive behavior; the route families below describe the current controls and state paths.

| Route family | Controls | Required states and permission behavior |
| --- | --- | --- |
| `/app`, `/app/onboarding` | Workspace creation, persisted setup steps, workspace switcher, logout | Loading/error boundaries; owner-only setup; refresh-safe step state; viewer/admin permissions enforced server-side |
| `/app/inbox`, `/app/inbox/[conversationId]` | Search/status/priority filters, conversation links, routing, reply/internal note composer, ticket creation, AI handoff | Empty/error/retry, realtime/reconciliation status, viewer read-only detail, message/ticket server errors and success notices |
| `/app/customers`, `/app/customers/[customerId]` | Search, add customer, profile conversations, start conversation | Empty/error states; viewer sees read-only directory/profile; support writes rechecked on the server |
| `/app/tickets`, `/app/tickets/[ticketId]` | Search/status/priority filters, create ticket, routing/status update, timeline | Empty/error/retry; viewer read-only; update form uses pending submit state and server permission checks |
| `/app/knowledge`, `/app/knowledge/[sourceId]` | Paste/upload, enable/disable, retry/reindex, delete, pagination | Upload type/size/content validation, durable indexing status, empty/error/retry; owner/admin write controls |
| `/app/automations` | Create validated rule, enable/disable, confirmed delete | Empty/error/run history; owner/admin controls; mutation failures surface actionable feedback |
| `/app/analytics` | Date range, persisted evaluation run | Real-data empty/error state, role-checked evaluation action, no fabricated metrics |
| `/app/ai/runs`, `/app/ai/runs/[runId]` | Status filter, trace/citation links, role-checked feedback | Empty/error/retry; viewer can inspect but cannot submit feedback; provider errors are safe |
| `/app/team` | Invite/resend/revoke, role change, remove with confirmation | Owner/admin controls; last-owner protection; field/server errors and notices; viewer read-only |
| `/app/notifications` | Related-work links, mark read | Empty/error/retry; read state is scoped to current member/workspace |
| `/app/settings/general`, `/app/settings/widget`, `/app/settings/ai` | Validated settings forms | Owner/admin write checks, visible field errors, pending/success/error states |
| `/app/settings/integrations` | Endpoint create/edit/test/rotate/revoke, delivery history | HTTPS/DNS/secret handling, confirmations, pending/connected/error states, retry/error feedback; owner/admin only |
| `/app/settings/security` | Member/audit review | Owner-only view with safe permission message; empty/error states |

## APIs and background controls

`/api/contact` validates origin, payload, and rate limits before persistence/email. `/api/widget/config`, `/api/widget/session`, and `/api/widget/messages` require exact origin/bootstrap/session proofs and scoped rate limits. Supabase migrations through `20261011121955_p11_trigger_hardening` are live; current MCP inspection confirms every public table has RLS enabled. Existing advisor findings are intentional service-only/role-checked functions and the provider-plan leaked-password warning documented in `.agent/QA.md`.

## Gate evidence

- `node_modules/.bin/next build --webpack` — PASS; all 46 static pages generated and all app/API routes compiled.
- `node_modules/.bin/playwright test` — PASS, 19 tests, including P12 route/metadata/link/viewport/mobile/cookie/focus/404 coverage.
- `node_modules/.bin/tsc --noEmit`, ESLint, Prettier, Vitest (52 passed / 3 skipped), and `git diff --check` — PASS.
- P01–P11 live/authenticated suites remain the source of evidence for real Supabase writes, roles, RLS, widget realtime, knowledge, analytics, automations, AI, and integrations. P07 Gemini provider quota remains a separate manual gate.
