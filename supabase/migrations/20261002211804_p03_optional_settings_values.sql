-- Normalize blank optional settings supplied by HTML forms to NULL.
create or replace function app_private.update_workspace_general(
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
    or (nullif(trim(p_company_name),'') is not null and char_length(trim(p_company_name)) not between 2 and 120)
    or (nullif(trim(p_support_name),'') is not null and char_length(trim(p_support_name)) not between 2 and 120)
    or (nullif(trim(p_support_email),'') is not null and (char_length(p_support_email)>320 or p_support_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'))
    or (nullif(trim(p_website_origin),'') is not null and (char_length(p_website_origin)>255 or p_website_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$|^http://localhost(:[0-9]{1,5})?$')) then
    raise exception 'INVALID_INPUT' using errcode='P0001'; end if;
  select * into v_old from public.workspaces where id=p_workspace_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.workspaces set name=trim(p_name),slug=p_slug,timezone=p_timezone,
    company_name=nullif(trim(p_company_name),''), support_name=nullif(trim(p_support_name),''),
    support_email=nullif(lower(trim(p_support_email)),''), website_origin=nullif(trim(p_website_origin),''), updated_at=now()
    where id=p_workspace_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'workspace.settings_updated','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('fields',pg_catalog.jsonb_build_array('name','slug','timezone','company_name','support_name','support_email','website_origin')));
end;
$$;
