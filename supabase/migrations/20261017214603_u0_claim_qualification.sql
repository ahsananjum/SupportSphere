-- Qualify columns that collide with RETURNS TABLE output variables.
create or replace function public.claim_automation_run()
returns table(id uuid,workspace_id uuid,rule_id uuid,trigger_type text,trigger_entity_id uuid,payload jsonb,attempt integer,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare v_run public.automation_runs%rowtype; v_token uuid:=gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.automation_runs as target set status='queued',lease_token=null,lease_expires_at=null
    where status='processing' and lease_expires_at<now();
  select * into v_run from public.automation_runs where status='queued' and next_run_at<=now()
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.automation_runs as target set status='processing',attempt=target.attempt+1,lease_token=v_token,
    lease_expires_at=now()+interval '4 minutes',started_at=coalesce(started_at,now())
    where target.id=v_run.id;
  return query select v_run.id,v_run.workspace_id,v_run.rule_id,v_run.trigger_type,v_run.trigger_entity_id,
    v_run.payload,v_run.attempt+1,v_token;
end;
$$;
revoke all on function public.claim_automation_run() from public,anon,authenticated;
grant execute on function public.claim_automation_run() to service_role;


create or replace function public.claim_durable_job()
returns table(id uuid,workspace_id uuid,job_type text,entity_id uuid,payload jsonb,attempt integer,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare v_job public.durable_jobs%rowtype; v_token uuid:=gen_random_uuid();
begin
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  update public.durable_jobs as target set status='queued',lease_token=null,lease_expires_at=null
    where status='processing' and lease_expires_at<now();
  select * into v_job from public.durable_jobs where status='queued' and next_run_at<=now()
    order by next_run_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.durable_jobs as target set status='processing',attempt=target.attempt+1,lease_token=v_token,
    lease_expires_at=now()+interval '4 minutes',started_at=coalesce(started_at,now()) where target.id=v_job.id;
  return query select v_job.id,v_job.workspace_id,v_job.job_type,v_job.entity_id,v_job.payload,v_job.attempt+1,v_token;
end;
$$;
revoke all on function public.claim_durable_job() from public,anon,authenticated;
grant execute on function public.claim_durable_job() to service_role;

