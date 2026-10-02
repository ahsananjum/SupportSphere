-- Cover the notifications workspace foreign key for membership/workspace lifecycle queries.
create index notifications_workspace_idx on public.notifications(workspace_id);
