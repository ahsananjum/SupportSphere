create or replace function public.create_knowledge_source(p_workspace_id uuid,p_name text,p_type text,p_text text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 1 and 160 or
    p_type not in ('paste','txt','md','pdf') or
    (p_type='paste' and char_length(trim(coalesce(p_text,''))) not between 1 and 80000) or
    (p_type<>'paste' and p_text is not null) then
    raise exception 'INVALID_SOURCE' using errcode='P0001';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text,79));
  if (select count(*) from public.knowledge_sources where workspace_id=p_workspace_id)>=500 or
     (select count(*) from public.knowledge_sources where workspace_id=p_workspace_id
       and created_at>now()-interval '1 hour')>=30 then
    raise exception 'SOURCE_LIMIT' using errcode='P0001';
  end if;
  insert into public.knowledge_sources(id,workspace_id,name,source_type,input_text,storage_path,status)
    values(v_id,p_workspace_id,trim(p_name),p_type,
      case when p_type='paste' then p_text else null end,
      case when p_type<>'paste' then 'workspace/' || p_workspace_id::text || '/knowledge/' || v_id::text || '/original' else null end,
      case when p_type='paste' then 'queued' else 'uploading' end);
  if p_type='paste' then
    insert into public.ingestion_jobs(workspace_id,source_id) values(p_workspace_id,v_id);
  end if;
  return v_id;
end; $$;

select cron.unschedule(jobid) from cron.job where jobname='supportsphere-knowledge-worker';
select cron.schedule('supportsphere-knowledge-worker','* * * * *',$$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_url') || '/functions/v1/knowledge-worker',
    headers:=pg_catalog.jsonb_build_object(
      'Content-Type','application/json',
      'X-Worker-Token',(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_token')
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=150000
  )
  where exists(select 1 from vault.decrypted_secrets where name='knowledge_worker_url');
$$);
