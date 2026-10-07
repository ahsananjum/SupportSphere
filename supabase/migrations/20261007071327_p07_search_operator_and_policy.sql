-- Qualify pgvector operator under restrictive SECURITY DEFINER search_path.

create or replace function public.search_knowledge_chunks(p_workspace_id uuid,p_embedding extensions.vector(384),p_limit integer default 10)
returns table(id uuid,source_id uuid,document_id uuid,content text,metadata jsonb,distance double precision)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.is_workspace_member(p_workspace_id) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_limit not between 1 and 20 then raise exception 'INVALID_LIMIT' using errcode='P0001'; end if;
  return query select c.id,c.source_id,c.document_id,c.content,c.metadata,
    (c.embedding operator(extensions.<=>) p_embedding)::double precision
    from public.knowledge_chunks c join public.knowledge_sources s
      on s.id=c.source_id and s.workspace_id=c.workspace_id
    where c.workspace_id=p_workspace_id and s.status='ready' and s.enabled
    order by c.embedding operator(extensions.<=>) p_embedding limit p_limit;
end; $$;

create or replace function public.search_ai_knowledge(p_workspace_id uuid,p_embedding extensions.vector(384),p_limit integer default 5)
returns table(chunk_id uuid,source_id uuid,source_name text,content text,score double precision)
language plpgsql security definer set search_path='' as $$
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_limit not between 1 and 10 then raise exception 'INVALID_LIMIT' using errcode='P0001'; end if;
  return query select c.id,c.source_id,s.name,c.content,
    (1-(c.embedding operator(extensions.<=>) p_embedding))::double precision
    from public.knowledge_chunks c join public.knowledge_sources s
      on s.workspace_id=c.workspace_id and s.id=c.source_id
    where c.workspace_id=p_workspace_id and s.status='ready' and s.enabled
    order by c.embedding operator(extensions.<=>) p_embedding limit p_limit;
end; $$;

alter table public.ai_agent_configs add constraint ai_config_mandatory_handoffs
  check (excluded_intents @> array['billing','security','privacy','legal','account_change']::text[]);
