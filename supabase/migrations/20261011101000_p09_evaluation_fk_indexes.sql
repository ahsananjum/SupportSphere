create index evaluation_results_ai_run_idx on public.evaluation_results(ai_run_id);
create index evaluation_results_case_idx on public.evaluation_results(case_id);
create index evaluation_results_workspace_ai_run_idx on public.evaluation_results(workspace_id, ai_run_id);
create index evaluation_results_workspace_case_idx on public.evaluation_results(workspace_id, case_id);
