# SupportSphere — Delivery Phases

> Purpose: force complete vertical delivery and prevent partial feature sprawl.

## Phase status vocabulary

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED_MANUAL`
- `VERIFYING`
- `COMPLETE`

The active phase is persisted in `.agent/STATE.md`.

---

# P00 — Repository bootstrapping, research, and agent memory

## Goal

Create a clean, reproducible, agent-safe foundation before feature code spreads.

## Deliverables

- Next.js TypeScript application.
- strict TypeScript.
- Tailwind.
- lint/format.
- unit test tooling.
- Playwright.
- `.env.example`.
- `.gitignore`.
- CI baseline.
- `.agent/STATE.md`, `DECISIONS.md`, `QA.md`, `MANUAL_ACTIONS.md`, `HANDOFF.md`.
- root project documents.
- agreed directory architecture.
- central env validation.
- provider adapter skeletons without fake production behavior.
- Supabase MCP/Vercel MCP availability documented.
- DesignMD source documented.
- minimal developer README.

## Acceptance

- [ ] Fresh clone can install and start.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit smoke test passes.
- [ ] Playwright smoke test passes.
- [ ] Production build passes.
- [ ] No secrets tracked.
- [ ] `.agent` files exist and contain current state.
- [ ] No nested duplicate applications or junk scaffolds.
- [ ] No fake feature data introduced.

---

# P01 — Core data platform, auth, tenancy, OAuth, and email foundation

## Goal

Establish real identity, workspace isolation, membership, RLS, password recovery, OAuth, and Brevo-backed transactional foundations.

## Database

Implement:

- profiles,
- workspaces,
- workspace_members,
- workspace_invitations,
- audit_logs,
- RLS helpers/policies,
- required indexes/constraints.

## Auth

- sign up,
- login,
- logout,
- forgot password,
- reset password,
- auth callback,
- protected app layout,
- one OAuth provider,
- safe redirects,
- invalid/expired token states.

## Workspace

- create workspace,
- onboarding progress state,
- role model,
- switch active workspace.

## Invitations

- create,
- Brevo send,
- accept,
- expiry,
- resend,
- revoke,
- already-member case,
- role validation.

## Likely manual gates

- connect/select Supabase project,
- configure OAuth provider client,
- configure Brevo sender/domain/custom SMTP.

Remain in P01 while blocked.

## Acceptance

- [ ] Cross-tenant RLS tests pass.
- [ ] Sign up/login/logout works.
- [ ] Forgot/reset works through real configured mail path.
- [ ] OAuth works end-to-end.
- [ ] Invitation email arrives and link works.
- [ ] Expired/revoked invitation UX works.
- [ ] User cannot elevate own role from client.
- [ ] Last-owner safety works.
- [ ] Mobile auth pages complete.
- [ ] Form loading/error states complete.
- [ ] Membership/role mutations create audit events.
- [ ] Build/test suite passes.

---

# P02 — Design system, marketing website, legal, SEO, contact

## Goal

Build a complete public product surface using `DESIGN.md`, DesignMD reference, and Motion Primitives.

## Pages

- home,
- features,
- AI support,
- knowledge base,
- integrations,
- pricing,
- security,
- about,
- contact,
- privacy,
- terms,
- cookies,
- thank-you,
- custom 404.

## Mandatory design/UX

- responsive header,
- mobile menu,
- clickable logo,
- CTA above fold,
- sticky mobile CTA where suitable,
- interactive product visualization,
- animated SVGs/diagrams where meaningful,
- Motion Primitives for controlled motion,
- reduced-motion behavior,
- no fake testimonials/brand logos.

## SEO

- title per public page,
- description per public page,
- canonical strategy,
- Open Graph,
- robots,
- sitemap,
- favicon/icons,
- index/noindex decisions,
- ALT audit.

## Contact

- real backend form,
- validation,
- rate limit,
- Brevo notification/receipt if configured,
- thank-you state.

## Manual gates

- legal/operator display identity,
- real contact address,
- production domain when available,
- analytics property/consent choice.

## Acceptance

- [ ] Every public nav link works.
- [ ] Logo returns home.
- [ ] CTA visible above fold.
- [ ] Mobile menu opens/closes/accessibly traps behavior as needed.
- [ ] No unintended horizontal scrolling at required widths.
- [ ] Every public page has metadata.
- [ ] `robots.txt` and `sitemap.xml` valid.
- [ ] Image ALT audit complete.
- [ ] Custom 404 works.
- [ ] Contact form truly sends/persists according to design.
- [ ] Legal pages contain owner-provided factual identity/contact fields.
- [ ] Cookie banner correctly controls analytics if required.
- [ ] Motion respects reduced motion.
- [ ] Broken-link check clean.
- [ ] Production build passes.

---

# P03 — Onboarding, app shell, team, role-aware settings

## Goal

Turn auth into a real multi-tenant application shell.

## Deliverables

- persisted onboarding flow,
- app sidebar/header,
- mobile navigation/drawer,
- workspace switcher,
- team page,
- member management,
- general settings,
- initial security settings,
- notification shell,
- role-aware navigation/actions.

## Acceptance

- [ ] Onboarding survives refresh/re-entry.
- [ ] Workspace route/action never trusts client workspace ID alone.
- [ ] Viewer cannot mutate.
- [ ] Agent/admin/owner UI and server permissions agree.
- [ ] Member remove/role flows complete.
- [ ] Save/loading/error states complete.
- [ ] Mobile app navigation complete.
- [ ] No empty/dead nav entries.
- [ ] Direct request cannot bypass hidden UI.

---

# P04 — Customers, conversations, messages, ticketing

## Goal

Build the support operating core before AI.

## Schema

- customers,
- customer_identities,
- conversations,
- messages,
- message attachments when included,
- tickets,
- ticket_events,
- tags and join tables.

## UI

- inbox list,
- conversation detail,
- composer,
- internal notes,
- assignment/status/priority/tags,
- ticket list,
- ticket detail/create,
- customer list/detail,
- search/filters/pagination.

## Backend

- transactional writes where needed,
- safe message rendering,
- search indexes,
- ticket number invariant,
- deterministic customer identity/dedupe logic.

## Acceptance

- [ ] Everything uses real DB records.
- [ ] No fake counters.
- [ ] Message failure/retry UX works.
- [ ] Ticket number unique per workspace.
- [ ] Ticket timeline persists.
- [ ] Cross-tenant security tests pass.
- [ ] Search/filter/pagination work.
- [ ] Mobile inbox is usable.
- [ ] Empty/loading/error states complete.
- [ ] Foreign direct IDs do not leak another tenant.

---

# P05 — Realtime and embedded website widget

## Goal

Prove customer-to-agent live communication.

## Widget

- async loader,
- iframe isolation,
- public widget key/config,
- allowed origins,
- anonymous session,
- create/reuse conversation,
- send/receive messages,
- offline/error/rate-limit states,
- transcript continuity,
- mobile behavior,
- reduced motion.

## Realtime

- customer message appears in inbox,
- agent reply appears in widget,
- reconnect/reconciliation,
- event dedupe,
- cross-tenant protection.

## Acceptance golden test

1. open external test host,
2. widget loads,
3. customer sends message,
4. inbox receives it,
5. agent replies,
6. widget receives reply,
7. reload keeps valid conversation history.

Plus:

- [ ] Hostile origin rejected.
- [ ] Flooding/rate limit produces usable 429 UX.
- [ ] Guessed widget/session identifiers do not expose private data.
- [ ] Mobile widget works.
- [ ] No cross-workspace realtime subscription.

---

# P06 — Knowledge base and durable ingestion

## Goal

Build real document ingestion into Supabase Storage/Postgres/pgvector.

## Schema

- knowledge_sources,
- knowledge_documents,
- knowledge_chunks,
- ingestion_jobs.

## Inputs

Minimum:

- text/Markdown paste,
- TXT/MD,
- PDF.

Desired:

- DOCX.

URL ingestion is enabled only if SSRF-safe.

## Pipeline

- source creation,
- file fetch/upload,
- type/size validation,
- text extraction,
- normalization,
- deterministic chunking,
- embedding,
- persistence,
- ready/failed status,
- retry/reindex/delete.

## Acceptance

- [ ] Source status represents real state.
- [ ] Failed extraction shows actionable error.
- [ ] Embeddings are workspace-scoped.
- [ ] Reindex is idempotent.
- [ ] Duplicate/content-hash policy documented.
- [ ] File security enforced.
- [ ] URL SSRF tests pass if URL ingestion enabled.
- [ ] Job is durable beyond request lifecycle.
- [ ] No source marked ready before chunks/embeddings persist.

---

# P07 — RAG, AI triage, drafting, quality gate, escalation

## Goal

Add controlled AI only after the real support and knowledge primitives exist.

## Reference patterns

Inspect relevant `500-AI-Agents-Projects` customer support/RAG/reflection/retry patterns. Adapt, do not blindly copy.

## Implement

- AI provider adapter,
- prompt versioning,
- structured triage,
- workspace-scoped retrieval,
- citations,
- response draft,
- quality/safety gate,
- confidence/policy gate,
- human escalation,
- AI modes,
- AI run/step/citation/feedback persistence,
- run inspector UI.

## Security

- no arbitrary SQL,
- no service-role key in LLM context,
- no arbitrary HTTP tool,
- prompt-injection defense,
- bounded context,
- tool allowlist,
- sensitive action human gate.

## Acceptance scenarios

- [ ] Known KB question produces grounded response + citation.
- [ ] Unknown/no-evidence question does not invent an answer.
- [ ] Billing dispute escalates.
- [ ] “Talk to a human” escalates.
- [ ] Low confidence drafts/escalates per policy.
- [ ] AI off mode never generates/sends.
- [ ] Draft mode never auto-sends.
- [ ] Quality failure blocks auto-send.
- [ ] Provider outage degrades gracefully.
- [ ] Prompt-injection document does not override system/tool policy.
- [ ] Run inspector has trace/citations.

---

# P08 — Automations, durable jobs, notifications, Redis hardening

## Goal

Build reliable workflows beyond direct request/response.

## Implement

- automation rules/runs,
- in-app notifications,
- rate-limit matrix,
- central Redis key namespace/helpers,
- cache invalidation,
- idempotency,
- locks/dedupe,
- durable jobs/retries,
- terminal job failure visibility.

## Acceptance

- [ ] Duplicate event cannot duplicate final action.
- [ ] Retryable job retries boundedly.
- [ ] Permanent error becomes terminal failure.
- [ ] Cache invalidates after config mutations.
- [ ] Redis outage behavior documented/tested.
- [ ] Abuse endpoints rate limited.
- [ ] 429 UX exists.
- [ ] Notifications use real events.
- [ ] Automation run history visible.

---

# P09 — Analytics and AI evaluation

## Goal

Make operations and AI quality measurable from real data.

## Analytics

- conversation volume,
- status/priority,
- response/resolution timing,
- categories,
- AI usage,
- AI escalation,
- feedback/retrieval metrics that can be truthfully computed.

## Evaluation

- curated evaluation cases,
- retrieval test harness,
- response-quality checks,
- policy/escalation tests,
- provider/model comparison architecture if feasible.

## Acceptance

- [ ] Every metric has a written definition.
- [ ] Every chart is real query/real seeded DB data.
- [ ] Date range works.
- [ ] Timezone handling explicit.
- [ ] Empty/loading/error states.
- [ ] Accessible chart text/summary.
- [ ] No fabricated accuracy/success statistic.
- [ ] Evaluation results derive from executed cases.

---

# P10 — Integrations, developer features, Stripe sandbox billing

## Goal

Demonstrate real external integration engineering.

## Required

- integration connection state comes from reality,
- integration error/disconnect states,
- outgoing webhooks if selected,
- Stripe test mode if billing selected,
- server-side plan/entitlement enforcement.

## Optional

- Slack notification integration.

## Acceptance

- [ ] Incoming/outgoing webhook verification/signing as applicable.
- [ ] Webhook retries/idempotency.
- [ ] Delivery history without unsafe payload leakage.
- [ ] Stripe event idempotency.
- [ ] Client cannot self-upgrade plan.
- [ ] Test/live modes cannot be confused.
- [ ] Disconnect cleans/revokes state appropriately.
- [ ] No fake “connected”.

---

# P11 — Security, privacy, abuse, lifecycle hardening

## Goal

Perform a dedicated hostile review after continuous security work.

## Review

- auth,
- RLS/IDOR,
- role elevation,
- storage,
- XSS/content rendering,
- CSRF assumptions,
- SSRF,
- upload abuse,
- prompt injection,
- OAuth,
- invitation/reset abuse,
- rate limits,
- webhook forgery/replay,
- secrets/logging,
- Redis tenant isolation,
- realtime authorization,
- security headers/CSP,
- dependencies,
- cookies/analytics consent,
- data export/deletion procedure.

## MCP

Run Supabase security/performance advisors and inspect Vercel runtime/deployment where useful.

## Acceptance

- [ ] No unresolved high-severity advisor finding without explicit owner-approved ADR.
- [ ] Tenant penetration matrix passes.
- [ ] Service role absent from client bundle.
- [ ] Upload/URL abuse tests pass.
- [ ] Prompt injection suite passes.
- [ ] Security headers reviewed.
- [ ] Legal/security claims accurate.
- [ ] Secret scan clean.

---

# P12 — UX completeness, accessibility, responsive, performance, SEO final audit

## Goal

Catch the “agent built 80% and stopped” failures.

## Exhaustive route/control audit

Verify every route, nav item, action, form, modal, async state, and breakpoint.

Explicit checklist:

- [ ] custom 404,
- [ ] meta title every public page,
- [ ] meta description every public page,
- [ ] canonical behavior,
- [ ] robots.txt,
- [ ] sitemap.xml,
- [ ] ALT text on every image according to informative/decorative purpose,
- [ ] mobile breakpoints,
- [ ] sticky mobile CTA where intended,
- [ ] loading states,
- [ ] form field/server error states,
- [ ] thank-you page,
- [ ] privacy policy,
- [ ] terms,
- [ ] cookies/banner behavior,
- [ ] analytics consent behavior,
- [ ] real contact address,
- [ ] mobile menu,
- [ ] clickable logo,
- [ ] unused navigation removed,
- [ ] broken links removed,
- [ ] no page-level horizontal overflow,
- [ ] forgot/reset password remains working,
- [ ] no dead buttons,
- [ ] keyboard/focus checks,
- [ ] reduced motion,
- [ ] performance review.

Run Playwright across multiple viewports and production build. Repair every required failure and loop again.

---

# P13 — Production deployment and portfolio proof

## Goal

Ship a reproducible public portfolio deployment with a real end-to-end demonstration.

## Deploy/configure

- Vercel production,
- Supabase production project/environment,
- Redis,
- durable jobs,
- Brevo,
- AI provider,
- production domain,
- analytics,
- Stripe test integration if included.

## Demo data

Use a documented seed script into a demo workspace. Never hide fake data in UI code.

## Portfolio package

README should include:

- product summary,
- architecture diagram,
- stack,
- screenshots,
- setup,
- schema/migration workflow,
- AI/RAG flow,
- security design,
- demo/golden journey,
- provider/free-tier notes,
- limitations,
- upstream acknowledgments.

## Final golden journey

`landing → signup/login → onboarding → knowledge ingestion → widget → inbox → AI evidence → escalation → human reply → ticket → analytics`

## Acceptance

- [ ] Vercel deployment healthy.
- [ ] Environment validation passes.
- [ ] No browser console errors in critical path.
- [ ] Manual gates resolved.
- [ ] Golden journey passes against deployed app.
- [ ] OAuth redirects correct.
- [ ] Email links correct.
- [ ] robots/sitemap correct on production domain.
- [ ] Mobile final smoke passes.
- [ ] Final secret scan clean.
- [ ] Repository clean.
- [ ] `.agent/STATE.md` marks P13 complete.

---

# Universal phase execution loop

For each phase:

1. Set phase `IN_PROGRESS`.
2. Implement one or more complete vertical slices.
3. Re-read phase acceptance list.
4. Run tests/verification.
5. Repair failures.
6. Repeat verification.
7. If manual work is needed, set `BLOCKED_MANUAL` and stay in phase.
8. When every criterion is proven, set `VERIFYING` and run the complete phase gate one final time.
9. Only then set `COMPLETE`.
10. Update `.agent/HANDOFF.md` and move to next phase.

There is no “mostly complete” phase.
