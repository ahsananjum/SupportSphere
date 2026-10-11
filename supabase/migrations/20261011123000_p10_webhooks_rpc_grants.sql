-- Invoker wrappers need EXECUTE on their private role-checked implementation.
grant execute on function app_private.create_webhook_endpoint(uuid,text,text,text,text[]) to authenticated;
grant execute on function app_private.update_webhook_endpoint(uuid,uuid,text,text,text[],boolean) to authenticated;
grant execute on function app_private.delete_webhook_endpoint(uuid,uuid) to authenticated;
grant execute on function app_private.enqueue_webhook_test(uuid,uuid) to authenticated;
