'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { listReturnHref } from '../../lib/support/list-navigation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import {
  customerSchema,
  conversationSchema,
  messageSchema,
  ticketSchema,
  customerEditSchema,
  ticketEditSchema,
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
function canWriteSupport(role: string) {
  return role !== 'viewer';
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
  if (!canWriteSupport(active.role))
    return { message: 'Viewer access is read-only for support records.' };
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
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] ?? 'form'),
          issue.message,
        ]),
      ),
      message: 'Choose a customer and add a subject.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return { message: 'Create a workspace before starting a conversation.' };
  if (!canWriteSupport(active.role))
    return { message: 'Viewer access is read-only for support records.' };
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
      fields: { body: 'Write a message before sending.' },
      message: 'Write a message before sending.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active) return { message: 'Your workspace is unavailable.' };
  if (!canWriteSupport(active.role))
    return { message: 'Viewer access is read-only for support records.' };
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
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] ?? 'form'),
          issue.message,
        ]),
      ),
      message: 'Add a title and valid ticket details.',
      values: formValues(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active) return { message: 'Your workspace is unavailable.' };
  if (!canWriteSupport(active.role))
    return { message: 'Viewer access is read-only for support records.' };
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
  const { supabase, active } = await getWorkspaceContext();
  const id = String(formData.get('conversationId') ?? '');
  if (!active || !id) redirect('/app/inbox?error=invalid');
  if (!canWriteSupport(active.role))
    redirect(`/app/inbox/${id}?error=permission`);
  const assignment = String(formData.get('assignee') ?? 'keep');
  const teammate = z.string().uuid().safeParse(assignment);
  if (!['keep', 'me', 'unassigned'].includes(assignment) && !teammate.success)
    redirect(`/app/inbox/${id}?error=update`);
  const { error } = teammate.success
    ? await supabase.rpc('update_support_routing', {
        p_workspace_id: active.id,
        p_entity_type: 'conversation',
        p_entity_id: id,
        p_status: nullableRpc(String(formData.get('status') || '') || null),
        p_priority: nullableRpc(String(formData.get('priority') || '') || null),
        p_assignment: 'teammate',
        p_assignee_id: teammate.data,
      })
    : await supabase.rpc('update_conversation_routing', {
        p_workspace_id: active.id,
        p_conversation_id: id,
        p_status: String(formData.get('status') || '') || undefined,
        p_priority: String(formData.get('priority') || '') || undefined,
        p_assignment: assignment,
      });
  redirect(
    `/app/inbox/${id}?returnTo=${encodeURIComponent(listReturnHref('inbox', formData.get('returnTo')))}&${error ? 'error=update' : 'notice=updated'}`,
  );
}
export async function updateTicket(formData: FormData) {
  const { supabase, active } = await getWorkspaceContext();
  const id = String(formData.get('ticketId') ?? '');
  if (!active || !id) redirect('/app/tickets?error=invalid');
  if (!canWriteSupport(active.role))
    redirect(`/app/tickets/${id}?error=permission`);
  const assignment = String(formData.get('assignee') ?? 'keep');
  const teammate = z.string().uuid().safeParse(assignment);
  if (!['keep', 'me', 'unassigned'].includes(assignment) && !teammate.success)
    redirect(`/app/tickets/${id}?error=update`);
  const { error } = teammate.success
    ? await supabase.rpc('update_support_routing', {
        p_workspace_id: active.id,
        p_entity_type: 'ticket',
        p_entity_id: id,
        p_status: nullableRpc(String(formData.get('status') || '') || null),
        p_priority: nullableRpc(String(formData.get('priority') || '') || null),
        p_assignment: 'teammate',
        p_assignee_id: teammate.data,
      })
    : await supabase.rpc('update_ticket_routing', {
        p_workspace_id: active.id,
        p_ticket_id: id,
        p_status: String(formData.get('status') || '') || undefined,
        p_priority: String(formData.get('priority') || '') || undefined,
        p_assignment: assignment,
      });
  redirect(
    `/app/tickets/${id}?returnTo=${encodeURIComponent(listReturnHref('tickets', formData.get('returnTo')))}&${error ? 'error=update' : 'notice=updated'}`,
  );
}

async function editFields(
  kind: 'customer' | 'ticket',
  formData: FormData,
): Promise<FormState> {
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canWriteSupport(active.role))
    return { message: 'You do not have permission to change support records.' };
  const id = z.string().uuid().safeParse(formData.get('recordId'));
  if (!id.success) return { message: 'That support record is unavailable.' };
  let changes: unknown;
  try {
    const raw = String(formData.get('changes') ?? '');
    if (raw.length > 250000) throw Error();
    changes = JSON.parse(raw);
  } catch {
    return { message: 'Check the edited fields and try again.' };
  }
  const parsed = (
    kind === 'customer' ? customerEditSchema : ticketEditSchema
  ).safeParse(changes);
  if (!parsed.success)
    return {
      message: 'Check the highlighted fields and try again.',
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    };
  if (!Object.keys(parsed.data).length)
    return { success: 'No changes to save.' };
  const savedValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data))
    if (typeof value === 'string')
      savedValues[key] =
        kind === 'customer' && key === 'email' ? value.toLowerCase() : value;
  const result =
    kind === 'customer'
      ? await supabase.rpc('update_customer_fields', {
          p_workspace_id: active.id,
          p_customer_id: id.data,
          p_changes: savedValues,
        })
      : await supabase.rpc('update_ticket_fields', {
          p_workspace_id: active.id,
          p_ticket_id: id.data,
          p_changes: savedValues,
        });
  if (result.error)
    return result.error.code === '23505'
      ? {
          message:
            'Another customer already uses that email in this workspace.',
          fields: {
            email: 'Use a different email or review the existing customer.',
          },
        }
      : { message: messageFor(result.error.message) };
  revalidatePath(
    `/app/${kind === 'customer' ? 'customers' : 'tickets'}/${id.data}`,
  );
  revalidatePath(`/app/${kind === 'customer' ? 'customers' : 'tickets'}`);
  return {
    success:
      kind === 'customer' ? 'Customer details saved.' : 'Ticket details saved.',
    values: savedValues,
  };
}
export async function updateCustomerDetails(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return editFields('customer', formData);
}
export async function updateTicketDetails(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  return editFields('ticket', formData);
}
