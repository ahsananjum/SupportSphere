-- Public contact intake is platform-owned, not attached to a customer workspace.
-- Only the server-held service role may read or write either table.
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email_normalized text not null,
  company text,
  topic text not null,
  message text not null,
  delivery_status text not null default 'pending',
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_name_length check (char_length(trim(full_name)) between 2 and 120),
  constraint contact_email_length check (char_length(email_normalized) between 3 and 320 and email_normalized = lower(trim(email_normalized))),
  constraint contact_company_length check (company is null or char_length(company) <= 120),
  constraint contact_topic_allowed check (topic in ('general', 'product', 'partnership', 'privacy')),
  constraint contact_message_length check (char_length(trim(message)) between 10 and 4000),
  constraint contact_delivery_status_allowed check (delivery_status in ('pending', 'sent', 'failed')),
  constraint contact_error_code_length check (last_error_code is null or char_length(last_error_code) <= 80)
);
create index contact_submissions_created_idx on public.contact_submissions(created_at desc);
create index contact_submissions_pending_idx on public.contact_submissions(created_at)
  where delivery_status in ('pending', 'failed');

create table public.contact_rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts between 1 and 20),
  expires_at timestamptz not null,
  primary key (key_hash, window_start),
  constraint contact_rate_expiry check (expires_at > window_start)
);
create index contact_rate_limits_expiry_idx on public.contact_rate_limits(expires_at);

alter table public.contact_submissions enable row level security;
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_submissions, public.contact_rate_limits from public, anon, authenticated;
grant select, insert, update on public.contact_submissions to service_role;
grant select, insert, update, delete on public.contact_rate_limits to service_role;

create function public.reserve_contact_attempt(p_key_hash text, p_max_attempts integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  accepted integer;
  current_window timestamptz := date_trunc('hour', now());
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' or p_max_attempts not between 1 and 20 then
    raise exception 'invalid rate limit input';
  end if;

  insert into public.contact_rate_limits (key_hash, window_start, attempts, expires_at)
  values (p_key_hash, current_window, 1, current_window + interval '1 hour')
  on conflict (key_hash, window_start)
  do update set attempts = public.contact_rate_limits.attempts + 1
  where public.contact_rate_limits.attempts < p_max_attempts
  returning 1 into accepted;

  return coalesce(accepted = 1, false);
end;
$$;
revoke all on function public.reserve_contact_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.reserve_contact_attempt(text, integer) to service_role;
