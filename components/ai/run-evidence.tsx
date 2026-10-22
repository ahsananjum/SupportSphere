import type { RunEvidence } from '../../lib/ai/evidence';
import { sourceReadiness } from '../../lib/knowledge/readiness';
import { ReviewRefresh } from './review-refresh';
import styles from './review.module.css';

export function AiEvidence({ evidence }: { evidence: RunEvidence }) {
  return (
    <section aria-label="Evidence for this answer" className={styles.evidence}>
      <h3>Evidence for this answer</h3>
      <p className="field-help">
        Recorded snippets support this run. Check the current source before
        relying on them; opening a source keeps this reply in its tab.
      </p>
      {evidence.error ? (
        <>
          <p role="alert">Evidence could not be loaded.</p>
          <ReviewRefresh />
        </>
      ) : !evidence.citations.length ? (
        <p>
          No reliable citation was recorded. Review the answer with a human.
        </p>
      ) : (
        <ol className={styles.citations}>
          {evidence.citations.map((c) => (
            <li key={c.id}>
              <strong>
                [{c.ordinal}]{' '}
                {c.source?.name ??
                  (c.sourceLoadFailed
                    ? 'Source details unavailable'
                    : 'Source removed or unavailable')}
              </strong>
              <blockquote>{c.snippet || 'No snippet was recorded.'}</blockquote>
              {c.source ? (
                <>
                  <p className="field-help">
                    Current source: {sourceReadiness(c.source).label}.
                    {!c.chunk_id &&
                      ' Original chunk no longer available; this snippet is historical.'}
                  </p>
                  <a
                    href={`/app/knowledge/${c.source.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open {c.source.name} in a new tab ↗
                  </a>
                </>
              ) : (
                <p className="field-help">
                  The recorded snippet is historical. The source cannot
                  currently be verified.
                </p>
              )}
              {c.sourceLoadFailed && <ReviewRefresh />}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
