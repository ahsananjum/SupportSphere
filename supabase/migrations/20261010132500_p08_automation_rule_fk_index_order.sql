-- The foreign-key column must lead the covering index for Supabase's advisor
-- and for rule-scoped run-history lookups.
drop index if exists public.automation_runs_rule_idx;
create index automation_runs_rule_idx
  on public.automation_runs(rule_id, workspace_id, created_at desc);
