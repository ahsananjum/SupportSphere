create or replace function app_private.update_automation_rule_versioned(
  p_workspace_id uuid,p_rule_id uuid,p_expected_version integer,p_name text,p_trigger_type text,p_conditions jsonb,p_actions jsonb,p_enabled boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_trigger_type not in ('conversation_created','customer_message_received','ticket_created','priority_changed','tag_added','escalation')
    or char_length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'INVALID_AUTOMATION' using errcode='P0001'; end if;
  perform app_private.validate_automation_payload(p_conditions,p_actions);
  update public.automation_rules set name=trim(p_name),trigger_type=p_trigger_type,conditions=p_conditions,actions=p_actions,
    enabled=coalesce(p_enabled,true),version=version+1,updated_at=now()
    where id=p_rule_id and workspace_id=p_workspace_id and version=p_expected_version;
  if not found then raise exception 'AUTOMATION_VERSION_CONFLICT' using errcode='P0001'; end if;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'automation.rule_updated','automation_rule',p_rule_id,jsonb_build_object('version',p_expected_version + 1));
end;
$$;
revoke all on function app_private.update_automation_rule_versioned(uuid,uuid,integer,text,text,jsonb,jsonb,boolean) from public,anon,authenticated;
create or replace function public.update_automation_rule_versioned(
  p_workspace_id uuid,p_rule_id uuid,p_expected_version integer,p_name text,p_trigger_type text,p_conditions jsonb,p_actions jsonb,p_enabled boolean
) returns void language sql security invoker set search_path='' as $$ select app_private.update_automation_rule_versioned($1,$2,$3,$4,$5,$6,$7,$8) $$;
grant execute on function public.update_automation_rule_versioned(uuid,uuid,integer,text,text,jsonb,jsonb,boolean) to authenticated;
