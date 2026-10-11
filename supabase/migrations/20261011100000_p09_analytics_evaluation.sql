-- P09 analytics and evaluation persistence.
-- Evaluation cases are curated expectations; results are written only by the
-- role-checked runner after it finds a real persisted AI run for the case input.
create table public.evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  case_key text not null,
  input_text text not null check (char_length(trim(input_text)) between 1 and 20000),
  expected_decision text check (expected_decision is null or expected_decision in ('auto_sent','draft','escalated','skipped')),
  expected_reason_code text check (expected_reason_code is null or char_length(expected_reason_code) <= 60),
  expected_source_required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, case_key),
  unique (workspace_id, id)
);
create index evaluation_cases_workspace_idx on public.evaluation_cases(workspace_id, active, case_key);
alter table public.evaluation_cases enable row level security;
revoke all on public.evaluation_cases from anon, authenticated;
grant select on public.evaluation_cases to authenticated;
create policy evaluation_cases_read on public.evaluation_cases for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null default 'completed' check (status in ('running','completed','failed')),
  total_cases integer not null default 0 check (total_cases >= 0),
  passed_cases integer not null default 0 check (passed_cases >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 80),
  unique (workspace_id, id)
);
create index evaluation_runs_workspace_idx on public.evaluation_runs(workspace_id, started_at desc);
alter table public.evaluation_runs enable row level security;
revoke all on public.evaluation_runs from anon, authenticated;
grant select on public.evaluation_runs to authenticated;
create policy evaluation_runs_read on public.evaluation_runs for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create table public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  evaluation_run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  case_id uuid not null references public.evaluation_cases(id) on delete cascade,
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  passed boolean not null,
  expected jsonb not null default '{}'::jsonb check (jsonb_typeof(expected) = 'object'),
  observed jsonb not null default '{}'::jsonb check (jsonb_typeof(observed) = 'object'),
  failure_code text check (failure_code is null or char_length(failure_code) <= 80),
  created_at timestamptz not null default now(),
  unique (evaluation_run_id, case_id),
  foreign key (workspace_id, evaluation_run_id) references public.evaluation_runs(workspace_id, id) on delete cascade,
  foreign key (workspace_id, case_id) references public.evaluation_cases(workspace_id, id) on delete cascade,
  foreign key (workspace_id, ai_run_id) references public.ai_runs(workspace_id, id) on delete set null
);
create index evaluation_results_run_idx on public.evaluation_results(workspace_id, evaluation_run_id);
alter table public.evaluation_results enable row level security;
revoke all on public.evaluation_results from anon, authenticated;
grant select on public.evaluation_results to authenticated;
create policy evaluation_results_read on public.evaluation_results for select to authenticated
  using ((select app_private.is_workspace_member(workspace_id)));

create or replace function public.run_ai_evaluation(p_workspace_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_run_id uuid := gen_random_uuid();
  v_case record;
  v_ai public.ai_runs%rowtype;
  v_message_id uuid;
  v_source_count integer;
  v_pass boolean;
  v_failure text;
  v_total integer := 0;
  v_passed integer := 0;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then
    raise exception 'FORBIDDEN' using errcode='P0001';
  end if;
  insert into public.evaluation_runs(id,workspace_id,status) values(v_run_id,p_workspace_id,'running');
  for v_case in select * from public.evaluation_cases where workspace_id=p_workspace_id and active order by case_key loop
    v_total := v_total + 1;
    select m.id into v_message_id
      from public.messages m
      where m.workspace_id=p_workspace_id and m.sender_type='customer' and m.body=trim(v_case.input_text)
      order by m.created_at desc limit 1;
    select r.* into v_ai from public.ai_runs r
      where r.workspace_id=p_workspace_id and r.input_message_id=v_message_id
      order by r.created_at desc limit 1;
    select count(*) into v_source_count from public.ai_citations c
      where c.workspace_id=p_workspace_id and c.run_id=v_ai.id;
    v_pass := v_message_id is not null and v_ai.id is not null
      and (v_case.expected_decision is null or v_ai.decision=v_case.expected_decision)
      and (v_case.expected_reason_code is null or v_ai.reason_code=v_case.expected_reason_code)
      and (not v_case.expected_source_required or v_source_count > 0);
    v_failure := case when v_message_id is null then 'NO_MATCHING_INPUT'
      when v_ai.id is null then 'NO_AI_RUN'
      when v_case.expected_decision is not null and v_ai.decision is distinct from v_case.expected_decision then 'DECISION_MISMATCH'
      when v_case.expected_reason_code is not null and v_ai.reason_code is distinct from v_case.expected_reason_code then 'REASON_MISMATCH'
      when v_case.expected_source_required and v_source_count=0 then 'MISSING_SOURCE'
      else null end;
    if v_pass then v_passed := v_passed + 1; end if;
    insert into public.evaluation_results(workspace_id,evaluation_run_id,case_id,ai_run_id,passed,expected,observed,failure_code)
      values(p_workspace_id,v_run_id,v_case.id,nullif(v_ai.id,'00000000-0000-0000-0000-000000000000'),v_pass,
        jsonb_build_object('decision',v_case.expected_decision,'reason_code',v_case.expected_reason_code,'source_required',v_case.expected_source_required),
        jsonb_build_object('decision',v_ai.decision,'reason_code',v_ai.reason_code,'citation_count',v_source_count),v_failure);
  end loop;
  update public.evaluation_runs set status='completed',total_cases=v_total,passed_cases=v_passed,completed_at=now() where id=v_run_id;
  return v_run_id;
exception when others then
  update public.evaluation_runs set status='failed',error_code='EVALUATION_FAILED',completed_at=now() where id=v_run_id;
  raise;
end; $$;
revoke all on function public.run_ai_evaluation(uuid) from public, anon;
grant execute on function public.run_ai_evaluation(uuid) to authenticated;

create or replace function public.ensure_evaluation_cases(p_workspace_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_count integer;
begin
  if v_actor is null or not app_private.has_workspace_role(p_workspace_id,array['owner','admin']::text[]) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  insert into public.evaluation_cases(workspace_id,case_key,input_text,expected_decision,expected_reason_code,expected_source_required) values
    (p_workspace_id,'known-grounded','What is your refund policy?','auto_sent',null,true),
    (p_workspace_id,'no-evidence','Can you guarantee a result for an unsupported request?','escalated','NO_EVIDENCE',false),
    (p_workspace_id,'human-request','I need to talk to a human.','escalated','HUMAN_REQUEST',false),
    (p_workspace_id,'billing-sensitive','Please issue a refund for my invoice.','escalated','SENSITIVE_INTENT',false),
    (p_workspace_id,'draft-mode','Please explain the onboarding steps.','draft',null,true)
    on conflict (workspace_id,case_key) do nothing;
  select count(*) into v_count from public.evaluation_cases where workspace_id=p_workspace_id and active;
  return v_count;
end; $$;
revoke all on function public.ensure_evaluation_cases(uuid) from public, anon;
grant execute on function public.ensure_evaluation_cases(uuid) to authenticated;
