-- Keep the elevated settings implementation outside the exposed API schema.
alter function public.configure_widget(uuid,text[],boolean) set schema app_private;
revoke all on function app_private.configure_widget(uuid,text[],boolean) from public,anon;
grant execute on function app_private.configure_widget(uuid,text[],boolean) to authenticated;
create function public.configure_widget(p_workspace_id uuid,p_origins text[],p_enabled boolean)
returns text language sql security invoker set search_path = ''
as $$ select app_private.configure_widget($1,$2,$3) $$;
revoke all on function public.configure_widget(uuid,text[],boolean) from public,anon;
grant execute on function public.configure_widget(uuid,text[],boolean) to authenticated;

create index widget_sessions_customer_workspace_idx on public.widget_sessions(workspace_id,customer_id);
create index widget_sessions_conversation_workspace_idx on public.widget_sessions(workspace_id,conversation_id);
create index widget_sessions_widget_key_idx on public.widget_sessions(widget_key);

-- Bound the private rate table without a separate cron/manual provider step.
create or replace function public.reserve_widget_rate(p_bucket_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  if char_length(p_bucket_key) != 64 or p_bucket_key !~ '^[a-f0-9]+$' or
     p_limit not between 1 and 100 or p_window_seconds not between 1 and 3600 then
    raise exception 'INVALID_RATE_BUCKET' using errcode='P0001';
  end if;
  if pg_catalog.random() < 0.01 then
    delete from public.widget_rate_buckets where bucket_key in (
      select bucket_key from public.widget_rate_buckets
      where reset_at < now() - interval '1 day' limit 100
    );
  end if;
  insert into public.widget_rate_buckets(bucket_key,hits,reset_at)
    values(p_bucket_key,1,now()+pg_catalog.make_interval(secs=>p_window_seconds))
    on conflict (bucket_key) do update set
      hits=case when widget_rate_buckets.reset_at <= now() then 1 else widget_rate_buckets.hits+1 end,
      reset_at=case when widget_rate_buckets.reset_at <= now() then now()+pg_catalog.make_interval(secs=>p_window_seconds) else widget_rate_buckets.reset_at end
    returning hits into v_hits;
  return v_hits <= p_limit;
end; $$;
revoke all on function public.reserve_widget_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_widget_rate(text,integer,integer) to service_role;
