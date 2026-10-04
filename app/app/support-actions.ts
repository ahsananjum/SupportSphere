'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import {
  customerSchema,
  conversationSchema,
  messageSchema,
  ticketSchema,
} from '../../lib/validation/support';
import type { FormState } from '../../lib/action-state';

function messageFor(error?: string) {
  if (error?.includes('FORBIDDEN'))
    return 'You do not have permission to change support records.';
  if (error?.includes('NOT_FOUND'))
    return 'That support record is no longer available.';
  if (error?.includes('INVALID_INPUT'))
    return 'Check the highlighted fields and try again.';
  return 'We could not save this support record. Try again.';
}

function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : '',
    ]),
  );
}
// Supabase's generated RPC types currently flatten nullable PostgreSQL
// parameters to strings. Keep the runtime null semantics used by the
// SECURITY DEFINER functions while preserving the generated schema file.
function nullableRpc<T>(value: T | null): T {
  return value as T;
}
export async function createCustomer(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = customerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    company: formData.get('company'),
  });
  if (!parsed.success)
    return {
      fields: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return { message: 'Create a workspace before adding customers.' };
  const { data, error } = await supabase.rpc('create_or_get_customer', {
    p_workspace_id: active.id,
    p_name: parsed.data.name,
    p_email: parsed.data.email ?? '',
    p_phone: parsed.data.phone ?? '',
    p_company: parsed.data.company ?? '',
    p_provider: 'manual',
    p_identity_key: '',
  });
  if (error || !data)
    return { message: messageFor(error?.message), values: parsed.data };
  redirect(`/app/customers/${data}`);
}
export async function createConversation(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = conversationSchema.safeParse({
    customerId: formData.get('customerId'),
    subject: formData.get('subject'),
    channel: formData.get('channel'),
  });
  if (!parsed.success)
    return {
      message: 'Choose a customer and add a subject.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return { message: 'Create a workspace before starting a conversation.' };
  const { data, error } = await supabase.rpc('create_conversation', {
    p_workspace_id: active.id,
    p_customer_id: parsed.data.customerId,
    p_subject: parsed.data.subject,
    p_channel: parsed.data.channel,
  });
  if (error || !data)
    return { message: messageFor(error?.message), values: parsed.data };
  redirect(`/app/inbox/${data}`);
}
export async function sendMessage(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = messageSchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
    internal: formData.get('internal') ?? '',
    clientId: formData.get('clientId') ?? randomUUID(),
  });
  if (!parsed.success)
    return {
      message: 'Write a message before sending.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active) return { message: 'Your workspace is unavailable.' };
  const { data, error } = await supabase.rpc('send_message', {
    p_workspace_id: active.id,
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
    p_internal: parsed.data.internal === 'on',
    p_client_id: parsed.data.clientId,
  });
  if (error || !data)
    return {
      message: messageFor(error?.message),
      values: formValues(formData),
    };
  revalidatePath(`/app/inbox/${parsed.data.conversationId}`);
  return {
    success:
      parsed.data.internal === 'on' ? 'Internal note saved.' : 'Message sent.',
  };
}
export async function createTicket(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = ticketSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    customerId: formData.get('customerId'),
    conversationId: formData.get('conversationId'),
  });
  if (!parsed.success)
    return {
      message: 'Add a title and valid ticket details.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active) return { message: 'Your workspace is unavailable.' };
  const { data, error } = await supabase.rpc('create_ticket', {
    p_workspace_id: active.id,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_priority: parsed.data.priority,
    p_category: parsed.data.category,
    p_customer_id: nullableRpc(parsed.data.customerId || null),
    p_conversation_id: nullableRpc(parsed.data.conversationId || null),
    p_assignee_user_id: nullableRpc<string>(null),
  });
  if (error || !data)
    return {
      message: messageFor(error?.message),
      values: formValues(formData),
    };
  redirect(`/app/tickets/${data}`);
}
export async function updateConversation(formData: FormData) {
  const { supabase, active, user } = await getWorkspaceContext();
  const id = String(formData.get('conversationId') ?? '');
  if (!active || !id) redirect('/app/inbox?error=invalid');
  const { error } = await supabase.rpc('update_conversation', {
    p_workspace_id: active.id,
    p_conversation_id: id,
    p_status: String(formData.get('status') || '') || undefined,
    p_priority: String(formData.get('priority') || '') || undefined,
    p_assignee_user_id: nullableRpc(
      String(formData.get('assignee') || '') === 'me' ? user.id : null,
    ),
  });
  redirect(`/app/inbox/${id}?${error ? 'error=update' : 'notice=updated'}`);
}
export async function updateTicket(formData: FormData) {
  const { supabase, active, user } = await getWorkspaceContext();
  const id = String(formData.get('ticketId') ?? '');
  if (!active || !id) redirect('/app/tickets?error=invalid');
  const { error } = await supabase.rpc('update_ticket', {
    p_workspace_id: active.id,
    p_ticket_id: id,
    p_status: String(formData.get('status') || '') || undefined,
    p_priority: String(formData.get('priority') || '') || undefined,
    p_category: nullableRpc<string>(null),
    p_assignee_user_id: nullableRpc(
      String(formData.get('assignee') || '') === 'me' ? user.id : null,
    ),
    p_title: nullableRpc<string>(null),
    p_description: nullableRpc<string>(null),
  });
  redirect(`/app/tickets/${id}?${error ? 'error=update' : 'notice=updated'}`);
}
