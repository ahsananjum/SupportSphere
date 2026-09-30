import 'server-only';
import { getEmailEnv } from '../env';
import { trustedUrl } from '../auth/redirect';
import { logEvent } from '../observability/log';

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
