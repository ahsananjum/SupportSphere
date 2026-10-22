-- U2: patch existing fields and assign only current eligible workspace teammates.
-- Public RPCs remain invoker wrappers; privileged code is private and role checked.
create function app_private.update_customer_fields(p_workspace_id uuid,p_customer_id uuid,p_changes jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_old public.customers%rowtype; v_new public.customers%rowtype;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or p_changes='{}'::jsonb or exists(select 1 from jsonb_each(p_changes) e where e.key not in ('name','email','phone','company') or jsonb_typeof(e.value)<>'string') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select * into v_old from public.customers where workspace_id=p_workspace_id and id=p_customer_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  v_new:=v_old;
  if p_changes ? 'name' then v_new.name:=trim(p_changes->>'name'); end if;
  if p_changes ? 'email' then v_new.email:=nullif(lower(trim(p_changes->>'email')),''); end if;
  if p_changes ? 'phone' then v_new.phone:=nullif(trim(p_changes->>'phone'),''); end if;
  if p_changes ? 'company' then v_new.company:=nullif(trim(p_changes->>'company'),''); end if;
  if (p_changes ? 'name' and char_length(v_new.name)>160) or (p_changes ? 'phone' and char_length(coalesce(v_new.phone,''))>60) or (p_changes ? 'company' and char_length(coalesce(v_new.company,''))>160) or (p_changes ? 'email' and v_new.email is not null and (char_length(v_new.email)>320 or v_new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  update public.customers set name=v_new.name,email=v_new.email,phone=v_new.phone,company=v_new.company,updated_at=now() where workspace_id=p_workspace_id and id=p_customer_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata) values(p_workspace_id,auth.uid(),'customer.updated','customer',p_customer_id,jsonb_build_object('fields',(select jsonb_agg(key) from jsonb_object_keys(p_changes) key)));
end; $$;

create function app_private.update_ticket_fields(p_workspace_id uuid,p_ticket_id uuid,p_changes jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_old public.tickets%rowtype; v_new public.tickets%rowtype;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or p_changes='{}'::jsonb or exists(select 1 from jsonb_each(p_changes) e where e.key not in ('title','description','category') or jsonb_typeof(e.value)<>'string') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select * into v_old from public.tickets where workspace_id=p_workspace_id and id=p_ticket_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  v_new:=v_old;
  if p_changes ? 'title' then v_new.title:=trim(p_changes->>'title'); end if;
  if p_changes ? 'description' then v_new.description:=trim(p_changes->>'description'); end if;
  if p_changes ? 'category' then v_new.category:=nullif(trim(p_changes->>'category'),''); end if;
  if (p_changes ? 'title' and char_length(v_new.title) not between 1 and 240) or (p_changes ? 'description' and char_length(v_new.description)>40000) or (p_changes ? 'category' and char_length(coalesce(v_new.category,''))>80) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  update public.tickets set title=v_new.title,description=v_new.description,category=v_new.category,updated_at=now() where workspace_id=p_workspace_id and id=p_ticket_id;
  insert into public.ticket_events(workspace_id,ticket_id,actor_user_id,event_type,payload) values(p_workspace_id,p_ticket_id,auth.uid(),'updated',jsonb_build_object('from_title',v_old.title,'to_title',v_new.title,'from_category',v_old.category,'to_category',v_new.category,'description_changed',v_old.description is distinct from v_new.description));
end; $$;

-- Validate every new assignment, including legacy RPC/rule callers. Lock membership
-- through the mutation so concurrent suspension/removal cannot race validation.
create function app_private.validate_support_assignee() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.assignee_user_id is not null and (tg_op='INSERT' or new.assignee_user_id is distinct from old.assignee_user_id) then
    perform 1 from public.workspace_members where workspace_id=new.workspace_id and user_id=new.assignee_user_id and status='active' and role in ('owner','admin','agent') for share;
    if not found then raise exception 'INVALID_ASSIGNEE' using errcode='P0001'; end if;
  end if;
  return new;
end; $$;
create trigger u2_conversation_assignee before insert or update of assignee_user_id on public.conversations for each row execute function app_private.validate_support_assignee();
create trigger u2_ticket_assignee before insert or update of assignee_user_id on public.tickets for each row execute function app_private.validate_support_assignee();

create function app_private.update_support_routing(p_workspace_id uuid,p_entity_type text,p_entity_id uuid,p_status text,p_priority text,p_assignment text,p_assignee_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_assignee uuid;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_assignment not in ('keep','me','unassigned','teammate') or p_assignment is null or p_entity_type not in ('conversation','ticket') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_entity_type='conversation' then
    select assignee_user_id into v_assignee from public.conversations where workspace_id=p_workspace_id and id=p_entity_id for update;
  else
    select assignee_user_id into v_assignee from public.tickets where workspace_id=p_workspace_id and id=p_entity_id for update;
  end if;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if p_assignment='me' then v_assignee:=auth.uid(); elsif p_assignment='unassigned' then v_assignee:=null; elsif p_assignment='teammate' then
    if p_assignee_id is null then raise exception 'INVALID_ASSIGNEE' using errcode='P0001'; end if;
    perform 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_assignee_id and status='active' and role in ('owner','admin','agent') for share;
    if not found then raise exception 'INVALID_ASSIGNEE' using errcode='P0001'; end if;
    v_assignee:=p_assignee_id;
  end if;
  if p_entity_type='conversation' then perform app_private.update_conversation(p_workspace_id,p_entity_id,p_status,p_priority,v_assignee);
  else perform app_private.update_ticket(p_workspace_id,p_entity_id,p_status,p_priority,null,v_assignee,null,null); end if;
end; $$;

create function public.update_customer_fields(p_workspace_id uuid,p_customer_id uuid,p_changes jsonb) returns void language sql security invoker set search_path='' as $$ select app_private.update_customer_fields($1,$2,$3) $$;
create function public.update_ticket_fields(p_workspace_id uuid,p_ticket_id uuid,p_changes jsonb) returns void language sql security invoker set search_path='' as $$ select app_private.update_ticket_fields($1,$2,$3) $$;
create function public.update_support_routing(p_workspace_id uuid,p_entity_type text,p_entity_id uuid,p_status text,p_priority text,p_assignment text,p_assignee_id uuid default null) returns void language sql security invoker set search_path='' as $$ select app_private.update_support_routing($1,$2,$3,$4,$5,$6,$7) $$;
revoke all on function app_private.validate_support_assignee() from public,anon,authenticated;
revoke all on function app_private.update_customer_fields(uuid,uuid,jsonb),app_private.update_ticket_fields(uuid,uuid,jsonb),app_private.update_support_routing(uuid,text,uuid,text,text,text,uuid),public.update_customer_fields(uuid,uuid,jsonb),public.update_ticket_fields(uuid,uuid,jsonb),public.update_support_routing(uuid,text,uuid,text,text,text,uuid) from public,anon;
grant execute on function app_private.update_customer_fields(uuid,uuid,jsonb),app_private.update_ticket_fields(uuid,uuid,jsonb),app_private.update_support_routing(uuid,text,uuid,text,text,text,uuid),public.update_customer_fields(uuid,uuid,jsonb),public.update_ticket_fields(uuid,uuid,jsonb),public.update_support_routing(uuid,text,uuid,text,text,text,uuid) to authenticated;

create or replace function app_private.update_ticket(p_workspace_id uuid,p_ticket_id uuid,p_status text default null,p_priority text default null,p_category text default null,p_assignee_user_id uuid default null,p_title text default null,p_description text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_old public.tickets%rowtype; v_event jsonb := '{}'::jsonb;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_old from public.tickets where id=p_ticket_id and workspace_id=p_workspace_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if p_status is not null and p_status not in ('open','in_progress','pending','resolved','closed') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_assignee_user_id is not null and not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_assignee_user_id and status='active') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  update public.tickets set title=coalesce(nullif(trim(p_title),''),title),description=coalesce(p_description,description),status=coalesce(p_status,status),priority=coalesce(p_priority,priority),category=case when p_category is null then category else nullif(trim(p_category),'') end,assignee_user_id=p_assignee_user_id,updated_at=now(),resolved_at=case when p_status in ('resolved','closed') then coalesce(resolved_at,now()) when p_status is not null then null else resolved_at end where id=p_ticket_id;
  v_event := jsonb_build_object('from_assignee_user_id',v_old.assignee_user_id,'to_assignee_user_id',p_assignee_user_id,'from_status',v_old.status,'to_status',coalesce(p_status,v_old.status),'from_priority',v_old.priority,'to_priority',coalesce(p_priority,v_old.priority));
  insert into public.ticket_events(workspace_id,ticket_id,actor_user_id,event_type,payload) values(p_workspace_id,p_ticket_id,v_actor,'updated',v_event);
end; $$;
