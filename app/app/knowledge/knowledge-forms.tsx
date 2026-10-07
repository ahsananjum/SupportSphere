'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initialFormState } from '../../../lib/action-state';
import {
  changeKnowledgeSource,
  createTextSource,
  uploadKnowledgeSource,
} from './actions';

export function KnowledgeForms({ canEdit }: { canEdit: boolean }) {
  const [textState, textAction, textPending] = useActionState(
    createTextSource,
    initialFormState,
  );
  const [fileState, fileAction, filePending] = useActionState(
    uploadKnowledgeSource,
    initialFormState,
  );
  const router = useRouter();
  useEffect(() => {
    if (textState.success || fileState.success) router.refresh();
  }, [textState.success, fileState.success, router]);
  if (!canEdit)
    return (
      <p className="field-help">
        Your role can read knowledge but cannot add or change sources.
      </p>
    );
  return (
    <div className="knowledge-form-grid">
      <section className="workspace-card">
        <h2>Paste text or Markdown</h2>
        <form action={textAction} className="form-stack">
          <div className="field">
            <label htmlFor="knowledge-text-name">Source name</label>
            <input
              id="knowledge-text-name"
              name="name"
              required
              maxLength={160}
              defaultValue={textState.values?.name ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor="knowledge-text-content">Content</label>
            <textarea
              id="knowledge-text-content"
              name="content"
              required
              maxLength={80000}
              rows={8}
              defaultValue={textState.values?.content ?? ''}
              aria-describedby="knowledge-text-help"
            />
            <p id="knowledge-text-help" className="field-help">
              Up to 80,000 characters. Indexing starts after you save.
            </p>
          </div>
          {textState.message && (
            <p role="alert" className="form-error">
              {textState.message}
            </p>
          )}
          {textState.success && (
            <p role="status" className="form-success">
              {textState.success}
            </p>
          )}
          <button className="primary-button" disabled={textPending}>
            {textPending ? 'Queuing…' : 'Add text source'}
          </button>
        </form>
      </section>
      <section className="workspace-card">
        <h2>Upload a file</h2>
        <form action={fileAction} className="form-stack">
          <div className="field">
            <label htmlFor="knowledge-file-name">Source name</label>
            <input
              id="knowledge-file-name"
              name="name"
              required
              maxLength={160}
              defaultValue={fileState.values?.name ?? ''}
            />
          </div>
          <div className="field">
            <label htmlFor="knowledge-file">TXT, MD, or text PDF</label>
            <input
              id="knowledge-file"
              name="file"
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              required
              aria-describedby="knowledge-file-help"
            />
            <p id="knowledge-file-help" className="field-help">
              Maximum 4 MB. Scanned PDFs need OCR before upload.
            </p>
          </div>
          {fileState.message && (
            <p role="alert" className="form-error">
              {fileState.message}
            </p>
          )}
          {fileState.success && (
            <p role="status" className="form-success">
              {fileState.success}
            </p>
          )}
          <button className="primary-button" disabled={filePending}>
            {filePending ? 'Uploading…' : 'Upload and index'}
          </button>
        </form>
      </section>
    </div>
  );
}

export function KnowledgeRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return active ? (
    <p className="field-help" role="status">
      Indexing is running in the background. Status refreshes automatically.
    </p>
  ) : null;
}

export function SourceControls({
  sourceId,
  enabled,
  status,
  errorCode,
}: {
  sourceId: string;
  enabled: boolean;
  status: string;
  errorCode: string | null;
}) {
  const [state, action, pending] = useActionState(
    changeKnowledgeSource,
    initialFormState,
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  return (
    <div className="knowledge-controls">
      {status === 'failed' &&
        (!errorCode ||
          [
            'EMBEDDING_UNAVAILABLE',
            'EMBEDDING_INVALID',
            'STORAGE_UNAVAILABLE',
            'PERSIST_FAILED',
            'WORKER_ERROR',
            'WORKER_TIMEOUT',
            'JOB_LIMIT',
          ].includes(errorCode)) && (
          <form action={action}>
            <input type="hidden" name="sourceId" value={sourceId} />
            <button
              name="operation"
              value="retry"
              className="secondary-button"
              disabled={pending}
            >
              Retry
            </button>
          </form>
        )}
      {status === 'ready' && (
        <form action={action}>
          <input type="hidden" name="sourceId" value={sourceId} />
          <button
            name="operation"
            value="reindex"
            className="secondary-button"
            disabled={pending}
          >
            Reindex
          </button>
        </form>
      )}
      <form action={action}>
        <input type="hidden" name="sourceId" value={sourceId} />
        <button
          name="operation"
          value={enabled ? 'disable' : 'enable'}
          className="secondary-button"
          disabled={pending}
        >
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </form>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              'Delete this source, its indexed content, and stored file?',
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="sourceId" value={sourceId} />
        <button
          name="operation"
          value="delete"
          className="secondary-button"
          disabled={pending}
        >
          Delete
        </button>
      </form>
      {state.message && (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
    </div>
  );
}
