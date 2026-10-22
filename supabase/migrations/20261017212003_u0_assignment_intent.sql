-- Keep legacy RPC signatures for existing callers. Routing intent is resolved
-- under the row lock, never from a hidden/stale browser-supplied owner.
create function app_private.update_conversation_routing(
  p_workspace_id uuid, p_conversation_id uuid,
  p_status text default null, p_priority text default null,
  p_assignment text default 'keep'
) returns void language plpgsql security definer set search_path = '' as $$
declare v_assignee uuid;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_assignment is null or p_assignment not in ('keep','me','unassigned') then
    raise exception 'INVALID_INPUT' using errcode='P0001';
  end if;
  select assignee_user_id into v_assignee from public.conversations
    where workspace_id=p_workspace_id and id=p_conversation_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if p_assignment='me' then v_assignee:=auth.uid();
  elsif p_assignment='unassigned' then v_assignee:=null; end if;
  perform app_private.update_conversation(p_workspace_id,p_conversation_id,p_status,p_priority,v_assignee);
end; $$;

create function app_private.update_ticket_routing(
  p_workspace_id uuid, p_ticket_id uuid,
  p_status text default null, p_priority text default null,
  p_assignment text default 'keep'
) returns void language plpgsql security definer set search_path = '' as $$
declare v_assignee uuid;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_assignment is null or p_assignment not in ('keep','me','unassigned') then
    raise exception 'INVALID_INPUT' using errcode='P0001';
  end if;
  select assignee_user_id into v_assignee from public.tickets
    where workspace_id=p_workspace_id and id=p_ticket_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if p_assignment='me' then v_assignee:=auth.uid();
  elsif p_assignment='unassigned' then v_assignee:=null; end if;
  perform app_private.update_ticket(p_workspace_id,p_ticket_id,p_status,p_priority,null,v_assignee,null,null);
end; $$;

create function public.update_conversation_routing(p_workspace_id uuid,p_conversation_id uuid,p_status text default null,p_priority text default null,p_assignment text default 'keep')
returns void language sql security invoker set search_path='' as $$ select app_private.update_conversation_routing($1,$2,$3,$4,$5) $$;
create function public.update_ticket_routing(p_workspace_id uuid,p_ticket_id uuid,p_status text default null,p_priority text default null,p_assignment text default 'keep')
returns void language sql security invoker set search_path='' as $$ select app_private.update_ticket_routing($1,$2,$3,$4,$5) $$;
revoke all on function app_private.update_conversation_routing(uuid,uuid,text,text,text),app_private.update_ticket_routing(uuid,uuid,text,text,text),public.update_conversation_routing(uuid,uuid,text,text,text),public.update_ticket_routing(uuid,uuid,text,text,text) from public,anon;
grant execute on function app_private.update_conversation_routing(uuid,uuid,text,text,text),app_private.update_ticket_routing(uuid,uuid,text,text,text),public.update_conversation_routing(uuid,uuid,text,text,text),public.update_ticket_routing(uuid,uuid,text,text,text) to authenticated;
