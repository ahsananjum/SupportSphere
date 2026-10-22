## U4 delivery history and bounded retry

**Approved upgrade contract (18 October 2026):** U4 in [the roadmap](upgrade-roadmap.md) refines existing endpoint/delivery history, retry eligibility, version/current-state checks, revoke behavior and deduped failure recovery under [the automation policy](automation-and-human-control.md). No new destination provider is selected. Extend existing delivery/security tests and manual steps with implementation; the plan is not delivery proof.

SupportSphere currently exposes outgoing webhooks. Stripe checkout and Slack are intentionally not shown until their provider configuration and server entitlement flows are verified.

An endpoint receives a JSON envelope with `id`, `type`, `delivery_id`, `created_at`, and `data`. The `X-SupportSphere-Signature` header is `t=<unix-seconds>,v1=<HMAC-SHA256>`. Compute the HMAC over the exact request body prefixed with `<timestamp>.`, compare with a constant-time operation, and reject timestamps outside a five-minute replay window. Use `X-SupportSphere-Delivery` as the idempotency key.

Endpoint signing secrets are shown once and stored in Supabase Vault. Destinations must use HTTPS; the worker rejects localhost, private/reserved IPv4 ranges, DNS failures, redirects, and non-2xx responses. Delivery attempts are durable, idempotent per endpoint/event, retried with bounded exponential backoff, and retained as safe status/response metadata without persisting remote response bodies.

## U1 review controls

Endpoint editing is an inline native disclosure with Escape/focus return. Send test and Revoke confirmations name the stored destination; rotation also requires a confirmation explaining receiver updates. Cancel/Escape makes no request. Confirm uses the existing server role/policy checks. A queued test still requires Recent attempts for actual delivery proof. Follow [UI task checks](ui-foundation.md) using isolated destinations and never rotate a real receiver as unattended verification.

U1 Recent attempts shares queued/processing/retry/terminal feedback and safe reason copy. A queued test is not delivery; a disabled/revoked endpoint does not gain retry authority from the label. Existing attempt/HTTP metadata stays visible. Presentation tests use controlled persisted local states, never a real receiver or delivery proof.
# Integrations

Outgoing webhook history identifies the endpoint name, event type, event ID and attempt count. A queued or processing row is not success; only a recorded terminal response is presented as delivered. Failed deliveries explain whether a bounded retry is still eligible. Owners and admins can use the existing retry action when the endpoint remains enabled and the delivery has not exhausted its limit; the server rechecks workspace role, endpoint state and delivery status and records an audit event. Test deliveries remain clearly labeled and do not imply a connected provider until a signed delivery succeeds.
