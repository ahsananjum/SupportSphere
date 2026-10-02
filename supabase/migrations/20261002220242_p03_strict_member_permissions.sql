-- P03 role parity: agent/viewer routes cannot mutate workspace membership.
create or replace function app_private.remove_member(p_workspace_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_actor_role text; v_old_role text; v_next_owner uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text,0));
  select role into v_actor_role from public.workspace_members where workspace_id=p_workspace_id and user_id=v_actor;
  select role into v_old_role from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id for update;
  if v_old_role is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if coalesce(v_actor_role,'') not in ('owner','admin') or
     (v_actor_role='admin' and v_old_role in ('owner','admin')) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_old_role='owner' then
    select user_id into v_next_owner from public.workspace_members
      where workspace_id=p_workspace_id and role='owner' and user_id<>p_user_id limit 1;
    if v_next_owner is null then raise exception 'LAST_OWNER' using errcode='P0001'; end if;
    update public.workspaces set owner_user_id=v_next_owner,updated_at=now()
      where id=p_workspace_id and owner_user_id=p_user_id;
  end if;
  delete from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'member.removed','member',p_user_id,pg_catalog.jsonb_build_object('role',v_old_role));
end;
$$;

create or replace function app_private.mark_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_workspace_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select workspace_id into v_workspace_id from public.notifications where id=p_id and user_id=v_actor for update;
  if v_workspace_id is null or not app_private.is_workspace_member(v_workspace_id) then
    raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(v_workspace_id,array['owner','admin','agent']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.notifications set read_at=coalesce(read_at,now()) where id=p_id;
end;
$$;
