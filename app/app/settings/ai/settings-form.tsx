'use client';

import { useActionState } from 'react';
import { initialFormState } from '../../../../lib/action-state';
import { saveAiSettings } from './actions';

type Config = {
  mode: string;
  tone: string;
  confidence_threshold: number;
  evidence_threshold: number;
  custom_instructions: string;
  excluded_intents: string[];
  version: number;
};
const modes = [
  {
    value: 'off',
    label: 'Off',
    help: 'Customer messages do not trigger AI generation.',
  },
  {
    value: 'draft_only',
    label: 'Draft only',
    help: 'AI suggestions wait for a team member to review and send.',
  },
  {
    value: 'assisted',
    label: 'Assisted auto reply',
    help: 'Only grounded, low risk answers that pass every gate are sent.',
  },
];
export function AiSettingsForm({ config }: { config: Config }) {
  const [state, action, pending] = useActionState(
    saveAiSettings,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack ai-settings-form">
      <fieldset className="ai-mode-options">
        <legend>Response mode</legend>
        {modes.map((mode) => (
          <label key={mode.value} className="setup-choice">
            <input
              type="radio"
              name="mode"
              value={mode.value}
              defaultChecked={
                (state.values?.mode ?? config.mode) === mode.value
              }
            />
            <strong>{mode.label}</strong>
            <small>{mode.help}</small>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="ai-tone">Reply tone</label>
        <input
          id="ai-tone"
          name="tone"
          required
          minLength={3}
          maxLength={120}
          defaultValue={state.values?.tone ?? config.tone}
          aria-invalid={!!state.fields?.tone}
        />
        {state.fields?.tone && (
          <p className="field-error">{state.fields.tone}</p>
        )}
      </div>
      <div className="ai-thresholds">
        <div className="field">
          <label htmlFor="ai-confidence">Minimum confidence</label>
          <input
            id="ai-confidence"
            name="confidence"
            type="number"
            min="0.70"
            max="0.99"
            step="0.01"
            required
            defaultValue={
              state.values?.confidence ?? config.confidence_threshold
            }
            aria-invalid={!!state.fields?.confidence}
          />
          <p className="field-help">
            Auto reply needs at least this confidence.
          </p>
          {state.fields?.confidence && (
            <p className="field-error">{state.fields.confidence}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="ai-evidence">Minimum evidence score</label>
          <input
            id="ai-evidence"
            name="evidence"
            type="number"
            min="0.60"
            max="0.95"
            step="0.01"
            required
            defaultValue={state.values?.evidence ?? config.evidence_threshold}
            aria-invalid={!!state.fields?.evidence}
          />
          <p className="field-help">
            Answers with weaker knowledge matches go to a human.
          </p>
          {state.fields?.evidence && (
            <p className="field-error">{state.fields.evidence}</p>
          )}
        </div>
      </div>
      <fieldset>
        <legend>Also exclude from auto reply</legend>
        {['how_to', 'product_info', 'other'].map((intent) => (
          <label key={intent} className="check-row">
            <input
              type="checkbox"
              name="exclude"
              value={intent}
              defaultChecked={config.excluded_intents.includes(intent)}
            />
            {intent === 'how_to'
              ? 'How-to questions'
              : intent === 'product_info'
                ? 'Product information'
                : 'Other requests'}
          </label>
        ))}
        <p className="field-help">
          Billing, security, privacy, legal, and account changes always require
          a human.
        </p>
      </fieldset>
      <div className="field">
        <label htmlFor="ai-instructions">Workspace writing guidance</label>
        <textarea
          id="ai-instructions"
          name="instructions"
          rows={4}
          maxLength={1000}
          defaultValue={
            state.values?.instructions ?? config.custom_instructions
          }
          aria-invalid={!!state.fields?.instructions}
        />
        <p className="field-help">
          Style guidance cannot override citations, safety, or handoff rules.
        </p>
        {state.fields?.instructions && (
          <p className="field-error">{state.fields.instructions}</p>
        )}
      </div>
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
      <button className="primary-button" disabled={pending}>
        {pending ? 'Saving AI policy…' : 'Save AI policy'}
      </button>
    </form>
  );
}
