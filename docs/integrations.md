# Integrations

SupportSphere currently exposes outgoing webhooks. Stripe checkout and Slack are intentionally not shown until their provider configuration and server entitlement flows are verified.

An endpoint receives a JSON envelope with `id`, `type`, `delivery_id`, `created_at`, and `data`. The `X-SupportSphere-Signature` header is `t=<unix-seconds>,v1=<HMAC-SHA256>`. Compute the HMAC over the exact request body prefixed with `<timestamp>.`, compare with a constant-time operation, and reject timestamps outside a five-minute replay window. Use `X-SupportSphere-Delivery` as the idempotency key.

Endpoint signing secrets are shown once and stored in Supabase Vault. Destinations must use HTTPS; the worker rejects localhost, private/reserved IPv4 ranges, DNS failures, redirects, and non-2xx responses. Delivery attempts are durable, idempotent per endpoint/event, retried with bounded exponential backoff, and retained as safe status/response metadata without persisting remote response bodies.

