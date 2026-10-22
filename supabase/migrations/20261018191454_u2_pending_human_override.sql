-- U2: serialize final automatic effects with human routing and newer messages.
alter table public.conversations add column support_revision bigint not null default 0 check(support_revision>=0);
alter table public.tickets add column support_revision bigint not null default 0 check(support_revision>=0);
alter table public.ai_runs add column support_revision bigint not null default 0 check(support_revision>=0);

create function app_private.support_revision_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('app.automation_executing',true),'')<>'on' and
    (auth.uid() is not null or coalesce(current_setting('app.support_input',true),'')='on' or
      (tg_table_name='conversations' and (to_jsonb(new)->>'ai_handoff_at') is distinct from (to_jsonb(old)->>'ai_handoff_at'))) then
    new.support_revision:=old.support_revision+1;
  else new.support_revision:=old.support_revision; end if;
  return new;
end; $$;
create trigger u2_support_revision before update on public.conversations for each row execute function app_private.support_revision_trigger();
create trigger u2_support_revision before update on public.tickets for each row execute function app_private.support_revision_trigger();

create function app_private.support_message_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.sender_type in ('customer','note') or (new.sender_type='agent' and new.sender_user_id is not null) then
    perform set_config('app.support_input','on',true);
    update public.conversations set support_revision=support_revision+1 where workspace_id=new.workspace_id and id=new.conversation_id;
    perform set_config('app.support_input','off',true);
  end if;
  return new;
end; $$;
create trigger u2_message_revision before insert on public.messages for each row execute function app_private.support_message_revision();

create function app_private.capture_support_revision() returns trigger language plpgsql security definer set search_path='' as $$
declare v_revision bigint;
begin
  if tg_table_name='ai_runs' then
    select support_revision into v_revision from public.conversations where workspace_id=new.workspace_id and id=new.conversation_id;
    new.support_revision:=coalesce(v_revision,0);
  else
    if new.trigger_type='ticket_created' then
      select support_revision into v_revision from public.tickets where workspace_id=new.workspace_id and id=new.trigger_entity_id;
    else
      select support_revision into v_revision from public.conversations where workspace_id=new.workspace_id and id=new.trigger_entity_id;
    end if;
    new.payload:=coalesce(new.payload,'{}'::jsonb)||jsonb_build_object('_support_revision',v_revision,'_rule_version',(select version from public.automation_rules where workspace_id=new.workspace_id and id=new.rule_id));
  end if;
  return new;
end; $$;
create trigger u2_ai_revision before insert on public.ai_runs for each row execute function app_private.capture_support_revision();
create trigger u2_automation_revision before insert on public.automation_runs for each row execute function app_private.capture_support_revision();

-- The target lock is held through all effects and their terminal recording.
create function app_private.support_revision_matches(p_workspace uuid,p_kind text,p_id uuid,p_expected text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_revision bigint;
begin
  if p_kind='ticket' then select support_revision into v_revision from public.tickets where workspace_id=p_workspace and id=p_id for update;
  elsif p_kind='conversation' then select support_revision into v_revision from public.conversations where workspace_id=p_workspace and id=p_id for update;
  else return false; end if;
  return found and p_expected is not null and p_expected=v_revision::text;
end; $$;
revoke all on function app_private.support_revision_trigger(),app_private.support_message_revision(),app_private.capture_support_revision(),app_private.support_revision_matches(uuid,text,uuid,text) from public,anon,authenticated;

create or replace function app_private.process_automation_runs(p_limit integer default 20)
returns integer language plpgsql security definer set search_path='' as $$
declare
  v_run public.automation_runs%rowtype;
  v_rule public.automation_rules%rowtype;
  v_action jsonb;
  v_index integer;
  v_done integer:=0;
  v_match boolean;
  v_retry boolean;
  v_error text;
  v_state text;
  v_entity_type text;
  v_params jsonb;
begin
  if current_user not in ('postgres','service_role') then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  update public.automation_runs set status='queued',lease_token=null,lease_expires_at=null
    where status='processing' and lease_expires_at<now();
  for v_run in
    select * from public.automation_runs where status='queued' and next_run_at<=now()
    order by next_run_at,created_at for update skip locked limit least(greatest(coalesce(p_limit,20),1),100)
  loop
    update public.automation_runs set status='processing',attempt=attempt+1,
      lease_token=gen_random_uuid(),lease_expires_at=now()+interval '4 minutes',
      started_at=coalesce(started_at,now()) where id=v_run.id returning * into v_run;
    begin
      select * into v_rule from public.automation_rules
        where id=v_run.rule_id and workspace_id=v_run.workspace_id for update;
      if not found or not v_rule.enabled or v_rule.trigger_type<>v_run.trigger_type or v_rule.version::text is distinct from v_run.payload->>'_rule_version' then
        update public.automation_runs set status='skipped',result='{"reason":"disabled_or_changed"}'::jsonb,
          lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
      elsif not app_private.support_revision_matches(v_run.workspace_id,case when v_run.trigger_type='ticket_created' then 'ticket' else 'conversation' end,v_run.trigger_entity_id,v_run.payload->>'_support_revision') then
        update public.automation_runs set status='skipped',result='{"reason":"HUMAN_OVERRIDE"}'::jsonb,
          lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
      else
        v_match:=true;
        if v_rule.conditions ? 'status' and v_rule.conditions->>'status' is distinct from v_run.payload->>'status' then v_match:=false; end if;
        if v_rule.conditions ? 'priority' and v_rule.conditions->>'priority' is distinct from v_run.payload->>'priority' then v_match:=false; end if;
        if v_rule.conditions ? 'channel' and v_rule.conditions->>'channel' is distinct from v_run.payload->>'channel' then v_match:=false; end if;
        if v_rule.conditions ? 'tag_id' and v_rule.conditions->>'tag_id' is distinct from v_run.payload->>'tag_id' then v_match:=false; end if;
        if not v_match then
          update public.automation_runs set status='skipped',result='{"reason":"conditions_not_met"}'::jsonb,
            lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
        else
          perform set_config('app.automation_executing','on',true);
          v_entity_type:=case when v_run.trigger_type='ticket_created' then 'ticket' else 'conversation' end;
          v_index:=0;
          for v_action in select value from jsonb_array_elements(v_rule.actions) loop
            v_params:=v_action || jsonb_build_object('_automation_run_id',v_run.id,'_action_index',v_index,'_lease_token',v_run.lease_token);
            if v_action->>'type'='notify' then
              v_params:=jsonb_set(v_params,'{dedupe_key}',to_jsonb('automation:'||v_run.id::text||':'||v_index::text),true);
            end if;
            perform app_private.apply_automation_action(v_run.workspace_id,v_entity_type,
              v_run.trigger_entity_id,v_action->>'type',v_params);
            v_index:=v_index+1;
          end loop;
          update public.automation_runs set status='succeeded',
            result=jsonb_build_object('actions',v_index),lease_token=null,lease_expires_at=null,
            completed_at=now() where id=v_run.id;
          perform set_config('app.automation_executing','off',true);
        end if;
      end if;
    exception when others then
      get stacked diagnostics v_state=returned_sqlstate, v_error=message_text;
      perform set_config('app.automation_executing','off',true);
      v_retry:=v_state in ('40001','40P01','55P03','57014') and v_run.attempt+1<v_run.max_attempts;
      update public.automation_runs set status=case when v_retry then 'queued' else 'failed' end,
        next_run_at=now()+make_interval(secs=>(15*power(2,v_run.attempt))::integer),
        error_code=left(v_state,60),error_message='Automation action could not be completed.',
        lease_token=null,lease_expires_at=null,
        completed_at=case when v_retry then null else now() end where id=v_run.id;
      if not v_retry then
        insert into public.notifications(workspace_id,user_id,kind,title,body,dedupe_key,target_route)
          select v_run.workspace_id,m.user_id,'automation_failed','Automation needs attention',
            'A workflow failed. Open Automations to review the run.',
            'automation_failed:'||v_run.id::text,'/app/automations'
          from public.workspace_members m where m.workspace_id=v_run.workspace_id
            and m.status='active' and m.role in ('owner','admin')
          on conflict (workspace_id,user_id,kind,dedupe_key) where dedupe_key is not null do nothing;
      end if;
    end;
    v_done:=v_done+1;
  end loop;
  return v_done;
end;
$$;
revoke all on function app_private.process_automation_runs(integer) from public,anon,authenticated;


create or replace function app_private.apply_automation_action(
  p_workspace_id uuid,p_entity_type text,p_entity_id uuid,p_action_type text,p_params jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_member boolean; v_ticket_number bigint; v_conversation uuid; v_message uuid; v_policy public.ai_agent_configs%rowtype; v_reason text; v_origin public.automation_runs%rowtype; v_rule public.automation_rules%rowtype; v_kind text; v_recent integer;
begin
  select * into v_origin from public.automation_runs where id=(p_params->>'_automation_run_id')::uuid and workspace_id=p_workspace_id and trigger_entity_id=p_entity_id for update;
  if not found then raise exception 'AUTOMATION_ORIGIN_REQUIRED' using errcode='P0001'; end if;
  if v_origin.status<>'processing' or v_origin.lease_expires_at<=now() or v_origin.lease_token::text is distinct from p_params->>'_lease_token' then raise exception 'LEASE_EXPIRED' using errcode='P0001'; end if;
  select * into v_rule from public.automation_rules where id=v_origin.rule_id and workspace_id=p_workspace_id for update;
  if not found or not v_rule.enabled or v_rule.version::text is distinct from v_origin.payload->>'_rule_version' then raise exception 'AUTOMATION_CHANGED' using errcode='P0001'; end if;
  if coalesce(p_params->>'_action_index','') !~ '^[0-9]{1,2}$' then raise exception 'INVALID_AUTOMATION_ACTION' using errcode='P0001'; end if;
  if v_rule.actions->((p_params->>'_action_index')::integer)->>'type' is distinct from p_action_type then raise exception 'INVALID_AUTOMATION_ACTION' using errcode='P0001'; end if;
  if coalesce(v_origin.result->'applied_actions','[]'::jsonb) @> jsonb_build_array((p_params->>'_action_index')::integer) then return; end if;
  if not app_private.support_revision_matches(p_workspace_id,p_entity_type,p_entity_id,v_origin.payload->>'_support_revision') then raise exception 'HUMAN_OVERRIDE' using errcode='P0001'; end if;
  if p_action_type='assign' then
    v_user:=nullif(p_params->>'user_id','')::uuid;
    select exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=v_user and status='active') into v_member;
    if not v_member then raise exception 'INVALID_AUTOMATION_TARGET' using errcode='P0001'; end if;
    if p_entity_type='conversation' then
      update public.conversations set assignee_user_id=v_user,updated_at=now() where workspace_id=p_workspace_id and id=p_entity_id;
    elsif p_entity_type='ticket' then
      update public.tickets set assignee_user_id=v_user,updated_at=now() where workspace_id=p_workspace_id and id=p_entity_id;
    end if;
    if not found then raise exception 'AUTOMATION_TARGET_MISSING' using errcode='P0001'; end if;
  elsif p_action_type in ('set_priority','set_status') then
    if p_entity_type='conversation' then
      update public.conversations set priority=case when p_action_type='set_priority' then p_params->>'value' else priority end,
        status=case when p_action_type='set_status' then p_params->>'value' else status end,updated_at=now()
        where workspace_id=p_workspace_id and id=p_entity_id;
    elsif p_entity_type='ticket' then
      update public.tickets set priority=case when p_action_type='set_priority' then p_params->>'value' else priority end,
        status=case when p_action_type='set_status' then p_params->>'value' else status end,updated_at=now()
        where workspace_id=p_workspace_id and id=p_entity_id;
    end if;
    if not found then raise exception 'AUTOMATION_TARGET_MISSING' using errcode='P0001'; end if;
  elsif p_action_type='notify' then
    insert into public.notifications(workspace_id,user_id,kind,title,body,dedupe_key,target_route)
      select p_workspace_id,m.user_id,'automation',
        left(coalesce(p_params->>'title','Automation update'),120),
        left(coalesce(p_params->>'body','An automation completed.'),400),
        nullif(left(coalesce(p_params->>'dedupe_key','automation:'||p_entity_id::text),200),''),
        nullif(left(p_params->>'target_route',500),'')
      from public.workspace_members m
      where m.workspace_id=p_workspace_id and m.status='active'
        and (p_params->>'user_id' is null or m.user_id=(p_params->>'user_id')::uuid)
      on conflict (workspace_id,user_id,kind,dedupe_key) where dedupe_key is not null do nothing;
  elsif p_action_type in ('invoke_triage','invoke_ai_draft') then
    select * into v_origin from public.automation_runs where id=(p_params->>'_automation_run_id')::uuid and workspace_id=p_workspace_id;
    if not found then raise exception 'AUTOMATION_ORIGIN_REQUIRED' using errcode='P0001'; end if;
    select * into v_rule from public.automation_rules where id=v_origin.rule_id and workspace_id=p_workspace_id;
    if not found or not v_rule.enabled then raise exception 'AUTOMATION_RULE_UNAVAILABLE' using errcode='P0001'; end if;
    v_conversation:=case when p_entity_type='conversation' then p_entity_id
      when p_entity_type='ticket' then (select conversation_id from public.tickets where workspace_id=p_workspace_id and id=p_entity_id) else null end;
    if v_conversation is not null and not exists(select 1 from public.conversations where workspace_id=p_workspace_id and id=v_conversation) then
      raise exception 'AUTOMATION_TARGET_MISSING' using errcode='P0001'; end if;
    select id into v_message from public.messages where workspace_id=p_workspace_id and conversation_id=v_conversation and sender_type='customer' order by created_at desc,id desc limit 1;
    select * into v_policy from public.ai_agent_configs where workspace_id=p_workspace_id;
    perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text,81));
    select count(*) into v_recent from public.ai_runs where workspace_id=p_workspace_id and created_at>now()-interval '1 hour';
    v_reason:=case when v_policy.mode is null or v_policy.mode='off' then 'AI_OFF'
      when v_message is null then 'NO_CUSTOMER_INPUT' when v_recent>=60 then 'RATE_LIMIT'
      when exists(select 1 from public.conversations where id=v_conversation and workspace_id=p_workspace_id and (assignee_user_id is not null or ai_handoff_at is not null or status='closed')) then 'INACTIVE_CONVERSATION' else null end;
    v_kind:=case when p_action_type='invoke_triage' then 'triage' else 'draft' end;
    insert into public.ai_runs(workspace_id,conversation_id,input_message_id,policy_version,run_type,automation_run_id,automation_rule_version,automation_action_key,status,decision,reason_code,completed_at)
      values(p_workspace_id,v_conversation,v_message,coalesce(v_policy.version,1),v_kind,v_origin.id,v_rule.version,
        v_origin.id::text||':'||coalesce(p_params->>'_action_index','0'),
        case when v_reason is null then 'queued' else 'skipped' end,
        case when v_reason is null then null else 'skipped' end,v_reason,case when v_reason is null then null else now() end)
      on conflict (workspace_id,automation_action_key) where automation_action_key is not null do nothing;
  elsif p_action_type='create_ticket' then
    perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text, 41));
    select coalesce(max(ticket_number),0)+1 into v_ticket_number from public.tickets where workspace_id=p_workspace_id;
    insert into public.tickets(workspace_id,ticket_number,title,description,priority,category,conversation_id)
      values(p_workspace_id,v_ticket_number,left(coalesce(p_params->>'title','Automation ticket'),240),
        left(coalesce(p_params->>'description','Created by automation.'),40000),
        case when p_params->>'priority' in ('low','normal','high','urgent') then p_params->>'priority' else 'normal' end,
        nullif(left(p_params->>'category',120),''),case when p_entity_type='conversation' then p_entity_id else null end);
  elsif p_action_type in ('add_tag','remove_tag') then
    if p_entity_type<>'conversation' or not exists(select 1 from public.tags where workspace_id=p_workspace_id and id=(p_params->>'tag_id')::uuid) then
      raise exception 'INVALID_AUTOMATION_TARGET' using errcode='P0001';
    end if;
    if p_action_type='add_tag' then
      insert into public.conversation_tags(workspace_id,conversation_id,tag_id)
        values(p_workspace_id,p_entity_id,(p_params->>'tag_id')::uuid) on conflict do nothing;
    else
      delete from public.conversation_tags where workspace_id=p_workspace_id
        and conversation_id=p_entity_id and tag_id=(p_params->>'tag_id')::uuid;
    end if;
  else
    raise exception 'INVALID_AUTOMATION_ACTION' using errcode='P0001';
  end if;
  update public.automation_runs set result=jsonb_set(coalesce(result,'{}'::jsonb),'{applied_actions}',coalesce(result->'applied_actions','[]'::jsonb)||jsonb_build_array((p_params->>'_action_index')::integer),true) where id=v_origin.id;
end;
$$;
revoke all on function app_private.apply_automation_action(uuid,text,uuid,text,jsonb) from public,anon,authenticated;



create or replace function public.finish_ai_run(
  p_run_id uuid,p_lease_token uuid,p_provider text,p_model text,p_triage jsonb,p_quality jsonb,
  p_output text,p_confidence numeric,p_evidence numeric,p_requested_decision text,p_reason text,
  p_steps jsonb,p_citations jsonb,p_input_tokens integer,p_output_tokens integer,p_latency_ms integer
) returns text language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_config public.ai_agent_configs%rowtype;
  v_decision text; v_step jsonb; v_cite jsonb; v_index integer:=0; v_message public.messages%rowtype;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs where id=p_run_id and status='processing'
    and lease_token=p_lease_token and lease_expires_at>now() for update;
  if not found then raise exception 'LEASE_EXPIRED' using errcode='P0001'; end if;
  perform 1 from public.conversations where workspace_id=v_run.workspace_id and id=v_run.conversation_id for update;
  if not found then raise exception 'INPUT_MISSING' using errcode='P0001'; end if;
  select * into v_config from public.ai_agent_configs where workspace_id=v_run.workspace_id for update;
  select * into v_message from public.messages where id=v_run.input_message_id
    and workspace_id=v_run.workspace_id and conversation_id=v_run.conversation_id;
  if not found or v_message.sender_type<>'customer' then raise exception 'INPUT_MISSING' using errcode='P0001'; end if;
  if p_requested_decision not in ('auto_sent','draft','escalated','skipped') or
     char_length(coalesce(p_output,''))>20000 or char_length(coalesce(p_reason,''))>60 or
     jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)>20 or
     jsonb_typeof(p_citations)<>'array' or jsonb_array_length(p_citations)>10 then
    raise exception 'INVALID_RESULT' using errcode='P0001';
  end if;
  v_decision := p_requested_decision;
  if v_run.run_type='draft' and v_decision='auto_sent' then v_decision:='draft'; end if;
  if v_run.run_type='triage' and v_decision not in ('escalated','skipped') then v_decision:='skipped'; end if;
  if not app_private.ai_automation_allowed(v_run.id) then v_decision:='skipped'; p_reason:='AUTOMATION_CHANGED'; end if;
  if v_config.mode='off' then v_decision:='skipped'; end if;
  if v_decision='auto_sent' and (
    v_config.mode<>'assisted' or v_config.version<>v_run.policy_version or
    coalesce(p_confidence,0)<v_config.confidence_threshold or coalesce(p_evidence,0)<v_config.evidence_threshold or
    coalesce(p_quality->>'passed','false')<>'true' or coalesce(p_quality->>'grounded','false')<>'true' or
    coalesce(p_quality->>'safe','false')<>'true' or coalesce(p_quality->>'tone_ok','false')<>'true' or
    coalesce(p_triage->>'escalate','true')<>'false' or coalesce(p_triage->>'intent','') not in ('how_to','product_info') or
    p_triage->>'intent'=any(v_config.excluded_intents) or jsonb_array_length(p_citations)=0 or
    exists(select 1 from jsonb_array_elements(p_citations) cite
      where position('[' || (cite->>'ordinal') || ']' in p_output)=0) or
    exists(select 1 from public.conversations where workspace_id=v_run.workspace_id
      and id=v_run.conversation_id and (ai_handoff_at is not null or assignee_user_id is not null or status='closed')) or
    exists(select 1 from public.messages where workspace_id=v_run.workspace_id and conversation_id=v_run.conversation_id
      and (created_at,id)>(v_message.created_at,v_message.id) and sender_type in ('customer','agent','note'))
  ) then v_decision:='draft'; end if;
  if not app_private.support_revision_matches(v_run.workspace_id,'conversation',v_run.conversation_id,v_run.support_revision::text) then
    v_decision:='skipped'; p_reason:='HUMAN_OVERRIDE';
  end if;
  if v_decision='auto_sent' and nullif(trim(p_output),'') is null then v_decision:='escalated'; end if;
  if v_decision='escalated' then
    perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,
      coalesce(p_reason,'AI_HANDOFF'));
  end if;
  if v_decision='auto_sent' then
    insert into public.messages(workspace_id,conversation_id,sender_type,body,delivery_status,client_id)
      values(v_run.workspace_id,v_run.conversation_id,'agent',trim(p_output),'sent','ai:'||v_run.id::text);
    update public.conversations set updated_at=now(),last_message_at=now()
      where workspace_id=v_run.workspace_id and id=v_run.conversation_id;
  end if;
  update public.ai_runs set status='completed',decision=v_decision,reason_code=case when v_decision<>p_requested_decision then
      case when p_reason in ('AUTOMATION_CHANGED','HUMAN_OVERRIDE') then p_reason when v_config.mode='off' then 'AI_OFF' when v_run.run_type='triage' then 'TRIAGE_COMPLETE' else 'DB_GATE_DOWNGRADE' end
      else left(p_reason,60) end,
    provider=left(p_provider,60),model=left(p_model,100),triage=p_triage,quality=p_quality,
    output_text=case when v_decision='skipped' then null else p_output end,
    confidence=p_confidence,evidence_score=p_evidence,input_tokens=p_input_tokens,
    output_tokens=p_output_tokens,latency_ms=p_latency_ms,
    lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    insert into public.ai_run_steps(workspace_id,run_id,ordinal,step_type,status,duration_ms,metadata)
      values(v_run.workspace_id,v_run.id,v_index,v_step->>'type',v_step->>'status',
        coalesce((v_step->>'duration_ms')::integer,0),coalesce(v_step->'metadata','{}'::jsonb));
    v_index:=v_index+1;
  end loop;
  for v_cite in select value from jsonb_array_elements(p_citations) loop
    if not exists(select 1 from public.knowledge_chunks c where c.workspace_id=v_run.workspace_id
      and c.id=(v_cite->>'chunk_id')::uuid and c.source_id=(v_cite->>'source_id')::uuid) then
      raise exception 'INVALID_CITATION' using errcode='P0001';
    end if;
    insert into public.ai_citations(workspace_id,run_id,source_id,chunk_id,ordinal,score,snippet)
      values(v_run.workspace_id,v_run.id,(v_cite->>'source_id')::uuid,
        (v_cite->>'chunk_id')::uuid,(v_cite->>'ordinal')::integer,
        (v_cite->>'score')::numeric,left(v_cite->>'snippet',500));
  end loop;
  return v_decision;
end; $$;


create or replace function public.claim_ai_run()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_mode text;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs
    where (status='queued' and next_run_at<=now()) or
      (status='processing' and lease_expires_at<now())
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if not app_private.ai_automation_allowed(v_run.id) then
    update public.ai_runs set status='skipped',decision='skipped',reason_code='AUTOMATION_CHANGED',completed_at=now(),lease_token=null,lease_expires_at=null where id=v_run.id;
    return null;
  end if;
  if not app_private.support_revision_matches(v_run.workspace_id,'conversation',v_run.conversation_id,v_run.support_revision::text) then
    update public.ai_runs set status='skipped',decision='skipped',reason_code='HUMAN_OVERRIDE',completed_at=now(),lease_token=null,lease_expires_at=null where id=v_run.id;
    return null;
  end if;
  select mode into v_mode from public.ai_agent_configs where workspace_id=v_run.workspace_id;
  if v_mode is null or v_mode='off' or v_run.attempt>=3 then
    update public.ai_runs set status=case when v_mode='off' then 'skipped' else 'failed' end,
      decision=case when v_mode='off' then 'skipped' else 'escalated' end,
      reason_code=case when v_mode='off' then 'AI_OFF' else 'RETRY_EXHAUSTED' end,
      completed_at=now(),lease_token=null,lease_expires_at=null where id=v_run.id;
    if v_mode is distinct from 'off' then
      perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,'AI worker exhausted retries');
    end if;
    return null;
  end if;
  update public.ai_runs set status='processing',attempt=attempt+1,
    lease_token=gen_random_uuid(),lease_expires_at=now()+interval '2 minutes',
    started_at=coalesce(started_at,now()) where id=v_run.id returning * into v_run;
  return pg_catalog.jsonb_build_object('id',v_run.id,'workspace_id',v_run.workspace_id,
    'conversation_id',v_run.conversation_id,'input_message_id',v_run.input_message_id,
    'lease_token',v_run.lease_token,'attempt',v_run.attempt,'run_type',v_run.run_type);
end; $$;



create or replace function public.fail_ai_run(p_run_id uuid,p_lease_token uuid,p_error_code text,p_retry boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_retry boolean;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs where id=p_run_id and status='processing'
    and lease_token=p_lease_token for update;
  if not found then return; end if;
  if not app_private.support_revision_matches(v_run.workspace_id,'conversation',v_run.conversation_id,v_run.support_revision::text) then
    update public.ai_runs set status='skipped',decision='skipped',reason_code='HUMAN_OVERRIDE',error_code=left(p_error_code,60),completed_at=now(),lease_token=null,lease_expires_at=null where id=v_run.id;
    return;
  end if;
  v_retry:=p_retry and v_run.attempt<3;
  update public.ai_runs set status=case when v_retry then 'queued' else 'failed' end,
    decision=case when v_retry then null else 'escalated' end,
    reason_code=case when v_retry then null else 'PROVIDER_UNAVAILABLE' end,
    error_code=left(p_error_code,60),
    next_run_at=now()+pg_catalog.make_interval(secs=>(15*power(2,v_run.attempt-1))::integer),
    lease_token=null,lease_expires_at=null,
    completed_at=case when v_retry then null else now() end where id=v_run.id;
  insert into public.ai_run_steps(workspace_id,run_id,ordinal,step_type,status,duration_ms,metadata)
    values(v_run.workspace_id,v_run.id,15+v_run.attempt,'provider','failed',0,
      pg_catalog.jsonb_build_object('code',left(p_error_code,60),'retry',v_retry))
    on conflict (run_id,ordinal) do nothing;
  if not v_retry then
    perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,
      'AI provider unavailable');
  end if;
end; $$;
-- The existing public invoker wrappers already grant only their selected private
-- consumers to service_role. Schema USAGE is also required; this grants no
-- authenticated/anon execution and does not expose the private schema via REST.
grant usage on schema app_private to service_role;
