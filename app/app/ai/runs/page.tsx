import Link from 'next/link';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';

export const metadata = {
  title: 'AI runs',
  robots: { index: false, follow: false },
};
export default async function AiRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
      </section>
    );
  const params = await searchParams;
  let query = supabase
    .from('ai_runs')
    .select(
      'id,status,decision,reason_code,provider,model,created_at,conversation_id,attempt',
    )
    .eq('workspace_id', active.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (
    ['queued', 'processing', 'completed', 'failed', 'skipped'].includes(
      params.status ?? '',
    )
  )
    query = query.eq(
      'status',
      params.status as
        'queued' | 'processing' | 'completed' | 'failed' | 'skipped',
    );
  const { data, error } = await query;
  return (
    <div className="support-page">
      <div className="page-heading">
        <p className="eyebrow">AI / TRACE</p>
        <h1>AI runs</h1>
        <p className="page-intro">
          Review each decision, evidence, and handoff.
        </p>
      </div>
      <form className="filter-bar">
        <label htmlFor="ai-run-status">Status</label>
        <select
          id="ai-run-status"
          name="status"
          defaultValue={params.status ?? ''}
        >
          <option value="">All statuses</option>
          {['queued', 'processing', 'completed', 'failed', 'skipped'].map(
            (x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ),
          )}
        </select>
        <button className="secondary-button">Filter</button>
      </form>
      {params.error && (
        <p role="alert" className="form-error">
          Feedback could not be saved.
        </p>
      )}
      {error ? (
        <section className="workspace-card error-state">
          <h2>Runs unavailable</h2>
          <p>Refresh to retry.</p>
          <Link href="/app/ai/runs" className="secondary-button">
            Retry
          </Link>
        </section>
      ) : !data?.length ? (
        <section className="workspace-card empty-state">
          <h2>No AI runs yet</h2>
          <p>
            Runs appear after a customer sends a message while AI is enabled.
          </p>
          <Link href="/app/inbox" className="secondary-button">
            Open inbox
          </Link>
        </section>
      ) : (
        <ul className="support-list">
          {data.map((run) => (
            <li key={run.id} className="support-row">
              <Link href={`/app/ai/runs/${run.id}`}>
                <span className="support-row-top">
                  <strong>{run.decision ?? run.status}</strong>
                  <span className="status-chip">{run.status}</span>
                </span>
                <span className="support-row-meta">
                  Run {run.id.slice(0, 8)} · {run.reason_code ?? 'In progress'}
                  {run.attempt > 1 ? ` · attempt ${run.attempt}` : ''}
                </span>
                <time dateTime={run.created_at}>
                  {new Date(run.created_at).toLocaleString()}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
