# Workflow infrastructure

P08 keeps automation truth in Postgres. A rule stores a fixed trigger, a JSON condition object, and a bounded list of action objects. Zod and the database validate the action allowlist; no rule can execute JavaScript, SQL, or arbitrary HTTP.

Support writes emit database events for conversation creation, customer messages, ticket creation, priority changes, and AI escalation. The trigger inserts one automation run per enabled rule. A unique workspace, rule, and idempotency key makes duplicate delivery harmless.

Supabase pg_cron runs supportsphere-automation-worker every minute. It leases queued runs with SKIP LOCKED, executes actions in one transaction, records succeeded/skipped/failed state, and retries only transient database errors. A terminal failure is visible in run history and creates one deduplicated owner notification.

Redis keys use an environment and purpose namespace and hash identifiers that do not need to be recoverable. Rate-limit buckets live in one central matrix. Protected buckets fail closed when Redis is unavailable; widget buckets fall back to the existing durable Postgres limiter. Every ephemeral marker has a TTL, and locks verify their owner token before release.

Redis never authorizes a request and never stores support or job truth. Workspace and AI settings invalidate their scoped cache keys after the database confirms a successful write.
