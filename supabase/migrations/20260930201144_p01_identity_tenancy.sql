-- P01 identity, tenant isolation, invitations, and audit.
-- All application mutations are authenticated RPCs; browser table access is read-only.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email_normalized text not null,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_length check (char_length(email_normalized) between 3 and 320),
  constraint profiles_display_length check (char_length(display_name) <= 120)
);
create index profiles_email_idx on public.profiles(email_normalized);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  onboarding_step text not null default 'workspace_created',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_length check (char_length(trim(name)) between 2 and 100),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  constraint workspaces_timezone_length check (char_length(timezone) between 1 and 100),
  constraint workspaces_name_line check (position(chr(10) in name) = 0 and position(chr(13) in name) = 0)
);
create index workspaces_owner_idx on public.workspaces(owner_user_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','agent','viewer')),
  status text not null default 'active' check (status = 'active'),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index workspace_members_owner_idx on public.workspace_members(workspace_id) where role = 'owner';

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email_normalized text not null,
  role text not null check (role in ('owner','admin','agent','viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by_user_id uuid not null references auth.users(id) on delete restrict,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','failed')),
  last_sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_length check (char_length(email_normalized) between 3 and 320 and email_normalized = lower(trim(email_normalized))),
  constraint invitations_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invitations_expiry check (expires_at > created_at),
  constraint invitations_terminal_exclusive check (accepted_at is null or revoked_at is null)
);
create unique index workspace_invitations_pending_email_idx
  on public.workspace_invitations(workspace_id, email_normalized)
  where accepted_at is null and revoked_at is null;
create index workspace_invitations_inviter_idx on public.workspace_invitations(invited_by_user_id, created_at desc);
create index workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id, created_at desc);
create index workspace_invitations_expiry_idx on public.workspace_invitations(expires_at) where accepted_at is null and revoked_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_action_length check (char_length(action) between 3 and 100),
  constraint audit_target_length check (char_length(target_type) between 2 and 80),
  constraint audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);
create index audit_logs_workspace_time_idx on public.audit_logs(workspace_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles, public.workspaces, public.workspace_members, public.workspace_invitations, public.audit_logs from anon, authenticated;
grant select on public.profiles, public.workspaces, public.workspace_members, public.workspace_invitations, public.audit_logs to authenticated;

create function app_private.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;
create function app_private.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
      and m.status = 'active' and m.role = any(p_roles)
  );
$$;
revoke all on function app_private.is_workspace_member(uuid), app_private.has_workspace_role(uuid,text[]) from public, anon;
grant execute on function app_private.is_workspace_member(uuid), app_private.has_workspace_role(uuid,text[]) to authenticated;

create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or exists (
  select 1 from public.workspace_members mine
  join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
  where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    and mine.status = 'active' and theirs.status = 'active'
));
create policy workspaces_select on public.workspaces for select to authenticated
using ((select app_private.is_workspace_member(id)));
create policy members_select on public.workspace_members for select to authenticated
using ((select app_private.is_workspace_member(workspace_id)));
create policy invitations_select on public.workspace_invitations for select to authenticated
using ((select app_private.has_workspace_role(workspace_id, array['owner','admin']::text[])));
create policy audit_select on public.audit_logs for select to authenticated
using ((select app_private.has_workspace_role(workspace_id, array['owner','admin']::text[])));

create function app_private.sync_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null then return new; end if;
  insert into public.profiles(id,email_normalized,display_name,avatar_url)
  values (new.id, lower(coalesce(new.email,'')),
    left(coalesce(new.raw_user_meta_data->>'display_name',''),120),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email_normalized = excluded.email_normalized,
    updated_at = now();
  return new;
end;
$$;
create trigger auth_user_profile_sync after insert or update of email on auth.users
for each row execute function app_private.sync_profile();

-- Populate profiles for existing auth users when this migration reaches an existing project.
insert into public.profiles(id,email_normalized,display_name)
select id, lower(coalesce(email,'')), left(coalesce(raw_user_meta_data->>'display_name',''),120)
from auth.users
where email is not null
on conflict (id) do nothing;

create function app_private.create_workspace(p_name text, p_slug text, p_timezone text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if char_length(trim(p_name)) not between 2 and 100 or p_slug !~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'
     or char_length(p_timezone) not between 1 and 100
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  insert into public.workspaces(name,slug,timezone,owner_user_id)
    values(trim(p_name),p_slug,p_timezone,v_actor) returning id into v_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(v_id,v_actor,'owner');
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id)
    values(v_id,v_actor,'workspace.created','workspace',v_id);
  return v_id;
end;
$$;
create function public.create_workspace(p_name text, p_slug text, p_timezone text)
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.create_workspace($1,$2,$3) $$;

create function app_private.create_invitation(p_workspace_id uuid, p_email text, p_role text, p_token_hash text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_email text := lower(trim(p_email)); v_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if p_role not in ('owner','admin','agent','viewer') or
     (p_role in ('owner','admin') and not app_private.has_workspace_role(p_workspace_id,array['owner']::text[])) or
     char_length(v_email) not between 3 and 320 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or
     p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.workspace_members m join auth.users u on u.id=m.user_id
    where m.workspace_id=p_workspace_id and lower(u.email)=v_email
  ) then raise exception 'ALREADY_MEMBER' using errcode = 'P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,1));
  if (select count(*) from public.workspace_invitations
      where invited_by_user_id=v_actor and created_at > now()-interval '1 hour') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
  update public.workspace_invitations set revoked_at=now(),updated_at=now() where workspace_id=p_workspace_id and email_normalized=v_email and accepted_at is null and revoked_at is null and expires_at<=now();
  insert into public.workspace_invitations(workspace_id,email_normalized,role,token_hash,expires_at,invited_by_user_id)
    values(p_workspace_id,v_email,p_role,p_token_hash,now()+interval '7 days',v_actor)
    returning id into v_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'invitation.created','invitation',v_id,jsonb_build_object('role',p_role));
  return v_id;
end;
$$;
create function public.create_invitation(p_workspace_id uuid,p_email text,p_role text,p_token_hash text)
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.create_invitation($1,$2,$3,$4) $$;

create function app_private.resend_invitation(p_id uuid,p_token_hash text)
returns table(email_normalized text,workspace_id uuid,role text)
language plpgsql security definer set search_path = ''
as $$
declare v_inv public.workspace_invitations%rowtype; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select * into v_inv from public.workspace_invitations where id=p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(v_inv.workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null then
    raise exception 'INVITATION_CLOSED' using errcode='P0001'; end if;
  if v_inv.last_sent_at > now()-interval '1 minute' then
    raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  update public.workspace_invitations set token_hash=p_token_hash, expires_at=now()+interval '7 days',
    delivery_status='pending', last_error_code=null, updated_at=now()
    where id=p_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id)
    values(v_inv.workspace_id,v_actor,'invitation.resent','invitation',p_id);
  return query select v_inv.email_normalized,v_inv.workspace_id,v_inv.role;
end;
$$;
create function public.resend_invitation(p_id uuid,p_token_hash text)
returns table(email_normalized text,workspace_id uuid,role text)
language sql security invoker set search_path = ''
as $$ select * from app_private.resend_invitation($1,$2) $$;

create function app_private.revoke_invitation(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_inv public.workspace_invitations%rowtype; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select * into v_inv from public.workspace_invitations where id=p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(v_inv.workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if v_inv.accepted_at is not null then raise exception 'INVITATION_CLOSED' using errcode='P0001'; end if;
  update public.workspace_invitations set revoked_at=coalesce(revoked_at,now()),updated_at=now() where id=p_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id)
    values(v_inv.workspace_id,v_actor,'invitation.revoked','invitation',p_id);
end;
$$;
create function public.revoke_invitation(p_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select app_private.revoke_invitation($1) $$;

create function app_private.accept_invitation(p_token_hash text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_inv public.workspace_invitations%rowtype; v_actor uuid := auth.uid(); v_email text;
begin
  if v_actor is null then return 'auth_required'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then return 'invalid'; end if;
  select * into v_inv from public.workspace_invitations where token_hash=p_token_hash for update;
  if not found then return 'invalid'; end if;
  if v_inv.revoked_at is not null then return 'revoked'; end if;
  if v_inv.accepted_at is not null then return 'used'; end if;
  if v_inv.expires_at <= now() then return 'expired'; end if;
  select lower(email) into v_email from auth.users where id=v_actor;
  if v_email is distinct from v_inv.email_normalized then return 'wrong_account'; end if;
  if exists(select 1 from public.workspace_members where workspace_id=v_inv.workspace_id and user_id=v_actor) then
    update public.workspace_invitations set accepted_at=now(),updated_at=now() where id=v_inv.id;
    return 'already_member';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(v_inv.workspace_id,v_actor,v_inv.role);
  update public.workspace_invitations set accepted_at=now(),updated_at=now() where id=v_inv.id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(v_inv.workspace_id,v_actor,'member.joined','member',v_actor,jsonb_build_object('role',v_inv.role));
  return 'accepted';
end;
$$;
create function public.accept_invitation(p_token_hash text)
returns text language sql security invoker set search_path = ''
as $$ select app_private.accept_invitation($1) $$;

create function app_private.change_member_role(p_workspace_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_actor_role text; v_old_role text; v_next_owner uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text,0));
  select role into v_actor_role from public.workspace_members where workspace_id=p_workspace_id and user_id=v_actor;
  select role into v_old_role from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id for update;
  if v_old_role is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if coalesce(v_actor_role,'') not in ('owner','admin') or
    (v_actor_role='admin' and (v_old_role in ('owner','admin') or p_role in ('owner','admin'))) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_role not in ('owner','admin','agent','viewer') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  if v_old_role=p_role then return; end if;
  if v_old_role='owner' and p_role<>'owner' then
    select user_id into v_next_owner from public.workspace_members
      where workspace_id=p_workspace_id and role='owner' and user_id<>p_user_id limit 1;
    if v_next_owner is null then raise exception 'LAST_OWNER' using errcode='P0001'; end if;
    update public.workspaces set owner_user_id=v_next_owner,updated_at=now()
      where id=p_workspace_id and owner_user_id=p_user_id;
  end if;
  update public.workspace_members set role=p_role where workspace_id=p_workspace_id and user_id=p_user_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'member.role_changed','member',p_user_id,
      jsonb_build_object('from',v_old_role,'to',p_role));
end;
$$;
create function public.change_member_role(p_workspace_id uuid,p_user_id uuid,p_role text)
returns void language sql security invoker set search_path = ''
as $$ select app_private.change_member_role($1,$2,$3) $$;

create function app_private.remove_member(p_workspace_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_actor_role text; v_old_role text; v_next_owner uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text,0));
  select role into v_actor_role from public.workspace_members where workspace_id=p_workspace_id and user_id=v_actor;
  select role into v_old_role from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id for update;
  if v_old_role is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if v_actor<>p_user_id and (coalesce(v_actor_role,'') not in ('owner','admin') or
     (v_actor_role='admin' and v_old_role in ('owner','admin'))) then
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
    values(p_workspace_id,v_actor,'member.removed','member',p_user_id,jsonb_build_object('role',v_old_role));
end;
$$;
create function public.remove_member(p_workspace_id uuid,p_user_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select app_private.remove_member($1,$2) $$;

-- Explicitly expose only hardened wrappers. Private functions are not in Data API exposed schemas.
revoke all on function public.create_workspace(text,text,text), public.create_invitation(uuid,text,text,text), public.resend_invitation(uuid,text), public.revoke_invitation(uuid), public.accept_invitation(text), public.change_member_role(uuid,uuid,text), public.remove_member(uuid,uuid) from public, anon;
grant execute on function public.create_workspace(text,text,text),
  public.create_invitation(uuid,text,text,text), public.resend_invitation(uuid,text),
  public.revoke_invitation(uuid),
  public.accept_invitation(text), public.change_member_role(uuid,uuid,text),
  public.remove_member(uuid,uuid) to authenticated;
revoke all on all functions in schema app_private from public, anon;
grant execute on all functions in schema app_private to authenticated;
