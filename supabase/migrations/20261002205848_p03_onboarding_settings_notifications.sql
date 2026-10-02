-- P03: persisted setup and workspace settings, with database-owned authorization.
alter table public.workspaces
  add column company_name text,
  add column support_name text,
  add column support_email text,
  add column website_origin text,
  add column ai_mode text not null default 'off';

update public.workspaces set onboarding_step = 'identity'
where onboarding_step = 'workspace_created';
alter table public.workspaces alter column onboarding_step set default 'identity';
alter table public.workspaces
  add constraint workspaces_onboarding_step_check check (onboarding_step in ('identity','origin','team','knowledge','ai','complete')),
  add constraint workspaces_company_length check (company_name is null or char_length(trim(company_name)) between 2 and 120),
  add constraint workspaces_support_name_length check (support_name is null or char_length(trim(support_name)) between 2 and 120),
  add constraint workspaces_support_email_format check (support_email is null or (char_length(support_email) <= 320 and support_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')),
  add constraint workspaces_origin_format check (website_origin is null or (char_length(website_origin) <= 255 and website_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$|^http://localhost(:[0-9]{1,5})?$')),
  add constraint workspaces_ai_mode_check check (ai_mode in ('off','draft_only','assisted')),
  add constraint workspaces_completion_check check ((onboarding_step = 'complete') = (onboarding_completed_at is not null));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('onboarding_complete','member_joined')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 400),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_workspace_time_idx on public.notifications(user_id,workspace_id,created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
using (user_id = (select auth.uid()) and (select app_private.is_workspace_member(workspace_id)));

create function app_private.update_workspace_general(
  p_workspace_id uuid, p_name text, p_slug text, p_timezone text,
  p_company_name text, p_support_name text, p_support_email text, p_website_origin text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_old public.workspaces%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 100 or p_name ~ '[\r\n]'
    or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'
    or p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone)
    or (p_company_name is not null and char_length(trim(p_company_name)) not between 2 and 120)
    or (p_support_name is not null and char_length(trim(p_support_name)) not between 2 and 120)
    or (p_support_email is not null and (char_length(p_support_email)>320 or p_support_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'))
    or (p_website_origin is not null and (char_length(p_website_origin)>255 or p_website_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$|^http://localhost(:[0-9]{1,5})?$')) then
    raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select * into v_old from public.workspaces where id=p_workspace_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.workspaces set name=trim(p_name),slug=p_slug,timezone=p_timezone,
    company_name=nullif(trim(p_company_name),''), support_name=nullif(trim(p_support_name),''),
    support_email=lower(p_support_email), website_origin=p_website_origin, updated_at=now()
    where id=p_workspace_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'workspace.settings_updated','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('fields',pg_catalog.jsonb_build_array('name','slug','timezone','company_name','support_name','support_email','website_origin')));
end;
$$;
create function public.update_workspace_general(
  p_workspace_id uuid, p_name text, p_slug text, p_timezone text,
  p_company_name text, p_support_name text, p_support_email text, p_website_origin text
) returns void language sql security invoker set search_path = '' as $$
  select app_private.update_workspace_general($1,$2,$3,$4,$5,$6,$7,$8)
$$;

create function app_private.advance_onboarding(p_workspace_id uuid,p_expected text,p_next text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_step text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(p_workspace_id,array['owner']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if not ((p_expected='identity' and p_next='origin') or (p_expected='origin' and p_next='team')
    or (p_expected='team' and p_next='knowledge') or (p_expected='knowledge' and p_next='ai')) then
    raise exception 'INVALID_STEP' using errcode='P0001'; end if;
  select onboarding_step into v_step from public.workspaces where id=p_workspace_id for update;
  if v_step is distinct from p_expected then raise exception 'STEP_CONFLICT' using errcode='P0001'; end if;
  if p_expected='identity' and (select company_name is null or support_name is null or support_email is null from public.workspaces where id=p_workspace_id) then
    raise exception 'IDENTITY_REQUIRED' using errcode='P0001'; end if;
  update public.workspaces set onboarding_step=p_next,updated_at=now() where id=p_workspace_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'onboarding.advanced','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('from',p_expected,'to',p_next));
end;
$$;
create function public.advance_onboarding(p_workspace_id uuid,p_expected text,p_next text)
returns void language sql security invoker set search_path = '' as $$
  select app_private.advance_onboarding($1,$2,$3)
$$;

create function app_private.finish_onboarding(p_workspace_id uuid,p_ai_mode text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_step text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  if not app_private.has_workspace_role(p_workspace_id,array['owner']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_ai_mode not in ('off','draft_only','assisted') then raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select onboarding_step into v_step from public.workspaces where id=p_workspace_id for update;
  if v_step <> 'ai' then raise exception 'STEP_CONFLICT' using errcode='P0001'; end if;
  update public.workspaces set ai_mode=p_ai_mode,onboarding_step='complete',
    onboarding_completed_at=now(),updated_at=now() where id=p_workspace_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'onboarding.completed','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('ai_mode',p_ai_mode));
  insert into public.notifications(workspace_id,user_id,kind,title,body)
    values(p_workspace_id,v_actor,'onboarding_complete','Workspace ready',
      'Your workspace setup is complete. You can manage your team and settings here.');
end;
$$;
create function public.finish_onboarding(p_workspace_id uuid,p_ai_mode text)
returns void language sql security invoker set search_path = '' as $$
  select app_private.finish_onboarding($1,$2)
$$;

create function app_private.mark_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_workspace_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
  select workspace_id into v_workspace_id from public.notifications where id=p_id and user_id=v_actor for update;
  if v_workspace_id is null or not app_private.is_workspace_member(v_workspace_id) then
    raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.notifications set read_at=coalesce(read_at,now()) where id=p_id;
end;
$$;
create function public.mark_notification_read(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select app_private.mark_notification_read($1)
$$;

revoke all on function public.update_workspace_general(uuid,text,text,text,text,text,text,text),
  public.advance_onboarding(uuid,text,text),public.finish_onboarding(uuid,text),
  public.mark_notification_read(uuid) from public,anon;
grant execute on function public.update_workspace_general(uuid,text,text,text,text,text,text,text),
  public.advance_onboarding(uuid,text,text),public.finish_onboarding(uuid,text),
  public.mark_notification_read(uuid) to authenticated;
revoke all on function app_private.update_workspace_general(uuid,text,text,text,text,text,text,text),
  app_private.advance_onboarding(uuid,text,text),app_private.finish_onboarding(uuid,text),
  app_private.mark_notification_read(uuid) from public,anon;
grant execute on function app_private.update_workspace_general(uuid,text,text,text,text,text,text,text),
  app_private.advance_onboarding(uuid,text,text),app_private.finish_onboarding(uuid,text),
  app_private.mark_notification_read(uuid) to authenticated;
