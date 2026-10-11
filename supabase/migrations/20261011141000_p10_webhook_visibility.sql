-- Revocation is safe workspace metadata used to exclude revoked endpoints from the UI.
grant select (revoked_at) on public.webhook_endpoints to authenticated;
