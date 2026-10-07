import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { KnowledgeRefresh, SourceControls } from '../knowledge-forms';

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
  if (source.error || !source.data) notFound();
  const documents = await supabase
    .from('knowledge_documents')
    .select('id,title,content,document_index')
    .eq('workspace_id', active.id)
    .eq('source_id', sourceId)
    .order('document_index')
    .limit(3);
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / KNOWLEDGE</p>
        <Link href="/app/knowledge">← All sources</Link>
        <h1>{source.data.name}</h1>
        <p className="page-intro">
          {source.data.source_type.toUpperCase()} · {source.data.status}
          {!source.data.enabled ? ' · Disabled' : ''}
        </p>
      </div>
      <section className="workspace-card">
        <h2>Indexing</h2>
        <p>
          {source.data.document_count} documents · {source.data.chunk_count}{' '}
          chunks
        </p>
        <p>
          {source.data.last_indexed_at
            ? `Last indexed ${new Date(source.data.last_indexed_at).toLocaleString()}`
            : 'Not indexed yet'}
        </p>
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
