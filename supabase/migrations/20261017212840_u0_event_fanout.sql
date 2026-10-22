-- Independent event fan-out with existing dedupe and recursion suppression.
create or replace function app_private.automation_event_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_type text;
  v_entity uuid;
  v_payload jsonb;
  v_key text;
begin
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); end if;
  v_entity := (v_new->>'id')::uuid;
  v_payload := jsonb_build_object('id', v_entity);

  if tg_table_name = 'conversations' and tg_op = 'INSERT' then
    v_type := 'conversation_created';
    v_payload := jsonb_build_object(
      'id', v_entity,
      'status', v_new->>'status',
      'priority', v_new->>'priority',
      'channel', v_new->>'channel'
    );
    v_key := 'conversation_created:' || v_entity::text;
  elsif tg_table_name = 'messages' and tg_op = 'INSERT' and v_new->>'sender_type' = 'customer' then
    v_type := 'customer_message_received';
    v_entity := (v_new->>'conversation_id')::uuid;
    v_payload := jsonb_build_object(
      'id', v_entity,
      'message_id', (v_new->>'id')::uuid,
      'priority', (select priority from public.conversations where id = v_entity),
      'status', (select status from public.conversations where id = v_entity),
      'channel', (select channel from public.conversations where id = v_entity)
    );
    v_key := 'message:' || (v_new->>'id');
  elsif tg_table_name = 'tickets' and tg_op = 'INSERT' then
    v_type := 'ticket_created';
    v_payload := jsonb_build_object(
      'id', v_entity,
      'status', v_new->>'status',
      'priority', v_new->>'priority'
    );
    v_key := 'ticket:' || v_entity::text;
  end if;


  if v_type is not null and coalesce(current_setting('app.automation_executing', true), '') <> 'on' then
    perform app_private.enqueue_automation_event(
      (v_new->>'workspace_id')::uuid, v_type, v_entity, v_payload, v_key
    );
  end if;
  -- A single support write can cause several independent events.
  if tg_table_name='conversations' and tg_op='UPDATE' and coalesce(current_setting('app.automation_executing',true),'')<>'on' then
    if v_new->>'priority' is distinct from v_old->>'priority' then
      perform app_private.enqueue_automation_event((v_new->>'workspace_id')::uuid,'priority_changed',v_entity,
        jsonb_build_object('id',v_entity,'priority',v_new->>'priority','previous_priority',v_old->>'priority','status',v_new->>'status','channel',v_new->>'channel'),
        'priority:'||v_entity::text||':'||(v_new->>'updated_at'));
    end if;
    if v_old->>'ai_handoff_at' is null and v_new->>'ai_handoff_at' is not null then
      perform app_private.enqueue_automation_event((v_new->>'workspace_id')::uuid,'escalation',v_entity,
        jsonb_build_object('id',v_entity,'reason',v_new->>'ai_handoff_reason','priority',v_new->>'priority','status',v_new->>'status','channel',v_new->>'channel'),
        'escalation:'||v_entity::text||':'||(v_new->>'ai_handoff_at'));
    end if;
  end if;
  return new;
end;
$$;

