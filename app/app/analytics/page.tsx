import Link from 'next/link';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { getAnalytics } from '../../../lib/analytics/queries';
import {
  defaultAnalyticsDates,
  metricDefinitions,
  validateAnalyticsDates,
} from '../../../lib/analytics/definitions';
import { runEvaluation } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

function n(value: number | null, suffix = '') {
  return value === null ? 'No data' : `${Math.round(value * 10) / 10}${suffix}`;
}
function pct(value: number | null) {
  return value === null ? 'No data' : `${Math.round(value * 100)}%`;
}
function list(values: Record<string, number>) {
  const entries = Object.entries(values);
  return entries.length ? (
    entries.map(([key, value]) => (
      <li key={key}>
        <span>{key}</span>
        <strong>{value}</strong>
      </li>
    ))
  ) : (
    <li className="analytics-muted">No data in this range</li>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    error?: string;
    evaluated?: string;
  }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
      </section>
    );
  const params = await searchParams;
  const defaults = defaultAnalyticsDates();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;
  const dateErrors = validateAnalyticsDates(from, to);
  const invalidDates = Object.keys(dateErrors).length > 0;
  let analytics: Awaited<ReturnType<typeof getAnalytics>> | null = null;
  let loadError = false;
  try {
    if (!invalidDates)
      analytics = await getAnalytics(supabase, active.id, {
        from,
        to,
        timezone: active.timezone,
      });
  } catch {
    loadError = true;
  }
  const latest = await supabase
    .from('evaluation_runs')
    .select('id,status,total_cases,passed_cases,started_at')
    .eq('workspace_id', active.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const cases = await supabase
    .from('evaluation_cases')
    .select(
      'id,case_key,input_text,expected_decision,expected_reason_code,expected_source_required',
    )
    .eq('workspace_id', active.id)
    .eq('active', true)
    .order('case_key');
  return (
    <div className="support-page analytics-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / MEASUREMENT</p>
        <h1>Analytics</h1>
        <p className="page-intro">
          Operational outcomes from persisted support and AI records. All times
          use <strong>{active.timezone}</strong>.
        </p>
      </div>
      <form className="filter-bar analytics-filter">
        <label htmlFor="analytics-from">From</label>
        <input
          id="analytics-from"
          type="date"
          name="from"
          defaultValue={from}
          aria-invalid={Boolean(dateErrors.from)}
          aria-describedby={
            dateErrors.from ? 'analytics-from-error' : undefined
          }
        />
        <label htmlFor="analytics-to">To</label>
        <input
          id="analytics-to"
          type="date"
          name="to"
          defaultValue={to}
          aria-invalid={Boolean(dateErrors.to)}
          aria-describedby={dateErrors.to ? 'analytics-to-error' : undefined}
        />
        <button className="secondary-button">Apply range</button>
      </form>
      {dateErrors.from && (
        <p id="analytics-from-error" role="alert" className="field-error">
          {dateErrors.from}
        </p>
      )}
      {dateErrors.to && (
        <p id="analytics-to-error" role="alert" className="field-error">
          {dateErrors.to}
        </p>
      )}
      {params.error && (
        <p role="alert" className="form-error">
          {params.error}
        </p>
      )}
      {params.evaluated && (
        <p role="status" className="form-success">
          Evaluation run saved from persisted AI records.
        </p>
      )}
      {invalidDates ? (
        <p role="status">Correct the date range to load metrics.</p>
      ) : loadError || !analytics ? (
        <section className="workspace-card error-state">
          <h2>Analytics unavailable</h2>
          <p>We could not read this workspace’s records. Refresh to retry.</p>
          <Link href="/app/analytics" className="secondary-button">
            Retry
          </Link>
        </section>
      ) : (
        <>
          <p className="analytics-summary" role="status">
            {analytics.volume} conversations,{' '}
            {Object.values(analytics.ticketStatus).reduce((a, b) => a + b, 0)}{' '}
            tickets, and{' '}
            {Object.values(analytics.aiStatuses).reduce((a, b) => a + b, 0)} AI
            runs in the selected date range.
          </p>
          <div className="analytics-grid">
            <section className="workspace-card metric-card">
              <span>Conversations</span>
              <strong>{analytics.volume}</strong>
              <small>{metricDefinitions.volume}</small>
            </section>
            <section className="workspace-card metric-card">
              <span>First response</span>
              <strong>{n(analytics.firstResponseMinutes, ' min')}</strong>
              <small>
                {analytics.firstResponseSample} conversations with both events
              </small>
            </section>
            <section className="workspace-card metric-card">
              <span>Resolution</span>
              <strong>{n(analytics.resolutionMinutes, ' min')}</strong>
              <small>{analytics.resolutionSample} resolved tickets</small>
            </section>
            <section className="workspace-card metric-card">
              <span>Escalation</span>
              <strong>{pct(analytics.escalationRate)}</strong>
              <small>{metricDefinitions.escalation}</small>
            </section>
          </div>
          <div className="analytics-columns">
            <section className="workspace-card analytics-card">
              <h2>Conversation status and priority</h2>
              <ul className="analytics-list">
                {list(analytics.openClosed)}
                {list(analytics.conversationPriority)}
              </ul>
            </section>
            <section className="workspace-card analytics-card">
              <h2>Tickets</h2>
              <ul className="analytics-list">
                {list(analytics.ticketStatus)}
                {list(analytics.ticketPriority)}
              </ul>
            </section>
            <section className="workspace-card analytics-card">
              <h2>Categories</h2>
              <ul className="analytics-list">{list(analytics.categories)}</ul>
            </section>
            <section className="workspace-card analytics-card">
              <h2>AI usage and retrieval</h2>
              <ul className="analytics-list">
                {list(analytics.aiUsage)}
                {list(analytics.aiStatuses)}
                <li>
                  <span>Retrieval with citation</span>
                  <strong>{pct(analytics.retrievalRate)}</strong>
                </li>
                <li>
                  <span>Helpful feedback</span>
                  <strong>
                    {analytics.feedback.total
                      ? `${analytics.feedback.helpful}/${analytics.feedback.total}`
                      : 'No data'}
                  </strong>
                </li>
              </ul>
            </section>
          </div>
        </>
      )}
      <section className="workspace-card evaluation-card">
        <div>
          <p className="eyebrow">AI / EVALUATION</p>
          <h2>Curated evaluation harness</h2>
          <p>
            Cases remain pending until a real customer input has a persisted AI
            run. No synthetic accuracy is displayed.
          </p>
        </div>
        {['owner', 'admin'].includes(active.role) && (
          <form action={runEvaluation}>
            <SubmitButton
              idle="Prepare cases and run"
              busy="Running evaluation…"
              className="primary-button"
            />
          </form>
        )}
        {cases.error || latest.error ? (
          <p className="form-error" role="alert">
            Evaluation data is unavailable. Refresh to retry; no empty result or
            score is implied.
          </p>
        ) : (
          <p className="analytics-muted">
            {cases.data?.length
              ? `${cases.data.length} curated cases available.`
              : 'Cases will be created when an admin starts a run.'}{' '}
            {latest.data
              ? `Latest: ${latest.data.passed_cases}/${latest.data.total_cases} passed.`
              : 'No run yet.'}
          </p>
        )}
      </section>
    </div>
  );
}
