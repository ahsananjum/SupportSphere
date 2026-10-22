# Workflow infrastructure

**Approved upgrade contract (18 October 2026):** [automation and human control](automation-and-human-control.md), [U0/U4 roadmap](upgrade-roadmap.md), and [phase testing](upgrade-testing.md). The following describes the baseline, not proof every exposed action completes. U0 must reconcile generic AI job consumption and simultaneous priority/handoff event emission. U4 must verify rule versions, stale-state/disable behavior, bounded recovery, terminal outcomes and deduped exceptions. Update this file and the existing recipe tests as each slice is implemented.

P08 keeps automation truth in Postgres. A rule stores a fixed trigger, a JSON condition object, and a bounded list of action objects. Zod and the database validate the action allowlist; no rule can execute JavaScript, SQL, or arbitrary HTTP.

Support writes emit database events for conversation creation, customer messages, ticket creation, priority changes, and AI escalation. The trigger inserts one automation run per enabled rule. A unique workspace, rule, and idempotency key makes duplicate delivery harmless.

Supabase pg_cron runs supportsphere-automation-worker every minute. It leases queued runs with SKIP LOCKED, executes actions in one transaction, records succeeded/skipped/failed state, and retries only transient database errors. A terminal failure is visible in run history and creates one deduplicated owner notification.

Redis keys use an environment and purpose namespace and hash identifiers that do not need to be recoverable. Rate-limit buckets live in one central matrix. Protected buckets fail closed when Redis is unavailable; widget buckets fall back to the existing durable Postgres limiter. Every ephemeral marker has a TTL, and locks verify their owner token before release.

Redis never authorizes a request and never stores support or job truth. Workspace and AI settings invalidate their scoped cache keys after the database confirms a successful write.

## U0 consumer and event correction

AI rule actions now enqueue scoped ai_runs consumed by the existing leased AI worker. Queue AI triage stops after structured triage (or safe handoff); Queue AI draft is private even in Assisted mode. Origin run/action identity dedupes retries and captures the enabled rule version; changed/disabled origins skip at claim/finalize. Off/missing-input/inactive/rate-limited requests have visible terminal skip reasons. Automation succeeded means its transaction dispatched the scoped run, not that generation completed; inspect AI runs for the downstream outcome. Old generic AI intents become visible failed jobs without automatic replay when the migration is applied.

A write that raises priority and creates a handoff emits both priority_changed and escalation independently, with existing event dedupe and recursion suppression. See [the producer/consumer inventory](automation-inventory.md) for controls, remaining U4 work and actual test sources. All U0 migrations/workers remain local until explicitly released.

## U1 history presentation

Run history uses [shared feedback](ui-foundation.md#automated-action-feedback--u17): waiting/processing/retry are distinct from terminal completion/skip/failure, with safe reasons and existing record/policy review. Rule completion says that queued AI work has a separate result in AI runs. No new approval surface, trigger/consumer, retry permission or mutation authority is introduced.

## U2 human precedence and recovery

Manual routing and customer/human messages advance a database-owned support revision. Automatic runs capture that revision and the current rule version, then lock/recheck the target before effects. Stale work records HUMAN_OVERRIDE in existing history. Claim/finalization/failure paths cannot overwrite later human work or set a stale handoff. Action receipts and valid leases prevent separately committed adapter retries from duplicating tickets or other effects. Earlier completed effects are disclosed if later actions stop; they cannot be recalled. The selected database batch consumer remains atomic, and the dormant TypeScript adapter was not scheduled or activated. All new migrations are local-only pending U6/P13 rollout review.

## U4 rule editing and version safety

The automation screen writes a plain-language summary from the stored trigger, conditions, action and enabled state. Owners and admins can edit an existing rule in place; the form explains the trigger and rejects unsafe combinations such as creating a ticket from a `ticket_created` trigger or leaving a `tag_added` trigger without a tag condition. The server validates the same schema and the versioned update refuses a stale tab instead of overwriting a newer rule. A successful edit increments the rule version and records the update audit event. A saved rule remains a configuration change only; execution still requires the existing durable producer, consumer and policy gates.

Notifications are member-scoped and show unread count, producer kind, related work and paged older/newer history. Existing onboarding, AI handoff/failure, automation and override producers remain server-owned; the list does not invent counts or broaden viewer read authority. Team and security surfaces explain role consequences, name a destructive target, protect the last owner on the server, and identify audit actor/time/action with a former-member fallback.
