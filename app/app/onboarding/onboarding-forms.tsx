'use client';

import { useActionState } from 'react';
import { initialFormState } from '../../../lib/action-state';
import {
  saveOnboardingIdentity,
  saveOnboardingOrigin,
  finishOnboarding,
} from '../workspace-actions';

function Feedback({
  state,
}: {
  state: { message?: string; success?: string };
}) {
  return state.message ? (
    <p role="alert" className="form-error">
      {state.message}
    </p>
  ) : state.success ? (
    <p role="status" className="form-success">
      {state.success}
    </p>
  ) : null;
}

export function IdentityForm({
  companyName,
  supportName,
  supportEmail,
}: {
  companyName: string;
  supportName: string;
  supportEmail: string;
}) {
  const [state, action, pending] = useActionState(
    saveOnboardingIdentity,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack setup-form">
      <div className="field">
        <label htmlFor="companyName">Company or organization</label>
        <input
          id="companyName"
          name="companyName"
          defaultValue={state.values?.companyName ?? companyName}
          minLength={2}
          maxLength={120}
          required
          aria-invalid={Boolean(state.fields?.companyName)}
          aria-describedby={
            state.fields?.companyName ? 'companyName-error' : undefined
          }
        />
        {state.fields?.companyName && (
          <p id="companyName-error" className="field-error">
            {state.fields.companyName}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="supportName">Support team name</label>
        <input
          id="supportName"
          name="supportName"
          defaultValue={state.values?.supportName ?? supportName}
          minLength={2}
          maxLength={120}
          required
          aria-invalid={Boolean(state.fields?.supportName)}
          aria-describedby={
            state.fields?.supportName ? 'supportName-error' : undefined
          }
        />
        {state.fields?.supportName && (
          <p id="supportName-error" className="field-error">
            {state.fields.supportName}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="supportEmail">Public support email</label>
        <input
          id="supportEmail"
          name="supportEmail"
          type="email"
          defaultValue={state.values?.supportEmail ?? supportEmail}
          maxLength={320}
          required
          aria-invalid={Boolean(state.fields?.supportEmail)}
          aria-describedby={
            state.fields?.supportEmail
              ? 'supportEmail-error'
              : 'supportEmail-help'
          }
        />
        <p id="supportEmail-help" className="field-help">
          This is your published support identity. It does not verify a sending
          domain.
        </p>
        {state.fields?.supportEmail && (
          <p id="supportEmail-error" className="field-error">
            {state.fields.supportEmail}
          </p>
        )}
      </div>
      <Feedback state={state} />
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Saving identity…' : 'Save and continue'}
      </button>
    </form>
  );
}

export function OriginForm({ websiteOrigin }: { websiteOrigin: string }) {
  const [state, action, pending] = useActionState(
    saveOnboardingOrigin,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack setup-form">
      <div className="field">
        <label htmlFor="websiteOrigin">Website origin</label>
        <input
          id="websiteOrigin"
          name="websiteOrigin"
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          defaultValue={state.values?.websiteOrigin ?? websiteOrigin}
          maxLength={255}
          aria-invalid={Boolean(state.fields?.websiteOrigin)}
          aria-describedby={
            state.fields?.websiteOrigin
              ? 'websiteOrigin-error'
              : 'websiteOrigin-help'
          }
        />
        <p id="websiteOrigin-help" className="field-help">
          Optional now. Add the exact HTTPS origin of your website when you are
          ready to configure a widget.
        </p>
        {state.fields?.websiteOrigin && (
          <p id="websiteOrigin-error" className="field-error">
            {state.fields.websiteOrigin}
          </p>
        )}
      </div>
      <Feedback state={state} />
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Saving origin…' : 'Save and continue'}
      </button>
    </form>
  );
}

export function AiModeForm({ currentMode }: { currentMode: string }) {
  const [state, action, pending] = useActionState(
    finishOnboarding,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack setup-form">
      <fieldset className="setup-choice">
        <legend>Choose your future AI policy</legend>
        <label>
          <input
            type="radio"
            name="aiMode"
            value="off"
            defaultChecked={currentMode === 'off'}
          />{' '}
          Off <small>No AI assistance requested.</small>
        </label>
        <label>
          <input
            type="radio"
            name="aiMode"
            value="draft_only"
            defaultChecked={currentMode === 'draft_only'}
          />{' '}
          Draft only{' '}
          <small>
            Prepare suggestions for human review when AI is configured.
          </small>
        </label>
        <label>
          <input
            type="radio"
            name="aiMode"
            value="assisted"
            defaultChecked={currentMode === 'assisted'}
          />{' '}
          Assisted reply{' '}
          <small>
            Record this preference for the future AI setup; auto replies are not
            active yet.
          </small>
        </label>
      </fieldset>
      {state.fields?.aiMode && (
        <p className="field-error">{state.fields.aiMode}</p>
      )}
      <p className="field-help">
        This choice saves a policy preference. AI responses remain unavailable
        until the knowledge and AI workflows are implemented and configured.
      </p>
      <Feedback state={state} />
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Finishing setup…' : 'Finish workspace setup'}
      </button>
    </form>
  );
}
