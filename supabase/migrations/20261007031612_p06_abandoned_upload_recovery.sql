create function app_private.limit_knowledge_jobs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.workspace_id::text,80));
  if (select count(*) from public.ingestion_jobs
      where workspace_id=new.workspace_id and created_at>now()-interval '1 hour')>=100 then
    raise exception 'JOB_LIMIT' using errcode='P0001';
  end if;
  return new;
end; $$;
revoke all on function app_private.limit_knowledge_jobs() from public,anon,authenticated;
create trigger limit_knowledge_jobs before insert on public.ingestion_jobs
  for each row execute function app_private.limit_knowledge_jobs();

create function app_private.recover_knowledge_uploads()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_source public.knowledge_sources%rowtype; v_recovered integer := 0;
begin
  for v_source in
    select * from public.knowledge_sources
      where status='uploading' and created_at<now()-interval '10 minutes'
      for update skip locked
  loop
    if exists(select 1 from storage.objects where bucket_id='knowledge-private' and name=v_source.storage_path) then
      begin
        update public.knowledge_sources set status='queued',updated_at=now() where id=v_source.id;
        insert into public.ingestion_jobs(workspace_id,source_id)
          values(v_source.workspace_id,v_source.id);
      exception when sqlstate 'P0001' then
        update public.knowledge_sources
          set status='failed',error_code='JOB_LIMIT',
            error_message='Too many indexing requests. Retry this source later.',
            updated_at=now() where id=v_source.id;
      end;
    else
      update public.knowledge_sources
        set status='failed',error_code='UPLOAD_INCOMPLETE',
          error_message='Upload did not finish. Delete this source and upload it again.',
          updated_at=now()
        where id=v_source.id;
    end if;
    v_recovered := v_recovered+1;
  end loop;
  return v_recovered;
end; $$;
revoke all on function app_private.recover_knowledge_uploads() from public,anon,authenticated;

create function public.recover_abandoned_knowledge_uploads()
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if auth.jwt()->>'role'<>'service_role' then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  return app_private.recover_knowledge_uploads();
end; $$;
revoke all on function public.recover_abandoned_knowledge_uploads() from public,anon,authenticated;
grant execute on function public.recover_abandoned_knowledge_uploads() to service_role;

select cron.schedule('supportsphere-knowledge-upload-recovery','*/5 * * * *',
  'select app_private.recover_knowledge_uploads()');
