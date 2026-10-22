'use client';

import { useActionState } from 'react';
import {
  FieldError,
  FormFeedback,
  fieldDescription,
} from '../../../../components/shared/form-feedback';
import { initialFormState } from '../../../../lib/action-state';
import { saveGeneralSettings } from '../../workspace-actions';

type Defaults = {
  name: string;
  slug: string;
  timezone: string;
  companyName: string;
  supportName: string;
  supportEmail: string;
  websiteOrigin: string;
};
const timezoneOptions = [
  'UTC',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];
const fields: {
  key: keyof Defaults;
  label: string;
  type?: string;
  required?: boolean;
  help?: string;
}[] = [
  { key: 'name', label: 'Workspace name', required: true },
  {
    key: 'slug',
    label: 'Workspace URL slug',
    required: true,
    help: '3–48 lowercase letters, numbers, or hyphens.',
  },
  {
    key: 'timezone',
    label: 'Timezone',
    required: true,
    help: 'Use a valid IANA timezone such as Asia/Karachi or UTC.',
  },
  { key: 'companyName', label: 'Company or organization', required: true },
  { key: 'supportName', label: 'Support team name', required: true },
  {
    key: 'supportEmail',
    label: 'Public support email',
    type: 'email',
    required: true,
    help: 'This address is identity information, not a verified sending domain.',
  },
  {
    key: 'websiteOrigin',
    label: 'Website origin',
    type: 'url',
    help: 'An exact HTTPS origin, or http://localhost for local setup.',
  },
];

export function GeneralForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(
    saveGeneralSettings,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack general-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      {fields.map(({ key, label, type, required, help }) => (
        <div className="field" key={key}>
          <label htmlFor={key}>{label}</label>
          {key === 'timezone' ? (
            <select
              id={key}
              name={key}
              required={required}
              defaultValue={state.values?.[key] ?? defaults[key]}
              aria-invalid={Boolean(state.fields?.[key])}
              aria-describedby={fieldDescription(
                key,
                state.fields?.[key],
                help,
              )}
            >
              {!timezoneOptions.includes(defaults.timezone) && (
                <option value={defaults.timezone}>{defaults.timezone}</option>
              )}
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={key}
              name={key}
              type={type ?? 'text'}
              required={required}
              defaultValue={state.values?.[key] ?? defaults[key]}
              minLength={required ? (key === 'slug' ? 3 : 2) : undefined}
              maxLength={
                key === 'slug'
                  ? 48
                  : key === 'name'
                    ? 100
                    : key === 'websiteOrigin'
                      ? 255
                      : key === 'supportEmail'
                        ? 320
                        : 120
              }
              aria-invalid={Boolean(state.fields?.[key])}
              aria-describedby={fieldDescription(
                key,
                state.fields?.[key],
                help,
              )}
            />
          )}
          {help && (
            <p id={key + '-help'} className="field-help">
              {help}
            </p>
          )}
          <FieldError id={key} error={state.fields?.[key]} />
        </div>
      ))}
      <FormFeedback state={state} pending={pending} busy="Saving settings…" />
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Saving settings…' : 'Save settings'}
      </button>
    </form>
  );
}
