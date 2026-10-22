import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import {
  KnowledgeForms,
  KnowledgeRefresh,
  SourceControls,
} from './knowledge-forms';
import { Disclosure } from '../../../components/shared/disclosure';
import { PageHeading } from '../../../components/shared/page-heading';
import { Timestamp } from '../../../components/shared/record-state';
import {
  libraryFilters,
  libraryHref,
  listSources,
  SOURCE_PAGE_SIZE,
} from '../../../lib/knowledge/library';
import type { ListParams } from '../../../lib/support/list-navigation';
import styles from './knowledge.module.css';
import { SourceReadiness } from '../../../components/knowledge/source-readiness';

export const metadata: Metadata = {
  title: 'Knowledge',
  robots: { index: false, follow: false },
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const filters = libraryFilters(await searchParams);
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt && active.onboardingStep !== 'knowledge')
    redirect('/app/onboarding');
  const {
    data: sources,
    error,
    count,
  } = await listSources(supabase, active.id, filters);
  const pages = Math.max(1, Math.ceil((count ?? 0) / SOURCE_PAGE_SIZE));
  if (!error && filters.page >= pages)
    redirect(libraryHref({ ...filters, page: pages - 1 }));
  const canEdit = ['owner', 'admin'].includes(active.role);
  return (
    <div className="settings-page">
      <PageHeading
        eyebrow="WORKSPACE / KNOWLEDGE"
        title="Knowledge"
        description="Review your support library. Only ready, enabled sources can support new AI answers."
      />
      {!active.onboardingCompletedAt && (
        <Link href="/app/onboarding">Return to setup</Link>
      )}
      <section
        className="workspace-card"
        aria-labelledby="knowledge-list-heading"
      >
        <h2 id="knowledge-list-heading">Sources</h2>
        <form
          className={`filter-bar ${styles.search}`}
          action="/app/knowledge"
          role="search"
        >
          <div className="field">
            <label htmlFor="source-search">Search sources</label>
            <input
              type="search"
              id="source-search"
              name="q"
              maxLength={200}
              defaultValue={filters.query}
              placeholder="Source name"
            />
          </div>
          <button className="secondary-button">Search</button>
          {filters.query && (
            <Link className="quiet-link" href="/app/knowledge">
              Clear search
            </Link>
          )}
        </form>
        {error ? (
          <div className="error-state">
            <p role="alert">Sources could not be loaded.</p>
            <Link href={libraryHref(filters)}>Retry</Link>
          </div>
        ) : (
          <>
            <KnowledgeRefresh
              active={(sources ?? []).some((s) =>
                ['queued', 'processing', 'uploading'].includes(s.status),
              )}
            />
            {!sources?.length ? (
              <p>
                {filters.query
                  ? 'No matching sources.'
                  : 'No sources yet. Add text or upload a file to start indexing.'}
              </p>
            ) : (
              <ul className="knowledge-source-list">
                {sources.map((source) => (
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
                      </p>
                      {source.last_indexed_at && (
                        <p className="field-help">
                          Indexed{' '}
                          <Timestamp
                            value={source.last_indexed_at}
                            timezone={active.timezone}
                          />
                        </p>
                      )}
                      {source.status === 'failed' && (
                        <p className="form-error" role="alert">
                          {source.error_message ??
                            'Indexing failed. Open the source for recovery.'}
                        </p>
                      )}
                    </div>
                    <div>
                      <SourceReadiness source={source} />
                      {canEdit && (
                        <SourceControls
                          sourceName={source.name}
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
            )}
            <nav
              className="knowledge-pagination filter-bar"
              aria-label="Source pages"
            >
              <span role="status">
                {count ?? 0} sources · Page {filters.page + 1} of {pages}
              </span>
              {filters.page > 0 && (
                <Link
                  href={libraryHref({ ...filters, page: filters.page - 1 })}
                >
                  Previous page
                </Link>
              )}
              {filters.page + 1 < pages && (
                <Link
                  href={libraryHref({ ...filters, page: filters.page + 1 })}
                >
                  Next page
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
      {canEdit ? (
        <Disclosure label="Add knowledge">
          <KnowledgeForms canEdit />
        </Disclosure>
      ) : (
        <KnowledgeForms canEdit={false} />
      )}
    </div>
  );
}
