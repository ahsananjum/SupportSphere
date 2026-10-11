/**
 * P09 metric contract. All values are scoped to one workspace and the selected
 * half-open UTC interval [from, to), where local calendar boundaries are
 * converted using the workspace IANA timezone. First response is the elapsed
 * time from the first customer message to the first later agent message in a
 * conversation. Resolution is created_at → resolved_at for resolved/closed
 * tickets. Rates use the count of qualifying rows as denominator and display
 * “No data” when the denominator is zero.
 */
export const metricDefinitions = {
  volume: 'Conversations created in the selected interval.',
  openClosed:
    'Conversation rows created in the interval grouped by current status.',
  ticketStatusPriority:
    'Tickets created in the interval grouped by status and priority.',
  firstResponse:
    'Average first agent response minus first customer message, per conversation with both events.',
  resolution:
    'Average resolved_at minus created_at for tickets with resolved_at in the interval.',
  categories: 'Tickets created in the interval grouped by non-empty category.',
  aiUsage:
    'AI runs created in the interval grouped by persisted decision and status.',
  escalation: 'Escalated AI runs divided by completed AI runs in the interval.',
  feedback: 'Helpful AI feedback divided by all feedback rows in the interval.',
  retrieval:
    'Completed AI runs with at least one citation divided by completed AI runs.',
} as const;

export type AnalyticsRange = { from: string; to: string; timezone: string };

export function defaultAnalyticsDates() {
  const to = new Date().toISOString().slice(0, 10);
  return {
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to,
  };
}

export function localDateToUtc(date: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(guess);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour) % 24,
    Number(values.minute),
    Number(values.second),
  );
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

export function rangeToUtc(from: string, to: string, timezone: string) {
  return {
    from: localDateToUtc(from, timezone),
    to: localDateToUtc(to, timezone),
  };
}
