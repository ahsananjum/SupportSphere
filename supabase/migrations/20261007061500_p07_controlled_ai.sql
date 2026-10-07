-- P07 controlled AI: tenant-owned policy, durable run queue, trace, citations, feedback.
create table public.ai_agent_configs (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  mode text not null default 'off' check (mode in ('off','draft_only','assisted')),
  tone text not null default 'clear and helpful' check (char_length(tone) between 3 and 120),
  confidence_threshold numeric(4,3) not null default 0.850 check (confidence_threshold between 0.700 and 0.990),
  evidence_threshold numeric(4,3) not null default 0.750 check (evidence_threshold between 0.600 and 0.950),
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 1000),
  excluded_intents text[] not null default array['billing','security','privacy','legal','account_change']::text[],
  version integer not null default 1 check (version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.ai_agent_configs(workspace_id,mode)
select id,ai_mode from public.workspaces;
alter table public.ai_agent_configs enable row level security;
revoke all on public.ai_agent_configs from anon,authenticated;
grant select on public.ai_agent_configs to authenticated;
create policy ai_configs_read on public.ai_agent_configs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

alter table public.conversations
  add column ai_handoff_reason text,
  add column ai_handoff_at timestamptz;
alter table public.conversations
  add constraint ai_handoff_reason_length check (ai_handoff_reason is null or char_length(ai_handoff_reason) between 1 and 200);

alter table public.messages add constraint messages_workspace_id_id_key unique (workspace_id,id);
alter table public.knowledge_chunks add constraint knowledge_chunks_workspace_id_id_key unique (workspace_id,id);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid,
  input_message_id uuid,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','skipped')),
  decision text check (decision in ('auto_sent','draft','escalated','skipped')),
  reason_code text check (reason_code is null or char_length(reason_code) <= 60),
  provider text check (provider is null or char_length(provider) <= 60),
  model text check (model is null or char_length(model) <= 100),
  prompt_version text not null default 'support-v1' check (char_length(prompt_version) <= 40),
  policy_version integer not null,
  triage jsonb,
  quality jsonb,
  output_text text check (output_text is null or char_length(output_text) <= 20000),
  confidence numeric(4,3) check (confidence between 0 and 1),
  evidence_score numeric(4,3) check (evidence_score between 0 and 1),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  attempt integer not null default 0 check (attempt between 0 and 3),
  next_run_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 60),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  unique (input_message_id),
  foreign key (workspace_id,conversation_id) references public.conversations(workspace_id,id) on delete set null (conversation_id),
  foreign key (workspace_id,input_message_id) references public.messages(workspace_id,id) on delete set null (input_message_id)
);
create index ai_runs_claim_idx on public.ai_runs(next_run_at,created_at) where status in ('queued','processing');
create index ai_runs_conversation_idx on public.ai_runs(workspace_id,conversation_id,created_at desc);
create index ai_runs_workspace_idx on public.ai_runs(workspace_id,created_at desc);
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from anon,authenticated;
grant select on public.ai_runs to authenticated;
create policy ai_runs_read on public.ai_runs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.ai_run_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id uuid not null,
  ordinal integer not null check (ordinal between 0 and 20),
  step_type text not null check (step_type in ('triage','policy','retrieve','draft','quality','decision','provider')),
  status text not null check (status in ('passed','failed','skipped')),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now(),
  unique (run_id,ordinal),
  foreign key (workspace_id,run_id) references public.ai_runs(workspace_id,id) on delete cascade
);
create index ai_run_steps_run_idx on public.ai_run_steps(workspace_id,run_id,ordinal);
alter table public.ai_run_steps enable row level security;
revoke all on public.ai_run_steps from anon,authenticated;
grant select on public.ai_run_steps to authenticated;
create policy ai_steps_read on public.ai_run_steps for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id uuid not null,
  source_id uuid,
  chunk_id uuid,
  ordinal integer not null check (ordinal between 1 and 10),
  score numeric(4,3) not null check (score between 0 and 1),
  snippet text not null check (char_length(snippet) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (run_id,ordinal),
  foreign key (workspace_id,run_id) references public.ai_runs(workspace_id,id) on delete cascade,
  foreign key (workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete set null (source_id),
  foreign key (workspace_id,chunk_id) references public.knowledge_chunks(workspace_id,id) on delete set null (chunk_id)
);
create index ai_citations_run_idx on public.ai_citations(workspace_id,run_id,ordinal);
create index ai_citations_source_idx on public.ai_citations(workspace_id,source_id);
alter table public.ai_citations enable row level security;
revoke all on public.ai_citations from anon,authenticated;
grant select on public.ai_citations to authenticated;
create policy ai_citations_read on public.ai_citations for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  rating text not null check (rating in ('helpful','unhelpful')),
  reason text check (reason is null or char_length(reason) <= 80),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (run_id,user_id),
  foreign key (workspace_id,run_id) references public.ai_runs(workspace_id,id) on delete cascade
);
create index ai_feedback_run_idx on public.ai_feedback(workspace_id,run_id);
alter table public.ai_feedback enable row level security;
revoke all on public.ai_feedback from anon,authenticated;
grant select on public.ai_feedback to authenticated;
create policy ai_feedback_read on public.ai_feedback for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('onboarding_complete','member_joined','ai_handoff'));

create function app_private.sync_ai_mode()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.ai_agent_configs(workspace_id,mode)
    values(new.id,new.ai_mode)
    on conflict (workspace_id) do update set mode=excluded.mode,
      version=case when public.ai_agent_configs.mode is distinct from excluded.mode
        then public.ai_agent_configs.version+1 else public.ai_agent_configs.version end,
      updated_at=case when public.ai_agent_configs.mode is distinct from excluded.mode
        then now() else public.ai_agent_configs.updated_at end;
  return new;
end; $$;
revoke all on function app_private.sync_ai_mode() from public,anon,authenticated;
create trigger sync_ai_mode after insert or update of ai_mode on public.workspaces
for each row execute function app_private.sync_ai_mode();

create function public.update_ai_config(
  p_workspace_id uuid,p_mode text,p_tone text,p_confidence numeric,
  p_evidence numeric,p_custom_instructions text,p_excluded_intents text[]
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_mode not in ('off','draft_only','assisted') or
     char_length(trim(coalesce(p_tone,''))) not between 3 and 120 or
     p_confidence not between 0.700 and 0.990 or p_evidence not between 0.600 and 0.950 or
     char_length(coalesce(p_custom_instructions,''))>1000 or
     coalesce(array_length(p_excluded_intents,1),0)>15 or
     exists(select 1 from unnest(p_excluded_intents) value where value !~ '^[a-z_]{2,40}$') then
    raise exception 'INVALID_POLICY' using errcode='P0001';
  end if;
  update public.workspaces set ai_mode=p_mode where id=p_workspace_id;
  update public.ai_agent_configs set tone=trim(p_tone),confidence_threshold=p_confidence,
    evidence_threshold=p_evidence,custom_instructions=coalesce(p_custom_instructions,''),
    excluded_intents=p_excluded_intents,version=version+1,updated_by=v_actor,updated_at=now()
    where workspace_id=p_workspace_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,v_actor,'ai.policy_updated','workspace',p_workspace_id,
      pg_catalog.jsonb_build_object('mode',p_mode));
end; $$;
revoke all on function public.update_ai_config(uuid,text,text,numeric,numeric,text,text[]) from public,anon;
grant execute on function public.update_ai_config(uuid,text,text,numeric,numeric,text,text[]) to authenticated;

create function public.submit_ai_feedback(p_workspace_id uuid,p_run_id uuid,p_rating text,p_reason text,p_comment text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  if p_rating not in ('helpful','unhelpful') or char_length(coalesce(p_reason,''))>80 or
     char_length(coalesce(p_comment,''))>500 then
    raise exception 'INVALID_FEEDBACK' using errcode='P0001';
  end if;
  insert into public.ai_feedback(workspace_id,run_id,user_id,rating,reason,comment)
    values(p_workspace_id,p_run_id,auth.uid(),p_rating,nullif(trim(p_reason),''),nullif(trim(p_comment),''))
    on conflict (run_id,user_id) do update set rating=excluded.rating,reason=excluded.reason,
      comment=excluded.comment,created_at=now();
end; $$;
revoke all on function public.submit_ai_feedback(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.submit_ai_feedback(uuid,uuid,text,text,text) to authenticated;

create function public.release_ai_handoff(p_workspace_id uuid,p_conversation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin','agent']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  update public.conversations set ai_handoff_reason=null,ai_handoff_at=null,updated_at=now()
    where workspace_id=p_workspace_id and id=p_conversation_id and ai_handoff_at is not null;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.audit_logs(workspace_id,actor_user_id,action,target_type,target_id,metadata)
    values(p_workspace_id,auth.uid(),'ai.handoff_released','conversation',p_conversation_id,'{}'::jsonb);
end; $$;
revoke all on function public.release_ai_handoff(uuid,uuid) from public,anon;
grant execute on function public.release_ai_handoff(uuid,uuid) to authenticated;

create function app_private.enqueue_ai_for_message()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_config public.ai_agent_configs%rowtype; v_recent integer;
begin
  if new.sender_type<>'customer' then return new; end if;
  select * into v_config from public.ai_agent_configs where workspace_id=new.workspace_id;
  if not found or v_config.mode='off' then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.workspace_id::text,81));
  select count(*) into v_recent from public.ai_runs where workspace_id=new.workspace_id
    and created_at>now()-interval '1 hour';
  insert into public.ai_runs(workspace_id,conversation_id,input_message_id,status,decision,reason_code,policy_version)
    values(new.workspace_id,new.conversation_id,new.id,
      case when v_recent>=60 then 'skipped' else 'queued' end,
      case when v_recent>=60 then 'skipped' else null end,
      case when v_recent>=60 then 'RATE_LIMIT' else null end,v_config.version);
  return new;
end; $$;
revoke all on function app_private.enqueue_ai_for_message() from public,anon,authenticated;
create trigger enqueue_ai_after_customer_message after insert on public.messages
for each row execute function app_private.enqueue_ai_for_message();

create function public.claim_ai_run()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_mode text;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs
    where (status='queued' and next_run_at<=now()) or
      (status='processing' and lease_expires_at<now())
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return null; end if;
  select mode into v_mode from public.ai_agent_configs where workspace_id=v_run.workspace_id;
  if v_mode is null or v_mode='off' or v_run.attempt>=3 then
    update public.ai_runs set status=case when v_mode='off' then 'skipped' else 'failed' end,
      decision=case when v_mode='off' then 'skipped' else 'escalated' end,
      reason_code=case when v_mode='off' then 'AI_OFF' else 'RETRY_EXHAUSTED' end,
      completed_at=now(),lease_token=null,lease_expires_at=null where id=v_run.id;
    return null;
  end if;
  update public.ai_runs set status='processing',attempt=attempt+1,
    lease_token=gen_random_uuid(),lease_expires_at=now()+interval '2 minutes',
    started_at=coalesce(started_at,now()) where id=v_run.id returning * into v_run;
  return pg_catalog.jsonb_build_object('id',v_run.id,'workspace_id',v_run.workspace_id,
    'conversation_id',v_run.conversation_id,'input_message_id',v_run.input_message_id,
    'lease_token',v_run.lease_token,'attempt',v_run.attempt);
end; $$;
revoke all on function public.claim_ai_run() from public,anon,authenticated;
grant execute on function public.claim_ai_run() to service_role;

create function public.search_ai_knowledge(p_workspace_id uuid,p_embedding extensions.vector(384),p_limit integer default 5)
returns table(chunk_id uuid,source_id uuid,source_name text,content text,score double precision)
language plpgsql security definer set search_path='' as $$
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if p_limit not between 1 and 10 then raise exception 'INVALID_LIMIT' using errcode='P0001'; end if;
  return query select c.id,c.source_id,s.name,c.content,
    (1-(c.embedding <=> p_embedding))::double precision
    from public.knowledge_chunks c join public.knowledge_sources s
      on s.workspace_id=c.workspace_id and s.id=c.source_id
    where c.workspace_id=p_workspace_id and s.status='ready' and s.enabled
    order by c.embedding <=> p_embedding limit p_limit;
end; $$;
revoke all on function public.search_ai_knowledge(uuid,extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.search_ai_knowledge(uuid,extensions.vector,integer) to service_role;

create function public.finish_ai_run(
  p_run_id uuid,p_lease_token uuid,p_provider text,p_model text,p_triage jsonb,p_quality jsonb,
  p_output text,p_confidence numeric,p_evidence numeric,p_requested_decision text,p_reason text,
  p_steps jsonb,p_citations jsonb,p_input_tokens integer,p_output_tokens integer,p_latency_ms integer
) returns text language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_config public.ai_agent_configs%rowtype;
  v_decision text; v_step jsonb; v_cite jsonb; v_index integer:=0; v_message public.messages%rowtype;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs where id=p_run_id and status='processing'
    and lease_token=p_lease_token and lease_expires_at>now() for update;
  if not found then raise exception 'LEASE_EXPIRED' using errcode='P0001'; end if;
  select * into v_config from public.ai_agent_configs where workspace_id=v_run.workspace_id for update;
  select * into v_message from public.messages where id=v_run.input_message_id
    and workspace_id=v_run.workspace_id and conversation_id=v_run.conversation_id;
  if not found or v_message.sender_type<>'customer' then raise exception 'INPUT_MISSING' using errcode='P0001'; end if;
  if p_requested_decision not in ('auto_sent','draft','escalated','skipped') or
     char_length(coalesce(p_output,''))>20000 or char_length(coalesce(p_reason,''))>60 or
     jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)>20 or
     jsonb_typeof(p_citations)<>'array' or jsonb_array_length(p_citations)>10 then
    raise exception 'INVALID_RESULT' using errcode='P0001';
  end if;
  v_decision := p_requested_decision;
  if v_config.mode='off' then v_decision:='skipped'; end if;
  if v_decision='auto_sent' and (
    v_config.mode<>'assisted' or v_config.version<>v_run.policy_version or
    coalesce(p_confidence,0)<v_config.confidence_threshold or coalesce(p_evidence,0)<v_config.evidence_threshold or
    coalesce(p_quality->>'passed','false')<>'true' or coalesce(p_quality->>'grounded','false')<>'true' or
    coalesce(p_quality->>'safe','false')<>'true' or coalesce(p_quality->>'tone_ok','false')<>'true' or
    coalesce(p_triage->>'escalate','true')<>'false' or coalesce(p_triage->>'intent','') not in ('how_to','product_info') or
    p_triage->>'intent'=any(v_config.excluded_intents) or jsonb_array_length(p_citations)=0 or
    exists(select 1 from public.conversations where workspace_id=v_run.workspace_id
      and id=v_run.conversation_id and (ai_handoff_at is not null or assignee_user_id is not null or status='closed')) or
    exists(select 1 from public.messages where workspace_id=v_run.workspace_id and conversation_id=v_run.conversation_id
      and created_at>v_message.created_at and sender_type in ('customer','agent','note'))
  ) then v_decision:='draft'; end if;
  if v_decision='auto_sent' and nullif(trim(p_output),'') is null then v_decision:='escalated'; end if;
  if v_decision='escalated' then
    update public.conversations set ai_handoff_reason=left(coalesce(p_reason,'AI_HANDOFF'),200),
      ai_handoff_at=coalesce(ai_handoff_at,now()),status='open',
      priority=case when priority in ('low','normal') then 'high' else priority end,
      updated_at=now() where workspace_id=v_run.workspace_id and id=v_run.conversation_id;
    insert into public.notifications(workspace_id,user_id,kind,title,body)
      select v_run.workspace_id,m.user_id,'ai_handoff','Conversation needs a human',
        'AI requested a human handoff. Open the conversation to review the reason.'
      from public.workspace_members m where m.workspace_id=v_run.workspace_id
        and m.role in ('owner','admin','agent');
  end if;
  if v_decision='auto_sent' then
    insert into public.messages(workspace_id,conversation_id,sender_type,body,delivery_status,client_id)
      values(v_run.workspace_id,v_run.conversation_id,'agent',trim(p_output),'sent','ai:'||v_run.id::text);
    update public.conversations set updated_at=now(),last_message_at=now()
      where workspace_id=v_run.workspace_id and id=v_run.conversation_id;
  end if;
  update public.ai_runs set status='completed',decision=v_decision,reason_code=left(p_reason,60),
    provider=left(p_provider,60),model=left(p_model,100),triage=p_triage,quality=p_quality,
    output_text=case when v_decision='skipped' then null else p_output end,
    confidence=p_confidence,evidence_score=p_evidence,input_tokens=p_input_tokens,
    output_tokens=p_output_tokens,latency_ms=p_latency_ms,
    lease_token=null,lease_expires_at=null,completed_at=now() where id=v_run.id;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    insert into public.ai_run_steps(workspace_id,run_id,ordinal,step_type,status,duration_ms,metadata)
      values(v_run.workspace_id,v_run.id,v_index,v_step->>'type',v_step->>'status',
        coalesce((v_step->>'duration_ms')::integer,0),coalesce(v_step->'metadata','{}'::jsonb));
    v_index:=v_index+1;
  end loop;
  for v_cite in select value from jsonb_array_elements(p_citations) loop
    if not exists(select 1 from public.knowledge_chunks c where c.workspace_id=v_run.workspace_id
      and c.id=(v_cite->>'chunk_id')::uuid and c.source_id=(v_cite->>'source_id')::uuid) then
      raise exception 'INVALID_CITATION' using errcode='P0001';
    end if;
    insert into public.ai_citations(workspace_id,run_id,source_id,chunk_id,ordinal,score,snippet)
      values(v_run.workspace_id,v_run.id,(v_cite->>'source_id')::uuid,
        (v_cite->>'chunk_id')::uuid,(v_cite->>'ordinal')::integer,
        (v_cite->>'score')::numeric,left(v_cite->>'snippet',500));
  end loop;
  return v_decision;
end; $$;
revoke all on function public.finish_ai_run(uuid,uuid,text,text,jsonb,jsonb,text,numeric,numeric,text,text,jsonb,jsonb,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_ai_run(uuid,uuid,text,text,jsonb,jsonb,text,numeric,numeric,text,text,jsonb,jsonb,integer,integer,integer) to service_role;

create function public.fail_ai_run(p_run_id uuid,p_lease_token uuid,p_error_code text,p_retry boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_run public.ai_runs%rowtype; v_retry boolean;
begin
  if auth.jwt()->>'role'<>'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into v_run from public.ai_runs where id=p_run_id and status='processing'
    and lease_token=p_lease_token for update;
  if not found then return; end if;
  v_retry:=p_retry and v_run.attempt<3;
  update public.ai_runs set status=case when v_retry then 'queued' else 'failed' end,
    decision=case when v_retry then null else 'escalated' end,
    reason_code=case when v_retry then null else 'PROVIDER_UNAVAILABLE' end,
    error_code=left(p_error_code,60),
    next_run_at=now()+pg_catalog.make_interval(secs=>(15*power(2,v_run.attempt-1))::integer),
    lease_token=null,lease_expires_at=null,
    completed_at=case when v_retry then null else now() end where id=v_run.id;
  if not v_retry then
    insert into public.notifications(workspace_id,user_id,kind,title,body)
      select v_run.workspace_id,m.user_id,'ai_handoff','AI needs a human',
        'AI could not finish this reply. Open the conversation for human support.'
      from public.workspace_members m where m.workspace_id=v_run.workspace_id
        and m.role in ('owner','admin','agent');
    update public.conversations set ai_handoff_reason='AI provider unavailable',ai_handoff_at=now(),
      status='open',updated_at=now() where workspace_id=v_run.workspace_id and id=v_run.conversation_id;
  end if;
end; $$;
revoke all on function public.fail_ai_run(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fail_ai_run(uuid,uuid,text,boolean) to service_role;

select vault.create_secret(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  'ai_worker_token','Internal P07 scheduled worker authorization');
create function public.ai_worker_authorized(p_token text)
returns boolean language sql stable security definer set search_path='' as $$
  select (auth.jwt()->>'role'='service_role') and exists (
    select 1 from vault.decrypted_secrets where name='ai_worker_token'
      and decrypted_secret=p_token and char_length(p_token)=64
  );
$$;
revoke all on function public.ai_worker_authorized(text) from public,anon,authenticated;
grant execute on function public.ai_worker_authorized(text) to service_role;
select cron.schedule('supportsphere-ai-worker','* * * * *',$$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='knowledge_worker_url') || '/functions/v1/ai-worker',
    headers:=pg_catalog.jsonb_build_object('Content-Type','application/json',
      'X-Worker-Token',(select decrypted_secret from vault.decrypted_secrets where name='ai_worker_token')),
    body:='{}'::jsonb,timeout_milliseconds:=10000)
  where exists(select 1 from vault.decrypted_secrets where name='knowledge_worker_url');
$$);
