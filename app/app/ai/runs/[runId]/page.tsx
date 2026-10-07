import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../../lib/workspaces/context';
import { submitAiFeedback } from '../../actions';

export const metadata = {
  title: 'AI run inspector',
  robots: { index: false, follow: false },
};
export default async function AiRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  const { runId } = await params;
  const notice = await searchParams;
  if (!active) notFound();
  const { data: run, error } = await supabase
    .from('ai_runs')
    .select('*')
    .eq('workspace_id', active.id)
    .eq('id', runId)
    .maybeSingle();
  if (error || !run) notFound();
  const [stepsResult, citationsResult, feedbackResult] = await Promise.all([
    supabase
      .from('ai_run_steps')
      .select('*')
      .eq('workspace_id', active.id)
      .eq('run_id', run.id)
      .order('created_at')
      .order('ordinal'),
    supabase
      .from('ai_citations')
      .select('*')
      .eq('workspace_id', active.id)
      .eq('run_id', run.id)
      .order('created_at')
      .order('ordinal'),
    supabase
      .from('ai_feedback')
      .select('id,rating,reason,comment,created_at')
      .eq('workspace_id', active.id)
      .eq('run_id', run.id)
      .order('created_at', { ascending: false }),
  ]);
  const loadError =
    stepsResult.error || citationsResult.error || feedbackResult.error;
  const triage =
    run.triage && typeof run.triage === 'object' && !Array.isArray(run.triage)
      ? (run.triage as Record<string, unknown>)
      : null;
  const quality =
    run.quality &&
    typeof run.quality === 'object' &&
    !Array.isArray(run.quality)
      ? (run.quality as Record<string, unknown>)
      : null;
  return (
    <div className="support-page ai-run-page">
      <Link href="/app/ai/runs" className="back-link">
        ← AI runs
      </Link>
      <div className="page-heading">
        <p className="eyebrow">AI / SUPPORT RESPONSE</p>
        <h1>Run {run.id.slice(0, 8)}</h1>
        <p className="page-intro">
          {run.status} · {run.decision ?? 'Decision pending'} ·{' '}
          {run.reason_code ?? 'No reason recorded'}
        </p>
      </div>
      {notice.notice && (
        <p role="status" className="form-success">
          Feedback saved.
        </p>
      )}
      {notice.error && (
        <p role="alert" className="form-error">
          Feedback could not be saved. Retry.
        </p>
      )}
      {loadError ? (
        <section className="workspace-card error-state">
          <h2>Trace unavailable</h2>
          <p>Refresh to load the complete run.</p>
          <Link href={`/app/ai/runs/${run.id}`} className="secondary-button">
            Retry
          </Link>
        </section>
      ) : (
        <>
          <section className="workspace-card ai-run-summary">
            <h2>Decision</h2>
            <dl className="ai-facts">
              <div>
                <dt>Status</dt>
                <dd>{run.status}</dd>
              </div>
              <div>
                <dt>Disposition</dt>
                <dd>{run.decision ?? 'Pending'}</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{run.reason_code ?? '—'}</dd>
              </div>
              <div>
                <dt>Prompt version</dt>
                <dd>{run.prompt_version}</dd>
              </div>
              <div>
                <dt>Policy version</dt>
                <dd>{run.policy_version}</dd>
              </div>
              <div>
                <dt>Provider / model</dt>
                <dd>
                  {run.provider ?? '—'} / {run.model ?? '—'}
                </dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{run.attempt}</dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd>
                  {run.latency_ms === null ? '—' : `${run.latency_ms} ms`}
                </dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{run.confidence ?? '—'}</dd>
              </div>
              <div>
                <dt>Evidence score</dt>
                <dd>{run.evidence_score ?? '—'}</dd>
              </div>
              <div>
                <dt>Tokens</dt>
                <dd>
                  {run.input_tokens ?? '—'} in / {run.output_tokens ?? '—'} out
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  <time dateTime={run.created_at}>
                    {new Date(run.created_at).toLocaleString()}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>
                  {run.completed_at ? (
                    <time dateTime={run.completed_at}>
                      {new Date(run.completed_at).toLocaleString()}
                    </time>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
            {run.error_code && (
              <p role="alert">Provider error: {run.error_code}</p>
            )}
            {run.conversation_id && (
              <Link
                href={`/app/inbox/${run.conversation_id}`}
                className="quiet-link"
              >
                Open conversation ↗
              </Link>
            )}
          </section>
          <section className="workspace-card">
            <h2>Triage and quality</h2>
            <p>
              Intent: {String(triage?.intent ?? '—')} · Priority:{' '}
              {String(triage?.priority ?? '—')} · Escalation:{' '}
              {String(triage?.escalate ?? '—')}
            </p>
            {typeof triage?.summary === 'string' && <p>{triage.summary}</p>}
            <p>
              Quality: {quality ? String(quality.passed) : 'Not run'} ·
              Grounded: {quality ? String(quality.grounded) : '—'} · Safe:{' '}
              {quality ? String(quality.safe) : '—'}
            </p>
            {typeof quality?.reason === 'string' && (
              <p>Review note: {quality.reason}</p>
            )}
          </section>
          <section className="workspace-card">
            <h2>Step timeline</h2>
            {stepsResult.data?.length ? (
              <ol className="ai-step-list">
                {stepsResult.data.map((s) => (
                  <li key={s.id}>
                    <strong>{s.step_type}</strong> · {s.status} ·{' '}
                    {s.duration_ms} ms
                    {s.metadata &&
                      Object.keys(s.metadata as object).length > 0 && (
                        <pre>{JSON.stringify(s.metadata)}</pre>
                      )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No step trace was recorded for this run.</p>
            )}
          </section>
          <section className="workspace-card">
            <h2>Evidence and citations</h2>
            {citationsResult.data?.length ? (
              <ol className="ai-citation-list">
                {citationsResult.data.map((c) => (
                  <li key={c.id}>
                    <strong>
                      [{c.ordinal}] Evidence score {c.score}
                    </strong>
                    <p>{c.snippet}</p>
                    <small>
                      Source {c.source_id?.slice(0, 8) ?? 'removed'} · Chunk{' '}
                      {c.chunk_id?.slice(0, 8) ?? 'removed'}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No reliable citation was used.</p>
            )}
          </section>
          <section className="workspace-card">
            <h2>Output</h2>
            {run.output_text ? (
              <p className="ai-output">{run.output_text}</p>
            ) : (
              <p>No answer was generated for this run.</p>
            )}
          </section>
          <section className="workspace-card">
            <h2>Human feedback</h2>
            {feedbackResult.data?.length ? (
              <ul className="ai-feedback-list">
                {feedbackResult.data.map((f) => (
                  <li key={f.id}>
                    <strong>{f.rating}</strong>
                    {f.reason && ` · ${f.reason}`}
                    {f.comment && <p>{f.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No feedback yet.</p>
            )}
            {['owner', 'admin', 'agent'].includes(active.role) && (
              <form action={submitAiFeedback} className="form-stack">
                <input type="hidden" name="runId" value={run.id} />
                <div className="field">
                  <label htmlFor="ai-rating">Rating</label>
                  <select id="ai-rating" name="rating" required>
                    <option value="helpful">Helpful</option>
                    <option value="unhelpful">Unhelpful</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ai-reason">Reason</label>
                  <input id="ai-reason" name="reason" maxLength={80} />
                </div>
                <div className="field">
                  <label htmlFor="ai-comment">Comment</label>
                  <textarea
                    id="ai-comment"
                    name="comment"
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <button className="secondary-button">Save feedback</button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
