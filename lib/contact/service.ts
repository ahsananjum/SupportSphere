import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '../supabase/admin';
import { getServerSupabaseEnv } from '../env';
import { sendContactNotification } from '../email/brevo';
import { logEvent } from '../observability/log';
import type { ContactInput } from './schema';

const ipLimit = 5;
const emailLimit = 3;

function sign(value: string) {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerSupabaseEnv();
  return createHmac('sha256', SUPABASE_SERVICE_ROLE_KEY)
    .update(value)
    .digest('hex');
}

export function createReceipt(id: string) {
  return `${id}.${sign(`contact-receipt:${id}`)}`;
}

export function verifyReceipt(value: string | undefined) {
  if (!value) return null;
  const [id, mac] = value.split('.');
  if (!id || !/^[0-9a-f-]{36}$/.test(id) || !mac || !/^[0-9a-f]{64}$/.test(mac))
    return null;
  const expected = Buffer.from(sign(`contact-receipt:${id}`), 'hex');
  const actual = Buffer.from(mac, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    ? id
    : null;
}

export async function hasContactReceipt(value: string | undefined) {
  const id = verifyReceipt(value);
  if (!id) return false;
  const { data, error } = await createAdminClient()
    .from('contact_submissions')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  return !error && !!data;
}

export async function submitContact(input: ContactInput, ip: string) {
  const admin = createAdminClient();
  const requestId = randomUUID();
  const { error: cleanupError } = await admin
    .from('contact_rate_limits')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (cleanupError) {
    logEvent('contact.rate_limit_cleanup', 'failed', {
      requestId,
      errorClass: cleanupError.code,
    });
  }
  const buckets = [
    { value: `ip:${ip}`, limit: ipLimit },
    { value: `email:${input.email}`, limit: emailLimit },
  ];

  for (const bucket of buckets) {
    const { data, error } = await admin.rpc('reserve_contact_attempt', {
      p_key_hash: sign(bucket.value),
      p_max_attempts: bucket.limit,
    });
    if (error) {
      logEvent('contact.rate_limit', 'failed', {
        requestId,
        errorClass: error.code ?? 'DB_ERROR',
      });
      return {
        ok: false as const,
        status: 503,
        message:
          'The contact form is temporarily unavailable. Please try again shortly.',
      };
    }
    if (!data) {
      logEvent('contact.rate_limit', 'blocked', { requestId });
      return {
        ok: false as const,
        status: 429,
        message:
          'You have sent too many messages. Please try again in an hour.',
      };
    }
  }

  const { data, error } = await admin
    .from('contact_submissions')
    .insert({
      full_name: input.fullName,
      email_normalized: input.email,
      company: input.company || null,
      topic: input.topic,
      message: input.message,
    })
    .select('id')
    .single();
  if (error || !data) {
    logEvent('contact.persist', 'failed', {
      requestId,
      errorClass: error?.code ?? 'DB_ERROR',
    });
    return {
      ok: false as const,
      status: 503,
      message: 'We could not save your message. Please try again shortly.',
    };
  }

  const delivery = await sendContactNotification({
    id: data.id,
    fullName: input.fullName,
    email: input.email,
    company: input.company || null,
    topic: input.topic,
    message: input.message,
  });
  const deliveryStatus = delivery.ok ? 'sent' : 'failed';
  const { error: updateError } = await admin
    .from('contact_submissions')
    .update({
      delivery_status: deliveryStatus,
      last_error_code: delivery.ok ? null : delivery.code,
      processed_at: new Date().toISOString(),
    })
    .eq('id', data.id);
  if (updateError) {
    logEvent('contact.delivery_status', 'failed', {
      requestId,
      submissionId: data.id,
      errorClass: updateError.code,
    });
  }
  logEvent('contact.submission', 'accepted', {
    requestId,
    submissionId: data.id,
    deliveryStatus,
  });
  return { ok: true as const, id: data.id };
}
