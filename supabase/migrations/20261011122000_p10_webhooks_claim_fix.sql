create or replace function public.claim_webhook_delivery() returns table(id uuid,workspace_id uuid,endpoint_id uuid,destination_url text,secret text,event_id text,event_type text,payload jsonb,attempt integer,lease_token uuid) language plpgsql security definer set search_path='' as $$
declare v_delivery public.webhook_deliveries%rowtype; v_endpoint public.webhook_endpoints%rowtype; v_token uuid := gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.webhook_deliveries wd set status='queued',lease_token=null,lease_expires_at=null where wd.status='processing' and wd.lease_expires_at<now();
  select wd.* into v_delivery from public.webhook_deliveries wd where wd.status='queued' and wd.next_attempt_at<=now() order by wd.next_attempt_at,wd.created_at for update skip locked limit 1;
  if not found then return; end if;
  select we.* into v_endpoint from public.webhook_endpoints we where we.id=v_delivery.endpoint_id and we.enabled;
  if not found then update public.webhook_deliveries wd set status='failed',last_error='Endpoint disabled or missing',completed_at=now() where wd.id=v_delivery.id; return; end if;
  update public.webhook_deliveries wd set status='processing',attempts=wd.attempts+1,lease_token=v_token,lease_expires_at=now()+interval '2 minutes' where wd.id=v_delivery.id;
  return query select v_delivery.id,v_delivery.workspace_id,v_delivery.endpoint_id,v_endpoint.destination_url,v_endpoint.secret,v_delivery.event_id,v_delivery.event_type,v_delivery.payload,v_delivery.attempts+1,v_token;
end; $$;
revoke all on function public.claim_webhook_delivery() from public,anon,authenticated;
grant execute on function public.claim_webhook_delivery() to service_role;
