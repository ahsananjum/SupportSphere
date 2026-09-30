# P01 verification matrix

P01 is BLOCKED_MANUAL. Local build success does not prove hosted identity, mail, or RLS behavior.

| Requirement | Automated proof | Manual/live proof | Status | Notes |
| --- | --- | --- | --- | --- |
| Versioned schema, RLS, constraints, indexes | Migration authored and statically reviewed | Apply to SupportSphere; inspect tables, policies, grants, advisors | PENDING LIVE | No SupportSphere project is connected. |
| Generated TypeScript database types | No generation possible without database | Generate from actual project after migration | BLOCKED | No handwritten types are being presented as generated. |
| Cross-tenant SELECT and mutation | tests/security/p01-attacks.test.ts authored | Run against a dedicated local/test Supabase project | BLOCKED | Test skipped because local Docker/Supabase endpoint is unavailable. |
| Forged workspace ID, viewer/admin escalation | Attack test authored; RPC guards statically reviewed | Execute live attack test | BLOCKED | Draft SQL NULL-role bypass found in review and fixed before application. |
| Expired/revoked/reused invitations, last owner | Attack test authored; UI invalid-link state browser tested | Execute live test with real users | BLOCKED | Database not running. |
| Sign up/login/logout and protected route | Actions, callback, proxy, and app guard compile/build | Real accounts/session refresh/logout | BLOCKED | SupportSphere Auth project unavailable. |
| Forgot/reset and invalid state | Recovery callback and short-lived recovery cookie compile; invalid state code reviewed | Real Brevo SMTP mail and expired link | BLOCKED | Sender/SMTP unconfigured. |
| Google OAuth | Provider action and safe callback compile | Complete provider sign-in, callback, logout | BLOCKED | Owner OAuth credentials/config required. |
| Invitation email | Brevo API adapter builds text+HTML links with verified-origin configuration, timeout, safe failure state | Receive and click real message | BLOCKED | Verified sender/API key absent. |
| Membership/role audit | Atomic SQL inserts are in migration | Query audit rows after live mutations | BLOCKED | Migration unapplied. |
| Safe redirects | 13 redirect/validation unit cases pass | OAuth and recovery callback with malicious next | PARTIAL | Server allowlist tested locally; provider callback pending. |
| Auth mobile, labels, validation, focus | Playwright 3 tests pass at 320, 360, 390, 768, 1024, 1280, 1440; native/server validation exercised | Real reset/active invite visual check | PARTIAL | Provider dependent screens pending. |
| Typecheck/lint/format | All pass | n/a | PASS | See exact commands below. |
| Unit/security tests | 19 passed, 1 live security test skipped | Local/test Supabase required | PARTIAL | Skip is not an RLS pass. |
| Production build | Passed | n/a | PASS | Dynamic app/auth routes produced. |

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