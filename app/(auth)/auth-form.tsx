'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useActionState, useState } from 'react';
import { initialFormState } from '../../lib/action-state';
import {
  logIn,
  requestReset,
  signInWithGoogle,
  signUp,
  updatePassword,
} from './actions';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const config = {
  login: {
    title: 'Sign In or Join Now!',
    intro: 'login or create your SupportSphere account.',
    button: 'Continue With Email',
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

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.21 0 10.05 0 12s.45 3.79 1.25 5.41l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
      />
    </svg>
  );
}

function AtIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </svg>
  );
}

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

  // Two-step progressive auth state for login
  const [userStep, setUserStep] = useState<'email' | 'password' | null>(null);
  const [enteredEmail, setEnteredEmail] = useState('');
  const [clientEmailError, setClientEmailError] = useState('');

  const currentEmail = enteredEmail || state.email || '';
  const step =
    userStep !== null
      ? userStep
      : state.fields?.password || state.message
        ? 'password'
        : 'email';

  const handleContinueWithEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = currentEmail.trim();
    if (!trimmed) {
      setClientEmailError('Enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setClientEmailError('Enter a valid email address.');
      return;
    }
    setClientEmailError('');
    setUserStep('password');
  };

  return (
    <motion.section
      aria-labelledby="auth-title"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="auth-header">
        <h1 id="auth-title" className="auth-title">
          {details.title}
        </h1>
        <p className="auth-intro">{details.intro}</p>
      </div>

      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}

      {mode === 'login' && (
        <>
          <form action={signInWithGoogle} className="oauth-form">
            {next && <input type="hidden" name="next" value={next} />}
            <motion.button
              type="submit"
              className="oauth-pill-button"
              aria-label="Continue with Google"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </motion.button>
          </form>

          <div className="auth-divider" role="separator" aria-label="or">
            <span>OR</span>
          </div>
        </>
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

          {/* Email input for login step 1 */}
          {mode === 'login' && (
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.div
                  key="step-email-input"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="field"
                >
                  <label htmlFor="email">
                    Email address
                    <span className="auth-label-hint">
                      Enter your email address to sign in or create an account
                    </span>
                  </label>
                  <div className="auth-input-group">
                    <span className="auth-input-prefix" aria-hidden="true">
                      <AtIcon />
                    </span>
                    <input
                      id="email"
                      suppressHydrationWarning
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="your.email@example.com"
                      value={currentEmail}
                      onChange={(e) => {
                        setEnteredEmail(e.target.value);
                        if (clientEmailError) setClientEmailError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleContinueWithEmail();
                        }
                      }}
                      className="with-prefix"
                      maxLength={320}
                      required
                      aria-invalid={Boolean(clientEmailError)}
                      aria-describedby={
                        clientEmailError ? 'client-email-error' : undefined
                      }
                    />
                  </div>
                  {clientEmailError && (
                    <p id="client-email-error" className="field-error">
                      {clientEmailError}
                    </p>
                  )}
                  <div className="auth-field-auxiliary">
                    <Link href="/forgot-password" className="auth-inline-link">
                      Forgot password?
                    </Link>
                  </div>
                  <motion.button
                    type="button"
                    className="primary-button"
                    onClick={handleContinueWithEmail}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    Continue With Email
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="step-password-input"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="auth-email-badge">
                    <span>{currentEmail}</span>
                    <button
                      type="button"
                      className="auth-change-email-btn"
                      onClick={() => setUserStep('email')}
                    >
                      Change
                    </button>
                  </div>
                  <input type="hidden" name="email" value={currentEmail} />

                  <div className="field">
                    <div className="field-header-row">
                      <label htmlFor="password">Password</label>
                      <Link
                        href="/forgot-password"
                        className="auth-inline-link"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      minLength={8}
                      maxLength={128}
                      required
                      autoFocus
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
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Email input for non-login modes */}
          {mode !== 'login' && mode !== 'reset' && (
            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="auth-input-group">
                <span className="auth-input-prefix" aria-hidden="true">
                  <AtIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your.email@example.com"
                  defaultValue={state.email}
                  className="with-prefix"
                  maxLength={320}
                  required
                  aria-invalid={Boolean(state.fields?.email)}
                  aria-describedby={
                    state.fields?.email ? 'email-error' : undefined
                  }
                />
              </div>
              {state.fields?.email && (
                <p id="email-error" className="field-error">
                  {state.fields.email}
                </p>
              )}
            </div>
          )}

          {/* Password for signup or reset */}
          {(mode === 'signup' || mode === 'reset') && (
            <div className="field">
              <label htmlFor="password">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'new-password'
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

          {/* Render primary submit button for non-step-1-login */}
          {(mode !== 'login' || step === 'password') && (
            <motion.button
              className="primary-button"
              type="submit"
              disabled={pending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {pending
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : details.button}
            </motion.button>
          )}
        </form>
      )}

      {(mode === 'login' || mode === 'signup') && (
        <p className="auth-disclaimer">
          By clicking continue, you agree to our{' '}
          <span className="auth-legal-term">Terms of Service</span> and{' '}
          <span className="auth-legal-term">Privacy Policy</span>.
        </p>
      )}

      {mode === 'login' && (
        <nav className="auth-links" aria-label="Account options">
          <span>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link-highlight">
              <strong>Join Now</strong>
            </Link>
          </span>
          <Link href="/forgot-password" className="auth-link-subtle">
            Forgot / Reset password?
          </Link>
        </nav>
      )}
      {mode === 'signup' && (
        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">
            <strong>Sign in</strong>
          </Link>
        </p>
      )}
      {mode === 'forgot' && (
        <p className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </p>
      )}
    </motion.section>
  );
}
