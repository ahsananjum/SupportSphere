# Automation with human control

**Owner direction:** 18 October 2026. Automate routine work within existing features and engineering verification while retaining meaningful human control. This is an approved implementation direction, not a statement that all controls below already exist.

## Product boundary

Use existing AI modes, draft review, handoff latch, routing, rule enable/disable, knowledge lifecycle, notifications, endpoint settings, and run/delivery history. Improve these surfaces; do not invent a separate approval inbox, autonomous business agent, generic workflow designer, or new outbound channel.

The principle is **automate preparation, execute only within explicit policy, and make exceptions actionable**. A model's confidence, a saved rule, or a successful enqueue cannot stand in for authorization or completed work.

## Automation inventory and control matrix

| Existing workflow                 | Automate within existing policy                                                                                                            | Human control                                                                                                                    | Required exception/recovery                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Customer message triage           | Validate, classify, retrieve context and prepare routing/summaries.                                                                        | A teammate can correct/override; changing actual ownership needs an authorized user or an explicitly enabled valid rule.         | Uncertain/invalid/stale input becomes a visible draft, skip, or handoff with reason.                                   |
| Customer reply                    | Generate cited drafts; assisted mode may send only after every existing deterministic/database gate passes.                                | Off blocks generation; draft-only requires deliberate send; edited text is never overwritten.                                    | Sensitive, low-evidence, failed-quality, stale, assigned, closed, or handoff cases cannot bypass their gates.          |
| Sensitive requests                | Detect and route to a human; retain context and safe reasons.                                                                              | Explicit human decisions remain required for billing/security/privacy/legal/account actions.                                     | No refund, deletion, privilege change, or subscription action is executed by the model.                                |
| Queue routing and ticket creation | Deterministic priority/status/assignment/tag/ticket actions only for a validated, explicitly enabled rule and supported producer/consumer. | Admin chooses scope and enables/disables rules; agents' later manual changes take precedence where they make pending work stale. | Revalidate target/current state; explain skipped or rejected actions. No inferred AI resolution from confidence alone. |
| Knowledge ingestion               | Queue supported files/text, parse/embed/index, reconcile leases, retry transient failures.                                                 | Owner/admin selects sources, changes eligibility, retries terminal work, or confirms deletion.                                   | Usable only when fully ready/enabled; unsupported types fail honestly; no invented completion percentage.              |
| Automation runs                   | Durable claim/execute/finish, event dedupe and bounded retries.                                                                            | Explicit rule changes and disable actions; review actual rule/version/record/result in existing history.                         | Terminal failure creates a deduped actionable notice. Enqueued AI work needs a real downstream consumer.               |
| Webhooks                          | Deliver subscribed metadata to configured destinations; retry transient eligible failures.                                                 | Admin configures destination/events; test/retry/revoke/rotate controls retain their existing authorization and confirmations.    | No arbitrary model-selected destination, unbounded replay, private URL, or automatic secret rotation.                  |
| Notifications                     | Emit existing verified producer events and link to the affected record; dedupe noisy repeats.                                              | User handles the relevant work; read-state stays member-scoped and follows the approved role contract.                           | Verify each producer independently; do not fabricate unread counts or silently change viewer permissions.              |
| Analytics/evaluation              | Compute accurate cohorts and evaluate persisted matching evidence.                                                                         | User chooses range and interprets results; admin initiates the existing evaluation where required.                               | Missing evidence is explicit; a failing case is never rewritten to pass.                                               |
| Setup and configuration           | Validate inputs, show recorded readiness, generate/copy existing snippets.                                                                 | Owner/admin saves identity/origins/policy and selects enabled behavior.                                                          | Configured is distinct from connected or proven in deployment.                                                         |

## Runtime execution contract

For each automated action inventory the existing trigger, authorized actor/policy, workspace/entity, action and policy/rule versions, current state preconditions, idempotency identity, consumer, retry limit, timeout/lease, terminal result, human override, and existing review location. U0.8 records implementation gaps before promising automation in the UI.

1. **Validate and authorize:** Trusted server/database state determines workspace and permission. Retrieved text and model output never authorize actions.
2. **Prepare:** Persist only the minimum safe context and versions needed. Secrets and unrestricted customer content do not belong in diagnostic logs.
3. **Gate:** Recheck latest policy, record state, newest input, ownership/handoff and allowed action immediately before execution. A stale approval/draft cannot authorize a later changed action.
4. **Execute once:** Use durable leases, unique event/action identities and atomic transitions. Duplicate attempts must not duplicate customer sends, tickets, notifications, or accepted delivery effects.
5. **Reconcile:** Record completed/skipped/failed accurately. Separate queue acceptance, processing, retrying, and terminal success. Resume from durable state after interruption.
6. **Escalate exceptions:** Give a safe reason and an existing next action. Notify on a meaningful failure/change, with dedupe; do not spam on unchanged polling state.
7. **Respect human override:** Off, handoff, rule disable, endpoint revoke, and later manual changes must affect pending work according to documented transactional semantics. Clearly state when already-completed work cannot be recalled.

Use the existing Off/handoff/disable/revoke controls as scoped stop controls. Do not add a global kill-switch product or a new durable approval queue unless a separately approved requirement needs it. Add schema/version fields only when the implementation cannot enforce the approved contract with existing data; use migrations/RLS/types/tests, never client-only enforcement.

## Test the boundary, not only the successful job

Required cases: Off/draft/assisted mode; unsafe/sensitive request; prompt injection; missing or removed knowledge; invalid structured result; manual assignment/handoff or policy edit during processing; duplicate/reordered events; retry after timeout; lease takeover; rule disable/revoke during a queued run; simultaneous priority/handoff events; terminal failure plus one notification; viewer/other-tenant denial; and recovery with no duplicate side effect.

Controlled provider/transport failures in isolated tests prove branches. Only fresh real-provider evidence proves current Gemini behavior. Do not run provider traffic, email, webhooks, seed/reset, or stress tests against production merely because a test command exists.

## Engineering automation

Prefer existing pnpm/Vitest/Playwright/CI tools. Automating checks is distinct from granting a coding agent unrestricted authority.

| Stage                | Target automation                                                                                                                                   | Human involvement                                                                                            | Delivery phase                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Preflight            | Check branch/HEAD/diff, active phase and required docs; detect missing/stale checkpoint and unresolved test evidence.                               | Resolve genuine scope conflicts or unavailable target access.                                                | U0.8                                |
| Focused verification | A small phase-aware runner maps slice IDs to actual tests, runs bounded commands, captures exit status/duration/target and safe artifact paths.     | Review new failure hypotheses rather than approving every rerun.                                             | U0.8 foundation; expand every phase |
| Fixture management   | Disposable named users/workspaces with explicit target guard, idempotent setup, finally-cleanup and leftover ledger.                                | Approve isolated target where needed; never silently use production as fallback.                             | U0, U2–U4                           |
| UI quality           | Capture baseline/current screenshots at required widths; automate overflow, focus, label, recipient/state and long-content checks where meaningful. | Review composition, clarity, phone keyboard, and screen-reader experience; no automatic baseline acceptance. | U1–U5                               |
| Doc consistency      | Check local links, phase/slice/test ID coverage, progress status vocabulary and referenced test files; fail on stale generated evidence.            | Approve substantive policy/scope changes; agent may keep factual docs current.                               | U0.8, U6.8                          |
| CI                   | Existing deterministic checks on PR/push; add bounded isolated integration/browser jobs and evidence artifacts as phases implement them.            | Trusted-environment access/review for secret-bearing jobs; never expose production secrets to untrusted PRs. | Every phase; consolidated U6.8      |
| Recovery             | Resume packet identifies the exact next slice and pending operation; rerun only invalidated/failed checks.                                          | Review blocked decisions and consequential operations.                                                       | Every phase                         |
| Release              | Assemble build/commit parity, evidence, limitations and rollback/recovery plan.                                                                     | Existing final production release/security/provider gates remain.                                            | U6                                  |

U0 implements the bounded runner, documentation checks and isolated fixtures described in automation-inventory.md. Extra CI jobs and broader recovery remain assigned to their later phases. Select exact filenames/commands during U0.8 after inspecting existing tests; do not put nonexistent npm scripts in completion evidence. New dependencies require the normal maintenance/license/bundle review.

No recurring Codex automation or new infrastructure scheduler is being activated. If requested later, use the app's supported automation tool and an explicit phase/target/notification policy. Never create a blind infinite loop, self-approving merge/deploy, or workaround scheduled process. Existing product cron workers remain unchanged.

## Human review evidence

Record action/policy version, affected target, allowed scope, reviewer identity from the actual authorized context, decision/time, and subsequent result when relevant. Reuse existing audit/run records; do not invent a person's approval. An old approval does not cover a materially changed destination, recipient, privilege, destructive effect, or customer message.

Humans should spend time on representative visual/task review, uncertain exceptions, policy choices, credentials/access, and release decisions. Routine regression execution, status reconciliation, screenshots, docs synchronization and safe local repairs should be automated as far as the available tools permit.

## U0 implementation evidence boundary

The bounded runner, local fixture guard and producer/consumer inventory are now implemented in [automation-inventory.md](automation-inventory.md); actual passing evidence is in current QA, not this policy text. No new CI job or recurring scheduler was activated. The prepared AI consumer migration caps automation to triage/private drafts, records origin/action identity and rechecks disabled/changed rules. Local controlled-provider execution is distinct from Gemini/release proof.

## U2 final support-state gate

Support revisions are owned by the database, captured when work is queued and rechecked while holding the target lock at claim/finalization/effect boundaries. Later manual routing, customer input, public reply, private note or handoff stops stale work. Current rule version and lease remain required. SQL action receipts serialize duplicate adapter calls; the selected batch consumer still commits its actions and terminal state together. A stopped adapter run can have earlier committed effects, so history reports that count instead of implying that nothing happened. Completed effects cannot be recalled. No new stop product or scheduler was added. Hosted rollout still requires explicit pending-work review under U6/P13.

## U3 final evidence and review boundaries

Draft adoption only edits the human composer; it never authorizes sending or sensitive actions. Its replacement choice is invalidated by changed writing, suggestion or current policy identity. Releasing handoff only removes the existing latch after explicit confirmation, leaving status/assignment and old questions unchanged. No automatic replay is added.

At final send, the existing database function locks cited source/chunk rows and rechecks current tenant/ready/enabled/score eligibility. Source changes downgrade to actionable human review; invalid deleted citations cannot commit. It also checks the lease against the real clock after lock waits. All prior policy/quality/sensitive/current-state/revision/idempotency constraints remain. Local controlled processors prove branch/persistence behavior; U6/P13 still require real provider/deployed proof.

## U6 engineering proof boundary

The U6 runner now records current source/build parity before browser execution, clears inherited slice limits, fails closed on nonzero or timed-out commands, and retains guarded local fixture cleanup. CI runs the documentation, resume/failure probes and non-provider unit layer; local isolated/browser evidence remains separate from hosted provider, deployment and human release authority. No runner result authorizes a merge, deploy, external send or sensitive action.
