'use client';
import { useState } from 'react';
export function DraftAdoption({
  draft,
  runId,
  body,
  pending,
  onAdopt,
}: {
  draft: string;
  runId: string;
  body: string;
  pending: boolean;
  onAdopt: (text: string) => void;
}) {
  const [choice, setChoice] = useState<{
    draft: string;
    runId: string;
    body: string;
  } | null>(null);
  const unchanged =
    choice &&
    choice.draft === draft &&
    choice.runId === runId &&
    choice.body === body;
  return (
    <div>
      <button
        type="button"
        className="secondary-button"
        disabled={pending}
        onClick={() => {
          if (!body) {
            onAdopt(draft);
            setChoice(null);
          } else setChoice({ draft, runId, body });
        }}
      >
        Use this draft
      </button>
      <p className="field-help">
        Copies this suggestion into the composer for your review. Sending or
        saving a note is a separate action; new suggestions never replace your
        writing.
      </p>
      {choice && (
        <section aria-label="Replace your writing?" className="form-notice">
          <h3>Replace your writing?</h3>
          <p>
            Your composer already contains text. Keep it, or replace it with the
            suggestion you reviewed.
          </p>
          {!unchanged && (
            <p role="status">
              The suggestion or your writing changed. Review the current draft
              again before replacing anything.
            </p>
          )}
          <button
            type="button"
            className="secondary-button"
            disabled={pending}
            onClick={() => setChoice(null)}
          >
            Keep my writing
          </button>{' '}
          <button
            type="button"
            className="secondary-button"
            disabled={pending || !unchanged}
            onClick={() => {
              if (unchanged) {
                onAdopt(choice.draft);
                setChoice(null);
              }
            }}
          >
            Replace with reviewed draft
          </button>
        </section>
      )}
    </div>
  );
}
