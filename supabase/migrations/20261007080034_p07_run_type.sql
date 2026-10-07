alter table public.ai_runs add column run_type text not null default 'support_reply' check (run_type = 'support_reply');
