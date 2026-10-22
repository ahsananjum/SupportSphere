-- Repair the hosted U0 routing wrapper ACL before continuing the ordered rollout.
revoke all on function public.update_ticket_routing(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.update_ticket_routing(uuid,uuid,text,text,text) to authenticated;
