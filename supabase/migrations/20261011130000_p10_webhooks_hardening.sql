-- P10 hardening: Vault-backed endpoint secrets, pending evidence state, revocation, and cancellation.
alter table public.integration_connections drop constraint if exists integration_connections_status_check;
alter table public.integration_connections add constraint integration_connections_status_check check (status in ('connected','pending','disconnected','error'));
alter table public.webhook_endpoints drop constraint if exists webhook_endpoints_status_check;
alter table public.webhook_endpoints add constraint webhook_endpoints_status_check check (status in ('connected','pending','disconnected','error'));
alter table public.webhook_endpoints add column if not exists secret_ref uuid;
alter table public.webhook_endpoints add column if not exists revoked_at timestamptz;
alter table public.webhook_deliveries add column if not exists canceled_at timestamptz;

do $$
declare v_endpoint record; v_secret_ref uuid;
begin
  for v_endpoint in select id, secret from public.webhook_endpoints where secret_ref is null loop
    v_secret_ref := vault.create_secret(v_endpoint.secret, 'webhook_endpoint:' || v_endpoint.id::text, 'SupportSphere outgoing webhook signing secret');
    update public.webhook_endpoints set secret_ref=v_secret_ref where id=v_endpoint.id;
  end loop;
end $$;
alter table public.webhook_endpoints drop column if exists secret;
alter table public.webhook_endpoints alter column secret_ref set not null;

create or replace function app_private.create_webhook_endpoint(
  p_workspace_id uuid, p_name text, p_destination_url text, p_secret text, p_event_types text[]
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_secret_ref uuid; v_url text := trim(p_destination_url); v_events text[];
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 120 or char_length(coalesce(p_secret,'')) not between 32 and 256 then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if v_url !~ '^https://[^[:space:]]+$' and v_url !~ '^http://localhost(:[0-9]+)?(/[^[:space:]]*)?$' then raise exception 'INVALID_URL' using errcode='P0001'; end if;
  v_events := array(select distinct trim(value) from unnest(coalesce(p_event_types,array[]::text[])) value where trim(value) <> '');
  if cardinality(v_events) < 1 or not (v_events <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]) then raise exception 'INVALID_EVENTS' using errcode='P0001'; end if;
  v_secret_ref := vault.create_secret(p_secret, 'webhook_endpoint:' || gen_random_uuid()::text, 'SupportSphere outgoing webhook signing secret');
  insert into public.webhook_endpoints(workspace_id,name,destination_url,secret_ref,event_types,status)
    values(p_workspace_id,trim(p_name),v_url,v_secret_ref,v_events,'pending') returning id into v_id;
  insert into public.integration_connections(workspace_id,provider,status,display_name,connected_at,updated_at)
    values(p_workspace_id,'webhooks','pending','Outgoing webhooks',null,now())
    on conflict (workspace_id,provider) do update set status='pending',last_error=null,updated_at=now();
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'webhook.endpoint_created','webhook_endpoint',v_id,jsonb_build_object('event_types',v_events));
  return v_id;
end; $$;

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
  update public.webhook_endpoints set name=trim(p_name),destination_url=v_url,event_types=v_events,enabled=coalesce(p_enabled,true),status=case when coalesce(p_enabled,true) then 'pending' else 'disconnected' end,last_error=null,revoked_at=case when coalesce(p_enabled,true) then null else revoked_at end,updated_at=now()
    where id=p_endpoint_id and workspace_id=p_workspace_id and revoked_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.webhook_deliveries set status='failed',last_error='Delivery canceled because endpoint configuration changed',canceled_at=now(),completed_at=now()
    where endpoint_id=p_endpoint_id and status in ('queued','processing');
  update public.integration_connections set status=case when exists(select 1 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and revoked_at is null) then 'pending' else 'disconnected' end,last_error=null,updated_at=now() where workspace_id=p_workspace_id and provider='webhooks';
end; $$;

create or replace function app_private.delete_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_secret_ref uuid;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select secret_ref into v_secret_ref from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id for update;
  if v_secret_ref is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.webhook_deliveries set status='failed',last_error='Endpoint revoked',canceled_at=now(),completed_at=now() where endpoint_id=p_endpoint_id and status in ('queued','processing');
  update public.webhook_endpoints set enabled=false,revoked_at=now(),status='disconnected',updated_at=now() where id=p_endpoint_id and workspace_id=p_workspace_id;
  delete from vault.secrets where id=v_secret_ref;
  update public.integration_connections set status=case when exists(select 1 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and revoked_at is null) then 'pending' else 'disconnected' end,last_error=null,updated_at=now() where workspace_id=p_workspace_id and provider='webhooks';
end; $$;

create or replace function app_private.rotate_webhook_secret(p_workspace_id uuid,p_endpoint_id uuid,p_secret text) returns text language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_old_ref uuid; v_new_ref uuid;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if char_length(coalesce(p_secret,'')) not between 32 and 256 then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select secret_ref into v_old_ref from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and revoked_at is null for update;
  if v_old_ref is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  v_new_ref := vault.create_secret(p_secret, 'webhook_endpoint:' || gen_random_uuid()::text, 'SupportSphere outgoing webhook signing secret');
  update public.webhook_endpoints set secret_ref=v_new_ref,status=case when enabled then 'pending' else 'disconnected' end,last_error=null,updated_at=now() where id=p_endpoint_id and workspace_id=p_workspace_id;
  update public.webhook_deliveries set status='failed',last_error='Delivery canceled because signing secret rotated',canceled_at=now(),completed_at=now() where endpoint_id=p_endpoint_id and status in ('queued','processing');
  delete from vault.secrets where id=v_old_ref;
  update public.integration_connections set status=case when exists(select 1 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and revoked_at is null) then 'pending' else 'disconnected' end,last_error=null,updated_at=now() where workspace_id=p_workspace_id and provider='webhooks';
  return p_secret;
end; $$;
revoke all on function app_private.rotate_webhook_secret(uuid,uuid,text) from public,anon,authenticated;
grant execute on function app_private.rotate_webhook_secret(uuid,uuid,text) to authenticated;
create or replace function public.rotate_webhook_secret(p_workspace_id uuid,p_endpoint_id uuid,p_secret text) returns text language sql security invoker set search_path='' as $$ select app_private.rotate_webhook_secret($1,$2,$3) $$;
revoke all on function public.rotate_webhook_secret(uuid,uuid,text) from public,anon;
grant execute on function public.rotate_webhook_secret(uuid,uuid,text) to authenticated;

create or replace function app_private.enqueue_webhook_event_internal(p_workspace_id uuid,p_event_id text,p_event_type text,p_payload jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer := 0; v_endpoint public.webhook_endpoints%rowtype;
begin
  if p_event_type not in ('conversation.created','message.created','ticket.created','conversation.escalated','webhook.test') then return 0; end if;
  for v_endpoint in select * from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and revoked_at is null and p_event_type=any(event_types) loop
    insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload) values(p_workspace_id,v_endpoint.id,left(p_event_id,180),p_event_type,coalesce(p_payload,'{}'::jsonb)) on conflict (endpoint_id,event_id) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end; $$;

create or replace function public.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_endpoint public.webhook_endpoints%rowtype;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_endpoint from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and enabled and revoked_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload) values(p_workspace_id,p_endpoint_id,'test:'||gen_random_uuid()::text,'webhook.test',jsonb_build_object('type','webhook.test','workspace_id',p_workspace_id,'sent_at',now())) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.claim_webhook_delivery() returns table(id uuid,workspace_id uuid,endpoint_id uuid,destination_url text,secret text,event_id text,event_type text,payload jsonb,attempt integer,lease_token uuid) language plpgsql security definer set search_path='' as $$
declare v_delivery public.webhook_deliveries%rowtype; v_endpoint public.webhook_endpoints%rowtype; v_secret text; v_token uuid := gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.webhook_deliveries wd set status='queued',lease_token=null,lease_expires_at=null where wd.status='processing' and wd.lease_expires_at<now();
  select wd.* into v_delivery from public.webhook_deliveries wd where wd.status='queued' and wd.next_attempt_at<=now() order by wd.next_attempt_at,wd.created_at for update skip locked limit 1;
  if not found then return; end if;
  select we.* into v_endpoint from public.webhook_endpoints we where we.id=v_delivery.endpoint_id and we.enabled and we.revoked_at is null;
  if not found then update public.webhook_deliveries wd set status='failed',last_error='Endpoint disabled or revoked',canceled_at=now(),completed_at=now() where wd.id=v_delivery.id; return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where id=v_endpoint.secret_ref;
  if v_secret is null then update public.webhook_deliveries wd set status='failed',last_error='Signing secret unavailable',canceled_at=now(),completed_at=now() where wd.id=v_delivery.id; return; end if;
  update public.webhook_deliveries wd set status='processing',attempts=wd.attempts+1,lease_token=v_token,lease_expires_at=now()+interval '2 minutes' where wd.id=v_delivery.id;
  return query select v_delivery.id,v_delivery.workspace_id,v_delivery.endpoint_id,v_endpoint.destination_url,v_secret,v_delivery.event_id,v_delivery.event_type,v_delivery.payload,v_delivery.attempts+1,v_token;
end; $$;

create or replace function public.finish_webhook_delivery(p_delivery_id uuid,p_lease_token uuid,p_success boolean,p_response_code integer,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare v_delivery public.webhook_deliveries%rowtype; v_retry boolean; v_next timestamptz;
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select wd.* into v_delivery from public.webhook_deliveries wd where wd.id=p_delivery_id and wd.status='processing' and wd.lease_token=p_lease_token for update;
  if not found then return; end if;
  if p_success then
    update public.webhook_deliveries wd set status='succeeded',response_code=p_response_code,last_error=null,lease_token=null,lease_expires_at=null,delivered_at=now(),completed_at=now() where wd.id=p_delivery_id;
    update public.webhook_endpoints we set status='connected',last_error=null,last_success_at=now(),updated_at=now() where we.id=v_delivery.endpoint_id;
    update public.integration_connections ic set status='connected',last_error=null,updated_at=now() where ic.workspace_id=v_delivery.workspace_id and ic.provider='webhooks';
  else
    v_retry := v_delivery.attempts < v_delivery.max_attempts;
    v_next := now()+make_interval(secs=>(15*power(2,greatest(v_delivery.attempts-1,0)))::integer);
    update public.webhook_deliveries wd set status=case when v_retry then 'queued' else 'failed' end,response_code=p_response_code,last_error=left(coalesce(p_error,'Delivery failed'),240),next_attempt_at=v_next,lease_token=null,lease_expires_at=null,delivered_at=case when v_retry then null else now() end,completed_at=case when v_retry then null else now() end where wd.id=p_delivery_id;
    if not v_retry then
      update public.webhook_endpoints we set status='error',last_error='Delivery failed after retry limit',updated_at=now() where we.id=v_delivery.endpoint_id;
      update public.integration_connections ic set status='error',last_error='A webhook endpoint reached its retry limit',updated_at=now() where ic.workspace_id=v_delivery.workspace_id and ic.provider='webhooks';
    end if;
  end if;
end; $$;
