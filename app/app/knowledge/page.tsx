import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import {
  KnowledgeForms,
  KnowledgeRefresh,
  SourceControls,
} from './knowledge-forms';

export const metadata: Metadata = {
  title: 'Knowledge',
  robots: { index: false, follow: false },
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const rawPage = (await searchParams).page;
  const page =
    rawPage && /^\d{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt && active.onboardingStep !== 'knowledge')
    redirect('/app/onboarding');
  const {
    data: sources,
    error,
    count,
  } = await supabase
    .from('knowledge_sources')
    .select(
      'id,name,source_type,status,enabled,document_count,chunk_count,last_indexed_at,error_code,error_message,created_at',
      { count: 'exact' },
    )
    .eq('workspace_id', active.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  const canEdit = ['owner', 'admin'].includes(active.role);
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / KNOWLEDGE</p>
        <h1>Knowledge</h1>
        <p className="page-intro">
          Add trustworthy support material. Sources become available to
          retrieval only after every chunk is indexed.
        </p>
        {!active.onboardingCompletedAt && (
          <Link href="/app/onboarding">Return to setup</Link>
        )}
      </div>
      <KnowledgeForms canEdit={canEdit} />
      <section
        className="workspace-card"
        aria-labelledby="knowledge-list-heading"
      >
        <h2 id="knowledge-list-heading">Sources</h2>
        {error ? (
          <div className="error-state">
            <p role="alert">Sources could not be loaded.</p>
            <Link href="/app/knowledge">Retry</Link>
          </div>
        ) : !sources?.length && page === 1 ? (
          <p>No sources yet. Add text or upload a file to start indexing.</p>
        ) : (
          <>
            <KnowledgeRefresh
              active={(sources ?? []).some((source) =>
                ['queued', 'processing', 'uploading'].includes(source.status),
              )}
            />
            <ul className="knowledge-source-list">
              {(sources ?? []).map((source) => (
                <li key={source.id} className="knowledge-source-row">
                  <div>
                    <h3>
                      <Link href={`/app/knowledge/${source.id}`}>
                        {source.name}
                      </Link>
                    </h3>
                    <p className="field-help">
                      {source.source_type.toUpperCase()} ·{' '}
                      {source.document_count} documents · {source.chunk_count}{' '}
                      chunks
                      {source.last_indexed_at
                        ? ` · Indexed ${new Date(source.last_indexed_at).toLocaleString()}`
                        : ''}
                    </p>
                    {source.status === 'failed' && (
                      <p className="form-error" role="alert">
                        {source.error_message ??
                          'Indexing failed. Retry this source.'}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="knowledge-status">
                      {source.status}
                      {!source.enabled ? ' · Disabled' : ''}
                    </span>
                    {canEdit && (
                      <SourceControls
                        sourceId={source.id}
                        enabled={source.enabled}
                        status={source.status}
                        errorCode={source.error_code}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {!sources?.length && (
              <p>No sources on this page. Go to the previous page.</p>
            )}
            <nav className="knowledge-pagination" aria-label="Source pages">
              {page > 1 && (
                <Link href={`/app/knowledge?page=${page - 1}`}>Previous</Link>
              )}
              <span>
                Page {page}
                {count !== null
                  ? ` of ${Math.max(1, Math.ceil(count / 25))}`
                  : ''}
              </span>
              {count !== null && page * 25 < count && (
                <Link href={`/app/knowledge?page=${page + 1}`}>Next</Link>
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
