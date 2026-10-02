-- Completed workspaces must retain a real support identity after later settings edits.
alter table public.workspaces add constraint workspaces_completed_identity_check
check (onboarding_completed_at is null or
  (company_name is not null and support_name is not null and support_email is not null));
