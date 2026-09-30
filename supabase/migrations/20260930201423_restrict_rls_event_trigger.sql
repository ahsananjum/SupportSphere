-- The platform event trigger enables RLS on new public tables. It is not an
-- application RPC and must not be executable by Data API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
