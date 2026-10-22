import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../../lib/workspaces/context';
import { AutomatedActionState } from '../../../../../components/shared/automated-action-state';
import { PageHeading } from '../../../../../components/shared/page-heading';
import { Disclosure } from '../../../../../components/shared/disclosure';
import { Timestamp } from '../../../../../components/shared/record-state';
import { AiFeedbackForm } from '../../../../../components/ai/feedback-form';
import { ReviewRefresh } from '../../../../../components/ai/review-refresh';
import { AiEvidence } from '../../../../../components/ai/run-evidence';
import { readRunEvidence } from '../../../../../lib/ai/evidence';
import {
  aiNextAction,
  qualityLabel,
  aiStepLabel,
  aiStepStatus,
} from '../../../../../lib/ai/review';
import { statusLabel } from '../../../../../lib/ui/presentation';
import { aiModeLabel } from '../../../../../lib/ai/policy';

export const metadata = {
  title: 'AI run review',
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
  const { runId } = await params,
    notice = await searchParams;
  if (!active) notFound();
  const result = await supabase
    .from('ai_runs')
    .select('*')
    .eq('workspace_id', active.id)
    .eq('id', runId)
    .maybeSingle();
  if (result.error)
    return (
      <section className="workspace-card">
        <h1>Run unavailable</h1>
        <p role="alert">The run could not be loaded.</p>
        <ReviewRefresh />
      </section>
    );
  const run = result.data;
  if (!run) notFound();
  const [steps, evidence, feedback, policy] = await Promise.all([
    supabase
      .from('ai_run_steps')
      .select('*')
      .eq('workspace_id', active.id)
      .eq('run_id', run.id)
      .order('ordinal'),
    readRunEvidence(supabase, active.id, run.id),
    supabase
      .from('ai_feedback')
      .select('id,rating,reason,comment,created_at')
      .eq('workspace_id', active.id)
      .eq('run_id', run.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ai_agent_configs')
      .select('mode,version')
      .eq('workspace_id', active.id)
      .maybeSingle(),
  ]);
  const object = (v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  const triage = object(run.triage),
    quality = object(run.quality);
  const text = (v: unknown) => (typeof v === 'string' ? v : 'Not recorded');
  return (
    <div className="support-page ai-run-page">
      <Link href="/app/ai/runs" className="back-link">
        ← AI runs
      </Link>
      <PageHeading
        eyebrow="AI / SUPPORT RESPONSE"
        title={`Run ${run.id.slice(0, 8)}`}
        description="Review the saved outcome and evidence before deciding what to do."
      />
      <AutomatedActionState kind="ai" run={run} heading />
      <section className="workspace-card" aria-labelledby="next-action-heading">
        <h2 id="next-action-heading">Next action</h2>
        <p>{aiNextAction(run)}</p>
        {run.conversation_id ? (
          <p>
            <Link href={`/app/inbox/${run.conversation_id}`}>
              Open conversation ↗
            </Link>
          </p>
        ) : (
          <p>The conversation is no longer available.</p>
        )}
        <p>
          <Link href="/app/knowledge">Review knowledge sources</Link>
        </p>
        <p className="field-help">
          Recorded policy version {run.policy_version}.{' '}
          {policy.error || !policy.data
            ? 'Current policy unavailable.'
            : `Current policy: ${aiModeLabel(policy.data.mode)}, version ${policy.data.version}.`}
        </p>
        {policy.data && policy.data.version !== run.policy_version && (
          <p className="form-notice">
            Policy changed since this run. This recorded result does not
            authorize new automatic work.
          </p>
        )}
        {['owner', 'admin'].includes(active.role) && (
          <p>
            <Link href="/app/settings/ai">Review AI policy</Link>
          </p>
        )}
        <ReviewRefresh />
      </section>
      <section className="workspace-card">
        <h2>Answer</h2>
        {run.output_text ? (
          <p className="ai-output">{run.output_text}</p>
        ) : (
          <p>No answer was recorded for this run.</p>
        )}
        <AiEvidence evidence={evidence} />
      </section>
      <section className="workspace-card">
        <h2>Triage and quality</h2>
        <p>
          Intent:{' '}
          {triage?.intent ? statusLabel(text(triage.intent)) : 'Not recorded'} ·
          Priority:{' '}
          {triage?.priority
            ? statusLabel(text(triage.priority))
            : 'Not recorded'}
        </p>
        {typeof triage?.summary === 'string' && <p>{triage.summary}</p>}
        <p>
          Human escalation requested:{' '}
          {triage?.escalate === true
            ? 'Yes'
            : triage?.escalate === false
              ? 'No'
              : 'Not recorded'}
          .
        </p>
        <p>
          Quality: {qualityLabel(quality?.passed)} · Grounding:{' '}
          {qualityLabel(quality?.grounded)} · Safety:{' '}
          {qualityLabel(quality?.safe)} · Tone: {qualityLabel(quality?.tone_ok)}
        </p>
        {typeof quality?.reason === 'string' && (
          <p>Review note: {quality.reason}</p>
        )}
      </section>
      <Disclosure label="Technical details">
        <section className="workspace-card">
          <h2>Recorded execution</h2>
          <dl className="ai-facts">
            {Object.entries({
              'Run ID': run.id,
              'Run type': run.run_type,
              Status: statusLabel(run.status),
              Disposition: run.decision
                ? statusLabel(run.decision)
                : 'Not recorded',
              'Technical reason code': run.reason_code ?? 'Not recorded',
              'Error code': run.error_code ?? 'None recorded',
              'Prompt version': run.prompt_version,
              'Policy version': run.policy_version,
              'Provider / model': `${run.provider ?? 'Not recorded'} / ${run.model ?? 'Not recorded'}`,
              Attempts: run.attempt,
              Latency:
                run.latency_ms === null
                  ? 'Not recorded'
                  : `${run.latency_ms} ms`,
              Confidence: run.confidence ?? 'Not recorded',
              'Evidence score': run.evidence_score ?? 'Not recorded',
              Tokens: `${run.input_tokens ?? 'Not recorded'} in / ${run.output_tokens ?? 'Not recorded'} out`,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>Created</dt>
              <dd>
                <Timestamp value={run.created_at} timezone={active.timezone} />
              </dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>
                {run.completed_at ? (
                  <Timestamp
                    value={run.completed_at}
                    timezone={active.timezone}
                  />
                ) : (
                  'Not recorded'
                )}
              </dd>
            </div>
          </dl>
          <h3>Citation metadata</h3>
          {evidence.error ? (
            <p>Citation metadata unavailable.</p>
          ) : (
            <pre className="ai-output">
              {JSON.stringify(
                evidence.citations.map(
                  ({ ordinal, source_id, chunk_id, score }) => ({
                    ordinal,
                    source_id,
                    chunk_id,
                    score,
                  }),
                ),
                null,
                2,
              )}
            </pre>
          )}
          <h3>Step timeline</h3>
          {steps.error ? (
            <>
              <p role="alert">Step trace unavailable.</p>
              <ReviewRefresh />
            </>
          ) : steps.data?.length ? (
            <ol className="ai-step-list">
              {steps.data.map((s) => (
                <li key={s.id}>
                  <strong>{aiStepLabel(s.step_type)}</strong> ·{' '}
                  {aiStepStatus(s.status)} · {s.duration_ms} ms
                  {s.metadata && (
                    <pre>{JSON.stringify(s.metadata, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No step trace was recorded for this run.</p>
          )}
        </section>
      </Disclosure>
      <section className="workspace-card">
        <h2>Human feedback</h2>
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
        {feedback.error ? (
          <>
            <p role="alert">Feedback history unavailable.</p>
            <ReviewRefresh />
          </>
        ) : feedback.data?.length ? (
          <ul className="ai-feedback-list">
            {feedback.data.map((f) => (
              <li key={f.id}>
                <strong>{statusLabel(f.rating)}</strong>
                {f.reason && ` · ${f.reason}`}
                {f.comment && <p>{f.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No feedback yet.</p>
        )}
        {['owner', 'admin', 'agent'].includes(active.role) && (
          <AiFeedbackForm runId={run.id} />
        )}
      </section>
    </div>
  );
}
