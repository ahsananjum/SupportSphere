-- U3.7: lock and recheck current tenant-scoped evidence at the final send boundary.
-- Existing policy/role/revision/lease/idempotency gates remain authoritative.
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
  perform 1 from public.conversations where workspace_id=v_run.workspace_id and id=v_run.conversation_id for update;
  if not found then raise exception 'INPUT_MISSING' using errcode='P0001'; end if;
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
  -- Lock sources before chunks in stable order, matching ingestion lifecycle locks.
  -- Disable/delete/reindex cannot invalidate evidence between this check and send.
  perform s.id from public.knowledge_sources s
    where s.workspace_id=v_run.workspace_id and s.id in
      (select (cite->>'source_id')::uuid from jsonb_array_elements(p_citations) cite)
    order by s.id for share;
  perform c.id from public.knowledge_chunks c
    where c.workspace_id=v_run.workspace_id and c.id in
      (select (cite->>'chunk_id')::uuid from jsonb_array_elements(p_citations) cite)
    order by c.id for share;
  v_decision := p_requested_decision;
  if v_run.run_type='draft' and v_decision='auto_sent' then v_decision:='draft'; end if;
  if v_run.run_type='triage' and v_decision not in ('escalated','skipped') then v_decision:='skipped'; end if;
  if not app_private.ai_automation_allowed(v_run.id) then v_decision:='skipped'; p_reason:='AUTOMATION_CHANGED'; end if;
  if v_config.mode='off' then v_decision:='skipped'; end if;
  if v_decision='auto_sent' and exists (
    select 1 from jsonb_array_elements(p_citations) cite
    where not exists (
      select 1 from public.knowledge_chunks c
      join public.knowledge_sources s on s.workspace_id=c.workspace_id and s.id=c.source_id
      where c.workspace_id=v_run.workspace_id and c.id=(cite->>'chunk_id')::uuid
        and c.source_id=(cite->>'source_id')::uuid and s.status='ready' and s.enabled
    ) or coalesce((cite->>'score')::numeric,0)<v_config.evidence_threshold
  ) then v_decision:='draft'; p_reason:='EVIDENCE_CHANGED'; end if;
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
  if not app_private.support_revision_matches(v_run.workspace_id,'conversation',v_run.conversation_id,v_run.support_revision::text) then
    v_decision:='skipped'; p_reason:='HUMAN_OVERRIDE';
  end if;
  if v_decision='auto_sent' and nullif(trim(p_output),'') is null then v_decision:='escalated'; end if;
  -- Row-lock waits must not extend the authority of an expired worker lease.
  if v_run.lease_expires_at<=clock_timestamp() then
    raise exception 'LEASE_EXPIRED' using errcode='P0001';
  end if;
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
      case when p_reason in ('AUTOMATION_CHANGED','HUMAN_OVERRIDE','EVIDENCE_CHANGED') then p_reason when v_config.mode='off' then 'AI_OFF' when v_run.run_type='triage' then 'TRIAGE_COMPLETE' else 'DB_GATE_DOWNGRADE' end
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

revoke all on function public.finish_ai_run(uuid,uuid,text,text,jsonb,jsonb,text,numeric,numeric,text,text,jsonb,jsonb,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_ai_run(uuid,uuid,text,text,jsonb,jsonb,text,numeric,numeric,text,text,jsonb,jsonb,integer,integer,integer) to service_role;
