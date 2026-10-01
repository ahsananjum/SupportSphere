'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { contactSchema } from '../../lib/contact/schema';

type FieldName = 'fullName' | 'email' | 'company' | 'topic' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

export function ContactForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    company: '',
    topic: 'general',
    message: '',
    website: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const update = (name: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      document.getElementById(`contact-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        errors?: Partial<Record<FieldName, string[]>>;
      };
      if (!response.ok) {
        if (result.errors) {
          setErrors(
            Object.fromEntries(
              Object.entries(result.errors).map(([key, messages]) => [
                key,
                messages?.[0],
              ]),
            ) as FieldErrors,
          );
        }
        setFormError(
          result.message ?? 'We could not send your message. Please try again.',
        );
        return;
      }
      router.push('/thank-you');
    } catch {
      setFormError(
        'We could not connect right now. Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-form-row">
        <div className="field">
          <label htmlFor="contact-fullName">Your name</label>
          <input
            id="contact-fullName"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={values.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            aria-invalid={!!errors.fullName}
            aria-describedby={
              errors.fullName ? 'contact-fullName-error' : undefined
            }
          />
          {errors.fullName && (
            <p id="contact-fullName-error" className="field-error">
              {errors.fullName}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="contact-email">Email address</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
          />
          {errors.email && (
            <p id="contact-email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
      </div>
      <div className="contact-form-row">
        <div className="field">
          <label htmlFor="contact-company">
            Company <span>(optional)</span>
          </label>
          <input
            id="contact-company"
            name="company"
            autoComplete="organization"
            maxLength={120}
            value={values.company}
            onChange={(event) => update('company', event.target.value)}
            aria-invalid={!!errors.company}
            aria-describedby={
              errors.company ? 'contact-company-error' : undefined
            }
          />
          {errors.company && (
            <p id="contact-company-error" className="field-error">
              {errors.company}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="contact-topic">Topic</label>
          <select
            id="contact-topic"
            name="topic"
            value={values.topic}
            onChange={(event) => update('topic', event.target.value)}
            aria-invalid={!!errors.topic}
            aria-describedby={errors.topic ? 'contact-topic-error' : undefined}
          >
            <option value="general">General question</option>
            <option value="product">Product feedback</option>
            <option value="partnership">Partnership</option>
            <option value="privacy">Privacy or legal</option>
          </select>
          {errors.topic && (
            <p id="contact-topic-error" className="field-error">
              {errors.topic}
            </p>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={7}
          value={values.message}
          onChange={(event) => update('message', event.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={
            errors.message ? 'contact-message-error' : 'contact-message-help'
          }
        />
        <p id="contact-message-help" className="field-help">
          A few details help us respond usefully.
        </p>
        {errors.message && (
          <p id="contact-message-error" className="field-error">
            {errors.message}
          </p>
        )}
      </div>
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update('website', event.target.value)}
        />
      </div>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <button
        type="submit"
        className="marketing-button marketing-button-dark"
        disabled={pending}
      >
        {pending ? 'Sending your message…' : 'Send message'}{' '}
        <span aria-hidden="true">↗</span>
      </button>
      <p className="contact-privacy-note">
        We use your details to answer this request. See our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}
