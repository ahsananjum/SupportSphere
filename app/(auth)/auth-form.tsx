'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { initialFormState } from '../../lib/action-state';
import { logIn, requestReset, signUp, updatePassword } from './actions';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const config = {
  login: {
    title: 'Welcome back',
    intro: 'Sign in to your workspace.',
    button: 'Sign in',
  },
  signup: {
    title: 'Create your account',
    intro: 'Start a support workspace.',
    button: 'Create account',
  },
  forgot: {
    title: 'Reset your password',
    intro: 'We will email you a secure reset link.',
    button: 'Send reset link',
  },
  reset: {
    title: 'Choose a new password',
    intro: 'Use a password with at least eight characters.',
    button: 'Update password',
  },
};

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: Mode;
  next?: string;
  notice?: string;
}) {
  const action =
    mode === 'login'
      ? logIn
      : mode === 'signup'
        ? signUp
        : mode === 'forgot'
          ? requestReset
          : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const details = config[mode];

  return (
    <section aria-labelledby="auth-title">
      <h1 id="auth-title" className="auth-title">
        {details.title}
      </h1>
      <p className="auth-intro">{details.intro}</p>
      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}
      {state.success ? (
        <div role="status" className="form-success">
          <p>{state.success}</p>
          <Link href="/login">Go to sign in</Link>
        </div>
      ) : (
        <form action={formAction} className="form-stack">
          {next && <input type="hidden" name="next" value={next} />}
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="displayName">Your name</label>
              <input
                id="displayName"
                name="displayName"
                autoComplete="name"
                defaultValue={state.values?.displayName}
                maxLength={120}
                required
                aria-invalid={Boolean(state.fields?.displayName)}
                aria-describedby={
                  state.fields?.displayName ? 'displayName-error' : undefined
                }
              />
              {state.fields?.displayName && (
                <p id="displayName-error" className="field-error">
                  {state.fields.displayName}
                </p>
              )}
            </div>
          )}
          {mode !== 'reset' && (
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                maxLength={320}
                required
                aria-invalid={Boolean(state.fields?.email)}
                aria-describedby={
                  state.fields?.email ? 'email-error' : undefined
                }
              />
              {state.fields?.email && (
                <p id="email-error" className="field-error">
                  {state.fields.email}
                </p>
              )}
            </div>
          )}
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div className="field">
              <label htmlFor="password">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={8}
                maxLength={128}
                required
                aria-invalid={Boolean(state.fields?.password)}
                aria-describedby={
                  state.fields?.password ? 'password-error' : undefined
                }
              />
              {state.fields?.password && (
                <p id="password-error" className="field-error">
                  {state.fields.password}
                </p>
              )}
            </div>
          )}
          {mode === 'reset' && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(state.fields?.confirmPassword)}
                aria-describedby={
                  state.fields?.confirmPassword
                    ? 'confirmPassword-error'
                    : undefined
                }
              />
              {state.fields?.confirmPassword && (
                <p id="confirmPassword-error" className="field-error">
                  {state.fields.confirmPassword}
                </p>
              )}
            </div>
          )}
          {state.message && (
            <p role="alert" className="form-error">
              {state.message}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? 'Please wait…' : details.button}
          </button>
        </form>
      )}
      {mode === 'login' && (
        <nav className="auth-links" aria-label="Account help">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/signup">Create an account</Link>
        </nav>
      )}
      {mode === 'signup' && (
        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      )}
      {mode === 'forgot' && (
        <p className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </p>
      )}
    </section>
  );
}
