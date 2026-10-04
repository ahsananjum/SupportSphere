-- Cover composite workspace foreign keys used for tenant integrity checks.
create index tickets_conversation_workspace_idx on public.tickets(workspace_id, conversation_id);
create index tickets_customer_workspace_idx on public.tickets(workspace_id, customer_id);
