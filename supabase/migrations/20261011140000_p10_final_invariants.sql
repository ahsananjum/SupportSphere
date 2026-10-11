-- Final P10 invariants; all owner/admin writes stay in private role-checked functions.
alter table public.webhook_endpoints add constraint webhook_endpoint_workspace_unique unique(workspace_id,id);
alter table public.webhook_deliveries add constraint webhook_delivery_endpoint_workspace_fk foreign key(workspace_id,endpoint_id) references public.webhook_endpoints(workspace_id,id) on delete cascade;
create index webhook_delivery_workspace_endpoint_idx on public.webhook_deliveries(workspace_id,endpoint_id);
alter table public.webhook_endpoints alter column status set default 'pending';

create function app_private.valid_webhook_url(p_url text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(char_length(p_url) between 10 and 2048 and p_url ~ '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(/[^[:space:]?#\\]*)?$' and p_url !~ '\.(localhost|local|internal|invalid|test|example)(/|$)',false)
$$;
revoke all on function app_private.valid_webhook_url(text) from public,anon,authenticated;

create function app_private.sync_webhook_state(p_workspace_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
 select case when count(*)=0 then 'disconnected'
  when bool_or(status='error') then 'error'
  when bool_or(status='pending') then 'pending'
  else 'connected' end into v_status
 from public.webhook_endpoints where workspace_id=p_workspace_id and enabled and revoked_at is null;
 insert into public.integration_connections(workspace_id,provider,status,display_name,last_error,connected_at)
 values(p_workspace_id,'webhooks',v_status,'Outgoing webhooks',case when v_status='error' then 'A destination needs attention.' else null end,case when v_status='connected' then now() else null end)
 on conflict(workspace_id,provider) do update set status=excluded.status,last_error=excluded.last_error,connected_at=case when excluded.status='connected' then coalesce(integration_connections.connected_at,now()) else null end,updated_at=now();
end $$;
revoke all on function app_private.sync_webhook_state(uuid) from public,anon,authenticated;

create function app_private.webhook_secret_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from vault.secrets where id=old.secret_ref;
 return old;
end $$;
revoke all on function app_private.webhook_secret_cleanup() from public,anon,authenticated;
create trigger webhook_secret_cleanup before delete on public.webhook_endpoints for each row execute function app_private.webhook_secret_cleanup();

create or replace function app_private.create_webhook_endpoint(p_workspace_id uuid,p_name text,p_destination_url text,p_secret text,p_event_types text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_ref uuid; v_events text[];
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 1 and 120 or p_secret !~ '^[A-Za-z0-9_-]{43,86}$' or not app_private.valid_webhook_url(p_destination_url) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
 v_events:=array(select distinct value from unnest(p_event_types) value);
 if cardinality(v_events) not between 1 and 5 or not(v_events <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]) then raise exception 'INVALID_EVENTS' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,1010));
 if (select count(*) from public.webhook_endpoints where workspace_id=p_workspace_id and revoked_at is null)>=5 then raise exception 'ENDPOINT_LIMIT' using errcode='P0001'; end if;
 v_ref:=vault.create_secret(p_secret,'webhook_endpoint:'||v_id::text,'SupportSphere signing secret');
 insert into public.webhook_endpoints(id,workspace_id,name,destination_url,secret_ref,event_types,status) values(v_id,p_workspace_id,trim(p_name),p_destination_url,v_ref,v_events,'pending');
 perform app_private.sync_webhook_state(p_workspace_id);
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata) values(p_workspace_id,auth.uid(),'webhook.created','webhook_endpoint',v_id,jsonb_build_object('events',v_events));
 return v_id;
end $$;

create or replace function app_private.update_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid,p_name text,p_destination_url text,p_event_types text[],p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_events text[];
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 1 and 120 or not app_private.valid_webhook_url(p_destination_url) or p_enabled is null then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
 v_events:=array(select distinct value from unnest(p_event_types) value);
 if cardinality(v_events) not between 1 and 5 or not(v_events <@ array['conversation.created','message.created','ticket.created','conversation.escalated','webhook.test']::text[]) then raise exception 'INVALID_EVENTS' using errcode='P0001'; end if;
 update public.webhook_endpoints set name=trim(p_name),destination_url=p_destination_url,event_types=v_events,enabled=p_enabled,status=case when p_enabled then 'pending' else 'disconnected' end,last_success_at=null,last_error=null,updated_at=now() where id=p_endpoint_id and workspace_id=p_workspace_id and revoked_at is null;
 if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
 update public.webhook_deliveries set status='failed',canceled_at=now(),completed_at=now(),lease_token=null,lease_expires_at=null,last_error='CONFIG_CHANGED' where workspace_id=p_workspace_id and endpoint_id=p_endpoint_id and status in ('queued','processing');
 perform app_private.sync_webhook_state(p_workspace_id);
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata) values(p_workspace_id,auth.uid(),'webhook.updated','webhook_endpoint',p_endpoint_id,jsonb_build_object('enabled',p_enabled,'events',v_events));
end $$;

drop function public.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean);
create function public.update_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid,p_name text,p_destination_url text,p_event_types text[],p_enabled boolean) returns void language sql security invoker set search_path='' as $$ select app_private.update_webhook_endpoint($1,$2,$3,$4,$5,$6) $$;
revoke all on function public.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) from public,anon;
grant execute on function public.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) to authenticated;

create or replace function app_private.delete_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_ref uuid;
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 select secret_ref into v_ref from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and revoked_at is null for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
 update public.webhook_endpoints set enabled=false,status='disconnected',revoked_at=now(),updated_at=now(),last_error=null where workspace_id=p_workspace_id and id=p_endpoint_id;
 update public.webhook_deliveries set status='failed',canceled_at=now(),completed_at=now(),lease_token=null,lease_expires_at=null,last_error='ENDPOINT_REVOKED' where workspace_id=p_workspace_id and endpoint_id=p_endpoint_id and status in ('queued','processing');
 delete from vault.secrets where id=v_ref;
 perform app_private.sync_webhook_state(p_workspace_id);
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id) values(p_workspace_id,auth.uid(),'webhook.revoked','webhook_endpoint',p_endpoint_id);
end $$;
drop function public.delete_webhook_endpoint(uuid,uuid);
create function public.delete_webhook_endpoint(p_workspace_id uuid,p_endpoint_id uuid) returns void language sql security invoker set search_path='' as $$ select app_private.delete_webhook_endpoint($1,$2) $$;
revoke all on function public.delete_webhook_endpoint(uuid,uuid) from public,anon;
grant execute on function public.delete_webhook_endpoint(uuid,uuid) to authenticated;

create or replace function app_private.rotate_webhook_secret(p_workspace_id uuid,p_endpoint_id uuid,p_secret text) returns text language plpgsql security definer set search_path='' as $$
declare v_old uuid; v_new uuid;
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 if p_secret !~ '^[A-Za-z0-9_-]{43,86}$' then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
 select secret_ref into v_old from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and revoked_at is null for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
 v_new:=vault.create_secret(p_secret,'webhook_endpoint:'||gen_random_uuid()::text,'SupportSphere signing secret');
 update public.webhook_endpoints set secret_ref=v_new,status=case when enabled then 'pending' else 'disconnected' end,last_error=null,last_success_at=null,updated_at=now() where id=p_endpoint_id and workspace_id=p_workspace_id;
 update public.webhook_deliveries set status='failed',canceled_at=now(),completed_at=now(),lease_token=null,lease_expires_at=null,last_error='SECRET_ROTATED' where workspace_id=p_workspace_id and endpoint_id=p_endpoint_id and status in ('queued','processing');
 delete from vault.secrets where id=v_old;
 perform app_private.sync_webhook_state(p_workspace_id);
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id) values(p_workspace_id,auth.uid(),'webhook.secret_rotated','webhook_endpoint',p_endpoint_id);
 return p_secret;
end $$;

create or replace function app_private.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,1011));
 if (select count(*) from public.audit_logs where workspace_id=p_workspace_id and action in ('webhook.test_queued','webhook.delivery_retried') and created_at>now()-interval '1 hour')>=10 then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
 if not exists(select 1 from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and enabled and revoked_at is null) then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
 insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload) values(p_workspace_id,p_endpoint_id,'test:'||gen_random_uuid()::text,'webhook.test',jsonb_build_object('workspace_id',p_workspace_id,'test',true)) returning id into v_id;
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id) values(p_workspace_id,auth.uid(),'webhook.test_queued','webhook_delivery',v_id);
 return v_id;
end $$;
create or replace function public.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language sql security invoker set search_path='' as $$ select app_private.enqueue_webhook_test($1,$2) $$;

create function app_private.retry_webhook_delivery(p_workspace_id uuid,p_delivery_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_endpoint uuid;
begin
 if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,1011));
 if (select count(*) from public.audit_logs where workspace_id=p_workspace_id and action in ('webhook.test_queued','webhook.delivery_retried') and created_at>now()-interval '1 hour')>=10 then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
 select d.endpoint_id into v_endpoint from public.webhook_deliveries d join public.webhook_endpoints e on e.id=d.endpoint_id and e.workspace_id=d.workspace_id where d.id=p_delivery_id and d.workspace_id=p_workspace_id and d.status='failed' and d.canceled_at is null and e.enabled and e.revoked_at is null for update of d;
 if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
 update public.webhook_deliveries set status='queued',attempts=0,next_attempt_at=now(),last_error=null,completed_at=null,response_code=null,delivered_at=null,lease_token=null,lease_expires_at=null where id=p_delivery_id and workspace_id=p_workspace_id;
 update public.webhook_endpoints set status='pending',last_error=null where id=v_endpoint and workspace_id=p_workspace_id;
 perform app_private.sync_webhook_state(p_workspace_id);
 insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id) values(p_workspace_id,auth.uid(),'webhook.delivery_retried','webhook_delivery',p_delivery_id);
end $$;
create function public.retry_webhook_delivery(p_workspace_id uuid,p_delivery_id uuid) returns void language sql security invoker set search_path='' as $$ select app_private.retry_webhook_delivery($1,$2) $$;
revoke all on function app_private.retry_webhook_delivery(uuid,uuid),public.retry_webhook_delivery(uuid,uuid) from public,anon;
grant execute on function app_private.retry_webhook_delivery(uuid,uuid),public.retry_webhook_delivery(uuid,uuid) to authenticated;

-- Claim contains an immutable envelope timestamp and a secret only for the authorized worker.
drop function public.claim_webhook_delivery();
create function public.claim_webhook_delivery() returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.webhook_deliveries%rowtype; e public.webhook_endpoints%rowtype; t uuid:=gen_random_uuid(); s text; v_workspace uuid;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 -- Crashed final attempts must terminate, never attempt #6.
 for d in update public.webhook_deliveries set status='failed',last_error='LEASE_EXHAUSTED',completed_at=now(),lease_token=null,lease_expires_at=null where status='processing' and lease_expires_at<now() and attempts>=max_attempts returning * loop
  update public.webhook_endpoints set status='error',last_error='LEASE_EXHAUSTED' where id=d.endpoint_id and workspace_id=d.workspace_id and enabled and revoked_at is null;
  perform app_private.sync_webhook_state(d.workspace_id);
 end loop;
 update public.webhook_deliveries set status='queued',lease_token=null,lease_expires_at=null where status='processing' and lease_expires_at<now() and attempts<max_attempts;
 select wd.* into d from public.webhook_deliveries wd where wd.status='queued' and wd.attempts<wd.max_attempts and wd.next_attempt_at<=now() order by wd.next_attempt_at,wd.created_at for update skip locked limit 1;
 if not found then return null; end if;
 select we.* into e from public.webhook_endpoints we where we.id=d.endpoint_id and we.workspace_id=d.workspace_id and we.enabled and we.revoked_at is null;
 if not found then
  update public.webhook_deliveries set status='failed',canceled_at=now(),completed_at=now(),last_error='ENDPOINT_DISABLED' where id=d.id;
  return null;
 end if;
 select ds.decrypted_secret into s from vault.decrypted_secrets ds where ds.id=e.secret_ref;
 if s is null then
  update public.webhook_deliveries set status='failed',completed_at=now(),last_error='SECRET_UNAVAILABLE' where id=d.id;
  update public.webhook_endpoints set status='error',last_error='SECRET_UNAVAILABLE' where id=e.id;
  perform app_private.sync_webhook_state(d.workspace_id);
  return null;
 end if;
 update public.webhook_deliveries set status='processing',attempts=attempts+1,lease_token=t,lease_expires_at=now()+interval '2 minutes' where id=d.id;
 return jsonb_build_object('id',d.id,'workspace_id',d.workspace_id,'endpoint_id',d.endpoint_id,'destination_url',e.destination_url,'secret',s,'event_id',d.event_id,'event_type',d.event_type,'payload',d.payload,'created_at',d.created_at,'attempt',d.attempts+1,'lease_token',t);
end $$;
revoke all on function public.claim_webhook_delivery() from public,anon,authenticated;
grant execute on function public.claim_webhook_delivery() to service_role;

create function public.webhook_delivery_active(p_delivery_id uuid,p_lease_token uuid) returns boolean language sql security definer set search_path='' as $$
 select (auth.jwt()->>'role'='service_role') and exists(select 1 from public.webhook_deliveries d join public.webhook_endpoints e on e.id=d.endpoint_id and e.workspace_id=d.workspace_id where d.id=p_delivery_id and d.lease_token=p_lease_token and d.lease_expires_at>now() and d.status='processing' and e.enabled and e.revoked_at is null)
$$;
revoke all on function public.webhook_delivery_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.webhook_delivery_active(uuid,uuid) to service_role;

create or replace function public.finish_webhook_delivery(p_delivery_id uuid,p_lease_token uuid,p_success boolean,p_response_code integer,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare d public.webhook_deliveries%rowtype; retry boolean; code text;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
 select wd.* into d from public.webhook_deliveries wd where wd.id=p_delivery_id and wd.status='processing' and wd.lease_token=p_lease_token and wd.lease_expires_at>now() for update;
 if not found then return; end if;
 if p_success and p_response_code between 200 and 299 then
  update public.webhook_deliveries set status='succeeded',response_code=p_response_code,last_error=null,lease_token=null,lease_expires_at=null,delivered_at=now(),completed_at=now() where id=d.id;
  update public.webhook_endpoints set status='connected',last_error=null,last_success_at=now(),updated_at=now() where id=d.endpoint_id and enabled and revoked_at is null;
 else
  code:=case when p_response_code between 100 and 599 then 'HTTP_'||p_response_code::text when p_error in ('TIMEOUT','NETWORK_ERROR','DNS_UNAVAILABLE','DESTINATION_BLOCKED','LEASE_EXHAUSTED') then p_error else 'DELIVERY_FAILED' end;
  retry:=d.attempts<d.max_attempts and (p_response_code in (408,425,429) or p_response_code>=500 or (p_response_code is null and code in ('TIMEOUT','NETWORK_ERROR','DNS_UNAVAILABLE')));
  update public.webhook_deliveries set status=case when retry then 'queued' else 'failed' end,response_code=case when p_response_code between 100 and 599 then p_response_code else null end,last_error=code,next_attempt_at=now()+make_interval(secs=>(15*power(2,d.attempts-1))::integer),lease_token=null,lease_expires_at=null,completed_at=case when retry then null else now() end where id=d.id;
  if not retry then update public.webhook_endpoints set status='error',last_error=code,updated_at=now() where id=d.endpoint_id and enabled and revoked_at is null; end if;
 end if;
 perform app_private.sync_webhook_state(d.workspace_id);
end $$;

-- Keep every public wrapper permission explicit.
revoke all on function public.create_webhook_endpoint(uuid,text,text,text,text[]),public.enqueue_webhook_test(uuid,uuid),public.rotate_webhook_secret(uuid,uuid,text) from public,anon;
grant execute on function public.create_webhook_endpoint(uuid,text,text,text,text[]),public.enqueue_webhook_test(uuid,uuid),public.rotate_webhook_secret(uuid,uuid,text) to authenticated;

-- Restore P08 trigger verbatim. Webhook events have their own trigger and stable keys.
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
create function app_private.webhook_event_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='conversations' then
  if tg_op='INSERT' then
   perform app_private.enqueue_webhook_event_internal(new.workspace_id,'conversation:'||new.id::text,'conversation.created',jsonb_build_object('id',new.id,'workspace_id',new.workspace_id,'status',new.status,'priority',new.priority,'channel',new.channel));
  elsif old.ai_handoff_at is null and new.ai_handoff_at is not null then
   perform app_private.enqueue_webhook_event_internal(new.workspace_id,'escalation:'||new.id::text||':'||new.ai_handoff_at::text,'conversation.escalated',jsonb_build_object('id',new.id,'workspace_id',new.workspace_id,'reason',new.ai_handoff_reason));
  end if;
 elsif tg_table_name='messages' and new.sender_type='customer' and not new.is_internal then
  perform app_private.enqueue_webhook_event_internal(new.workspace_id,'message:'||new.id::text,'message.created',jsonb_build_object('id',new.id,'workspace_id',new.workspace_id,'conversation_id',new.conversation_id,'sender_type','customer'));
 elsif tg_table_name='tickets' then
  perform app_private.enqueue_webhook_event_internal(new.workspace_id,'ticket:'||new.id::text,'ticket.created',jsonb_build_object('id',new.id,'workspace_id',new.workspace_id,'status',new.status,'priority',new.priority));
 end if;
 return new;
end $$;
revoke all on function app_private.webhook_event_trigger() from public,anon,authenticated;
create trigger webhook_conversation_events after insert or update of ai_handoff_at on public.conversations for each row execute function app_private.webhook_event_trigger();
create trigger webhook_message_events after insert on public.messages for each row execute function app_private.webhook_event_trigger();
create trigger webhook_ticket_events after insert on public.tickets for each row execute function app_private.webhook_event_trigger();

-- The existing P08 Node adapter must call real, named, service-only wrappers.
create function public.enqueue_automation_event(p_workspace_id uuid,p_trigger_type text,p_entity_id uuid,p_payload jsonb,p_event_key text) returns integer language sql security invoker set search_path='' as $$ select app_private.enqueue_automation_event($1,$2,$3,$4,$5) $$;
create function public.apply_automation_action(p_workspace_id uuid,p_entity_type text,p_entity_id uuid,p_action_type text,p_params jsonb) returns void language sql security invoker set search_path='' as $$ select app_private.apply_automation_action($1,$2,$3,$4,$5) $$;
revoke all on function public.enqueue_automation_event(uuid,text,uuid,jsonb,text),public.apply_automation_action(uuid,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_automation_event(uuid,text,uuid,jsonb,text),public.apply_automation_action(uuid,text,uuid,text,jsonb),app_private.apply_automation_action(uuid,text,uuid,text,jsonb) to service_role;

