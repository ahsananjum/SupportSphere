# SupportSphere: complete app assessment and improvement report

**Date:** 18 October 2026, Asia/Karachi  
**Repository baseline:** `b414982` on `master`  
**Scope:** Improve the existing product, its supporting controls, and its end-to-end workflows.  
**Decision:** Report and roadmap first, as requested by the owner. Application implementation has not changed.  
**Companion:** [Prioritized upgrade roadmap](upgrade-roadmap.md).

**Approval addendum — 18 October 2026:** The owner has now approved this assessment and its roadmap and requested phased execution, persistent context checkpoints, evolving tests/docs and human-controlled automation. See [the execution contract](upgrade-execution.md), [automation plan](automation-and-human-control.md) and [phase prompts](upgrade-prompts/README.md). The findings and verification below remain the original assessment baseline, not proof that upgrades are implemented.

## 1. Executive assessment

SupportSphere has a credible technical foundation and a useful product scope. It already connects workspaces, customers, conversations, tickets, knowledge ingestion, controlled AI, automations, webhooks, notifications, and analytics. Its largest opportunity is to make those existing capabilities form one clear, dependable working experience.

The interface often presents database operations as forms and lists, without enough support for deciding what to do next, preserving context, understanding consequences, or recovering from mistakes. A visual refresh alone would leave important problems intact. Some existing controls can misrepresent ownership, a new AI run can reset a reply in progress, and older records become unreachable through several capped lists.

The recommended direction is **a calm, evidence-led support workbench**: useful queues, clear ownership, a dependable conversation timeline, a visibly safe composer, connected customer/ticket context, understandable AI decisions, and consistent mobile behavior. Keep the current paper, ink, and mint identity. Apply it more rigorously to operational screens.

Five changes would create the strongest initial improvement:

1. Make routing, authorship, draft preservation, and measurement truthful and reliable.
2. Establish shared page, form, list, status, feedback, and confirmation patterns.
3. Turn the overview and navigation into effective entry points to existing work.
4. Complete the existing customer → conversation → ticket → resolution paths.
5. Design mobile around completing tasks, including the keyboard and long-content cases.

“10/10” should be a quality target with observable criteria, rather than an unsupported score. The app should earn that description through successful tasks, accessible interactions, reliable state, responsive layouts, understandable copy, and verified production behavior.

## 2. What was assessed and what the evidence proves

### Method

- Reviewed the repository's product, architecture, design, phase, testing, and release records.
- Inspected every authenticated route family and its principal forms, shared navigation, support queries, realtime component, widget, analytics calculations, automation paths, and relevant worker/migration definitions.
- Inspected public marketing, authentication, SEO, and existing automated coverage.
- Opened the recorded production origin and visually reviewed its public and sign-in surfaces. Opening `/app` redirected to sign-in; no authenticated browser session was available.
- Measured sign-in placement at 320, 360, 390, 768, 1024, and 1440 CSS pixels after clean reloads.
- Ran the existing type check, lint check, and unit/security test command.
- Consulted primary accessibility, usability, and performance references for the proposed quality bar.

### Evidence labels

| Label                 | Meaning                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Observed**          | Directly inspected in the current public browser session.                                                        |
| **Source-confirmed**  | The current code directly contains the behavior or omission. This does not prove the deployed commit matches it. |
| **Risk to reproduce** | The source exposes a failure path; a focused runtime scenario is still needed.                                   |
| **Historical**        | Recorded by earlier project verification, without being rerun in this assessment.                                |
| **Proposed**          | A recommendation or acceptance target, not an implemented capability.                                            |

This is a comprehensive product and implementation assessment, **not a new production security certification, authenticated visual sign-off, accessibility conformance claim, load test, or real-provider AI evaluation**. There were no production data writes, email sends, provider-setting changes, migrations, or deployments in this pass. Environment secret values were not inspected.

### Current verification

| Check                                        | Result in this pass                                            | Practical limit                                                                     |
| -------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm typecheck`                             | Passed                                                         | Does not prove workflow correctness.                                                |
| `pnpm lint`                                  | Passed                                                         | Does not certify accessibility or visual quality.                                   |
| `pnpm test`                                  | 52 passed, 3 skipped; 10 files passed, 3 skipped               | Live security suites require explicit project opt-in and were skipped.              |
| Public production browser                    | Reviewed home and sign-in; protected app redirected to sign-in | No authenticated interaction walkthrough.                                           |
| Sign-in layout                               | Six widths inspected after reload                              | This is not six-width coverage of every app route.                                  |
| Full Playwright, production build, load test | Not rerun                                                      | The report changes documentation only. Existing historical results remain separate. |

The first sandboxed pnpm attempts failed while initializing its pinned version. The three checks above then ran successfully with elevated execution. No code repair was needed to make them pass.

### Production mobile sign-in measurements

Approximate email-field top position, measured from the top of the page with a 900px viewport height:

| Width  | Email field begins at | Assessment                                                      |
| ------ | --------------------- | --------------------------------------------------------------- |
| 320px  | 889px                 | The promotional panel consumes the initial view.                |
| 360px  | 855px                 | The main task requires scrolling.                               |
| 390px  | 854px                 | The main task requires scrolling.                               |
| 768px  | 703px                 | The stacked promotional treatment still competes with the form. |
| 1024px | 468px                 | Two-column treatment gives the form better priority.            |
| 1440px | 473px                 | Form and supporting content are both visible.                   |

The clean-reload measurements did not show persistent document overflow. A transient overflow reading during viewport changes was not consistent after reload and is not classified as a confirmed layout defect. The confirmed issue is task placement.

## 3. Product maturity by dimension

These are qualitative judgments supported by the inspected evidence, not measured numerical ratings.

| Dimension             | Current assessment                                         | Required improvement                                                                       |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Product focus         | Strong foundation                                          | Refine the existing support lifecycle; resist adding unrelated modules.                    |
| Workflow completeness | Uneven                                                     | Finish editing, assignment, linked-record navigation, list traversal, and recovery.        |
| Visual identity       | Defined but inconsistently applied                         | Turn tokens and intent into reusable operational components.                               |
| Information hierarchy | Needs substantial improvement                              | Make task, state, owner, and next action more prominent than introductory copy.            |
| Mobile usability      | Basic responsiveness with task-priority issues             | Recompose important workflows rather than only stacking desktop panels.                    |
| HCI and accessibility | Useful foundations; incomplete proof                       | Audit focus, labels, error associations, live updates, cognitive load, and confirmations.  |
| AI experience         | Traceable architecture; difficult operational presentation | Bring decision explanations and evidence closer to the reply being reviewed.               |
| Reliability and scale | Durable infrastructure; several application-level risks    | Verify every queued action completes and prevent data truncation and draft loss.           |
| Measurement           | Real records, but semantic discrepancies                   | Align calculations, date ranges, sample sizes, and labels.                                 |
| Release readiness     | Existing manual gates remain open                          | Preserve P13 status until credentials, deployment parity, and provider/journey proof pass. |

## 4. Highest-priority findings

Priority means impact on the current product: **P1** threatens correctness, work preservation, or core task completion; **P2** materially reduces usability or consistency; **P3** is later refinement. Existing release blockers retain their separate status in `.agent/STATE.md`.

| ID  | Priority | Finding and consequence                                                                                                                                                                  | Evidence                                                       | Required outcome                                                                                        |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A01 | P1       | Any non-null conversation/ticket assignee is rendered as `me`. Saving another field can therefore submit the current user as the owner.                                                  | Source-confirmed; E03, E04                                     | Show the actual owner and preserve assignment unless explicitly changed.                                |
| A02 | P1       | The composer is keyed by latest AI run ID. A new run can remount it during realtime refresh and discard unsent typing.                                                                   | Risk to reproduce; E03, E05                                    | Incoming runs never replace a human draft without a deliberate action.                                  |
| A03 | P1       | Every `agent` message is labelled “You,” regardless of `sender_user_id`.                                                                                                                 | Source-confirmed; E03, E06                                     | Correctly distinguish the current user, other teammates, and AI-origin replies where provenance exists. |
| A04 | P1       | Inbox returns 25 records; customers/tickets return 50. Their pages do not expose navigation beyond those limits.                                                                         | Source-confirmed; E06, E07                                     | Every authorized record is reachable; filters persist between pages.                                    |
| A05 | P1       | Resolution is described as tickets resolved in the interval, while the ticket query filters `created_at`. First-response calculation also operates only on messages inside the interval. | Source-confirmed mismatch; E14                                 | Define a cohort, calculate it consistently, and test cross-boundary examples.                           |
| A06 | P1       | Automation AI actions enqueue generic `ai.triage`/`ai.draft` durable jobs; no consumer for those job types was found in the inspected source.                                            | Source-confirmed wiring gap; runtime verification pending; E13 | A queued action produces the intended AI run and reaches a terminal state.                              |
| A07 | P1       | The latest automation trigger uses an `elsif` chain: a priority change can take precedence over a simultaneous handoff and suppress its escalation event.                                | Source-confirmed branch behavior; E13                          | Both applicable events are emitted once, without recursive duplication.                                 |
| A08 | P2       | Overview mainly shows workspace identity, role, and a team link. It does not help an agent start support work.                                                                           | Source-confirmed; E01                                          | Existing work queues become the primary entry points, using real data.                                  |
| A09 | P2       | Owner navigation is a flat list of up to 15 links, before account controls.                                                                                                              | Source-confirmed; E02                                          | Group daily work, operations, and settings; keep all links reachable at short heights.                  |
| A10 | P2       | Mobile sign-in places a substantial promotional panel before the form.                                                                                                                   | Observed; measurements above; E17                              | A compact brand header precedes the form on small screens.                                              |
| A11 | P2       | Terms and Privacy text on auth screens is styled as legal text but rendered as spans.                                                                                                    | Source-confirmed and visible in browser tree; E17              | Both are real, keyboard-reachable links.                                                                |
| A12 | P2       | Customer queries fetch tickets, but the customer page only renders conversations. Ticket queries fetch the conversation, but detail lacks its shortcut.                                  | Source-confirmed; E04, E06, E08                                | Display existing relationships so users can continue their work.                                        |
| A13 | P2       | Marketing and onboarding still describe implemented source capabilities as later phases.                                                                                                 | Observed and source-confirmed; E09, E18                        | Publish a truthful capability/status vocabulary after deployment parity is verified.                    |
| A14 | P2       | AI detail exposes raw codes, booleans, scores, and JSON before offering a concise operational explanation.                                                                               | Source-confirmed; E12                                          | Outcome, reason, evidence, and next action precede technical details.                                   |
| A15 | P2       | The stylesheet contains several generations of global selectors and about 3,600 lines spanning marketing, auth, and app.                                                                 | Source-confirmed; E19                                          | Consolidate shared primitives and scope styles without rewriting the stack.                             |
| A16 | P2       | Several related-record queries ignore secondary errors, allowing failures to resemble empty history or missing identity.                                                                 | Source-confirmed; E06                                          | Distinguish “none exists” from “could not load.”                                                        |

A01–A07 deserve attention before decorative polish because they affect trust in the support work itself. They do not justify expanding the product scope.

## 5. Existing feature inventory and scope boundary

| Existing area                     | Preserve                                                           | Improve within that area                                                                               |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Authentication and invitations    | Real authentication, recovery, Google OAuth, invitation lifecycle  | Copy, mobile form priority, focus, password usability, real legal links, state clarity.                |
| Workspace creation and onboarding | Persisted setup and workspace isolation                            | Step clarity, accurate availability, resume behavior, existing-workspace creation path where required. |
| App shell and overview            | Role-aware routes and workspace switching                          | Grouping, operational entry points, layout rhythm, current workspace visibility.                       |
| Inbox                             | Real conversations, filtering, realtime reconciliation             | Queue scanning, pagination, owner identity, filter recovery, context preservation.                     |
| Conversation and composer         | Replies, internal notes, handoff, ticket creation                  | Accurate authorship, distinct send modes, draft protection, reachable composer.                        |
| Tickets                           | Real linkage, number, routing, event history                       | Existing-field editing, actual assignee, readable history, linked conversation.                        |
| Customers                         | Identity records and related queries                               | Profile presentation, tickets/history, existing-field corrections.                                     |
| Knowledge                         | Paste/file ingestion, preview, enable/disable/retry/reindex/delete | Library-first layout, search, understandable progress, source evidence links.                          |
| AI policy and runs                | Safety gates, citations, feedback, traceability                    | Human-readable decisions, explicit use of drafts, evidence beside review, terminal status.             |
| Automations                       | Validated rules and durable run state                              | Plain-language rule summaries, trigger-compatible controls, edit/recovery and completion proof.        |
| Website widget                    | Isolated sessions, two-way messaging, history, offline recovery    | Installation guidance, copy action, scroll stability, mobile keyboard, honest connection labels.       |
| Webhooks                          | Signed delivery, endpoint management, retry infrastructure         | History usability, endpoint context, existing retry action, test progress.                             |
| Notifications                     | Member-scoped updates and read state                               | Read/unread clarity, grouping, contextual links, producer coverage.                                    |
| Team and security                 | Invitations, role checks, last-owner protection, audit records     | Clear role explanations, calmer row actions, named audit context.                                      |
| Analytics and evaluation          | Persisted evidence and explicit no-data treatment                  | Correct cohorts, useful hierarchy, understandable denominators and case results.                       |
| Marketing/contact/legal           | Real content, contact path, metadata and approved identity         | Availability consistency, working links, responsive task hierarchy.                                    |

### Explicitly outside this upgrade program

No new billing system, CRM pipeline, voice/video channel, social-channel integration, campaign tool, autonomous agent product, separate help-center product, native mobile application, or speculative provider integration is proposed. Keep intentionally unselected Stripe, Slack, and marketing tracking out of the work.

URL/DOCX ingestion and message attachments are documented requirement gaps or deferred breadth, not prerequisites for this polish program. Do not quietly add them as “supporting” work. New storage/retention systems, collaboration products, or generic workflow builders also need a separate scope decision.

Pagination, clear filtering, field editing, copy controls, confirmations, evidence links, status explanations, and contextual navigation qualify because they help complete an existing task with existing records.

## 6. Design direction: a more complete working environment

### Keep the identity; sharpen the hierarchy

The current fonts and palette already have character: Bricolage Grotesque, DM Sans, warm paper, dark ink, and mint/teal signals. Replacing these is lower value than fixing density, consistency, and placement.

Use a compact app header, readable grouped navigation, a clear page title with one primary action, a restrained filter toolbar, and a content region that prioritizes real work. Reserve strong decoration for public storytelling. Operational pages need focus and predictable alignment.

Proposed layout starting points, to validate in screenshots and task testing:

| Element                | Proposed treatment                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Operational page title | Usually 28–36px on desktop, 24–28px on mobile; allow names to wrap. Current headings can reach 64px.                              |
| Body and controls      | 14–16px desktop; editable mobile input text at least 16px. Keep critical information larger than compact metadata.                |
| Content spacing        | Consistent 4/8px rhythm; approximately 24–32px page gutters on desktop and 16px on mobile.                                        |
| Forms                  | Typically 480–640px reading width; group related settings with explanatory headings.                                              |
| Lists                  | Aligned columns at wide widths; deliberate two/three-line records on mobile.                                                      |
| Inspector              | Approximately 280–340px where sufficient content width remains; collapse into useful disclosures before it squeezes the timeline. |
| Surfaces               | Canvas, panel, and selected state form a clear hierarchy. Avoid adding shadows to every nested region.                            |
| Status                 | Consistent label, icon where helpful, and semantic tone; never color alone.                                                       |
| Numbers and timestamps | Tabular figures; shared formatting and explicit workspace timezone where relevant.                                                |
| Motion                 | Brief state transitions; no animation that delays replying or moves live rows unexpectedly.                                       |

These values are a specification to test, not a claim that one breakpoint or font size fits every page.

### Reorganize existing navigation

| Group      | Existing destinations                                                 |
| ---------- | --------------------------------------------------------------------- |
| Work       | Overview, Inbox, Tickets, Customers                                   |
| Operations | Knowledge, Automations, Analytics, AI runs                            |
| Workspace  | Team, Notifications                                                   |
| Settings   | General, Website widget, AI policy, Integrations, owner-only Security |

Keep the group order stable across roles; show only authorized destinations. Use recognizable icons with text, a clear selected state, and an obvious current workspace. Remove external-link arrows from ordinary internal navigation. A settings group may be disclosed rather than occupying the same visual weight as Inbox.

At short desktop heights, navigation must scroll independently enough to keep account controls reachable. On phones, the drawer needs correct focus return, background isolation, scroll handling, and an accessible close action. Preserve the existing role checks in every server action.

### Shared component contract

Build or refine the following within the existing Next.js/React/Tailwind stack. These are reusable presentations, not new user-facing modules.

| Primitive                     | Required behavior                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Page heading                  | Title, concise purpose when needed, primary action, responsive action alignment.                |
| Section header                | Common baseline for label, count, action, and description.                                      |
| Filter toolbar                | Visible labels, submit/reset, applied-state summary, preserved query parameters.                |
| Record list and pagination    | Stable columns/rows, accessible links, count/range, next/previous, loading and no-match states. |
| Status and priority indicator | Centralized vocabulary, readable tone, distinguish state from urgency.                          |
| Form field                    | Label, help, error ID, invalid state, required/optional meaning, correct input mode.            |
| Save/action feedback          | Idle, pending, success, error, recovery; announce meaningful changes once.                      |
| Confirmation                  | Name the affected record, explain consequences, cancel safely, preserve focus.                  |
| Empty/error/loading state     | Match the task and the user's permissions; distinguish no records from failed loading.          |
| Date/time display             | One shared locale/timezone policy; exact time available without hover-only access.              |

Do not solve style drift by appending another override block. Extract styles incrementally by surface/component and verify production CSS ordering. Keep existing tokens as the design source of truth.

## 7. Feature-by-feature upgrade specifications

### F01. Authentication, recovery, and invitations

**Current:** Real flows exist. The login screen mixes “Sign In or Join Now!”, a two-step email/password flow, repeated password-recovery links, and non-clickable legal text. A large promotional block precedes mobile authentication.

**Upgrade:** Lead with “Sign in to SupportSphere.” Separate the create-account path clearly. Either retain the two steps with clear focus and progress, or simplify to a standard email/password form after checking autofill and password-manager behavior. Keep a single recovery link where it helps. Add an accessible show/hide password control and concise password requirements for creation/reset. On small screens, show a compact wordmark and the form first; move supporting promotion below it or omit it. Preserve invite destinations through sign-in and make expired, revoked, wrong-account, and already-member outcomes understandable.

**Acceptance:** A returning user can identify the sign-in path immediately; the email field is visible within the first 600px at 320–390px widths; password managers/paste work; Terms and Privacy are actual links; recovery and invitation outcomes have a clear next step. Respect reduced motion in auth's direct Motion usage.

### F02. Workspace setup and general settings

**Current:** Setup is persisted, but several descriptions still refer to later phases. The knowledge step offers “Open knowledge” and “Skip for now,” including after a source has been added. Timezone is a free-text IANA value.

**Upgrade:** Explain the purpose and completion state of each current step. Show the actual knowledge state when returning from the library and use a neutral “Continue” when skipping is no longer the user's action. Replace stale availability copy only with verified release facts. Group general settings into workspace identity, support identity, and website context. Offer a searchable timezone selection using supported IANA values, with a readable local-time example. Show saving/saved/unsaved state and preserve entered values on recoverable failure.

**Acceptance:** Leaving and returning resumes correctly; an admin can explain what remains; field errors point to the relevant control; setup completion does not imply the provider or widget has passed runtime verification. Additional-workspace creation from an existing membership should be treated as a documented existing-scope gap to resolve deliberately.

### F03. Overview and navigation

**Current:** Overview is mostly an identity/role card with a team link. Operational navigation competes with configuration.

**Upgrade:** Retain workspace identity in a compact heading. Surface real open/unassigned conversations, urgent work, and recent handoffs using existing records, with links to the corresponding filtered queues. Show existing knowledge/AI readiness only when data supports it. Provide an empty workspace with the next useful step, not empty metric decoration. Avoid duplicating the full Analytics page.

**Acceptance:** An agent can begin daily work without opening Team. Every count matches its linked queue and authorization scope. Owner configuration does not dominate the agent's task area. A failed count query displays unavailable state rather than zero.

### F04. Inbox, search, and queue scanning

**Current:** Search, status, priority, timestamps, and realtime exist, but there is no usable page navigation beyond the first 25 conversations. Search is subject/channel text rather than customer-wide search. No-match copy still suggests creating data.

**Upgrade:** Put subject, customer, priority, status, owner, and last activity into a predictable scan pattern. Add URL-backed pagination with stable tie-break sorting. Expose existing assignment/channel dimensions where supported and validate each query parameter. Show applied filters and “Clear filters.” Distinguish a fresh inbox from no search results. Keep scroll position and filters when returning from a conversation. Use server filtering for the dataset; do not filter only the first loaded page in the browser. Do not display unread counts until a real read-state definition and data path support them.

**Acceptance:** With at least 60 conversations, the oldest remains reachable, filtering works across the full authorized set, and browser Back restores the queue context. Empty matching results offer filter recovery. Rapid updates do not repeatedly move the row a user is activating.

### F05. Conversation timeline and reply composer

**Current:** Messages, internal notes, routing, AI drafts, and ticket creation are present. Sender labels are inaccurate for other agents. The internal-note mode is a checkbox while the button continues to say “Send message.” AI run changes can remount the composer. Customer/routing/ticket controls stack below the timeline on mobile.

**Upgrade:** Give the thread a compact subject/customer header with readable state and actual ownership. Resolve teammate authorship correctly. Present “Reply to customer” and “Internal note” as visibly distinct modes; change composer label, treatment, help, and action to “Send reply” or “Save note.” Explain who can see a note. Preserve a human draft through realtime refresh, AI completion, validation failure, and opening contextual panels. Offer a deliberate “Use this draft” action instead of replacing existing typing. Preserve idempotent send behavior and make retry state explicit. Keep the composer reachable without covering messages or the software keyboard. Show linked tickets in context before suggesting another creation.

**Acceptance:** Agent A's message is not labelled “You” for Agent B; changing priority preserves Agent A's ownership; typing survives a new AI run and incoming messages; notes never render in customer-visible history; retry cannot create duplicate messages; long threads remain practical. A teammate-concurrency test must cover assignment and send changes.

### F06. Tickets and lifecycle

**Current:** Ticket creation captures title, description, priority, category, and optional links. Detail mostly edits routing and prints raw event types. Query support for a linked conversation is not reflected in navigation.

**Upgrade:** Keep ticket number, title, current state, priority, and actual owner in one readable header. Enable correction of existing title/description/category fields through the existing authorized update path. Add the linked customer and conversation shortcuts. Turn stored event payloads into clear changes such as “Priority changed from Normal to High,” including actor when available. Separate meaningful lifecycle state from background metadata. Preserve filters when returning to the ticket queue.

**Acceptance:** Corrections persist after reload; owner and category survive unrelated edits; the conversation is one obvious link away; a viewer gets a clear read-only representation. Pagination traverses all tickets. Status changes and reopened/resolved semantics agree with analytics.

### F07. Customer profiles

**Current:** Customer detail renders conversations but omits fetched tickets and useful profile fields. There is no correction UI for existing customer data.

**Upgrade:** Present name, email, phone, and company with clear missing-value treatment. Show existing conversation and ticket histories together with understandable counts. Enable authorized correction of existing fields while respecting identity uniqueness. Use “Company not provided” instead of inferring that a customer is “Independent.” Provide contextual contact-copy actions where helpful. Keep any deletion/anonymization decision outside routine profile polish until the existing retention/privacy policy is reconciled.

**Acceptance:** A support agent can see the customer's active work without re-searching another module. Failed history loading cannot masquerade as an empty history. Identity collisions have a useful recovery path and do not silently merge unrelated customers.

### F08. Knowledge library and ingestion

**Current:** Two large creation forms precede the library. Status exists, polling refreshes every five seconds while indexing is active, preview is limited, and search is absent. Several field errors are only summarized at form level. Delete uses a browser confirmation.

**Upgrade:** Make the existing library the main surface. Place paste/upload behind a clearly labelled inline disclosure or focused panel. Add source search and readable enabled/indexed states. Explain queued, processing, ready, failed, and disabled in terms of whether AI can use the source. Keep supported formats/limits beside upload. Show real processing stages only if recorded; never invent a percentage. Link citations to source detail with source names. Present retry and delete consequences with consistent controls. Pause unnecessary refresh when the view is hidden or work has reached a terminal state.

**Acceptance:** Users can identify usable sources, locate a known article, understand a failed upload, and recover without recreating it unnecessarily. Unsupported formats remain clearly unavailable. Preview/load failures are distinct from absent content; deleting a source explains its effect on indexed content.

### F09. AI review, evidence, policy, and handoff

**Current:** The backend records detailed decisions and evidence, but the conversation offers limited evidence context. The run inspector exposes a long technical record. A failed run with no decision can fall through to “AI is processing” in the conversation's heading logic. Feedback submission lacks the shared pending-state treatment.

**Upgrade:** Use a consistent state map for queued, processing, draft ready, sent, human needed, skipped, and failed. Begin with an operational sentence: “Human review needed because the knowledge match was too weak.” Keep the raw code in technical details. Show supporting snippets and named source links beside a draft. Preserve a clear distinction between assistant draft, human-edited text, and sent answer. Explain that confidence/evidence scores are gates, not calibrated probabilities of correctness. Explain what releasing a handoff permits and name the action accordingly. Show policy version and advanced trace only when relevant or disclosed.

**Acceptance:** A user can answer what happened, why, which evidence was used, and what action is available without reading JSON. Failed/skipped runs never claim to be processing. New AI work never overwrites typing. Human-gated categories stay gated; existing provider verification remains a separate release gate.

### F10. Automations

**Current:** A large creation form appears before existing rules. The configured-rule list does not show the conditions/actions already fetched. Status choices are not specialized to the trigger's entity. History shows a trigger but not a useful rule identity. AI action completion and escalation emission have identified gaps.

**Upgrade:** Repair A06/A07, then display rules as readable sentences assembled from stored conditions/actions: “When a customer message arrives and priority is Urgent, notify the support team.” Disclose the editor on demand. Offer only valid condition/action combinations for the current entity. Support editing existing rules with version awareness rather than requiring deletion/recreation. Relate recent runs to the rule and affected record. Distinguish matched, skipped, queued, completed, retrying, and failed. Keep consequences and destructive actions out of every row's default visual emphasis.

**Acceptance:** Each visible action has a verified producer, consumer, and terminal outcome. Changing priority and handing off together produces both expected events once. A queued AI job is not reported as a completed AI task. Rule edits preserve auditability and do not replay old events unintentionally.

### F11. Widget installation and customer conversation

**Current:** Real sessions, message history, retry, and offline draft retention exist. Embed code is presented as a code block without a copy control. Some installation copy refers to a local test host. The widget header says “SUPPORT / LIVE” independently of response availability. Refreshing messages can scroll to the bottom even while reading older content.

**Upgrade:** Present installation as save allowed origin → copy embed code → verify on that exact website. Explain origin errors in plain language while keeping exact-origin security. Add copy feedback without changing the snippet. Use “Support” and actual connection state; do not imply an agent is online. Auto-scroll only when already near the newest message or after sending; preserve older-history position. Keep retry idempotency, and test editing a draft while a request is pending. Audit short heights, safe areas, zoom, iframe focus, and software-keyboard behavior on a real phone.

**Acceptance:** An owner can install from the in-app instructions; a customer can read history while replies arrive, retain a failed draft, retry safely, and close/reopen with sensible focus. Internal notes never appear. The widget remains usable when the keyboard consumes much of the screen.

### F12. Integrations and webhook delivery

**Current:** Endpoint creation/editing, secrets, signed tests, and delivery state exist. Recent history is limited to 30 rows, without practical traversal, endpoint naming in each delivery, or a visible manual retry despite an existing backend retry capability.

**Upgrade:** Lead with endpoint health and actionable failures. Place creation behind an explicit action. Associate delivery rows with destination name, event, time, result, attempt, and next eligible action. Expose the existing authorized retry path with safe eligibility and idempotency rules. Show “Test queued” until an actual result exists; update the result in place with bounded refresh. Use consistent confirmation and one-time secret-copy/reveal treatment; do not persist secrets into convenience storage or logs.

**Acceptance:** Users can identify which endpoint failed, understand whether another attempt is pending, and retry eligible work without duplicate successful deliveries. Endpoint status reflects actual delivery evidence, not merely saved configuration. History is navigable beyond its first batch.

### F13. Analytics and evaluation

**Current:** Metrics come from real records and correctly support “No data,” but calculation/definition discrepancies undermine interpretation. Reversed ranges are silently clamped. The default dates use UTC while the page says workspace timezone. Broad row retrieval may be truncated by configured API limits. Evaluation cases and worker reason codes have documented mismatches.

**Upgrade:** First define the cohort for each metric and make the calculation match. For example, a ticket created before the range but resolved within it must be included if that is the stated resolution cohort. A response crossing midnight/range boundaries must not disappear or become a later response by accident. Validate real calendar dates and reversed ranges inline. Derive default calendar dates in workspace timezone. Use exact aggregation or complete bounded paging for volume; verify against a known larger dataset. Then improve visual hierarchy, grouped distributions, unit formatting, denominators, and sample sizes. Show evaluation case results and missing-evidence reasons before emphasizing a pass ratio. Evaluation remains evidence-bound and is not a claim of provider accuracy.

**Acceptance:** A known fixture set yields expected counts/averages across date boundaries, zero cases, reopened records, and configured row limits. The UI's range matches the query. Case expectations match current safety policy and reason codes. Unavailable evaluation queries do not look like “No run yet.”

### F14. Team, roles, and audit history

**Current:** Important role protections exist. Member rows combine role selection, save, confirmation checkbox, and remove actions. Security fetches actor IDs but presents events without actor identity. Invitation history can dominate active invitations.

**Upgrade:** Explain each existing role before assignment. Separate active members, pending invitations, and historical outcomes. Keep routine role editing visible and removal behind a named action with a clear consequence. Preserve last-owner protection in both UI and database. Present audit events as who changed what and when, using authorized profile data and a safe fallback when the actor no longer exists. Make history limits explicit and navigable where required.

**Acceptance:** Owners understand role consequences; admins cannot exceed their authority; the final owner cannot be removed/demoted; removal confirmations name the person. Audit identity is never invented from truncated IDs.

### F15. Notifications and cross-feature status

**Current:** A member-scoped list and related-work links exist, but recent items are capped at 50. Viewer read-state is intentionally restricted in the present implementation. Source guides flag uneven notification-producer proof.

**Upgrade:** Give unread items a visible text-supported state, group by recency, show context, and preserve read-state after returning from related work. Provide list traversal and an unread filter as refinements of this list. Decide whether marking one's own notification read should be allowed for viewers, then implement a narrowly scoped permission if approved within the existing role contract. Verify assignment, escalation, ingestion, and integration producers separately; one successful automation notice does not prove them all. Announce meaningful changes without repeated polling chatter.

**Acceptance:** A person understands what needs attention and reaches the affected record directly. Read-state changes remain scoped to that person/workspace. Restricted actions explain the reason without presenting a dead control.

### F16. Marketing, contact, legal, and release presentation

**Current:** The public design has more visual treatment than the operational app. Home, pricing, feature pages, and onboarding retain foundation-era claims. Public content observed in production matches those stale source claims; this alone does not identify the deployed commit.

**Upgrade:** Reconcile a small, central capability vocabulary: implemented in source, verified in deployment, configured, unavailable, or intentionally deferred. Update public copy only after checking the corresponding deployment facts. Present the app's real support work using authentic reviewed captures or clearly labelled diagrams. Keep pricing and integrations honest. Preserve approved operator/contact/legal facts, working SEO, contact validation, cookie behavior, and helpful 404s. Avoid copying internal implementation instructions into user-facing setup help.

**Acceptance:** Public, auth, setup, settings, README, and release records do not contradict one another. AI availability is stated precisely without implying the pending provider gate has passed. No new pricing, certification, customer, or performance claim is invented.

## 8. HCI and accessibility improvements

The practical review framework follows [Nielsen Norman Group's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): make state visible, use understandable language, preserve control, remain consistent, prevent mistakes, reduce memory demands, and provide useful recovery. The recommendations below apply those principles to this app; they are not results from a completed user study.

| Interaction principle    | SupportSphere application                                     | Observable quality check                                                                 |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Visibility of state      | Distinguish saved, queued, processing, failed, and completed. | An operator can tell whether a reply, upload, rule action, or webhook actually finished. |
| Match with user language | Replace raw event/reason codes in primary content.            | Users understand an outcome without technical documentation.                             |
| User control             | Preserve unsent work and make AI adoption explicit.           | Background activity cannot silently replace the user's draft.                            |
| Consistency              | Shared save controls, status labels, empty/error patterns.    | Similar actions behave and look the same across modules.                                 |
| Error prevention         | Preserve assignee and distinguish reply/note recipients.      | Saving a priority does not transfer ownership or misaddress a message.                   |
| Recognition over recall  | Visible linked customer, ticket, source, and rule context.    | Users do not need to remember IDs or re-search related screens.                          |
| Efficient work           | Compact queues, persistent filters, contextual actions.       | Frequent tasks take fewer unnecessary screen changes.                                    |
| Relevant information     | Disclose technical traces and large creation forms.           | Daily work appears before advanced configuration.                                        |
| Recovery                 | Field errors, retry eligibility, retained values.             | A failed action has a safe next step and does not lose the user's input.                 |

Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the accessibility acceptance reference: normal text contrast at least 4.5:1; large text at least 3:1; keyboard access, visible/unobscured focus, meaningful labels, error identification, and appropriate status announcements. Its AA target-size criterion is 24×24 CSS pixels with exceptions; SupportSphere should retain its more generous 44px target for primary touch controls. Validate reflow at 320 CSS pixels and text zoom. This report does not assert conformance.

Specific work includes error/help associations in AI and knowledge forms; unique control IDs when forms repeat; reduced-motion handling in direct auth animations; drawer background isolation and focus return; meaningful page titles; non-color status indicators; and respectful live-region announcements. Keep the existing skip link and native controls where they already work well. Test with a screen reader; automated lint cannot settle these questions.

## 9. Mobile and tablet specification

Responsive success means completing the same support task comfortably, rather than merely avoiding a horizontal scrollbar.

| Width/condition        | Required behavior                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 320–390px phone        | Compact page heading, visible main action, full-width readable controls, short record summaries, form-first authentication. |
| 480–767px              | Keep filters efficient; avoid making a short queue require several screens of controls.                                     |
| 768–1023px tablet      | Collapse an inspector when the conversation becomes too narrow; do not wait for a rigid phone breakpoint.                   |
| 1024–1279px laptop     | Inspect the actual remaining content width after navigation and gutters; allow optional context disclosure.                 |
| 1280–1440px+           | Aligned scan columns, bounded reading widths, useful side context, no excessive empty gutters.                              |
| Short height/landscape | Navigation/account controls, dialogs, and actions remain reachable by scrolling.                                            |
| Keyboard open          | Composer and submit action remain accessible; no header/footer traps or covered text.                                       |
| 200% text / 400% zoom  | Text wraps and reflows; no clipped forms or hidden controls.                                                                |
| Reduced motion         | State remains legible with spatial motion removed.                                                                          |

For conversation detail, use a compact summary and an accessible “Details” disclosure near the header on mobile, then the timeline and composer. Customer/routing/ticket context should not require scrolling through hundreds of messages. For long creation forms, prefer an in-flow expansion or a well-tested dialog/panel over an absolutely positioned dropdown that can exceed the viewport.

Run each important journey at 320, 360, 390, 768, 1024, and 1440px, with unusually long names/emails/subjects, validation errors, no data, large histories, and software-keyboard cases. Add real iOS/Android checks before mobile sign-off; desktop emulation does not prove keyboard behavior.

## 10. Technology and engineering improvements

Keep Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, the durable workers, and existing integrations. No framework migration or library shopping is required for the proposed quality improvement.

1. **Correct reads and writes.** Use actual identity values; preserve untouched fields; distinguish unknown/null from explicit clearing. Check related-query errors and never turn a failed query into fabricated zero/empty state.
2. **Stable state ownership.** Keep composer state independent from AI-run identity. Reconcile realtime data by identity. Test navigation/workspace changes with unsaved input; do not automatically persist sensitive drafts into unreviewed browser storage.
3. **Bounded, complete reads.** Use validated pagination and deterministic ordering. Return narrow projections when practical. Analytics must cover its full cohort rather than relying on a provider row cap.
4. **Realtime with controlled fallback.** The inbox refreshes every four seconds even when subscribed, alongside event/focus/online refresh. Coalesce bursts and use visibility-aware fallback/backoff. Verify reconnect recovery before reducing it. Keep server authorization authoritative.
5. **Complete durable workflows.** Verify job consumer ownership, leases, retry, terminal failure, and visible progress. Enqueue success is insufficient. Fix event fan-out without introducing recursive automation loops.
6. **Reuse the design implementation.** Extract shared components and scoped styles incrementally; remove superseded rules only after regression comparison. Keep tokens centralized and avoid adding another UI framework.
7. **Improve diagnostic precision.** Keep user-safe recovery messages with correlation metadata where already supported. Do not expose provider payloads, secrets, customer transcripts, or raw internal exceptions to improve perceived transparency.
8. **Target meaningful coverage.** Add tests for assignment preservation, incoming-AI draft preservation, pagination traversal, date-boundary metrics, simultaneous automation events, retry idempotency, and multi-role behavior. Do not substitute snapshot count for task coverage.

The performance target should use [Core Web Vitals](https://web.dev/articles/vitals): LCP ≤2.5 seconds, INP ≤200ms, and CLS ≤0.1 at the 75th percentile, evaluated separately for mobile and desktop. These are proposed targets; no field performance measurement was collected in this pass. Start with repeatable laboratory journeys, then use permitted production evidence without re-enabling intentionally disabled marketing tracking.

## 11. Innovation within the current feature set

The app can become distinctive through the quality of connected interactions. Each proposal below uses existing work rather than introducing a separate product feature.

| Improvement                     | Existing foundation                                     | User benefit                                                         | Scope guard                                                                 |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Evidence beside the reply       | AI drafts, citations, knowledge preview                 | Review the relevant source at the moment of deciding to send.        | No new autonomous agent or knowledge product.                               |
| Explain the next step           | Persisted run decision, policy, handoff state           | Understand why AI stopped and which existing action resolves it.     | Explanations must come from recorded facts, not generated guesses.          |
| A contextual customer history   | Customer/conversation/ticket links                      | Continue the support story without repeated search.                  | No CRM pipeline or unrelated customer enrichment.                           |
| Readable automation rules       | Existing trigger, conditions, actions, run history      | Understand what a rule will do before enabling it.                   | No generic visual workflow-builder platform.                                |
| Task-adaptive mobile detail     | Existing inspector, timeline, composer                  | Reach routing and context without losing the active conversation.    | No separate mobile product or reduced safety checks.                        |
| Readiness that explains itself  | Existing source/indexing/widget/AI configuration states | Tell configured, usable, pending, and failed apart.                  | No invented connection tests or fabricated health scores.                   |
| Recovery that keeps work intact | Existing drafts, idempotency, retries, durable state    | Recover from failure without recreating work or duplicating actions. | No silent sending, uncontrolled background replay, or new retention system. |

## 12. Workflow before and after

| Existing workflow          | Current friction                                                                  | Target upgraded experience                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Sign in → start support    | Promotion precedes the phone form; overview directs attention to team management. | Form-first sign-in → operational overview → correct queue.                                       |
| Inbox → answer             | Limited traversal, weak owner context, AI details elsewhere, draft-reset risk.    | Preserve queue context → readable timeline/owner → evidence beside draft → explicit send.        |
| Conversation → ticket      | Create form is available, existing links are difficult to follow.                 | See existing tickets → create only when needed → return to the original conversation.            |
| Upload → AI use            | Creation forms dominate and indexed/enabled states require interpretation.        | Library first → add source → understandable processing → clearly usable source → named citation. |
| Event → automation outcome | Form choices can promise an action without complete consumer proof.               | Valid rule → recorded match → real execution → related record and terminal result.               |
| Resolution → report        | Existing definitions and date-cohort calculations diverge.                        | Correct event/cohort handling → visible sample/definition → trustworthy metric.                  |

## 13. Prioritization and definition of done

The [roadmap](upgrade-roadmap.md) turns these findings into seven ordered work packages. Start with correctness and reusable foundations, then upgrade the inbox/conversation as the reference workflow and apply the same standard across related screens. Finish with whole-app verification and the existing owner-controlled release gates.

Every upgraded area must meet all applicable conditions:

- Existing happy path, role restrictions, persistence, and tenant boundaries still work.
- Loading, empty, no-match, failure, pending, success, and retry states are understandable.
- Labels, focus order, keyboard interactions, and error associations are verified.
- Phone, tablet, desktop, short-height, zoom, and long-content cases are reviewed.
- Background updates do not erase work or claim completion before it exists.
- Copy reflects what the deployed capability can actually do.
- Task-oriented tests pass, and the relevant screenshots receive human review.

Proposed usability validation: test five representative participants across agent, admin, and owner tasks. Aim for at least 90% completion of the agreed tasks without assistance and no critical recipient/ownership errors. Record baseline time, errors, and user confidence first; aim for a meaningful reduction in avoidable steps/time rather than inventing a claimed improvement percentage. A small study is directional evidence, not statistical proof of universal usability.

Suggested tasks: find an older conversation; change priority without changing owner; send a reply and a private note; use or reject an AI draft; locate the source behind it; follow a customer to a ticket and back; recover a failed source; explain a failed automation/webhook; choose an accurate analytics range; and complete the same core reply task on mobile.

## 14. Existing release gates and unresolved requirements

[Current release state](../.agent/STATE.md) still records P13 as `BLOCKED_MANUAL`. Preserve the existing credential-rotation, deployment/environment parity, and real Gemini/golden-journey verification requirements. Historical quota errors do not prove the provider's current availability; owner-reported enablement does not prove the complete AI journey.

The owner wants blocked phases handled at the end. Design work, local improvements, and isolated fixture verification can be planned independently; final release proof still depends on those existing gates. This assessment creates no new provider setup request and does not close any gate.

The [testing guide's requirement-gap inventory](../TESTING_GUIDE.md) remains relevant: incomplete tag editing, teammate assignment, customer/ticket editing, linked records, search/pagination, webhook retry, notification coverage, automation breadth, evaluation semantics, and isolated migration replay. Prioritize gaps that complete the current workflows. Keep deferred breadth and unselected integrations explicitly separate. A fresh-clone migration replay must use an isolated environment, never a reset of the shared production project.

## 15. Evidence index

Paths identify the assessed source baseline. Line references are search anchors for the current repository and may move during future implementation.

| Ref | Source                                                                                                                                                                                                                                                                                                                        | Relevant evidence                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| E01 | [Overview](../app/app/page.tsx)                                                                                                                                                                                                                                                                                               | Workspace name/role and team-management CTA.                                                                         |
| E02 | [App navigation](../components/shared/app-navigation.tsx)                                                                                                                                                                                                                                                                     | Flat destination array, workspace switcher, drawer/focus logic.                                                      |
| E03 | [Conversation detail](../app/app/inbox/[conversationId]/page.tsx)                                                                                                                                                                                                                                                             | Sender label around line 108; composer key around 159; assignment around 227; AI state presentation and ticket form. |
| E04 | [Ticket detail](../app/app/tickets/[ticketId]/page.tsx), [support actions](../app/app/support-actions.ts)                                                                                                                                                                                                                     | Assignment around detail line 109; routing writes; missing linked-conversation presentation; update fields.          |
| E05 | [Support forms](../components/support/support-forms.tsx), [inbox realtime](../components/support/inbox-realtime.tsx)                                                                                                                                                                                                          | Composer/default values, send idempotency, note checkbox, four-second refresh.                                       |
| E06 | [Support queries](../lib/support/queries.ts)                                                                                                                                                                                                                                                                                  | Inbox range around 22; customer/ticket limits around 98/152; related-data errors and unused fetched relationships.   |
| E07 | [Inbox](../app/app/inbox/page.tsx), [tickets](../app/app/tickets/page.tsx), [customers](../app/app/customers/page.tsx)                                                                                                                                                                                                        | Filter controls, list rendering, absent pagination, no-match copy.                                                   |
| E08 | [Customer detail](../app/app/customers/[customerId]/page.tsx)                                                                                                                                                                                                                                                                 | Conversation history without fetched tickets or profile-edit controls.                                               |
| E09 | [Onboarding](../app/app/onboarding/page.tsx), [general form](../app/app/settings/general/general-form.tsx)                                                                                                                                                                                                                    | Later-phase wording, knowledge skip, free-text timezone.                                                             |
| E10 | [Knowledge list](../app/app/knowledge/page.tsx), [forms](../app/app/knowledge/knowledge-forms.tsx), [detail](../app/app/knowledge/[sourceId]/page.tsx)                                                                                                                                                                        | Library/form hierarchy, pagination, preview, refresh, confirmation and errors.                                       |
| E11 | [AI policy](../app/app/settings/ai/settings-form.tsx), [AI actions](../app/app/ai/actions.ts)                                                                                                                                                                                                                                 | Policy explanations, feedback/handoff server actions, field-error patterns.                                          |
| E12 | [AI runs](../app/app/ai/runs/page.tsx), [run inspector](../app/app/ai/runs/[runId]/page.tsx)                                                                                                                                                                                                                                  | Raw codes/JSON, 50-row limit, citations, feedback and technical presentation.                                        |
| E13 | [Automation UI](../app/app/automations/page.tsx), [rule form](../app/app/automations/automation-form.tsx), [engine](../lib/automation/engine.ts), [P08 migration](../supabase/migrations/20261010122310_p08_workflows.sql), [latest trigger](../supabase/migrations/20261012163227_p13_reproducibility_trigger_hardening.sql) | Rule summaries, generic AI jobs, event precedence, trigger-compatible inputs.                                        |
| E14 | [Analytics queries](../lib/analytics/queries.ts), [definitions](../lib/analytics/definitions.ts), [analytics page](../app/app/analytics/page.tsx), [evaluation migration](../supabase/migrations/20261011100000_p09_analytics_evaluation.sql)                                                                                 | Created-vs-resolved cohort, message range, date handling, case expectations.                                         |
| E15 | [Widget](../app/widget/widget-client.tsx), [widget CSS](../app/widget/widget.css), [loader](../public/widget/loader.js), [settings](../app/app/settings/widget/page.tsx)                                                                                                                                                      | Session/retry/history, auto-scroll, live label, iframe sizing, installation copy.                                    |
| E16 | [Integrations](../app/app/settings/integrations/page.tsx), [team](../app/app/team/page.tsx), [security](../app/app/settings/security/page.tsx), [notifications](../app/app/notifications/page.tsx)                                                                                                                            | Row actions, capped histories, audit identity, role/read-state behavior.                                             |
| E17 | [Auth form](<../app/(auth)/auth-form.tsx>), [auth layout](<../app/(auth)/layout.tsx>), production `/login`                                                                                                                                                                                                                    | Title, two-step form, legal spans, mobile visual hierarchy.                                                          |
| E18 | [Home](../app/page.tsx), [marketing pages](../lib/marketing/pages.ts), [plans](../lib/marketing/plans.ts), production home                                                                                                                                                                                                    | Foundation-era availability claims.                                                                                  |
| E19 | [Global stylesheet](../app/globals.css), [tokens](../tokens.css), [design contract](../DESIGN.md), [root layout](../app/layout.tsx)                                                                                                                                                                                           | Fonts/tokens, repeated style generations, operational title scale, responsive patterns.                              |
| E20 | [CI](../.github/workflows/ci.yml), [browser tests](../tests/e2e), [live audits](../tests/live), [current state](../.agent/STATE.md)                                                                                                                                                                                           | Automated/historical coverage and unresolved production proof.                                                       |

The expected outcome of this program is an existing product that feels complete because its tasks, context, state, and presentation agree. Success should be demonstrated by the acceptance checks above and the roadmap's release evidence.
