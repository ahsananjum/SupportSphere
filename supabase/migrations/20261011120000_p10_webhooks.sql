-- P10 outgoing webhooks: tenant-scoped endpoints, signed deliveries, retries, and history.
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- P10 outgoing webhooks: tenant-scoped endpoints, signed deliveries, retries, and history.
create table public.integration_connections (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('connected','disconnected','error')),
  display_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  last_error text,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider),
  constraint integration_provider_check check (provider in ('webhooks')),
  constraint integration_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  destination_url text not null,
  secret text not null,
  event_types text[] not null default array['conversation.created','message.created','ticket.created','conversation.escalated']::text[],
  enabled boolean not null default true,
  status text not null default 'connected' check (status in ('connected','disconnected','error')),
  last_error text,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_name_length check (char_length(trim(name)) between 1 and 120),
  constraint webhook_url_length check (char_length(destination_url) between 1 and 2048),
  constraint webhook_secret_length check (char_length(secret) between 32 and 256),
  constraint webhook_event_types check (
    cardinality(event_types) between 1 and 20 and
    event_types <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]
  )
);
create index webhook_endpoints_workspace_idx on public.webhook_endpoints(workspace_id, updated_at desc);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed')),
  response_code integer,
  attempts integer not null default 0 check (attempts between 0 and 5),
  max_attempts integer not null default 5 check (max_attempts between 1 and 5),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error text,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint webhook_payload_object check (jsonb_typeof(payload) = 'object'),
  unique (endpoint_id, event_id)
);
create index webhook_deliveries_queue_idx on public.webhook_deliveries(status, next_attempt_at, created_at);
create index webhook_deliveries_workspace_idx on public.webhook_deliveries(workspace_id, created_at desc);
create index webhook_deliveries_endpoint_idx on public.webhook_deliveries(endpoint_id, created_at desc);

alter table public.integration_connections enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
revoke all on public.integration_connections, public.webhook_endpoints, public.webhook_deliveries from anon, authenticated;
grant select on public.integration_connections, public.webhook_endpoints, public.webhook_deliveries to authenticated;
-- The secret is service-only. Column grants intentionally omit it from the Data API.
revoke select on public.webhook_endpoints from authenticated;
grant select (id, workspace_id, name, destination_url, event_types, enabled, status, last_error, last_success_at, created_at, updated_at)
  on public.webhook_endpoints to authenticated;

create policy integration_connections_select on public.integration_connections for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));
create policy webhook_endpoints_select on public.webhook_endpoints for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));
create policy webhook_deliveries_select on public.webhook_deliveries for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create or replace function app_private.create_webhook_endpoint(
  p_workspace_id uuid, p_name text, p_destination_url text, p_secret text, p_event_types text[]
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_url text := trim(p_destination_url); v_events text[];
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 120 or char_length(coalesce(p_secret,'')) not between 32 and 256 then
    raise exception 'INVALID_INPUT' using errcode='P0001';
  end if;
  if v_url !~ '^https://[^[:space:]]+$' and v_url !~ '^http://localhost(:[0-9]+)?(/[^[:space:]]*)?$' then
    raise exception 'INVALID_URL' using errcode='P0001';
  end if;
  v_events := array(select distinct trim(value) from unnest(coalesce(p_event_types,array[]::text[])) value where trim(value) <> '');
  if cardinality(v_events) < 1 or not (v_events <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]) then
    raise exception 'INVALID_EVENTS' using errcode='P0001';
  end if;
  insert into public.webhook_endpoints(workspace_id,name,destination_url,secret,event_types)
    values(p_workspace_id,trim(p_name),v_url,p_secret,v_events) returning id into v_id;
  insert into public.integration_connections(workspace_id,provider,status,display_name,connected_at,updated_at)
    values(p_workspace_id,'webhooks','connected','Outgoing webhooks',now(),now())
    on conflict (workspace_id,provider) do update set status='connected',last_error=null,connected_at=coalesce(integration_connections.connected_at,now()),updated_at=now();
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'webhook.endpoint_created','webhook_endpoint',v_id,jsonb_build_object('event_types',v_events));
  return v_id;
end; $$;

create or replace function public.create_webhook_endpoint(
  p_workspace_id uuid, p_name text, p_destination_url text, p_secret text, p_event_types text[]
) returns uuid language sql security invoker set search_path='' as $$ select app_private.create_webhook_endpoint($1,$2,$3,$4,$5) $$;
revoke all on function app_private.create_webhook_endpoint(uuid,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.create_webhook_endpoint(uuid,text,text,text,text[]) to authenticated;

create or replace function app_private.update_webhook_endpoint(
  p_workspace_id uuid, p_endpoint_id uuid, p_name text, p_destination_url text, p_event_types text[], p_enabled boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_url text := trim(p_destination_url); v_events text[];
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if v_url !~ '^https://[^[:space:]]+$' and v_url !~ '^http://localhost(:[0-9]+)?(/[^[:space:]]*)?$' then raise exception 'INVALID_URL' using errcode='P0001'; end if;
  v_events := array(select distinct trim(value) from unnest(coalesce(p_event_types,array[]::text[])) value where trim(value) <> '');
  if cardinality(v_events) < 1 or not (v_events <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]) then raise exception 'INVALID_EVENTS' using errcode='P0001'; end if;
  update public.webhook_endpoints set name=trim(p_name),destination_url=v_url,event_types=v_events,enabled=coalesce(p_enabled,true),status=case when coalesce(p_enabled,true) then 'connected' else 'disconnected' end,last_error=null,updated_at=now()
    where id=p_endpoint_id and workspace_id=p_workspace_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.integration_connections set status=case when exists(select 1 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled) then 'connected' else 'disconnected' end,last_error=null,updated_at=now() where workspace_id=p_workspace_id and provider='webhooks';
end; $$;
create or replace function public.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) returns void language sql security invoker set search_path='' as $$ select app_private.update_webhook_endpoint($1,$2,$3,$4,$5,$6) $$;
revoke all on function app_private.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) from public,anon,authenticated;
grant execute on function public.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) to authenticated;

create or replace function app_private.delete_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  delete from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.integration_connections set status=case when exists(select 1 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled) then 'connected' else 'disconnected' end,last_error=null,updated_at=now() where workspace_id=p_workspace_id and provider='webhooks';
end; $$;
create or replace function public.delete_webhook_endpoint(uuid,uuid) returns void language sql security invoker set search_path='' as $$ select app_private.delete_webhook_endpoint($1,$2) $$;
revoke all on function app_private.delete_webhook_endpoint(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_webhook_endpoint(uuid,uuid) to authenticated;

create or replace function app_private.enqueue_webhook_event_internal(p_workspace_id uuid,p_event_id text,p_event_type text,p_payload jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer := 0; v_endpoint public.webhook_endpoints%rowtype;
begin
  if p_event_type not in ('conversation.created','message.created','ticket.created','conversation.escalated','webhook.test') then return 0; end if;
  for v_endpoint in select * from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and p_event_type=any(event_types) loop
    insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload) values(p_workspace_id,v_endpoint.id,left(p_event_id,180),p_event_type,coalesce(p_payload,'{}'::jsonb)) on conflict (endpoint_id,event_id) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end; $$;
revoke all on function app_private.enqueue_webhook_event_internal(uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function public.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_endpoint public.webhook_endpoints%rowtype;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_endpoint from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and enabled;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload) values(p_workspace_id,p_endpoint_id,'test:'||gen_random_uuid()::text,'webhook.test',jsonb_build_object('type','webhook.test','workspace_id',p_workspace_id,'sent_at',now())) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.enqueue_webhook_test(uuid,uuid) from public,anon;
grant execute on function public.enqueue_webhook_test(uuid,uuid) to authenticated;

create or replace function public.claim_webhook_delivery() returns table(id uuid,workspace_id uuid,endpoint_id uuid,destination_url text,secret text,event_id text,event_type text,payload jsonb,attempt integer,lease_token uuid) language plpgsql security definer set search_path='' as $$
declare v_delivery public.webhook_deliveries%rowtype; v_endpoint public.webhook_endpoints%rowtype; v_token uuid := gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.webhook_deliveries set status='queued',lease_token=null,lease_expires_at=null where status='processing' and lease_expires_at<now();
  select * into v_delivery from public.webhook_deliveries where status='queued' and next_attempt_at<=now() order by next_attempt_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  select * into v_endpoint from public.webhook_endpoints where id=v_delivery.endpoint_id and enabled;
  if not found then update public.webhook_deliveries set status='failed',last_error='Endpoint disabled or missing',completed_at=now() where id=v_delivery.id; return; end if;
  update public.webhook_deliveries set status='processing',attempt=attempt+1,lease_token=v_token,lease_expires_at=now()+interval '2 minutes' where id=v_delivery.id;
  return query select v_delivery.id,v_delivery.workspace_id,v_delivery.endpoint_id,v_endpoint.destination_url,v_endpoint.secret,v_delivery.event_id,v_delivery.event_type,v_delivery.payload,v_delivery.attempt+1,v_token;
end; $$;
revoke all on function public.claim_webhook_delivery() from public,anon,authenticated;
grant execute on function public.claim_webhook_delivery() to service_role;

create or replace function public.finish_webhook_delivery(p_delivery_id uuid,p_lease_token uuid,p_success boolean,p_response_code integer,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare v_delivery public.webhook_deliveries%rowtype; v_retry boolean; v_next timestamptz;
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_delivery from public.webhook_deliveries where id=p_delivery_id and status='processing' and lease_token=p_lease_token for update;
  if not found then return; end if;
  if p_success then
    update public.webhook_deliveries set status='succeeded',response_code=p_response_code,last_error=null,lease_token=null,lease_expires_at=null,delivered_at=now() where id=p_delivery_id;
    update public.webhook_endpoints set status='connected',last_error=null,last_success_at=now(),updated_at=now() where id=v_delivery.endpoint_id;
    update public.integration_connections set status='connected',last_error=null,updated_at=now() where workspace_id=v_delivery.workspace_id and provider='webhooks';
  else
    v_retry := v_delivery.attempt < v_delivery.max_attempts;
    v_next := now()+make_interval(secs=>(15*power(2,greatest(v_delivery.attempt-1,0)))::integer);
    update public.webhook_deliveries set status=case when v_retry then 'queued' else 'failed' end,response_code=p_response_code,last_error=left(coalesce(p_error,'Delivery failed'),240),next_attempt_at=v_next,lease_token=null,lease_expires_at=null,delivered_at=case when v_retry then null else now() end where id=p_delivery_id;
    if not v_retry then
      update public.webhook_endpoints set status='error',last_error='Delivery failed after retry limit',updated_at=now() where id=v_delivery.endpoint_id;
      update public.integration_connections set status='error',last_error='A webhook endpoint reached its retry limit',updated_at=now() where workspace_id=v_delivery.workspace_id and provider='webhooks';
    end if;
  end if;
end; $$;
revoke all on function public.finish_webhook_delivery(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.finish_webhook_delivery(uuid,uuid,boolean,integer,text) to service_role;

-- Support events enqueue safe metadata only; message bodies and customer PII never enter webhook payloads.
create or replace function app_private.automation_event_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare v_type text; v_entity uuid; v_payload jsonb; v_key text; v_automation_type text; v_automation_entity uuid; v_automation_payload jsonb; v_automation_key text;
begin
  v_entity:=new.id; v_payload:=jsonb_build_object('id',new.id); v_key:=new.id::text; v_automation_entity:=new.id; v_automation_payload:=v_payload; v_automation_key:=v_key;
  if tg_table_name='conversations' and tg_op='INSERT' then
    v_type:='conversation.created'; v_payload:=jsonb_build_object('id',new.id,'status',new.status,'priority',new.priority,'channel',new.channel); v_key:='conversation.created:'||new.id::text;
    v_automation_type:='conversation_created'; v_automation_payload:=v_payload; v_automation_key:=v_key;
  elsif tg_table_name='messages' and tg_op='INSERT' and new.sender_type='customer' then
    v_type:='message.created'; v_entity:=new.conversation_id; v_payload:=jsonb_build_object('id',new.id,'conversation_id',new.conversation_id,'sender_type','customer'); v_key:='message.created:'||new.id::text;
    v_automation_type:='customer_message_received'; v_automation_entity:=new.conversation_id; v_automation_payload:=jsonb_build_object('id',new.conversation_id,'message_id',new.id,'priority',(select priority from public.conversations where id=new.conversation_id),'status',(select status from public.conversations where id=new.conversation_id),'channel',(select channel from public.conversations where id=new.conversation_id)); v_automation_key:='message:'||new.id::text;
  elsif tg_table_name='tickets' and tg_op='INSERT' then
    v_type:='ticket.created'; v_payload:=jsonb_build_object('id',new.id,'status',new.status,'priority',new.priority); v_key:='ticket.created:'||new.id::text;
    v_automation_type:='ticket_created'; v_automation_payload:=v_payload; v_automation_key:='ticket:'||new.id::text;
  elsif tg_table_name='conversations' and tg_op='UPDATE' and new.priority is distinct from old.priority then
    v_automation_type:='priority_changed'; v_automation_payload:=jsonb_build_object('id',new.id,'priority',new.priority,'previous_priority',old.priority); v_automation_key:='priority:'||new.id::text||':'||new.updated_at::text;
  elsif tg_table_name='conversations' and tg_op='UPDATE' and old.ai_handoff_at is null and new.ai_handoff_at is not null then
    v_type:='conversation.escalated'; v_payload:=jsonb_build_object('id',new.id,'reason',new.ai_handoff_reason); v_key:='conversation.escalated:'||new.id::text||':'||new.ai_handoff_at::text;
    v_automation_type:='escalation'; v_automation_payload:=v_payload; v_automation_key:='escalation:'||new.id::text||':'||new.ai_handoff_at::text;
  end if;
  if v_type is not null then perform app_private.enqueue_webhook_event_internal(new.workspace_id,v_key,v_type,v_payload); end if;
  if v_automation_type is not null and coalesce(current_setting('app.automation_executing',true),'')<>'on' then perform app_private.enqueue_automation_event(new.workspace_id,v_automation_type,v_automation_entity,v_automation_payload,v_automation_key); end if;
  return new;
end; $$;

select vault.create_secret(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),'webhook_worker_token','Internal P10 webhook worker authorization');
create or replace function public.webhook_worker_authorized(p_token text) returns boolean language sql stable security definer set search_path='' as $$ select (auth.jwt()->>'role'='service_role') and exists(select 1 from vault.decrypted_secrets where name='webhook_worker_token' and decrypted_secret=p_token and char_length(p_token)=64); $$;
revoke all on function public.webhook_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.webhook_worker_authorized(text) to service_role;
select cron.schedule('supportsphere-webhook-worker','* * * * *',$$ select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_url') || '/functions/v1/webhook-worker',headers:=jsonb_build_object('Content-Type','application/json','X-Worker-Token',(select decrypted_secret from vault.decrypted_secrets where name='webhook_worker_token')),body:='{}'::jsonb,timeout_milliseconds:=10000) where exists(select 1 from vault.decrypted_secrets where name='knowledge_worker_url'); $$);
