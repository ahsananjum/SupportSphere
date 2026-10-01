import 'server-only';
import { getEmailEnv } from '../env';
import { trustedUrl } from '../auth/redirect';
import { logEvent } from '../observability/log';
import { publicFacts } from '../marketing/facts';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
}

export async function sendInvitationEmail(input: {
  to: string;
  workspaceName: string;
  token: string;
  role: string;
  invitationId: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const env = getEmailEnv();
    const link = trustedUrl('/invite/' + encodeURIComponent(input.token));
    const safeName = escapeHtml(input.workspaceName);
    const safeRole = escapeHtml(input.role);
    const safeLink = escapeHtml(link);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: input.to }],
        subject: 'Join ' + input.workspaceName + ' on SupportSphere',
        textContent: `You have been invited to join ${input.workspaceName} as ${input.role}. Open this link to accept: ${link}\n\nThis link expires in seven days. If you did not expect this invitation, you can ignore it.`,
        htmlContent: `<p>You have been invited to join <strong>${safeName}</strong> as ${safeRole}.</p><p><a href="${safeLink}">Accept invitation</a></p><p>This link expires in seven days. If you did not expect this invitation, you can ignore it.</p>`,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      logEvent('email.invitation', 'failed', {
        invitationId: input.invitationId,
        providerStatus: String(response.status),
      });
      return { ok: false as const, code: 'BREVO_' + response.status };
    }
    logEvent('email.invitation', 'sent', { invitationId: input.invitationId });
    return { ok: true as const };
  } catch (error) {
    logEvent('email.invitation', 'failed', {
      invitationId: input.invitationId,
      errorClass: error instanceof Error ? error.name : 'Unknown',
    });
    return { ok: false as const, code: 'SEND_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendContactNotification(input: {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  topic: 'general' | 'product' | 'partnership' | 'privacy';
  message: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const env = getEmailEnv();
    const lines = [
      `Contact request: ${input.id}`,
      `From: ${input.fullName} <${input.email}>`,
      `Company: ${input.company || 'Not provided'}`,
      `Topic: ${input.topic}`,
      '',
      input.message,
    ];
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: publicFacts.supportEmail }],
        replyTo: { email: input.email, name: input.fullName },
        subject: `SupportSphere contact: ${input.topic}`,
        textContent: lines.join('\n'),
        htmlContent: `<p>Contact request ${escapeHtml(input.id)}</p><p>From: ${escapeHtml(input.fullName)} &lt;${escapeHtml(input.email)}&gt;</p><p>Company: ${escapeHtml(input.company || 'Not provided')}</p><p>Topic: ${escapeHtml(input.topic)}</p><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      logEvent('email.contact', 'failed', {
        submissionId: input.id,
        providerStatus: String(response.status),
      });
      return { ok: false as const, code: `BREVO_${response.status}` };
    }
    logEvent('email.contact', 'sent', { submissionId: input.id });
    return { ok: true as const };
  } catch (error) {
    logEvent('email.contact', 'failed', {
      submissionId: input.id,
      errorClass: error instanceof Error ? error.name : 'Unknown',
    });
    return { ok: false as const, code: 'SEND_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}
