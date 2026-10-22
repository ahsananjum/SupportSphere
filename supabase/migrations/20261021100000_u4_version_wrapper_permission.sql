create or replace function public.update_automation_rule_versioned(
  p_workspace_id uuid,p_rule_id uuid,p_expected_version integer,p_name text,p_trigger_type text,p_conditions jsonb,p_actions jsonb,p_enabled boolean
) returns void language sql security definer set search_path='' as $$ select app_private.update_automation_rule_versioned($1,$2,$3,$4,$5,$6,$7,$8) $$;
revoke all on function public.update_automation_rule_versioned(uuid,uuid,integer,text,text,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.update_automation_rule_versioned(uuid,uuid,integer,text,text,jsonb,jsonb,boolean) to authenticated;
