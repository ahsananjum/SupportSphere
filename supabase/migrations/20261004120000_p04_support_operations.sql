-- P04 support operations: customers, conversations, messages, tickets, and tags.
-- All writes go through authenticated, workspace-checked RPCs.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  email text,
  phone text,
  company text,
  locale text,
  timezone text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_length check (char_length(name) <= 160),
  constraint customers_email_length check (email is null or char_length(email) between 3 and 320),
  constraint customers_metadata_object check (jsonb_typeof(metadata) = 'object')
);
alter table public.customers add constraint customers_workspace_id_id_key unique (workspace_id, id);
create unique index customers_workspace_email_idx on public.customers(workspace_id, lower(email)) where email is not null;
create index customers_workspace_updated_idx on public.customers(workspace_id, updated_at desc, id desc);

create table public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider text not null,
  identity_key text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, provider, identity_key)
);
create index customer_identities_customer_idx on public.customer_identities(customer_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  subject text not null default 'New conversation',
  channel text not null default 'manual' check (channel in ('manual','widget','email','api')),
  status text not null default 'open' check (status in ('open','pending','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assignee_user_id uuid references auth.users(id) on delete set null,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations add constraint conversations_workspace_id_id_key unique (workspace_id, id);
alter table public.conversations add constraint conversations_customer_workspace_fk foreign key (workspace_id, customer_id) references public.customers(workspace_id, id) on delete restrict;
create index conversations_workspace_list_idx on public.conversations(workspace_id, updated_at desc, id desc);
create index conversations_customer_idx on public.conversations(workspace_id, customer_id, updated_at desc);
create index conversations_filters_idx on public.conversations(workspace_id, status, priority, assignee_user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','agent','note','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  delivery_status text not null default 'sent' check (delivery_status in ('pending','sent','failed')),
  client_id text,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(trim(body)) between 1 and 20000)
);
alter table public.messages add constraint messages_conversation_workspace_fk foreign key (workspace_id, conversation_id) references public.conversations(workspace_id, id) on delete cascade;
create unique index messages_idempotency_idx on public.messages(workspace_id, client_id) where client_id is not null;
create index messages_conversation_idx on public.messages(workspace_id, conversation_id, created_at asc, id asc);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ticket_number bigint not null,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open','in_progress','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  category text,
  customer_id uuid references public.customers(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (workspace_id, ticket_number),
  constraint tickets_title_length check (char_length(trim(title)) between 1 and 240),
  constraint tickets_description_length check (char_length(description) <= 40000)
);
alter table public.tickets add constraint tickets_workspace_id_id_key unique (workspace_id, id);
alter table public.tickets add constraint tickets_customer_workspace_fk foreign key (workspace_id, customer_id) references public.customers(workspace_id, id) on delete set null;
alter table public.tickets add constraint tickets_conversation_workspace_fk foreign key (workspace_id, conversation_id) references public.conversations(workspace_id, id) on delete set null;
create index tickets_workspace_list_idx on public.tickets(workspace_id, updated_at desc, id desc);
create index tickets_filters_idx on public.tickets(workspace_id, status, priority, assignee_user_id, updated_at desc);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ticket_events_payload_object check (jsonb_typeof(payload) = 'object')
);
alter table public.ticket_events add constraint ticket_events_ticket_workspace_fk foreign key (workspace_id, ticket_id) references public.tickets(workspace_id, id) on delete cascade;
create index ticket_events_timeline_idx on public.ticket_events(workspace_id, ticket_id, created_at asc, id asc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default 'mint',
  created_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(trim(name)) between 1 and 48)
);
create unique index tags_workspace_name_idx on public.tags(workspace_id, lower(name));
create table public.customer_tags (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (customer_id, tag_id)
);
create table public.conversation_tags (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (conversation_id, tag_id)
);
create table public.ticket_tags (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (ticket_id, tag_id)
);

alter table public.customers enable row level security;
alter table public.customer_identities enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.tags enable row level security;
alter table public.customer_tags enable row level security;
alter table public.conversation_tags enable row level security;
alter table public.ticket_tags enable row level security;

revoke all on public.customers, public.customer_identities, public.conversations, public.messages, public.tickets, public.ticket_events, public.tags, public.customer_tags, public.conversation_tags, public.ticket_tags from anon, authenticated;
grant select on public.customers, public.customer_identities, public.conversations, public.messages, public.tickets, public.ticket_events, public.tags, public.customer_tags, public.conversation_tags, public.ticket_tags to authenticated;

create policy customers_select on public.customers for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy identities_select on public.customer_identities for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy conversations_select on public.conversations for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy messages_select on public.messages for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy tickets_select on public.tickets for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy ticket_events_select on public.ticket_events for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy tags_select on public.tags for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy customer_tags_select on public.customer_tags for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy conversation_tags_select on public.conversation_tags for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));
create policy ticket_tags_select on public.ticket_tags for select to authenticated using ((select app_private.is_workspace_member(workspace_id)));

create or replace function app_private.create_or_get_customer(
  p_workspace_id uuid, p_name text, p_email text, p_phone text, p_company text,
  p_provider text, p_identity_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_customer uuid; v_email text := nullif(lower(trim(p_email)), '');
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id, array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text || ':' || coalesce(v_email,''), 17));
  if char_length(coalesce(p_name,'')) > 160 or (v_email is not null and (char_length(v_email) > 320 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if nullif(trim(p_identity_key),'') is not null then select customer_id into v_customer from public.customer_identities where workspace_id=p_workspace_id and provider=trim(p_provider) and identity_key=trim(p_identity_key) for update; end if;
  if v_customer is null and v_email is not null then select id into v_customer from public.customers where workspace_id=p_workspace_id and lower(email)=v_email for update; end if;
  if v_customer is null then
    insert into public.customers(workspace_id,name,email,phone,company) values(p_workspace_id,trim(coalesce(p_name,'')),v_email,nullif(trim(p_phone),''),nullif(trim(p_company),'')) returning id into v_customer;
  else
    update public.customers set name=case when trim(coalesce(p_name,''))='' then name else trim(p_name) end, email=coalesce(v_email,email), phone=coalesce(nullif(trim(p_phone),''),phone), company=coalesce(nullif(trim(p_company),''),company), last_seen_at=now(), updated_at=now() where id=v_customer;
  end if;
  if nullif(trim(p_identity_key),'') is not null then insert into public.customer_identities(workspace_id,customer_id,provider,identity_key) values(p_workspace_id,v_customer,trim(p_provider),trim(p_identity_key)) on conflict (workspace_id,provider,identity_key) do update set customer_id=excluded.customer_id; end if;
  return v_customer;
end; $$;

create or replace function app_private.create_conversation(p_workspace_id uuid,p_customer_id uuid,p_subject text,p_channel text default 'manual') returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_channel not in ('manual','widget','email','api') or char_length(trim(p_subject)) not between 1 and 240 or not exists(select 1 from public.customers where id=p_customer_id and workspace_id=p_workspace_id) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  insert into public.conversations(workspace_id,customer_id,subject,channel) values(p_workspace_id,p_customer_id,trim(p_subject),p_channel) returning id into v_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id) values(p_workspace_id,v_actor,'conversation.created','conversation',v_id);
  return v_id;
end; $$;

create or replace function app_private.send_message(p_workspace_id uuid,p_conversation_id uuid,p_body text,p_internal boolean default false,p_client_id text default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_customer uuid;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if char_length(trim(p_body)) not between 1 and 20000 then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select customer_id into v_customer from public.conversations where id=p_conversation_id and workspace_id=p_workspace_id for update;
  if v_customer is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if p_client_id is not null then select id into v_id from public.messages where workspace_id=p_workspace_id and client_id=p_client_id; if v_id is not null then return v_id; end if; end if;
  insert into public.messages(workspace_id,conversation_id,sender_type,sender_user_id,body,delivery_status,client_id) values(p_workspace_id,p_conversation_id,case when p_internal then 'note' else 'agent' end,v_actor,trim(p_body),'sent',nullif(trim(p_client_id),'')) returning id into v_id;
  update public.conversations set updated_at=now(),last_message_at=now() where id=p_conversation_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata) values(p_workspace_id,v_actor,case when p_internal then 'conversation.note_added' else 'message.sent' end,'conversation',p_conversation_id,jsonb_build_object('message_id',v_id));
  return v_id;
end; $$;

create or replace function app_private.update_conversation(p_workspace_id uuid,p_conversation_id uuid,p_status text default null,p_priority text default null,p_assignee_user_id uuid default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_status is not null and p_status not in ('open','pending','closed') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_assignee_user_id is not null and not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_assignee_user_id and status='active') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  update public.conversations set status=coalesce(p_status,status),priority=coalesce(p_priority,priority),assignee_user_id=p_assignee_user_id,updated_at=now() where id=p_conversation_id and workspace_id=p_workspace_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata) values(p_workspace_id,v_actor,'conversation.updated','conversation',p_conversation_id,jsonb_build_object('status',p_status,'priority',p_priority,'assignee_user_id',p_assignee_user_id));
end; $$;

create or replace function app_private.create_ticket(p_workspace_id uuid,p_title text,p_description text,p_priority text,p_category text,p_customer_id uuid,p_conversation_id uuid,p_assignee_user_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_number bigint;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if char_length(trim(p_title)) not between 1 and 240 or char_length(coalesce(p_description,'')) > 40000 or p_priority not in ('low','normal','high','urgent') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id and workspace_id=p_workspace_id) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_conversation_id is not null and not exists(select 1 from public.conversations where id=p_conversation_id and workspace_id=p_workspace_id) then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if p_assignee_user_id is not null and not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_assignee_user_id and status='active') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text, 41));
  select coalesce(max(ticket_number),0)+1 into v_number from public.tickets where workspace_id=p_workspace_id;
  insert into public.tickets(workspace_id,ticket_number,title,description,priority,category,customer_id,conversation_id,assignee_user_id) values(p_workspace_id,v_number,trim(p_title),coalesce(p_description,''),p_priority,nullif(trim(p_category),''),p_customer_id,p_conversation_id,p_assignee_user_id) returning id into v_id;
  insert into public.ticket_events(workspace_id,ticket_id,actor_user_id,event_type,payload) values(p_workspace_id,v_id,v_actor,'created',jsonb_build_object('ticket_number',v_number));
  return v_id;
end; $$;

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
  v_event := jsonb_build_object('from_status',v_old.status,'to_status',coalesce(p_status,v_old.status),'from_priority',v_old.priority,'to_priority',coalesce(p_priority,v_old.priority));
  insert into public.ticket_events(workspace_id,ticket_id,actor_user_id,event_type,payload) values(p_workspace_id,p_ticket_id,v_actor,'updated',v_event);
end; $$;

create or replace function public.create_or_get_customer(p_workspace_id uuid,p_name text,p_email text,p_phone text,p_company text,p_provider text,p_identity_key text) returns uuid language sql security invoker set search_path = '' as $$ select app_private.create_or_get_customer($1,$2,$3,$4,$5,$6,$7) $$;
create or replace function public.create_conversation(p_workspace_id uuid,p_customer_id uuid,p_subject text,p_channel text default 'manual') returns uuid language sql security invoker set search_path = '' as $$ select app_private.create_conversation($1,$2,$3,$4) $$;
create or replace function public.send_message(p_workspace_id uuid,p_conversation_id uuid,p_body text,p_internal boolean default false,p_client_id text default null) returns uuid language sql security invoker set search_path = '' as $$ select app_private.send_message($1,$2,$3,$4,$5) $$;
create or replace function public.update_conversation(p_workspace_id uuid,p_conversation_id uuid,p_status text default null,p_priority text default null,p_assignee_user_id uuid default null) returns void language sql security invoker set search_path = '' as $$ select app_private.update_conversation($1,$2,$3,$4,$5) $$;
create or replace function public.create_ticket(p_workspace_id uuid,p_title text,p_description text,p_priority text,p_category text,p_customer_id uuid,p_conversation_id uuid,p_assignee_user_id uuid) returns uuid language sql security invoker set search_path = '' as $$ select app_private.create_ticket($1,$2,$3,$4,$5,$6,$7,$8) $$;
create or replace function public.update_ticket(p_workspace_id uuid,p_ticket_id uuid,p_status text default null,p_priority text default null,p_category text default null,p_assignee_user_id uuid default null,p_title text default null,p_description text default null) returns void language sql security invoker set search_path = '' as $$ select app_private.update_ticket($1,$2,$3,$4,$5,$6,$7,$8) $$;
revoke all on function public.create_or_get_customer(uuid,text,text,text,text,text,text),public.create_conversation(uuid,uuid,text,text),public.send_message(uuid,uuid,text,boolean,text),public.update_conversation(uuid,uuid,text,text,uuid),public.create_ticket(uuid,text,text,text,text,uuid,uuid,uuid),public.update_ticket(uuid,uuid,text,text,text,uuid,text,text) from public,anon;
grant execute on function public.create_or_get_customer(uuid,text,text,text,text,text,text),public.create_conversation(uuid,uuid,text,text),public.send_message(uuid,uuid,text,boolean,text),public.update_conversation(uuid,uuid,text,text,uuid),public.create_ticket(uuid,text,text,text,text,uuid,uuid,uuid),public.update_ticket(uuid,uuid,text,text,text,uuid,text,text) to authenticated;

