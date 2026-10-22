/* The projections are intentionally heterogeneous; the narrow row shape is
 * normalized below after Supabase applies RLS to every query. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  rangeToUtc,
  validateAnalyticsDates,
  type AnalyticsRange,
} from './definitions';

type Client = SupabaseClient;
const within = (query: any, from: string, to: string) =>
  query.gte('created_at', from).lt('created_at', to);

export async function getAnalytics(
  client: Client,
  workspaceId: string,
  range: AnalyticsRange,
) {
  if (Object.keys(validateAnalyticsDates(range.from, range.to)).length)
    throw new Error('Invalid analytics date range.');
  const endParts = range.to.split('-').map(Number);
  const endDate = new Date(
    Date.UTC(endParts[0], endParts[1] - 1, endParts[2] + 1),
  );
  const endNext = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`;
  const bounds = rangeToUtc(range.from, endNext, range.timezone);
  const from = bounds.from.toISOString();
  const to = bounds.to.toISOString();
  // Every cohort traverses the full result, beyond the API's default row cap.
  const read = (table: string, columns: string, column = 'created_at') =>
    readAnalyticsRows(() =>
      client
        .from(table)
        .select(columns)
        .eq('workspace_id', workspaceId)
        .gte(column, from)
        .lt(column, to),
    );
  const [
    conversationRows,
    intervalAgents,
    ticketRows,
    resolved,
    runRows,
    feedbackRows,
  ] = await Promise.all([
    read('conversations', 'id,status,priority,created_at'),
    readAnalyticsRows(() =>
      within(
        client
          .from('messages')
          .select('conversation_id')
          .eq('workspace_id', workspaceId)
          .eq('sender_type', 'agent'),
        from,
        to,
      ),
    ),
    read('tickets', 'id,status,priority,category,created_at,resolved_at'),
    read('tickets', 'id,created_at,resolved_at', 'resolved_at'),
    read('ai_runs', 'id,status,decision,reason_code,created_at'),
    read('ai_feedback', 'id,rating,created_at'),
  ]);
  const histories: any[] = [];
  const citationRows: any[] = [];
  const conversationIds = [
    ...new Set(intervalAgents.map((row: any) => row.conversation_id)),
  ];
  for (let offset = 0; offset < conversationIds.length; offset += 200)
    histories.push(
      ...(await readAnalyticsRows(() =>
        client
          .from('messages')
          .select('id,conversation_id,sender_type,created_at')
          .eq('workspace_id', workspaceId)
          .in('conversation_id', conversationIds.slice(offset, offset + 200))
          .lt('created_at', to),
      )),
    );
  const completedRuns = runRows.filter(
    (row: any) => row.status === 'completed',
  );
  const completedIds = completedRuns.map((row: any) => row.id);
  for (let offset = 0; offset < completedIds.length; offset += 200)
    citationRows.push(
      ...(await readAnalyticsRows(() =>
        client
          .from('ai_citations')
          .select('id,run_id')
          .eq('workspace_id', workspaceId)
          .in('run_id', completedIds.slice(offset, offset + 200)),
      )),
    );
  const messageRows = histories;
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
    const ordered = rows.sort(
      (a: any, b: any) =>
        Date.parse(a.created_at) - Date.parse(b.created_at) ||
        String(a.id).localeCompare(String(b.id)),
    );
    const firstCustomer = ordered.find(
      (row: any) => row.sender_type === 'customer',
    );
    const firstAgent =
      firstCustomer &&
      ordered.find(
        (row: any) =>
          row.sender_type === 'agent' &&
          (Date.parse(row.created_at) > Date.parse(firstCustomer.created_at) ||
            (Date.parse(row.created_at) ===
              Date.parse(firstCustomer.created_at) &&
              String(row.id) > String(firstCustomer.id))),
      );
    if (
      firstCustomer &&
      firstAgent &&
      Date.parse(firstAgent.created_at) >= Date.parse(from) &&
      Date.parse(firstAgent.created_at) < Date.parse(to)
    )
      responseMinutes.push(
        (Date.parse(firstAgent.created_at) -
          Date.parse(firstCustomer.created_at)) /
          60000,
      );
  }
  const resolutionMinutes = resolved
    .map(
      (row: any) =>
        (Date.parse(row.resolved_at) - Date.parse(row.created_at)) / 60000,
    )
    .filter(Number.isFinite);
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

/** Stable ID paging, fail closed on partial/unavailable or unbounded results. */
export async function readAnalyticsRows(makeQuery: () => any) {
  const rows: any[] = [];
  const size = 1000;
  for (let page = 0; page < 500; page++) {
    const { data, error } = await makeQuery()
      .order('id', { ascending: true })
      .range(page * size, (page + 1) * size - 1);
    if (error || !data)
      throw new Error('Analytics data is temporarily unavailable.');
    rows.push(...data);
    if (data.length < size) return rows;
  }
  throw new Error('Analytics range is too large. Choose a shorter interval.');
}
