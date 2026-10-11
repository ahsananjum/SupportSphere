-- Keep the role-checked mutation body outside the exposed schema.
create or replace function app_private.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_endpoint public.webhook_endpoints%rowtype;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_endpoint from public.webhook_endpoints where id=p_endpoint_id and workspace_id=p_workspace_id and enabled;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.webhook_deliveries(workspace_id,endpoint_id,event_id,event_type,payload)
    values(p_workspace_id,p_endpoint_id,'test:'||gen_random_uuid()::text,'webhook.test',jsonb_build_object('type','webhook.test','workspace_id',p_workspace_id,'sent_at',now())) returning id into v_id;
  return v_id;
end; $$;
revoke all on function app_private.enqueue_webhook_test(uuid,uuid) from public,anon,authenticated;
create or replace function public.enqueue_webhook_test(p_workspace_id uuid,p_endpoint_id uuid) returns uuid language sql security invoker set search_path='' as $$ select app_private.enqueue_webhook_test($1,$2) $$;
revoke all on function public.enqueue_webhook_test(uuid,uuid) from public,anon;
grant execute on function public.enqueue_webhook_test(uuid,uuid) to authenticated;
