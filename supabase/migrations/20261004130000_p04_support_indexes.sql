-- P04 advisor follow-up: cover foreign keys used by tenant joins and cleanup.
create index customer_identities_workspace_idx on public.customer_identities(workspace_id);
create index conversations_customer_fk_idx on public.conversations(customer_id);
create index conversations_assignee_fk_idx on public.conversations(assignee_user_id);
create index messages_conversation_fk_idx on public.messages(conversation_id);
create index messages_sender_fk_idx on public.messages(sender_user_id);
create index tickets_customer_fk_idx on public.tickets(customer_id);
create index tickets_conversation_fk_idx on public.tickets(conversation_id);
create index tickets_assignee_fk_idx on public.tickets(assignee_user_id);
create index ticket_events_ticket_fk_idx on public.ticket_events(ticket_id);
create index ticket_events_actor_fk_idx on public.ticket_events(actor_user_id);
create index customer_tags_workspace_idx on public.customer_tags(workspace_id);
create index customer_tags_tag_idx on public.customer_tags(tag_id);
create index conversation_tags_workspace_idx on public.conversation_tags(workspace_id);
create index conversation_tags_tag_idx on public.conversation_tags(tag_id);
create index ticket_tags_workspace_idx on public.ticket_tags(workspace_id);
create index ticket_tags_tag_idx on public.ticket_tags(tag_id);
