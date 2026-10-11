/* The projections are intentionally heterogeneous; the narrow row shape is
 * normalized below after Supabase applies RLS to every query. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js';
import { rangeToUtc, type AnalyticsRange } from './definitions';

type Client = SupabaseClient;
const within = (query: any, from: string, to: string) =>
  query.gte('created_at', from).lt('created_at', to);

export async function getAnalytics(
  client: Client,
  workspaceId: string,
  range: AnalyticsRange,
) {
  const today = new Date().toISOString().slice(0, 10);
  const fallbackFrom = new Date(Date.now() - 29 * 86400000)
    .toISOString()
    .slice(0, 10);
  const endParts = (range.to || today).split('-').map(Number);
  const endNext = new Date(
    Date.UTC(endParts[0], endParts[1] - 1, endParts[2] + 1),
  )
    .toISOString()
    .slice(0, 10);
  const bounds = rangeToUtc(
    range.from || fallbackFrom,
    endNext,
    range.timezone,
  );
  const from = bounds.from.toISOString();
  const to = bounds.to.toISOString();
  const [conversations, messages, tickets, runs, citations, feedback] =
    await Promise.all([
      within(
        client
          .from('conversations')
          .select('id,status,priority,created_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
      within(
        client
          .from('messages')
          .select('conversation_id,sender_type,created_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
      within(
        client
          .from('tickets')
          .select('status,priority,category,created_at,resolved_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
      within(
        client
          .from('ai_runs')
          .select('id,status,decision,reason_code,created_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
      within(
        client
          .from('ai_citations')
          .select('run_id,created_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
      within(
        client
          .from('ai_feedback')
          .select('rating,created_at')
          .eq('workspace_id', workspaceId),
        from,
        to,
      ),
    ]);
  const errors = [
    conversations,
    messages,
    tickets,
    runs,
    citations,
    feedback,
  ].find((result) => result.error);
  if (errors?.error)
    throw new Error('Analytics data is temporarily unavailable.');
  const conversationRows = conversations.data ?? [];
  const messageRows = messages.data ?? [];
  const ticketRows = tickets.data ?? [];
  const runRows = runs.data ?? [];
  const citationRows = citations.data ?? [];
  const feedbackRows = feedback.data ?? [];
  const by = (rows: any[], key: string): Record<string, number> =>
    rows.reduce((acc: Record<string, number>, row: any) => {
      const value = row[key] || 'Uncategorized';
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  const groupedMessages = messageRows.reduce(
    (acc: Record<string, any[]>, row: any) => {
      (acc[row.conversation_id] ??= []).push(row);
      return acc;
    },
    {},
  );
  const responseMinutes: number[] = [];
  for (const rows of Object.values(groupedMessages) as any[][]) {
    const ordered = rows.sort((a: any, b: any) =>
      a.created_at.localeCompare(b.created_at),
    );
    const firstCustomer = ordered.find(
      (row: any) => row.sender_type === 'customer',
    );
    const firstAgent =
      firstCustomer &&
      ordered.find(
        (row: any) =>
          row.sender_type === 'agent' &&
          row.created_at > firstCustomer.created_at,
      );
    if (firstCustomer && firstAgent)
      responseMinutes.push(
        (Date.parse(firstAgent.created_at) -
          Date.parse(firstCustomer.created_at)) /
          60000,
      );
  }
  const resolved = ticketRows.filter((row: any) => row.resolved_at);
  const resolutionMinutes = resolved
    .map(
      (row: any) =>
        (Date.parse(row.resolved_at) - Date.parse(row.created_at)) / 60000,
    )
    .filter(Number.isFinite);
  const completedRuns = runRows.filter(
    (row: any) => row.status === 'completed',
  );
  const runIds = new Set(citationRows.map((row: any) => row.run_id));
  return {
    range: { ...range, fromUtc: from, toUtc: to },
    volume: conversationRows.length,
    openClosed: by(conversationRows, 'status'),
    conversationPriority: by(conversationRows, 'priority'),
    ticketStatus: by(ticketRows, 'status'),
    ticketPriority: by(ticketRows, 'priority'),
    categories: by(ticketRows, 'category'),
    firstResponseMinutes: responseMinutes.length
      ? responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length
      : null,
    firstResponseSample: responseMinutes.length,
    resolutionMinutes: resolutionMinutes.length
      ? resolutionMinutes.reduce((a: number, b: number) => a + b, 0) /
        resolutionMinutes.length
      : null,
    resolutionSample: resolutionMinutes.length,
    aiUsage: by(runRows, 'decision'),
    aiStatuses: by(runRows, 'status'),
    escalationRate: completedRuns.length
      ? completedRuns.filter((row: any) => row.decision === 'escalated')
          .length / completedRuns.length
      : null,
    retrievalRate: completedRuns.length
      ? completedRuns.filter((row: any) => runIds.has(row.id)).length /
        completedRuns.length
      : null,
    feedback: {
      helpful: feedbackRows.filter((row: any) => row.rating === 'helpful')
        .length,
      unhelpful: feedbackRows.filter((row: any) => row.rating === 'unhelpful')
        .length,
      total: feedbackRows.length,
    },
  };
}
