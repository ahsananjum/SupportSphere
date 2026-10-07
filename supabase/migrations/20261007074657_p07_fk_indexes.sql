-- Cover P07 foreign keys called out by the live Supabase performance advisor.
create index ai_agent_configs_updated_by_idx on public.ai_agent_configs(updated_by) where updated_by is not null;
create index ai_citations_chunk_idx on public.ai_citations(workspace_id,chunk_id) where chunk_id is not null;
create index ai_feedback_user_idx on public.ai_feedback(user_id);
create index ai_runs_input_message_idx on public.ai_runs(workspace_id,input_message_id) where input_message_id is not null;
