create function app_private.knowledge_storage_delete_allowed(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.knowledge_sources s
    where s.storage_path=p_path
      and app_private.has_workspace_role(s.workspace_id,array['owner','admin']::text[])
  );
$$;
revoke all on function app_private.knowledge_storage_delete_allowed(text) from public,anon;
grant execute on function app_private.knowledge_storage_delete_allowed(text) to authenticated;
create policy knowledge_storage_delete on storage.objects for delete to authenticated
  using (bucket_id='knowledge-private' and app_private.knowledge_storage_delete_allowed(name));
