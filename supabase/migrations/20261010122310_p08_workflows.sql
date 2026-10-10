-- P08 reliable workflow infrastructure: tenant-scoped automation, durable jobs, notification dedupe.
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'conversation_created','customer_message_received','ticket_created',
    'priority_changed','tag_added','escalation'
  )),
  conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(conditions)='object'),
  actions jsonb not null check (jsonb_typeof(actions)='array' and jsonb_array_length(actions) between 1 and 10),
  enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_name_length check (char_length(trim(name)) between 1 and 120),
  unique (workspace_id, id)
);
create index automation_rules_trigger_idx on public.automation_rules(workspace_id, trigger_type, enabled);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  trigger_type text not null,
  trigger_entity_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','skipped')),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  next_run_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text,
  error_message text,
  result jsonb check (result is null or jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (workspace_id, rule_id, idempotency_key)
);
create index automation_runs_queue_idx on public.automation_runs(status,next_run_at,created_at);
create index automation_runs_workspace_idx on public.automation_runs(workspace_id,created_at desc);

create table public.durable_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_type text not null check (job_type ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed')),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  next_run_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (workspace_id, job_type, idempotency_key)
);
create index durable_jobs_queue_idx on public.durable_jobs(status,next_run_at,created_at);
create index durable_jobs_workspace_idx on public.durable_jobs(workspace_id,created_at desc);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('onboarding_complete','member_joined','ai_handoff','automation','automation_failed','job_failed'));

alter table public.notifications add column dedupe_key text;
alter table public.notifications add column target_route text;
alter table public.notifications add constraint notifications_dedupe_key_length check (dedupe_key is null or char_length(dedupe_key) between 1 and 200);
alter table public.notifications add constraint notifications_target_route_length check (target_route is null or char_length(target_route) between 1 and 500);
create unique index notifications_dedupe_idx on public.notifications(workspace_id,user_id,kind,dedupe_key) where dedupe_key is not null;

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.durable_jobs enable row level security;
revoke all on public.automation_rules,public.automation_runs,public.durable_jobs from anon,authenticated;
grant select on public.automation_rules,public.automation_runs to authenticated;
create policy automation_rules_select on public.automation_rules for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));
create policy automation_runs_select on public.automation_runs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create or replace function app_private.validate_automation_payload(p_conditions jsonb,p_actions jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare v_action jsonb; v_type text;
begin
  if jsonb_typeof(p_conditions)<>'object' or jsonb_typeof(p_actions)<>'array'
    or jsonb_array_length(p_actions)<1 or jsonb_array_length(p_actions)>10 then
    raise exception 'INVALID_AUTOMATION' using errcode='P0001';
  end if;
  for v_action in select value from jsonb_array_elements(p_actions) loop
    if jsonb_typeof(v_action)<>'object' or jsonb_typeof(v_action->'type')<>'string' then
      raise exception 'INVALID_AUTOMATION' using errcode='P0001';
    end if;
    v_type:=v_action->>'type';
    if v_type not in ('assign','add_tag','remove_tag','set_priority','set_status','notify','invoke_triage','invoke_ai_draft','create_ticket') then
      raise exception 'INVALID_AUTOMATION_ACTION' using errcode='P0001';
    end if;
  end loop;
end;
$$;
revoke all on function app_private.validate_automation_payload(jsonb,jsonb) from public,anon,authenticated;

create or replace function app_private.create_automation_rule(
  p_workspace_id uuid,p_name text,p_trigger_type text,p_conditions jsonb,p_actions jsonb,p_enabled boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_trigger_type not in ('conversation_created','customer_message_received','ticket_created','priority_changed','tag_added','escalation')
    or char_length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'INVALID_AUTOMATION' using errcode='P0001'; end if;
  perform app_private.validate_automation_payload(p_conditions,p_actions);
  insert into public.automation_rules(workspace_id,name,trigger_type,conditions,actions,enabled)
    values(p_workspace_id,trim(p_name),p_trigger_type,p_conditions,p_actions,coalesce(p_enabled,true))
    returning id into v_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'automation.rule_created','automation_rule',v_id,jsonb_build_object('trigger_type',p_trigger_type));
  return v_id;
end;
$$;
create or replace function public.create_automation_rule(
  p_workspace_id uuid,
  p_name text,
  p_trigger_type text,
  p_conditions jsonb,
  p_actions jsonb,
  p_enabled boolean
)
returns uuid language sql security invoker set search_path='' as $$ select app_private.create_automation_rule($1,$2,$3,$4,$5,$6) $$;

create or replace function app_private.update_automation_rule(
  p_workspace_id uuid,p_rule_id uuid,p_name text,p_trigger_type text,p_conditions jsonb,p_actions jsonb,p_enabled boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_trigger_type not in ('conversation_created','customer_message_received','ticket_created','priority_changed','tag_added','escalation')
    or char_length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'INVALID_AUTOMATION' using errcode='P0001'; end if;
  perform app_private.validate_automation_payload(p_conditions,p_actions);
  update public.automation_rules set name=trim(p_name),trigger_type=p_trigger_type,conditions=p_conditions,actions=p_actions,
    enabled=coalesce(p_enabled,true),version=version+1,updated_at=now()
    where id=p_rule_id and workspace_id=p_workspace_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
end;
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
returns void language sql security invoker set search_path='' as $$ select app_private.update_automation_rule($1,$2,$3,$4,$5,$6,$7) $$;

create or replace function app_private.delete_automation_rule(p_workspace_id uuid,p_rule_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  delete from public.automation_rules where id=p_rule_id and workspace_id=p_workspace_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
end;
$$;
create or replace function public.delete_automation_rule(
  p_workspace_id uuid,
  p_rule_id uuid
)
returns void language sql security invoker set search_path='' as $$ select app_private.delete_automation_rule($1,$2) $$;

create or replace function app_private.create_notification_once(
  p_workspace_id uuid,p_user_id uuid,p_kind text,p_title text,p_body text,p_dedupe_key text,p_target_route text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  insert into public.notifications(workspace_id,user_id,kind,title,body,dedupe_key,target_route)
    values(p_workspace_id,p_user_id,p_kind,left(p_title,120),left(p_body,400),nullif(left(p_dedupe_key,200),''),nullif(left(p_target_route,500),''))
    on conflict (workspace_id,user_id,kind,dedupe_key) where dedupe_key is not null do nothing
    returning id into v_id;
  if v_id is null then
    select id into v_id from public.notifications where workspace_id=p_workspace_id and user_id=p_user_id
      and kind=p_kind and dedupe_key=p_dedupe_key limit 1;
  end if;
  return v_id;
end;
$$;
revoke all on function app_private.create_notification_once(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function app_private.create_notification_once(uuid,uuid,text,text,text,text,text) to service_role;

create or replace function app_private.enqueue_automation_event(
  p_workspace_id uuid,p_trigger_type text,p_entity_id uuid,p_payload jsonb,p_event_key text
) returns integer language plpgsql security definer set search_path='' as $$
declare v_rule record; v_count integer:=0;
begin
  if p_trigger_type not in ('conversation_created','customer_message_received','ticket_created','priority_changed','tag_added','escalation') then return 0; end if;
  for v_rule in select id from public.automation_rules where workspace_id=p_workspace_id and trigger_type=p_trigger_type and enabled loop
    insert into public.automation_runs(workspace_id,rule_id,trigger_type,trigger_entity_id,payload,idempotency_key)
      values(p_workspace_id,v_rule.id,p_trigger_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_event_key)
      on conflict (workspace_id,rule_id,idempotency_key) do nothing;
    if found then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function app_private.enqueue_automation_event(uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function app_private.enqueue_automation_event(uuid,text,uuid,jsonb,text) to service_role;

create or replace function app_private.automation_event_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_type text; v_entity uuid; v_payload jsonb; v_key text;
begin
  v_type:=null; v_entity:=new.id; v_payload:=jsonb_build_object('id',new.id);
  if tg_table_name='conversations' and tg_op='INSERT' then
    v_type:='conversation_created'; v_payload:=jsonb_build_object('id',new.id,'status',new.status,'priority',new.priority,'channel',new.channel); v_key:='conversation_created:'||new.id::text;
  elsif tg_table_name='messages' and tg_op='INSERT' and new.sender_type='customer' then
    v_type:='customer_message_received'; v_entity:=new.conversation_id;
    v_payload:=jsonb_build_object('id',new.conversation_id,'message_id',new.id,'priority',(select priority from public.conversations where id=new.conversation_id),'status',(select status from public.conversations where id=new.conversation_id),'channel',(select channel from public.conversations where id=new.conversation_id));
    v_key:='message:'||new.id::text;
  elsif tg_table_name='tickets' and tg_op='INSERT' then
    v_type:='ticket_created'; v_payload:=jsonb_build_object('id',new.id,'status',new.status,'priority',new.priority); v_key:='ticket:'||new.id::text;
  elsif tg_table_name='conversations' and tg_op='UPDATE' and new.priority is distinct from old.priority then
    v_type:='priority_changed'; v_payload:=jsonb_build_object('id',new.id,'priority',new.priority,'previous_priority',old.priority); v_key:='priority:'||new.id::text||':'||new.updated_at::text;
  elsif tg_table_name='conversations' and tg_op='UPDATE' and old.ai_handoff_at is null and new.ai_handoff_at is not null then
    v_type:='escalation'; v_payload:=jsonb_build_object('id',new.id,'reason',new.ai_handoff_reason); v_key:='escalation:'||new.id::text||':'||new.ai_handoff_at::text;
  end if;
  if v_type is not null and coalesce(current_setting('app.automation_executing',true),'')<>'on' then
    perform app_private.enqueue_automation_event(new.workspace_id,v_type,v_entity,v_payload,v_key);
  end if;
  return new;
end;
$$;
revoke all on function app_private.automation_event_trigger() from public,anon,authenticated;
create trigger automation_conversation_events after insert or update of priority,ai_handoff_at on public.conversations
for each row execute function app_private.automation_event_trigger();
create trigger automation_message_events after insert on public.messages
for each row execute function app_private.automation_event_trigger();
create trigger automation_ticket_events after insert on public.tickets
for each row execute function app_private.automation_event_trigger();

create or replace function public.claim_automation_run()
returns table(id uuid,workspace_id uuid,rule_id uuid,trigger_type text,trigger_entity_id uuid,payload jsonb,attempt integer,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare v_run public.automation_runs%rowtype; v_token uuid:=gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.automation_runs set status='queued',lease_token=null,lease_expires_at=null
    where status='processing' and lease_expires_at<now();
  select * into v_run from public.automation_runs where status='queued' and next_run_at<=now()
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.automation_runs set status='processing',attempt=attempt+1,lease_token=v_token,
    lease_expires_at=now()+interval '4 minutes',started_at=coalesce(started_at,now())
    where id=v_run.id;
  return query select v_run.id,v_run.workspace_id,v_run.rule_id,v_run.trigger_type,v_run.trigger_entity_id,
    v_run.payload,v_run.attempt+1,v_token;
end;
$$;
revoke all on function public.claim_automation_run() from public,anon,authenticated;
grant execute on function public.claim_automation_run() to service_role;

create or replace function public.finish_automation_run(p_run_id uuid,p_lease_token uuid,p_result jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.automation_runs set status='succeeded',result=coalesce(p_result,'{}'::jsonb),lease_token=null,lease_expires_at=null,completed_at=now()
    where id=p_run_id and status='processing' and lease_token=p_lease_token;
end;
$$;
revoke all on function public.finish_automation_run(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_automation_run(uuid,uuid,jsonb) to service_role;

create or replace function public.fail_automation_run(p_run_id uuid,p_lease_token uuid,p_error_code text,p_error_message text,p_retry boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_run public.automation_runs%rowtype; v_retry boolean;
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.automation_runs where id=p_run_id and status='processing' and lease_token=p_lease_token for update;
  if not found then return; end if;
  v_retry:=coalesce(p_retry,false) and v_run.attempt<v_run.max_attempts;
  update public.automation_runs set status=case when v_retry then 'queued' else 'failed' end,
    next_run_at=now()+make_interval(secs=>(15*power(2,greatest(v_run.attempt-1,0)))::integer),
    error_code=left(p_error_code,60),error_message=left(p_error_message,240),
    lease_token=null,lease_expires_at=null,completed_at=case when v_retry then null else now() end
    where id=v_run.id;
end;
$$;
revoke all on function public.fail_automation_run(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_automation_run(uuid,uuid,text,text,boolean) to service_role;

create or replace function public.enqueue_durable_job(
  p_workspace_id uuid,p_job_type text,p_entity_id uuid,p_payload jsonb,p_idempotency_key text,p_max_attempts integer default 3
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  insert into public.durable_jobs(workspace_id,job_type,entity_id,payload,idempotency_key,max_attempts)
    values(p_workspace_id,p_job_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,least(greatest(coalesce(p_max_attempts,3),1),5))
    on conflict (workspace_id,job_type,idempotency_key) do nothing
    returning id into v_id;
  if v_id is null then select id into v_id from public.durable_jobs where workspace_id=p_workspace_id and job_type=p_job_type and idempotency_key=p_idempotency_key; end if;
  return v_id;
end;
$$;
revoke all on function public.enqueue_durable_job(uuid,text,uuid,jsonb,text,integer) from public,anon,authenticated;
grant execute on function public.enqueue_durable_job(uuid,text,uuid,jsonb,text,integer) to service_role;

grant select on public.automation_rules,public.automation_runs to authenticated;



create or replace function app_private.apply_automation_action(
  p_workspace_id uuid,p_entity_type text,p_entity_id uuid,p_action_type text,p_params jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_member boolean; v_ticket_number bigint;
begin
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
    insert into public.durable_jobs(workspace_id,job_type,entity_id,payload,idempotency_key)
      values(p_workspace_id,case when p_action_type='invoke_triage' then 'ai.triage' else 'ai.draft' end,
        p_entity_id,coalesce(p_params,'{}'::jsonb),
        p_action_type||':'||p_entity_id::text)
      on conflict (workspace_id,job_type,idempotency_key) do nothing;
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
end;
$$;
revoke all on function app_private.apply_automation_action(uuid,text,uuid,text,jsonb) from public,anon,authenticated;

create or replace function public.claim_durable_job()
returns table(id uuid,workspace_id uuid,job_type text,entity_id uuid,payload jsonb,attempt integer,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare v_job public.durable_jobs%rowtype; v_token uuid:=gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.durable_jobs set status='queued',lease_token=null,lease_expires_at=null
    where status='processing' and lease_expires_at<now();
  select * into v_job from public.durable_jobs where status='queued' and next_run_at<=now()
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.durable_jobs set status='processing',attempt=attempt+1,lease_token=v_token,
    lease_expires_at=now()+interval '4 minutes',started_at=coalesce(started_at,now()) where id=v_job.id;
  return query select v_job.id,v_job.workspace_id,v_job.job_type,v_job.entity_id,v_job.payload,v_job.attempt+1,v_token;
end;
$$;
revoke all on function public.claim_durable_job() from public,anon,authenticated;
grant execute on function public.claim_durable_job() to service_role;

create or replace function public.finish_durable_job(p_job_id uuid,p_lease_token uuid,p_result jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.durable_jobs set status='succeeded',payload=payload || jsonb_build_object('result',coalesce(p_result,'{}'::jsonb)),
    lease_token=null,lease_expires_at=null,completed_at=now()
    where id=p_job_id and status='processing' and lease_token=p_lease_token;
end;
$$;
revoke all on function public.finish_durable_job(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_durable_job(uuid,uuid,jsonb) to service_role;

create or replace function public.fail_durable_job(p_job_id uuid,p_lease_token uuid,p_error_code text,p_error_message text,p_retry boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_job public.durable_jobs%rowtype; v_retry boolean;
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_job from public.durable_jobs where id=p_job_id and status='processing' and lease_token=p_lease_token for update;
  if not found then return; end if;
  v_retry:=coalesce(p_retry,false) and v_job.attempt<v_job.max_attempts;
  update public.durable_jobs set status=case when v_retry then 'queued' else 'failed' end,
    next_run_at=now()+make_interval(secs=>(15*power(2,greatest(v_job.attempt-1,0)))::integer),
    error_code=left(p_error_code,60),error_message=left(p_error_message,240),lease_token=null,lease_expires_at=null,
    completed_at=case when v_retry then null else now() end where id=v_job.id;
end;
$$;
revoke all on function public.fail_durable_job(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_durable_job(uuid,uuid,text,text,boolean) to service_role;

 
-- The scheduled processor owns the whole action sequence and run transition in one transaction.
-- A caught action error rolls back that run's actions before recording a bounded retry/failure.
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
      started_at=coalesce(started_at,now()) where id=v_run.id;
    begin
      select * into v_rule from public.automation_rules
        where id=v_run.rule_id and workspace_id=v_run.workspace_id for update;
      if not found or not v_rule.enabled or v_rule.trigger_type<>v_run.trigger_type then
        update public.automation_runs set status='skipped',result='{"reason":"disabled_or_changed"}'::jsonb,
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
            v_params:=v_action;
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
select cron.schedule('supportsphere-automation-worker','* * * * *',
  $$select app_private.process_automation_runs(20)$$);

