import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

import { PAGE_SIZE } from './list-navigation';
type Client = SupabaseClient<Database>;

export async function listSupportMembers(client: Client, workspaceId: string) {
  const { data, error } = await client
    .from('workspace_members')
    .select('user_id,role,status,profiles(display_name,email_normalized)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('joined_at');
  if (error) throw new Error('Team details are temporarily unavailable.');
  return (data ?? []).map((member) => {
    const profile = Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles;
    return {
      id: member.user_id,
      role: member.role,
      label:
        profile?.display_name ||
        profile?.email_normalized ||
        'Workspace teammate',
    };
  });
}
export async function listConversations(
  client: Client,
  workspaceId: string,
  filters: {
    query?: string;
    status?: string;
    priority?: string;
    page?: number;
    customerId?: string;
    conversationId?: string;
  },
) {
  const page =
    Number.isSafeInteger(filters.page) &&
    (filters.page ?? 0) >= 0 &&
    (filters.page ?? 0) < 999999
      ? (filters.page ?? 0)
      : 0;
  let query = client
    .from('conversations')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (filters.query)
    query = query.or(
      `subject.ilike.%${filters.query.replace(/[%_,]/g, '')}%,channel.ilike.%${filters.query.replace(/[%_,]/g, '')}%`,
    );
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.status && ['open', 'pending', 'closed'].includes(filters.status))
    query = query.eq('status', filters.status);
  if (
    filters.priority &&
    ['low', 'normal', 'high', 'urgent'].includes(filters.priority)
  )
    query = query.eq('priority', filters.priority);
  let { data, error, count } = await query;
  if (error?.code === 'PGRST103' && page > 0) {
    const recovery = await query.range(0, 0);
    if (!recovery.error) {
      data = [];
      count = recovery.count;
      error = null;
    }
  }
  if (error) throw new Error('Unable to load conversations');
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.customer_id))];
  const { data: customers, error: customersError } = ids.length
    ? await client
        .from('customers')
        .select('id,name,email')
        .eq('workspace_id', workspaceId)
        .in('id', ids)
    : {
        data: [] as { id: string; name: string; email: string | null }[],
        error: null,
      };
  if (customersError)
    throw new Error('Customer details are temporarily unavailable.');
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
  const [
    { data: customer, error: customerError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
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
  if (customerError)
    throw new Error('Customer details are temporarily unavailable.');
  if (messagesError) throw new Error('Unable to load messages');
  return { ...data, customers: customer, messages: messages ?? [] };
}
export async function listCustomers(
  client: Client,
  workspaceId: string,
  queryText?: string,
  page = 0,
) {
  let query = client
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (queryText) {
    const q = queryText.replace(/[%_,]/g, '');
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`,
    );
  }
  let { data, error, count } = await query;
  if (error?.code === 'PGRST103' && page > 0) {
    const recovery = await query.range(0, 0);
    if (!recovery.error) {
      data = [];
      count = recovery.count;
      error = null;
    }
  }
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
  const [
    {
      data: conversations,
      error: conversationsError,
      count: conversationCount,
    },
    { data: tickets, error: ticketsError, count: ticketCount },
  ] = await Promise.all([
    client
      .from('conversations')
      .select('id,subject,status,priority,updated_at', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('customer_id', id)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    client
      .from('tickets')
      .select('id,ticket_number,title,status,priority,updated_at', {
        count: 'exact',
      })
      .eq('workspace_id', workspaceId)
      .eq('customer_id', id)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1),
  ]);
  if (conversationsError || ticketsError)
    throw new Error('Customer history is temporarily unavailable.');
  return {
    ...data,
    conversationCount: conversationCount ?? 0,
    ticketCount: ticketCount ?? 0,
    conversations: conversations ?? [],
    tickets: tickets ?? [],
  };
}
export async function listTickets(
  client: Client,
  workspaceId: string,
  filters: {
    query?: string;
    status?: string;
    priority?: string;
    page?: number;
    customerId?: string;
    conversationId?: string;
  },
) {
  const page =
    Number.isSafeInteger(filters.page) &&
    (filters.page ?? 0) >= 0 &&
    (filters.page ?? 0) < 999999
      ? (filters.page ?? 0)
      : 0;
  let query = client
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (filters.conversationId)
    query = query.eq('conversation_id', filters.conversationId);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
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
  let { data, error, count } = await query;
  if (error?.code === 'PGRST103' && page > 0) {
    const recovery = await query.range(0, 0);
    if (!recovery.error) {
      data = [];
      count = recovery.count;
      error = null;
    }
  }
  if (error) throw new Error('Unable to load tickets');
  const rows = data ?? [];
  const ids = [
    ...new Set(
      rows.flatMap((row) => (row.customer_id ? [row.customer_id] : [])),
    ),
  ];
  const { data: customers, error: customersError } = ids.length
    ? await client
        .from('customers')
        .select('id,name,email')
        .eq('workspace_id', workspaceId)
        .in('id', ids)
    : {
        data: [] as { id: string; name: string; email: string | null }[],
        error: null,
      };
  if (customersError)
    throw new Error('Customer details are temporarily unavailable.');
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
    { data: customer, error: customerError },
    { data: conversation, error: conversationError },
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
      .select('id,event_type,payload,actor_user_id,created_at')
      .eq('workspace_id', workspaceId)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ]);
  if (customerError || conversationError)
    throw new Error('Related ticket details are temporarily unavailable.');
  if (eventsError) throw new Error('Unable to load ticket timeline');
  return {
    ...data,
    customers: customer,
    conversations: conversation,
    ticket_events: events ?? [],
  };
}
