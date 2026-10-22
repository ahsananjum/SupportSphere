-- The platform event trigger enables RLS on new public tables. It is not an
-- application RPC and must not be executable by Data API roles.
-- Some hosted projects install this helper; fresh local Supabase does not.
-- Preserve the revoke wherever it exists without blocking isolated replay.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
