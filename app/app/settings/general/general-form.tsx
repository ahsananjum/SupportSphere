'use client';

import { useActionState } from 'react';
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
    <form action={action} className="form-stack general-form">
      {fields.map(({ key, label, type, required, help }) => (
        <div className="field" key={key}>
          <label htmlFor={key}>{label}</label>
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
                : key === 'name' || key === 'timezone'
                  ? 100
                  : key === 'websiteOrigin'
                    ? 255
                    : key === 'supportEmail'
                      ? 320
                      : 120
            }
            aria-invalid={Boolean(state.fields?.[key])}
            aria-describedby={
              state.fields?.[key]
                ? key + '-error'
                : help
                  ? key + '-help'
                  : undefined
            }
          />
          {help && (
            <p id={key + '-help'} className="field-help">
              {help}
            </p>
          )}
          {state.fields?.[key] && (
            <p id={key + '-error'} className="field-error">
              {state.fields[key]}
            </p>
          )}
        </div>
      ))}
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
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Saving settings…' : 'Save settings'}
      </button>
    </form>
  );
}
