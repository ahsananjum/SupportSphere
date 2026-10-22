'use client';
import { ConfirmationForm } from '../../../components/shared/confirmation-form';
import { canRetryIngestion } from '../../../lib/knowledge/readiness';
import {
  FormFeedback,
  FieldError,
  fieldDescription,
} from '../../../components/shared/form-feedback';

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
    async (previous: typeof initialFormState, data: FormData) => {
      try {
        return await createTextSource(previous, data);
      } catch {
        return {
          message:
            'The save was not confirmed. Your content is preserved. Check the library for this source before retrying.',
        };
      }
    },
    initialFormState,
  );
  const [fileState, fileAction, filePending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      try {
        return await uploadKnowledgeSource(previous, data);
      } catch {
        return {
          message:
            'The upload was not confirmed. Check the library for an existing upload reservation before trying again.',
        };
      }
    },
    initialFormState,
  );
  const router = useRouter();
  useEffect(() => {
    if (textState.success || fileState.success) router.refresh();
  }, [textState, fileState, router]);
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
        <form
          action={textAction}
          className="form-stack"
          aria-busy={textPending}
          onReset={(e) => e.preventDefault()}
        >
          <div className="field">
            <label htmlFor="knowledge-text-name">Source name</label>
            <input
              id="knowledge-text-name"
              name="name"
              required
              maxLength={160}
              defaultValue={textState.values?.name ?? ''}
              readOnly={textPending}
              aria-invalid={!!textState.fields?.name}
              aria-describedby={fieldDescription(
                'knowledge-text-name',
                textState.fields?.name,
              )}
            />
            <FieldError
              id="knowledge-text-name"
              error={textState.fields?.name}
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
              readOnly={textPending}
              aria-invalid={!!textState.fields?.content}
              aria-describedby={fieldDescription(
                'knowledge-text-content',
                textState.fields?.content,
                'help',
              )}
            />
            <p id="knowledge-text-content-help" className="field-help">
              Up to 80,000 characters. Indexing starts after you save.
            </p>
            <FieldError
              id="knowledge-text-content"
              error={textState.fields?.content}
            />
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
        <form
          action={fileAction}
          className="form-stack"
          aria-busy={filePending}
          onReset={(e) => e.preventDefault()}
        >
          <div className="field">
            <label htmlFor="knowledge-file-name">Source name</label>
            <input
              id="knowledge-file-name"
              name="name"
              required
              maxLength={160}
              defaultValue={fileState.values?.name ?? ''}
              readOnly={filePending}
            />
          </div>
          <div className="field">
            <label htmlFor="knowledge-file">TXT, MD, or text PDF</label>
            <input
              id="knowledge-file"
              name="file"
              type="file"
              disabled={filePending}
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
      Status refreshes every five seconds. Queued work still needs an indexing
      worker to finish; no completion time is confirmed.
    </p>
  ) : null;
}

export function SourceControls({
  sourceId,
  sourceName,
  enabled,
  status,
  errorCode,
}: {
  sourceId: string;
  sourceName: string;
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
      {status === 'failed' && canRetryIngestion(errorCode) && (
        <form action={action}>
          <input type="hidden" name="sourceId" value={sourceId} />
          <button
            name="operation"
            value="retry"
            className="secondary-button"
            disabled={pending}
          >
            {pending ? 'Updating…' : 'Retry'}
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
      <ConfirmationForm
        action={action}
        message={`Delete “${sourceName}”, its indexed content, and stored file?`}
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
      </ConfirmationForm>
      <FormFeedback state={state} pending={pending} busy="Updating source…" />
    </div>
  );
}
