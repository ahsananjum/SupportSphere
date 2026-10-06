-- Public embed configuration is readable only through origin-checked server routes.
create table public.widget_configs (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  widget_key text not null unique default ('wgt_' || replace(gen_random_uuid()::text, '-', '')),
  allowed_origins text[] not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint widget_key_format check (widget_key ~ '^wgt_[a-f0-9]{32}$'),
  constraint widget_origins_count check (cardinality(allowed_origins) between 1 and 10)
);
create index widget_configs_enabled_idx on public.widget_configs(widget_key) where enabled;
alter table public.widget_configs enable row level security;
revoke all on public.widget_configs from anon, authenticated;
grant select on public.widget_configs to authenticated;
create policy widget_configs_member_select on public.widget_configs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.widget_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  widget_key text not null references public.widget_configs(widget_key) on delete cascade,
  origin text not null,
  token_hash text not null unique,
  customer_id uuid not null,
  conversation_id uuid not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint widget_session_token_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint widget_session_customer_fk foreign key (workspace_id, customer_id) references public.customers(workspace_id,id) on delete cascade,
  constraint widget_session_conversation_fk foreign key (workspace_id, conversation_id) references public.conversations(workspace_id,id) on delete cascade
);
create index widget_sessions_workspace_idx on public.widget_sessions(workspace_id, expires_at);
alter table public.widget_sessions enable row level security;
revoke all on public.widget_sessions from anon, authenticated;

create table public.widget_rate_buckets (
  bucket_key text primary key,
  hits integer not null check (hits > 0),
  reset_at timestamptz not null
);
create index widget_rate_buckets_expiry_idx on public.widget_rate_buckets(reset_at);
alter table public.widget_rate_buckets enable row level security;
revoke all on public.widget_rate_buckets from anon, authenticated;

create or replace function public.configure_widget(p_workspace_id uuid, p_origins text[], p_enabled boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_origin text; v_key text;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if cardinality(p_origins) not between 1 and 10 or p_origins is null then
    raise exception 'INVALID_ORIGINS' using errcode='P0001';
  end if;
  foreach v_origin in array p_origins loop
    if v_origin is null or char_length(v_origin) > 255 or
       v_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]{2,5})?$' and
       v_origin !~ '^http://localhost(:[0-9]{2,5})?$' then
      raise exception 'INVALID_ORIGINS' using errcode='P0001';
    end if;
  end loop;
  insert into public.widget_configs(workspace_id,allowed_origins,enabled)
    values(p_workspace_id,p_origins,p_enabled)
    on conflict (workspace_id) do update set allowed_origins=excluded.allowed_origins,
      enabled=excluded.enabled,updated_at=now()
    returning widget_key into v_key;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,auth.uid(),'widget.configured','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('enabled',p_enabled,'origin_count',cardinality(p_origins)));
  return v_key;
end; $$;
revoke all on function public.configure_widget(uuid,text[],boolean) from public,anon;
grant execute on function public.configure_widget(uuid,text[],boolean) to authenticated;

create or replace function public.reserve_widget_rate(p_bucket_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  if char_length(p_bucket_key) != 64 or p_bucket_key !~ '^[a-f0-9]+$' or
     p_limit not between 1 and 100 or p_window_seconds not between 1 and 3600 then
    raise exception 'INVALID_RATE_BUCKET' using errcode='P0001';
  end if;
  insert into public.widget_rate_buckets(bucket_key,hits,reset_at)
    values(p_bucket_key,1,now()+pg_catalog.make_interval(secs=>p_window_seconds))
    on conflict (bucket_key) do update set
      hits=case when widget_rate_buckets.reset_at <= now() then 1 else widget_rate_buckets.hits+1 end,
      reset_at=case when widget_rate_buckets.reset_at <= now() then now()+pg_catalog.make_interval(secs=>p_window_seconds) else widget_rate_buckets.reset_at end
    returning hits into v_hits;
  return v_hits <= p_limit;
end; $$;
revoke all on function public.reserve_widget_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_widget_rate(text,integer,integer) to service_role;

create or replace function public.open_widget_session(p_key text,p_origin text,p_token_hash text,p_existing_hash text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_config public.widget_configs%rowtype; v_session public.widget_sessions%rowtype; v_customer uuid; v_conversation uuid;
begin
  select * into v_config from public.widget_configs where widget_key=p_key and enabled for share;
  if not found or not (p_origin = any(v_config.allowed_origins)) then
    raise exception 'WIDGET_UNAVAILABLE' using errcode='P0001';
  end if;
  if p_existing_hash is not null then
    select * into v_session from public.widget_sessions
      where token_hash=p_existing_hash and widget_key=p_key and origin=p_origin and expires_at>now() for update;
    if found then
      update public.widget_sessions set last_seen_at=now(),expires_at=now()+interval '30 days' where id=v_session.id;
      return pg_catalog.jsonb_build_object('session_id',v_session.id,'conversation_id',v_session.conversation_id,'reused',true);
    end if;
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SESSION' using errcode='P0001'; end if;
  insert into public.customers(workspace_id,name) values(v_config.workspace_id,'Website visitor') returning id into v_customer;
  insert into public.customer_identities(workspace_id,customer_id,provider,identity_key)
    values(v_config.workspace_id,v_customer,'widget',p_token_hash);
  insert into public.conversations(workspace_id,customer_id,subject,channel)
    values(v_config.workspace_id,v_customer,'Website conversation','widget') returning id into v_conversation;
  insert into public.widget_sessions(workspace_id,widget_key,origin,token_hash,customer_id,conversation_id)
    values(v_config.workspace_id,p_key,p_origin,p_token_hash,v_customer,v_conversation) returning * into v_session;
  return pg_catalog.jsonb_build_object('session_id',v_session.id,'conversation_id',v_conversation,'reused',false);
end; $$;
revoke all on function public.open_widget_session(text,text,text,text) from public,anon,authenticated;
grant execute on function public.open_widget_session(text,text,text,text) to service_role;

create or replace function public.send_widget_message(p_key text,p_origin text,p_session_hash text,p_body text,p_client_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_session public.widget_sessions%rowtype; v_id uuid;
begin
  select s.* into v_session from public.widget_sessions s join public.widget_configs c on c.widget_key=s.widget_key
    where s.widget_key=p_key and s.origin=p_origin and s.token_hash=p_session_hash and s.expires_at>now()
      and c.enabled and p_origin=any(c.allowed_origins) for update of s;
  if not found then raise exception 'INVALID_SESSION' using errcode='P0001'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 4000 or
     char_length(p_client_id) not between 8 and 100 then
    raise exception 'INVALID_MESSAGE' using errcode='P0001';
  end if;
  select id into v_id from public.messages where workspace_id=v_session.workspace_id and client_id=p_client_id;
  if v_id is not null then
    if not exists(select 1 from public.messages where id=v_id and conversation_id=v_session.conversation_id and sender_type='customer') then
      raise exception 'INVALID_MESSAGE' using errcode='P0001';
    end if;
    return v_id;
  end if;
  insert into public.messages(workspace_id,conversation_id,sender_type,body,client_id)
    values(v_session.workspace_id,v_session.conversation_id,'customer',trim(p_body),p_client_id) returning id into v_id;
  update public.conversations set status='open',unread_count=unread_count+1,
    last_message_at=now(),updated_at=now() where id=v_session.conversation_id;
  update public.customers set last_seen_at=now(),updated_at=now() where id=v_session.customer_id;
  return v_id;
end; $$;
revoke all on function public.send_widget_message(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.send_widget_message(text,text,text,text,text) to service_role;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
