import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

type Client = SupabaseClient<Database>;
export async function listConversations(
  client: Client,
  workspaceId: string,
  filters: {
    query?: string;
    status?: string;
    priority?: string;
    page?: number;
  },
) {
  const page = Math.max(0, filters.page ?? 0);
  let query = client
    .from('conversations')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .range(page * 25, page * 25 + 24);
  if (filters.query)
    query = query.or(
      `subject.ilike.%${filters.query.replace(/[%_,]/g, '')}%,channel.ilike.%${filters.query.replace(/[%_,]/g, '')}%`,
    );
  if (filters.status && ['open', 'pending', 'closed'].includes(filters.status))
    query = query.eq('status', filters.status);
  if (
    filters.priority &&
    ['low', 'normal', 'high', 'urgent'].includes(filters.priority)
  )
    query = query.eq('priority', filters.priority);
  const { data, error, count } = await query;
  if (error) throw new Error('Unable to load conversations');
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.customer_id))];
  const { data: customers } = ids.length
    ? await client
        .from('customers')
        .select('id,name,email')
        .eq('workspace_id', workspaceId)
        .in('id', ids)
    : { data: [] as { id: string; name: string; email: string | null }[] };
  const byId = new Map(
    (customers ?? []).map((customer) => [customer.id, customer]),
  );
  return {
    rows: rows.map((row) => ({
      ...row,
      customers: byId.get(row.customer_id) ?? null,
    })),
    count: count ?? 0,
    page,
  };
}
export async function getConversation(
  client: Client,
  workspaceId: string,
  id: string,
) {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Unable to load conversation');
  if (!data) return null;
  const [{ data: customer }, { data: messages, error: messagesError }] =
    await Promise.all([
      client
        .from('customers')
        .select('id,name,email,phone,company')
        .eq('workspace_id', workspaceId)
        .eq('id', data.customer_id)
        .maybeSingle(),
      client
        .from('messages')
        .select('id,body,sender_type,sender_user_id,delivery_status,created_at')
        .eq('workspace_id', workspaceId)
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
    ]);
  if (messagesError) throw new Error('Unable to load messages');
  return { ...data, customers: customer, messages: messages ?? [] };
}
export async function listCustomers(
  client: Client,
  workspaceId: string,
  queryText?: string,
) {
  let query = client
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (queryText) {
    const q = queryText.replace(/[%_,]/g, '');
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
    );
  }
  const { data, error, count } = await query;
  if (error) throw new Error('Unable to load customers');
  return { rows: data ?? [], count: count ?? 0 };
}
export async function getCustomer(
  client: Client,
  workspaceId: string,
  id: string,
) {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Unable to load customer');
  if (!data) return null;
  const [{ data: conversations }, { data: tickets }] = await Promise.all([
    client
      .from('conversations')
      .select('id,subject,status,priority,updated_at')
      .eq('workspace_id', workspaceId)
      .eq('customer_id', id)
      .order('updated_at', { ascending: false }),
    client
      .from('tickets')
      .select('id,ticket_number,title,status,priority,updated_at')
      .eq('workspace_id', workspaceId)
      .eq('customer_id', id)
      .order('updated_at', { ascending: false }),
  ]);
  return {
    ...data,
    conversations: conversations ?? [],
    tickets: tickets ?? [],
  };
}
export async function listTickets(
  client: Client,
  workspaceId: string,
  filters: { query?: string; status?: string; priority?: string },
) {
  let query = client
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (filters.query) {
    const q = filters.query.replace(/[%_,]/g, '');
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (
    filters.status &&
    ['open', 'in_progress', 'pending', 'resolved', 'closed'].includes(
      filters.status,
    )
  )
    query = query.eq('status', filters.status);
  if (
    filters.priority &&
    ['low', 'normal', 'high', 'urgent'].includes(filters.priority)
  )
    query = query.eq('priority', filters.priority);
  const { data, error, count } = await query;
  if (error) throw new Error('Unable to load tickets');
  const rows = data ?? [];
  const ids = [
    ...new Set(
      rows.flatMap((row) => (row.customer_id ? [row.customer_id] : [])),
    ),
  ];
  const { data: customers } = ids.length
    ? await client
        .from('customers')
        .select('id,name,email')
        .eq('workspace_id', workspaceId)
        .in('id', ids)
    : { data: [] as { id: string; name: string; email: string | null }[] };
  const byId = new Map(
    (customers ?? []).map((customer) => [customer.id, customer]),
  );
  return {
    rows: rows.map((row) => ({
      ...row,
      customers: row.customer_id ? (byId.get(row.customer_id) ?? null) : null,
    })),
    count: count ?? 0,
  };
}
export async function getTicket(
  client: Client,
  workspaceId: string,
  id: string,
) {
  const { data, error } = await client
    .from('tickets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Unable to load ticket');
  if (!data) return null;
  const [
    { data: customer },
    { data: conversation },
    { data: events, error: eventsError },
  ] = await Promise.all([
    data.customer_id
      ? client
          .from('customers')
          .select('id,name,email')
          .eq('workspace_id', workspaceId)
          .eq('id', data.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.conversation_id
      ? client
          .from('conversations')
          .select('id,subject')
          .eq('workspace_id', workspaceId)
          .eq('id', data.conversation_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from('ticket_events')
      .select('id,event_type,payload,created_at')
      .eq('workspace_id', workspaceId)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ]);
  if (eventsError) throw new Error('Unable to load ticket timeline');
  return {
    ...data,
    customers: customer,
    conversations: conversation,
    ticket_events: events ?? [],
  };
}
