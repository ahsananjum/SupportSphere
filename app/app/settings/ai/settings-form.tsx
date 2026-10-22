'use client';

import { useActionState, useState } from 'react';
import { initialFormState } from '../../../../lib/action-state';
import { saveAiSettings } from './actions';
import { aiModes } from '../../../../lib/ai/policy';
import {
  FieldError,
  FormFeedback,
  fieldDescription,
} from '../../../../components/shared/form-feedback';
import styles from './settings.module.css';

type Config = {
  mode: string;
  tone: string;
  confidence_threshold: number;
  evidence_threshold: number;
  custom_instructions: string;
  excluded_intents: string[];
  version: number;
};
export function AiSettingsForm({ config }: { config: Config }) {
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      try {
        const next = await saveAiSettings(previous, data);
        if (next.success) setDirty(false);
        return next;
      } catch {
        return {
          message:
            'The policy save was not confirmed. Your edits remain; review the saved policy before retrying.',
        };
      }
    },
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack ai-settings-form"
      aria-busy={pending}
      onReset={(e) => e.preventDefault()}
      onChange={() => setDirty(true)}
    >
      <p className="field-help">
        Saved policy version {config.version}. Changes apply when saved. Pending
        work rechecks current policy before sending; already sent replies cannot
        be recalled.
      </p>
      {dirty && (
        <p role="status" className="form-notice">
          Unsaved policy changes.
        </p>
      )}
      <fieldset disabled={pending} className={styles.fields}>
        <fieldset
          className="ai-mode-options"
          aria-describedby={state.fields?.mode ? 'ai-mode-error' : undefined}
        >
          <legend>Response mode</legend>
          {aiModes.map((mode) => (
            <label key={mode.value} className={styles.mode}>
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
        <FieldError id="ai-mode" error={state.fields?.mode} />
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
            aria-describedby={fieldDescription('ai-tone', state.fields?.tone)}
          />
          {state.fields?.tone && (
            <FieldError id="ai-tone" error={state.fields.tone} />
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
              aria-describedby={fieldDescription(
                'ai-confidence',
                state.fields?.confidence,
                'help',
              )}
            />
            <p className="field-help" id="ai-confidence-help">
              Necessary for auto reply, but confidence alone cannot authorize a
              send.
            </p>
            {state.fields?.confidence && (
              <FieldError id="ai-confidence" error={state.fields.confidence} />
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
              aria-describedby={fieldDescription(
                'ai-evidence',
                state.fields?.evidence,
                'help',
              )}
            />
            <p className="field-help" id="ai-evidence-help">
              Answers with weaker knowledge matches go to a human.
            </p>
            {state.fields?.evidence && (
              <FieldError id="ai-evidence" error={state.fields.evidence} />
            )}
          </div>
        </div>
        <fieldset>
          <legend>Also exclude from auto reply</legend>
          {['how_to', 'product_info', 'other'].map((intent) => (
            <label key={intent} className={styles.exclusion}>
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
            Billing, security, privacy, legal, and account changes always
            require a human.
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
            aria-describedby={fieldDescription(
              'ai-instructions',
              state.fields?.instructions,
              'help',
            )}
          />
          <p className="field-help" id="ai-instructions-help">
            Style guidance cannot override citations, safety, or handoff rules.
          </p>
          {state.fields?.instructions && (
            <FieldError
              id="ai-instructions"
              error={state.fields.instructions}
            />
          )}
        </div>
      </fieldset>
      <FormFeedback
        state={dirty ? { ...state, success: undefined } : state}
        pending={pending}
        busy="Saving AI policy…"
      />
      <button className="primary-button" disabled={pending}>
        {pending ? 'Saving AI policy…' : 'Save AI policy'}
      </button>
    </form>
  );
}
