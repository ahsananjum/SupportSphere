# SupportSphere upgrade roadmap

**Prepared:** 18 October 2026  
**Status:** Owner-approved on 18 October 2026; U0 COMPLETE for approved local/isolated scope; U1–U6 NOT_STARTED.  
**Scope authority:** The owner approved the assessment and roadmap, then requested phased loops, persistent checkpoints, evolving tests/docs and automation with human control. The owner has invoked U0 implementation only; stop before U1.  
**Assessment:** [Complete report and evidence](app-assessment-2026-10-18.md).

**Execution:** [phase contract](upgrade-execution.md) · [phase prompts](upgrade-prompts/README.md) · [progress](../.agent/UPGRADE_PROGRESS.md) · [test matrix](../.agent/UPGRADE_TEST_MATRIX.md) · [automation and human control](automation-and-human-control.md).

## Planning rules

Preserve the existing stack and the paper/ink/mint identity. Complete existing tasks before adding breadth. U0 changes and local-only migrations/proof are recorded in STATE/QA. No hosted migration, deployment or provider configuration change is claimed.

Priorities refer to the assessment's A01–A16 findings and F01–F16 feature specifications. Effort is relative engineering complexity: **S** is a focused component/path, **M** spans several components or layers, and **L** spans multiple workflows or requires deeper data verification. These are not calendar estimates. Estimate time after baseline reproduction and the first reference screen.

Each phase ends with a reviewable result and acceptance evidence. Follow U0–U6 in order; loop through remaining slices inside the selected phase, verify, repair, update docs/tests and checkpoint. No automatic phase skipping or production release. No multi-agent delegation is required or separately authorized by this plan.

## Automation extension approved in this documentation pass

Automate routine preparation/reconciliation and explicitly configured execution within the app's existing features. Retain existing Off/draft/assisted, handoff, rule disable, endpoint revoke and role boundaries. Use existing screens for review; no separate approval product. The [control matrix](automation-and-human-control.md) assigns human decisions, stale-state checks, retry/dedupe/terminal outcomes and engineering automation.

Engineering work includes a bounded phase-aware verification runner, safe isolated fixture setup/cleanup, screenshot/state checks, docs/phase/test-ID consistency checks and CI evidence. U0 installs the bounded runner/fixture foundation; see automation-inventory.md and QA for actual commands/proof. Further CI/recovery work remains assigned to later phases. No recurring Codex job or new scheduler is activated. Every slice extends relevant tests and documentation; use [the testing protocol](upgrade-testing.md).

## U0 — Baseline and correctness repairs

**Priority:** First. **Effort:** L. **Dependency:** None for local/source reproduction; isolated infrastructure needed for database/provider scenarios.

| Work item                                                       | Impact                    | Acceptance evidence                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U0.1 Preserve actual conversation/ticket assignment             | A01                       | Agent B changes priority/status on Agent A's record; Agent A remains owner. Explicit unassign and assign-to-self still work.                                                                                                                                                                               |
| U0.2 Protect composer state from AI/realtime changes            | A02                       | A human draft survives incoming messages, a new AI run, and recoverable send failure. No implicit draft replacement.                                                                                                                                                                                       |
| U0.3 Correct message authorship and AI terminal states          | A03, F09                  | “You” appears only for the current author; other identities use truthful labels. Failed/skipped runs never show processing.                                                                                                                                                                                |
| U0.4 Repair metric cohorts and date validation                  | A05                       | Known cross-boundary fixture results match the stated definitions; invalid/reversed dates have inline errors.                                                                                                                                                                                              |
| U0.5 Prove the AI automation consumer                           | A06                       | Each visible AI automation action produces the intended run and reaches a terminal state; no orphan generic job.                                                                                                                                                                                           |
| U0.6 Repair simultaneous event emission                         | A07                       | Priority change plus handoff emits both events once; replay/retry does not duplicate effects or loop.                                                                                                                                                                                                      |
| U0.7 Propagate related-data errors                              | A16                       | Failed customer/history/evaluation loads show unavailable state instead of empty data or zero.                                                                                                                                                                                                             |
| U0.8 Inventory automation and establish verification foundation | UPG-AUTOMATION, UPG-PROOF | Map every exposed action to producer/consumer/policy/versions/stop/retry/result; implement a bounded local phase-aware verification/docs checker using existing tools and explicit isolated-fixture guards. Validate checks with intentional missing-ID/broken-link/failure cases; no production fallback. |

Capture the existing authenticated reference screens in an authorized session or isolated fixture environment: overview, populated inbox, long conversation, ticket, customer, knowledge, AI inspector, automation, analytics, and integrations. Include owner/admin/agent/viewer examples. Keep synthetic data clearly identified and out of production UI code.

**Exit:** Risky source paths reproduced or documented precisely, fixes tested by behavior, before/after evidence recorded. Provider-blocked runtime cases remain explicitly pending rather than silently passing.

## U1 — Shared UI foundation and navigation

**Priority:** High. **Effort:** M–L. **Dependency:** U0 baseline; correctness repairs can land separately before this work finishes.

| Work item                                                             | Impact             | Acceptance evidence                                                                                                                                           |
| --------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1.1 Shared page/section headings and spacing                         | A15, F03           | Inbox, settings, and detail screens use consistent baselines, gutters, title scale, and primary-action placement.                                             |
| U1.2 Shared field/error/help/action feedback                          | F01, F02, F08, F09 | Errors reference the right controls; input survives failure; pending/success behavior agrees across forms.                                                    |
| U1.3 Shared status, priority, time, empty/error/loading patterns      | F04–F16            | No raw status vocabulary leaks into primary labels; unavailable never means zero.                                                                             |
| U1.4 Group existing navigation and improve short-height behavior      | A09                | All role-authorized destinations remain reachable; settings do not overwhelm daily work; selected state and current workspace are clear.                      |
| U1.5 Refine drawer/confirmation/disclosure accessibility              | F03, F14           | Keyboard, Escape, background isolation, focus return, and touch work at phone/tablet sizes.                                                                   |
| U1.6 Scope styles incrementally                                       | A15                | Production screenshots preserve unaffected surfaces; no additional blanket override generation.                                                               |
| U1.7 Standardize automated-action state and human review presentation | UPG-AUTOMATION     | Shared feedback distinguishes queued from completed, displays safe reasons/next actions and uses accessible existing review controls. No new approval module. |

Use Inbox and General settings as representative consumers before applying primitives everywhere. Do not turn this into a framework rewrite or import a second styling system.

**Exit:** A small, documented shared component vocabulary with desktop/mobile examples; production CSS ordering and affected routes verified.

## U2 — Core support workflow

**Priority:** Highest product impact. **Effort:** L. **Dependency:** U0.1–U0.3 and U1 primitives.

| Work item                                                 | Impact         | Acceptance evidence                                                                                                                                                                                    |
| --------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U2.1 Complete inbox/customer/ticket list traversal        | A04            | More than 60 records per list remain reachable; stable pagination, validated parameters, full-dataset filtering, preserved Back context.                                                               |
| U2.2 Improve queue hierarchy and filter recovery          | F04            | Subject/customer/owner/state/priority/activity scan clearly; no-match state offers reset.                                                                                                              |
| U2.3 Refine conversation header, timeline, and composer   | F05            | Reply and note recipients/actions are obvious; drafts are protected; retries remain idempotent.                                                                                                        |
| U2.4 Show linked tickets and customer histories           | A12, F06, F07  | Customer → conversation → ticket → original conversation is navigable without manual search.                                                                                                           |
| U2.5 Edit existing customer/ticket fields                 | F06, F07       | Authorized corrections persist, uniqueness/validation works, and untouched fields are preserved.                                                                                                       |
| U2.6 Implement actual teammate assignment                 | F05, F06       | Only current eligible workspace members can be assigned; server membership/role checks remain authoritative.                                                                                           |
| U2.7 Make timeline events understandable                  | F06            | Stored changes have readable before/after labels and actor fallback; no fabricated identity.                                                                                                           |
| U2.8 Make overview operational                            | A08            | Real existing queues/readiness links replace the identity-only landing emphasis; counts match linked data and handle failure.                                                                          |
| U2.9 Preserve human override under pending automated work | UPG-AUTOMATION | New manual assignment/note/reply/handoff or newer input is reconciled at the final mutation/send gate; stale automated work cannot undo the human's action. Verify concurrency and idempotent retries. |

Unread counts and tags should only be surfaced after verifying the existing read-state/tag producer and mutation paths. Keep them visible in the gap register if they are not complete; do not ship cosmetic indicators.

**Exit:** The entire human-support journey works for each role, at six widths, with long records, failure recovery, realtime updates, and a second teammate acting concurrently.

## U3 — Knowledge and AI experience

**Priority:** High. **Effort:** M–L. **Dependency:** U0 draft/state fixes and U1/U2 reference workflow.

| Work item                                                 | Impact         | Acceptance evidence                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U3.1 Make knowledge library the main surface              | F08            | Existing sources precede optional creation controls; search and pagination cover the full library.                                                                                                                                                                 |
| U3.2 Explain ingestion/readiness/retry                    | F08            | Users can identify usable vs disabled/failed sources; only real recorded progress appears.                                                                                                                                                                         |
| U3.3 Put named evidence beside draft review               | F09            | Source/snippet navigation helps review without leaving an unsaved reply; removed/unavailable sources have honest fallbacks.                                                                                                                                        |
| U3.4 Make AI draft use explicit                           | F05, F09       | “Use this draft” does not overwrite edited text without a clear decision. No auto-send permissions are broadened.                                                                                                                                                  |
| U3.5 Recompose AI run detail                              | A14            | Outcome, reason, evidence, next action first; raw codes/JSON remain in optional technical detail.                                                                                                                                                                  |
| U3.6 Clarify policy and handoff consequences              | F09            | Users understand the existing modes and the effect of releasing a handoff; field errors/pending feedback are accessible.                                                                                                                                           |
| U3.7 Verify policy-bounded automation and explicit review | UPG-AUTOMATION | Off/draft/assisted and sensitive/evidence/quality/current-state gates stay authoritative; draft review is deliberate, old approvals do not cover changed content/policy, and exceptions are actionable. Controlled tests are distinct from U6 real-provider proof. |

**Exit:** Users can inspect why a decision happened and which evidence supports it. Synthetic tests prove UI/state behavior; actual grounded/provider/safety scenarios remain separately labelled until the existing provider gate permits proof.

## U4 — Automation, notifications, integrations, and team operations

**Priority:** High after correctness fixes. **Effort:** L. **Dependency:** U0.5/U0.6 and shared components.

| Work item                                                        | Impact         | Acceptance evidence                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U4.1 Readable rule summaries and trigger-aware editing           | F10            | Stored conditions/actions are understandable; invalid combinations cannot be saved; edits are version-aware.                                                                                                                                                                  |
| U4.2 Useful automation history                                   | F10            | Each run identifies rule, record, outcome, and recovery; completion reflects execution rather than enqueue.                                                                                                                                                                   |
| U4.3 Actionable webhook delivery history and existing retry      | F12            | Endpoint context, traversal, terminal/test state, eligible retry, and duplicate protection verified.                                                                                                                                                                          |
| U4.4 Notification hierarchy and producer audit                   | F15            | Read/unread, related record, list traversal, and each existing producer are verified independently.                                                                                                                                                                           |
| U4.5 Team role/edit/destructive-action clarity                   | F14            | Roles explained; removals name the affected person; server checks/last-owner protection pass.                                                                                                                                                                                 |
| U4.6 Meaningful audit presentation                               | F14            | Actor/action/time visible from authorized data; deleted actor fallback is clear.                                                                                                                                                                                              |
| U4.7 Complete bounded execution, override and exception recovery | UPG-AUTOMATION | Valid enabled rules execute supported routine work once; stale/disabled/revoked actions skip safely; lease recovery/transient retries end in truthful terminal state and one deduped actionable failure notification. No model-chosen external destinations or silent replay. |

**Exit:** Configuration screens explain their consequences, failures lead to recovery, and every exposed background action has end-to-end evidence. No integration/provider is added.

## U5 — Mobile, onboarding, public copy, and final visual consistency

**Priority:** Mobile auth is an early quick win; remaining consolidation follows reference workflows. **Effort:** M–L. **Dependency:** U1; broader work follows U2–U4.

| Work item                                           | Impact   | Acceptance evidence                                                                                               |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| U5.1 Form-first mobile auth and working legal links | A10, A11 | First field visible within first 600px on 320–390px screens; links/focus/password manager/recovery tested.        |
| U5.2 Task-adaptive detail and creation layouts      | F05–F08  | Context reachable without traversing a long thread; no oversized dropdown/panel; keyboard does not hide send.     |
| U5.3 Setup/general-settings clarity                 | F02      | Accurate current wording, meaningful completion/resume state, timezone selection, saved/unsaved feedback.         |
| U5.4 Widget installation and customer-side polish   | F11      | Copy snippet, exact-origin guidance, stable history scroll, safe retry and real-phone keyboard proof.             |
| U5.5 Capability/copy reconciliation                 | A13, F16 | Public/auth/onboarding/settings/docs agree with verified deployment availability.                                 |
| U5.6 Whole-app visual review                        | F01–F16  | Titles, action baselines, row density, status language, spacing, focus, and long-content wrapping are consistent. |

**Exit:** Every existing route family has phone/tablet/desktop and relevant role/state evidence. Preserve the owner-approved legal identity and intentionally unselected integrations/tracking.

## U6 — Quality proof and existing release gates

**Priority:** Required before claiming the upgrade complete. **Effort:** L; externally controlled prerequisites are not estimable. **Dependency:** Relevant U0–U5 work and owner-controlled gates.

| Work item                                        | Acceptance evidence                                                                                                                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U6.1 Full repository gate                        | Typecheck/lint/format, meaningful unit/integration/browser suites, production build and diff checks at the actual final revision.                                                                                          |
| U6.2 Isolation, scale and concurrency            | Role/tenant denial, list scale, simultaneous updates, retries and terminal background outcomes in authorized isolated fixtures.                                                                                            |
| U6.3 Accessibility and devices                   | 320/360/390/768/1024/1440, short height/long content/zoom/reduced motion/keyboard/screen reader; real-phone composer/widget keyboard proof.                                                                                |
| U6.4 Metrics and evaluation                      | Correct cohorts, denominators, calendar boundaries, large totals and evidence-bound case expectations.                                                                                                                     |
| U6.5 Usability review                            | Representative tasks with actual baseline/outcome/critical errors and unresolved issues; no fabricated study results.                                                                                                      |
| U6.6 Performance                                 | Repeatable evidence; target LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75 when field evidence exists, otherwise disclose the limit.                                                                                               |
| U6.7 Existing release gates and deployed journey | Resolve MANUAL-008/010/011, isolated migration replay, deployment/env parity, real Gemini/grounding/safety and full golden journey. Gate resolution is prerequisite to affected production operations.                     |
| U6.8 Engineering and product automation proof    | CI/runner/docs checks, safe fixtures/cleanup, context-resume drill, all action-policy boundaries, retry/stale/override failure cases and concrete human release review. No unattended merge/deploy or unexplained success. |

**Exit:** No critical correctness/usability regression, all applicable acceptance checks passed, remaining limitations accurately disclosed, and release state supported by current deployment/provider evidence.

## Recommended first implementation slice

Start with **assignment preservation, authorship, composer draft protection, mobile sign-in placement, and real legal links**. Then deliver the shared page/filter/list components with complete inbox pagination as the reference screen. This slice combines immediate trust repairs with a visible improvement that can be reviewed before repeating the pattern across the app.

## Progress evidence template

For every work item, record:

| Field       | Required content                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Scope       | Existing task improved; assessment finding/spec IDs.                                                 |
| Before      | Reproduced behavior or explicit source-only risk, with safe fixture/screenshot.                      |
| Change      | Final behavior and the components/data paths affected.                                               |
| Proof       | Exact tests, roles, widths, error cases, screenshots, and result.                                    |
| State       | Proposed / in progress / verified locally / verified in deployment / blocked by named existing gate. |
| Limitations | Remaining missing behavior or proof; no implied completion.                                          |

This roadmap is approved to guide implementation. Use a phase prompt when starting/resuming that phase. Original release acceptance and gates remain; unrelated product expansion is outside scope. Current progress is tracked in STATE/progress rather than inferred from this plan.
