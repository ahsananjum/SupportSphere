import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { KnowledgeRefresh, SourceControls } from '../knowledge-forms';
import { SourceReadiness } from '../../../../components/knowledge/source-readiness';
import { Timestamp } from '../../../../components/shared/record-state';
import { statusLabel } from '../../../../lib/ui/presentation';
import { PageHeading } from '../../../../components/shared/page-heading';
import styles from '../knowledge.module.css';

export const metadata: Metadata = {
  title: 'Knowledge source',
  robots: { index: false, follow: false },
};
export default async function KnowledgeSourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt && active.onboardingStep !== 'knowledge')
    redirect('/app/onboarding');
  const source = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('workspace_id', active.id)
    .eq('id', sourceId)
    .maybeSingle();
  if (source.error)
    return (
      <section className="workspace-card">
        <h1>Source unavailable</h1>
        <p role="alert">Source details could not be loaded.</p>
        <Link href={`/app/knowledge/${sourceId}`}>Retry</Link>
      </section>
    );
  if (!source.data) notFound();
  const job = await supabase
    .from('ingestion_jobs')
    .select(
      'id,status,attempt,max_attempts,next_run_at,started_at,completed_at,created_at',
    )
    .eq('workspace_id', active.id)
    .eq('source_id', sourceId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);
  const latestJob = job.data?.[0];
  const documents = await supabase
    .from('knowledge_documents')
    .select('id,title,content,document_index')
    .eq('workspace_id', active.id)
    .eq('source_id', sourceId)
    .order('document_index')
    .limit(3);
  return (
    <div className={`settings-page ${styles.sourceDetail}`}>
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / KNOWLEDGE</p>
        <Link href="/app/knowledge">← All sources</Link>
        <PageHeading
          title={source.data.name}
          description={source.data.source_type.toUpperCase()}
        />
      </div>
      <section className="workspace-card">
        <h2>Indexing</h2>
        <SourceReadiness source={source.data} />
        <p>
          {source.data.document_count} documents · {source.data.chunk_count}{' '}
          chunks
        </p>
        <p>
          {source.data.last_indexed_at ? (
            <>
              Last successful index{' '}
              <Timestamp
                value={source.data.last_indexed_at}
                timezone={active.timezone}
              />
            </>
          ) : (
            'No successful index recorded'
          )}
        </p>
        {['queued', 'processing', 'failed'].includes(source.data.status) &&
          source.data.chunk_count > 0 && (
            <p className="field-help">
              Counts may describe a previous index. Those chunks are excluded
              while the current index is unavailable.
            </p>
          )}
        {job.error ? (
          <p role="alert">Ingestion history unavailable. Refresh to retry.</p>
        ) : latestJob ? (
          <div aria-label="Latest ingestion attempt">
            <h3>Latest ingestion job</h3>
            <p>
              {latestJob.status === 'queued' && latestJob.attempt > 0
                ? 'Retry scheduled'
                : statusLabel(latestJob.status)}{' '}
              · Attempts started: {latestJob.attempt} of{' '}
              {latestJob.max_attempts}
            </p>
            {latestJob.status === 'queued' && (
              <p>
                Eligible after{' '}
                <Timestamp
                  value={latestJob.next_run_at}
                  timezone={active.timezone}
                />
                . This is the earliest eligible start time, not a completion
                promise.
              </p>
            )}
            {latestJob.started_at && (
              <p>
                First started{' '}
                <Timestamp
                  value={latestJob.started_at}
                  timezone={active.timezone}
                />
              </p>
            )}
            {latestJob.completed_at && (
              <p>
                Finished{' '}
                <Timestamp
                  value={latestJob.completed_at}
                  timezone={active.timezone}
                />
              </p>
            )}
          </div>
        ) : (
          <p className="field-help">
            No ingestion job is recorded for this source.
          </p>
        )}
        {source.data.status === 'failed' && (
          <p role="alert" className="form-error">
            {source.data.error_message ?? 'Indexing failed. Retry this source.'}
          </p>
        )}
        <KnowledgeRefresh
          active={['queued', 'processing', 'uploading'].includes(
            source.data.status,
          )}
        />
        {['owner', 'admin'].includes(active.role) && (
          <SourceControls
            sourceId={sourceId}
            sourceName={source.data.name}
            enabled={source.data.enabled}
            status={source.data.status}
            errorCode={source.data.error_code}
          />
        )}
      </section>
      <section className="workspace-card">
        <h2>Preview</h2>
        {documents.error ? (
          <p role="alert">Preview could not be loaded. Refresh to retry.</p>
        ) : !documents.data?.length ? (
          <p>Preview will appear after indexing finishes.</p>
        ) : (
          documents.data.map((doc) => (
            <article key={doc.id} className="knowledge-preview">
              <h3>{doc.title}</h3>
              <pre>{doc.content.slice(0, 3000)}</pre>
              {doc.content.length > 3000 && (
                <p className="field-help">
                  Preview truncated to 3,000 characters.
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
