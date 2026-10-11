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
revoke all on function public.finish_webhook_delivery(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.finish_webhook_delivery(uuid,uuid,boolean,integer,text) to service_role;
