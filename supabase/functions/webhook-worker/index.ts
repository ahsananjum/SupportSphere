import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import {
  safeWebhookFailure,
  validateWebhookDestination,
} from './shared/webhook-security.ts';

type Delivery = {
  id: string;
  workspace_id: string;
  endpoint_id: string;
  destination_url: string;
  secret: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt: number;
  lease_token: string;
};

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function sign(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });
  const token = request.headers.get('X-Worker-Token') ?? '';
  const authorized = await admin.rpc('webhook_worker_authorized', {
    p_token: token,
  });
  if (authorized.error || authorized.data !== true)
    return new Response('Unauthorized', { status: 401 });

  const claimed = await admin.rpc('claim_webhook_delivery');
  if (claimed.error)
    return Response.json({ error: 'claim_failed' }, { status: 500 });
  const delivery = (claimed.data ?? null) as Delivery | null;
  if (!delivery) return Response.json({ status: 'idle' });

  const envelope = {
    id: delivery.event_id,
    type: delivery.event_type,
    delivery_id: delivery.id,
    created_at: new Date().toISOString(),
    data: delivery.payload,
  };
  const body = JSON.stringify(envelope);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  try {
    await validateWebhookDestination(delivery.destination_url);
    const response = await fetch(delivery.destination_url, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'SupportSphere-Webhooks/1.0',
        'x-supportsphere-event': delivery.event_type,
        'x-supportsphere-delivery': delivery.id,
        'x-supportsphere-signature': `t=${timestamp},v1=${await sign(delivery.secret, timestamp, body)}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const responseCode = response.status;
    const success = responseCode >= 200 && responseCode < 300;
    await admin.rpc('finish_webhook_delivery', {
      p_delivery_id: delivery.id,
      p_lease_token: delivery.lease_token,
      p_success: success,
      p_response_code: responseCode,
      p_error: success ? null : `HTTP_${responseCode}`,
    });
    return Response.json({
      status: success ? 'succeeded' : 'retrying',
      delivery_id: delivery.id,
      response_code: responseCode,
    });
  } catch (error) {
    await admin.rpc('finish_webhook_delivery', {
      p_delivery_id: delivery.id,
      p_lease_token: delivery.lease_token,
      p_success: false,
      p_response_code: null,
      p_error: safeWebhookFailure(error),
    });
    return Response.json({ status: 'retrying', delivery_id: delivery.id });
  }
});
