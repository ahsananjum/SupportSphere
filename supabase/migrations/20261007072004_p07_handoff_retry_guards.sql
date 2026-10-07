-- Make exhausted leases visible as human handoffs and keep final send reasons accurate.

create function app_private.mark_ai_handoff(p_workspace_id uuid,p_conversation_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.conversations set ai_handoff_reason=left(p_reason,200),ai_handoff_at=now(),
    status='open',priority=case when priority in ('low','normal') then 'high' else priority end,
    updated_at=now()
    where workspace_id=p_workspace_id and id=p_conversation_id and ai_handoff_at is null;
  if found then
    insert into public.notifications(workspace_id,user_id,kind,title,body)
      select p_workspace_id,m.user_id,'ai_handoff','Conversation needs a human',
        'AI requested a human handoff. Open the conversation to review the reason.'
      from public.workspace_members m where m.workspace_id=p_workspace_id
        and m.role in ('owner','admin','agent');
  end if;
end; $$;
revoke all on function app_private.mark_ai_handoff(uuid,uuid,text) from public,anon,authenticated;

create or replace function public.claim_ai_run()
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
    if v_mode is distinct from 'off' then
      perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,'AI worker exhausted retries');
    end if;
    return null;
  end if;
  update public.ai_runs set status='processing',attempt=attempt+1,
    lease_token=gen_random_uuid(),lease_expires_at=now()+interval '2 minutes',
    started_at=coalesce(started_at,now()) where id=v_run.id returning * into v_run;
  return pg_catalog.jsonb_build_object('id',v_run.id,'workspace_id',v_run.workspace_id,
    'conversation_id',v_run.conversation_id,'input_message_id',v_run.input_message_id,
    'lease_token',v_run.lease_token,'attempt',v_run.attempt);
end; $$;

create or replace function public.finish_ai_run(
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
    exists(select 1 from jsonb_array_elements(p_citations) cite
      where position('[' || (cite->>'ordinal') || ']' in p_output)=0) or
    exists(select 1 from public.conversations where workspace_id=v_run.workspace_id
      and id=v_run.conversation_id and (ai_handoff_at is not null or assignee_user_id is not null or status='closed')) or
    exists(select 1 from public.messages where workspace_id=v_run.workspace_id and conversation_id=v_run.conversation_id
      and (created_at,id)>(v_message.created_at,v_message.id) and sender_type in ('customer','agent','note'))
  ) then v_decision:='draft'; end if;
  if v_decision='auto_sent' and nullif(trim(p_output),'') is null then v_decision:='escalated'; end if;
  if v_decision='escalated' then
    perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,
      coalesce(p_reason,'AI_HANDOFF'));
  end if;
  if v_decision='auto_sent' then
    insert into public.messages(workspace_id,conversation_id,sender_type,body,delivery_status,client_id)
      values(v_run.workspace_id,v_run.conversation_id,'agent',trim(p_output),'sent','ai:'||v_run.id::text);
    update public.conversations set updated_at=now(),last_message_at=now()
      where workspace_id=v_run.workspace_id and id=v_run.conversation_id;
  end if;
  update public.ai_runs set status='completed',decision=v_decision,reason_code=case when v_decision<>p_requested_decision then
      case when v_decision='skipped' then 'AI_OFF' else 'DB_GATE_DOWNGRADE' end
      else left(p_reason,60) end,
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

create or replace function public.fail_ai_run(p_run_id uuid,p_lease_token uuid,p_error_code text,p_retry boolean)
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
  insert into public.ai_run_steps(workspace_id,run_id,ordinal,step_type,status,duration_ms,metadata)
    values(v_run.workspace_id,v_run.id,15+v_run.attempt,'provider','failed',0,
      pg_catalog.jsonb_build_object('code',left(p_error_code,60),'retry',v_retry))
    on conflict (run_id,ordinal) do nothing;
  if not v_retry then
    perform app_private.mark_ai_handoff(v_run.workspace_id,v_run.conversation_id,
      'AI provider unavailable');
  end if;
end; $$;
