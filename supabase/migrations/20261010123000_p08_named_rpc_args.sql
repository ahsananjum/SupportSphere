-- PostgREST resolves RPC calls by argument names. Keep the public wrappers
-- explicitly named so server actions can invoke them with p_* keys.
create or replace function public.create_automation_rule(
  p_workspace_id uuid,
  p_name text,
  p_trigger_type text,
  p_conditions jsonb,
  p_actions jsonb,
  p_enabled boolean
)
returns uuid language sql security invoker set search_path='' as $$
  select app_private.create_automation_rule($1,$2,$3,$4,$5,$6)
$$;

create or replace function public.update_automation_rule(
  p_workspace_id uuid,
  p_rule_id uuid,
  p_name text,
  p_trigger_type text,
  p_conditions jsonb,
  p_actions jsonb,
  p_enabled boolean
)
returns void language sql security invoker set search_path='' as $$
  select app_private.update_automation_rule($1,$2,$3,$4,$5,$6,$7)
$$;

create or replace function public.delete_automation_rule(
  p_workspace_id uuid,
  p_rule_id uuid
)
returns void language sql security invoker set search_path='' as $$
  select app_private.delete_automation_rule($1,$2)
$$;
