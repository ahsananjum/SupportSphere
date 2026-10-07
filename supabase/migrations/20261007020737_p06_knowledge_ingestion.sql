create extension if not exists vector with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  source_type text not null check (source_type in ('paste','txt','md','pdf')),
  source_uri text,
  storage_path text unique,
  input_text text,
  status text not null check (status in ('uploading','queued','processing','ready','failed')) default 'uploading',
  enabled boolean not null default true,
  content_hash text check (content_hash ~ '^[a-f0-9]{64}$'),
  document_count integer not null default 0 check (document_count>=0),
  chunk_count integer not null default 0 check (chunk_count>=0),
  last_indexed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,id),
  constraint knowledge_source_input check (
    (source_type='paste' and input_text is not null and storage_path is null)
    or (source_type<>'paste' and input_text is null and storage_path =
      'workspace/' || workspace_id::text || '/knowledge/' || id::text || '/original')
  )
);
create index knowledge_sources_workspace_idx on public.knowledge_sources(workspace_id,created_at desc);
alter table public.knowledge_sources enable row level security;
revoke all on public.knowledge_sources from anon,authenticated;
grant select on public.knowledge_sources to authenticated;
create policy knowledge_sources_select on public.knowledge_sources for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  source_id uuid not null,
  document_index integer not null check (document_index>=0),
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  unique (source_id,document_index),
  foreign key (workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade
);
create index knowledge_documents_workspace_source_idx on public.knowledge_documents(workspace_id,source_id);
alter table public.knowledge_documents enable row level security;
revoke all on public.knowledge_documents from anon,authenticated;
grant select on public.knowledge_documents to authenticated;
create policy knowledge_documents_select on public.knowledge_documents for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  source_id uuid not null,
  document_id uuid not null,
  chunk_index integer not null check (chunk_index>=0),
  content text not null check (char_length(content) between 1 and 1200),
  token_count integer not null check (token_count between 1 and 500),
  embedding extensions.vector(384) not null,
  fts tsvector generated always as (to_tsvector('english',content)) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id,chunk_index),
  foreign key (workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade,
  foreign key (workspace_id,document_id) references public.knowledge_documents(workspace_id,id) on delete cascade
);
create index knowledge_chunks_workspace_source_idx on public.knowledge_chunks(workspace_id,source_id);
create index knowledge_chunks_document_idx on public.knowledge_chunks(workspace_id,document_id);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);
create index knowledge_chunks_fts_idx on public.knowledge_chunks using gin (fts);
alter table public.knowledge_chunks enable row level security;
revoke all on public.knowledge_chunks from anon,authenticated;
grant select on public.knowledge_chunks to authenticated;
create policy knowledge_chunks_select on public.knowledge_chunks for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  source_id uuid not null,
  status text not null check (status in ('queued','processing','succeeded','failed')) default 'queued',
  attempt integer not null default 0 check (attempt between 0 and 3),
  max_attempts integer not null default 3 check (max_attempts=3),
  idempotency_key uuid not null unique default gen_random_uuid(),
  lease_token uuid,
  lease_expires_at timestamptz,
  next_run_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  foreign key (workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade
);
create unique index ingestion_jobs_active_source_idx on public.ingestion_jobs(source_id)
  where status in ('queued','processing');
create index ingestion_jobs_claim_idx on public.ingestion_jobs(next_run_at,created_at)
  where status in ('queued','processing');
create index ingestion_jobs_workspace_source_idx on public.ingestion_jobs(workspace_id,source_id,created_at desc);
alter table public.ingestion_jobs enable row level security;
revoke all on public.ingestion_jobs from anon,authenticated;
grant select on public.ingestion_jobs to authenticated;
create policy ingestion_jobs_select on public.ingestion_jobs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('knowledge-private','knowledge-private',false,5242880,
  array['text/plain','text/markdown','application/pdf'])
on conflict (id) do nothing;

create function app_private.knowledge_storage_allowed(p_path text,p_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.knowledge_sources s
    where s.storage_path=p_path
      and (case when p_write then
        s.status='uploading' and app_private.has_workspace_role(s.workspace_id,array['owner','admin']::text[])
      else app_private.is_workspace_member(s.workspace_id) end)
  );
$$;
revoke all on function app_private.knowledge_storage_allowed(text,boolean) from public,anon;
grant execute on function app_private.knowledge_storage_allowed(text,boolean) to authenticated;
create policy knowledge_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id='knowledge-private' and app_private.knowledge_storage_allowed(name,true));
create policy knowledge_storage_select on storage.objects for select to authenticated
  using (bucket_id='knowledge-private' and app_private.knowledge_storage_allowed(name,false));

create function public.create_knowledge_source(p_workspace_id uuid,p_name text,p_type text,p_text text default null)
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
revoke all on function public.create_knowledge_source(uuid,text,text,text) from public,anon;
grant execute on function public.create_knowledge_source(uuid,text,text,text) to authenticated;

create function public.enqueue_knowledge_upload(p_workspace_id uuid,p_source_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_path text;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  select storage_path into v_path from public.knowledge_sources
    where id=p_source_id and workspace_id=p_workspace_id and status='uploading' for update;
  if v_path is null or not exists(select 1 from storage.objects where bucket_id='knowledge-private' and name=v_path) then
    raise exception 'UPLOAD_MISSING' using errcode='P0001';
  end if;
  update public.knowledge_sources set status='queued',updated_at=now() where id=p_source_id;
  insert into public.ingestion_jobs(workspace_id,source_id) values(p_workspace_id,p_source_id);
end; $$;
revoke all on function public.enqueue_knowledge_upload(uuid,uuid) from public,anon;
grant execute on function public.enqueue_knowledge_upload(uuid,uuid) to authenticated;

create function public.reindex_knowledge_source(p_workspace_id uuid,p_source_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_source public.knowledge_sources%rowtype;
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  select * into v_source from public.knowledge_sources
    where id=p_source_id and workspace_id=p_workspace_id for update;
  if not found or v_source.status='uploading' then raise exception 'SOURCE_UNAVAILABLE' using errcode='P0001'; end if;
  if exists(select 1 from public.ingestion_jobs where source_id=p_source_id and status in ('queued','processing')) then return; end if;
  update public.knowledge_sources set status='queued',error_code=null,error_message=null,updated_at=now() where id=p_source_id;
  insert into public.ingestion_jobs(workspace_id,source_id) values(p_workspace_id,p_source_id);
end; $$;
revoke all on function public.reindex_knowledge_source(uuid,uuid) from public,anon;
grant execute on function public.reindex_knowledge_source(uuid,uuid) to authenticated;

create function public.set_knowledge_source_enabled(p_workspace_id uuid,p_source_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  update public.knowledge_sources set enabled=p_enabled,updated_at=now()
    where workspace_id=p_workspace_id and id=p_source_id;
  if not found then raise exception 'SOURCE_UNAVAILABLE' using errcode='P0001'; end if;
end; $$;
revoke all on function public.set_knowledge_source_enabled(uuid,uuid,boolean) from public,anon;
grant execute on function public.set_knowledge_source_enabled(uuid,uuid,boolean) to authenticated;

create function public.delete_knowledge_source(p_workspace_id uuid,p_source_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  delete from public.knowledge_sources where workspace_id=p_workspace_id and id=p_source_id;
  if not found then raise exception 'SOURCE_UNAVAILABLE' using errcode='P0001'; end if;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,auth.uid(),'knowledge.deleted','knowledge_source',p_source_id,'{}'::jsonb);
end; $$;
revoke all on function public.delete_knowledge_source(uuid,uuid) from public,anon;
grant execute on function public.delete_knowledge_source(uuid,uuid) to authenticated;

create function public.claim_ingestion_job()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job public.ingestion_jobs%rowtype;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_job from public.ingestion_jobs
    where (status='queued' and next_run_at<=now())
       or (status='processing' and lease_expires_at<now())
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  if v_job.attempt>=v_job.max_attempts then
    update public.ingestion_jobs set status='failed',completed_at=now(),error_code='WORKER_TIMEOUT',
      error_message='Indexing timed out. Retry this source.' where id=v_job.id;
    update public.knowledge_sources set status='failed',error_code='WORKER_TIMEOUT',
      error_message='Indexing timed out. Retry this source.',updated_at=now() where id=v_job.source_id;
    return null;
  end if;
  update public.ingestion_jobs set status='processing',attempt=attempt+1,
    lease_token=gen_random_uuid(),lease_expires_at=now()+interval '4 minutes',
    started_at=coalesce(started_at,now()) where id=v_job.id returning * into v_job;
  update public.knowledge_sources set status='processing',updated_at=now() where id=v_job.source_id;
  return pg_catalog.jsonb_build_object('job_id',v_job.id,'source_id',v_job.source_id,
    'workspace_id',v_job.workspace_id,'lease_token',v_job.lease_token,'attempt',v_job.attempt);
end; $$;
revoke all on function public.claim_ingestion_job() from public,anon,authenticated;
grant execute on function public.claim_ingestion_job() to service_role;

create function public.finish_ingestion_job(p_job_id uuid,p_lease_token uuid,p_hash text,p_documents jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.ingestion_jobs%rowtype; v_source public.knowledge_sources%rowtype;
  v_doc jsonb; v_chunk jsonb; v_doc_id uuid; v_di integer := 0; v_ci integer; v_total integer := 0;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_job from public.ingestion_jobs where id=p_job_id and status='processing'
    and lease_token=p_lease_token and lease_expires_at>now() for update;
  if not found then raise exception 'LEASE_EXPIRED' using errcode='P0001'; end if;
  select * into v_source from public.knowledge_sources where id=v_job.source_id and workspace_id=v_job.workspace_id for update;
  if p_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_documents)<>'array' or
    jsonb_array_length(p_documents) not between 1 and 80 then
    raise exception 'INVALID_DOCUMENTS' using errcode='P0001';
  end if;
  if v_source.content_hash=p_hash and exists(select 1 from public.knowledge_chunks where source_id=v_source.id) then
    update public.knowledge_sources set status='ready',error_code=null,error_message=null,
      last_indexed_at=now(),updated_at=now() where id=v_source.id;
  else
    delete from public.knowledge_documents where source_id=v_source.id;
    for v_doc in select value from jsonb_array_elements(p_documents) loop
      if char_length(coalesce(v_doc->>'content','')) not between 1 and 80000 then
        raise exception 'INVALID_DOCUMENTS' using errcode='P0001';
      end if;
      insert into public.knowledge_documents(workspace_id,source_id,document_index,title,content,metadata)
        values(v_job.workspace_id,v_source.id,v_di,left(coalesce(v_doc->>'title',v_source.name),160),
          v_doc->>'content',pg_catalog.jsonb_build_object('page',v_doc->'page')) returning id into v_doc_id;
      v_ci := 0;
      for v_chunk in select value from jsonb_array_elements(v_doc->'chunks') loop
        insert into public.knowledge_chunks(workspace_id,source_id,document_id,chunk_index,content,token_count,embedding,metadata)
          values(v_job.workspace_id,v_source.id,v_doc_id,v_ci,v_chunk->>'content',
            (v_chunk->>'token_count')::integer,(v_chunk->'embedding')::text::extensions.vector,
            pg_catalog.jsonb_build_object('page',v_doc->'page'));
        v_ci := v_ci+1; v_total := v_total+1;
        if v_total>200 then raise exception 'TOO_MANY_CHUNKS' using errcode='P0001'; end if;
      end loop;
      v_di := v_di+1;
    end loop;
    if v_total=0 then raise exception 'NO_CHUNKS' using errcode='P0001'; end if;
    update public.knowledge_sources set content_hash=p_hash,status='ready',
      document_count=v_di,chunk_count=v_total,
      error_code=null,error_message=null,last_indexed_at=now(),updated_at=now() where id=v_source.id;
  end if;
  update public.ingestion_jobs set status='succeeded',lease_token=null,lease_expires_at=null,
    completed_at=now(),error_code=null,error_message=null where id=v_job.id;
end; $$;
revoke all on function public.finish_ingestion_job(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_ingestion_job(uuid,uuid,text,jsonb) to service_role;

create function public.fail_ingestion_job(p_job_id uuid,p_lease_token uuid,p_code text,p_message text,p_retry boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.ingestion_jobs%rowtype; v_retry boolean;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_job from public.ingestion_jobs where id=p_job_id and status='processing'
    and lease_token=p_lease_token for update;
  if not found then return; end if;
  v_retry := p_retry and v_job.attempt<v_job.max_attempts;
  update public.ingestion_jobs set status=case when v_retry then 'queued' else 'failed' end,
    lease_token=null,lease_expires_at=null,next_run_at=now()+pg_catalog.make_interval(secs=>(15*power(2,v_job.attempt-1))::integer),
    completed_at=case when v_retry then null else now() end,
    error_code=left(p_code,40),error_message=left(p_message,240) where id=v_job.id;
  update public.knowledge_sources set status=case when v_retry then 'queued' else 'failed' end,
    error_code=left(p_code,40),error_message=left(p_message,240),updated_at=now()
    where id=v_job.source_id;
end; $$;
revoke all on function public.fail_ingestion_job(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_ingestion_job(uuid,uuid,text,text,boolean) to service_role;

create function public.search_knowledge_chunks(p_workspace_id uuid,p_embedding extensions.vector(384),p_limit integer default 10)
returns table(id uuid,source_id uuid,document_id uuid,content text,metadata jsonb,distance double precision)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.is_workspace_member(p_workspace_id) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_limit not between 1 and 20 then raise exception 'INVALID_LIMIT' using errcode='P0001'; end if;
  return query select c.id,c.source_id,c.document_id,c.content,c.metadata,
    (c.embedding <=> p_embedding)::double precision
    from public.knowledge_chunks c join public.knowledge_sources s
      on s.id=c.source_id and s.workspace_id=c.workspace_id
    where c.workspace_id=p_workspace_id and s.status='ready' and s.enabled
    order by c.embedding <=> p_embedding limit p_limit;
end; $$;
revoke all on function public.search_knowledge_chunks(uuid,extensions.vector,integer) from public,anon;
grant execute on function public.search_knowledge_chunks(uuid,extensions.vector,integer) to authenticated;

select vault.create_secret(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  'knowledge_worker_token','Internal P06 scheduled worker authorization');

create function public.knowledge_worker_authorized(p_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (auth.jwt()->>'role'='service_role') and exists (
    select 1 from vault.decrypted_secrets where name='knowledge_worker_token'
      and decrypted_secret=p_token and char_length(p_token)=64
  );
$$;
revoke all on function public.knowledge_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.knowledge_worker_authorized(text) to service_role;

-- This secret is environment-specific and is provisioned after deployment.
-- No customer job can run until the project URL has been configured.
select cron.schedule('supportsphere-knowledge-worker','* * * * *',$$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_url') || '/functions/v1/knowledge-worker',
    headers:=pg_catalog.jsonb_build_object(
      'Content-Type','application/json',
      'X-Worker-Token',(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_token')
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=10000
  )
  where exists(select 1 from vault.decrypted_secrets where name='knowledge_worker_url');
$$);
