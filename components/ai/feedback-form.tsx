'use client';
import { useActionState } from 'react';
import { submitAiFeedback } from '../../app/app/ai/actions';
import { initialFormState } from '../../lib/action-state';
import { FormFeedback } from '../shared/form-feedback';
export function AiFeedbackForm({ runId }: { runId: string }) {
  const [state, action, pending] = useActionState(
    submitAiFeedback,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack"
      aria-busy={pending}
      onReset={(e) => e.preventDefault()}
    >
      <input type="hidden" name="runId" value={runId} />
      <div className="field">
        <label htmlFor="ai-rating">Rating</label>
        <select id="ai-rating" name="rating" required disabled={pending}>
          <option value="helpful">Helpful</option>
          <option value="unhelpful">Unhelpful</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ai-reason">Reason</label>
        <input id="ai-reason" name="reason" maxLength={80} readOnly={pending} />
      </div>
      <div className="field">
        <label htmlFor="ai-comment">Comment</label>
        <textarea
          id="ai-comment"
          name="comment"
          maxLength={500}
          rows={3}
          readOnly={pending}
        />
      </div>
      <FormFeedback state={state} pending={pending} busy="Saving feedback…" />
      <button className="secondary-button" disabled={pending}>
        {pending ? 'Saving feedback…' : 'Save feedback'}
      </button>
    </form>
  );
}
