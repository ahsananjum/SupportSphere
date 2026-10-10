create index automation_runs_rule_idx on public.automation_runs(workspace_id,rule_id,created_at desc);
