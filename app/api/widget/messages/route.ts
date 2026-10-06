import { z } from 'zod';
import { createAdminClient } from '../../../../lib/supabase/admin';
import {
  getSession,
  getTranscript,
  reserveRate,
} from '../../../../lib/widget/service';
import { hashToken } from '../../../../lib/widget/security';
import { logEvent } from '../../../../lib/observability/log';

export const runtime = 'nodejs';
const schema = z.object({
  body: z.string().trim().min(1).max(4000),
  clientId: z.uuid(),
});
async function authorized(request: Request) {
  const key = request.headers.get('x-widget-key') ?? '';
  const token =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const session = await getSession(key, token);
  return session ? { key, token, session } : null;
}
export async function GET(request: Request) {
  const auth = await authorized(request);
  if (!auth)
    return Response.json(
      { error: 'Session expired. Reopen support.' },
      { status: 401 },
    );
  const beforeInput = new URL(request.url).searchParams.get('before');
  let before: { createdAt: string; id: string } | undefined;
  if (beforeInput) {
    const [createdAt, id, extra] = beforeInput.split('|');
    if (
      extra ||
      !createdAt ||
      createdAt.length > 40 ||
      Number.isNaN(new Date(createdAt).getTime()) ||
      !id ||
      !z.uuid().safeParse(id).success
    )
      return Response.json(
        { error: 'Invalid history cursor.' },
        { status: 400 },
      );
    before = { createdAt, id };
  }
  try {
    return Response.json(
      await getTranscript(
        auth.session.workspace_id,
        auth.session.conversation_id,
        before,
      ),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Messages unavailable. Retry shortly.' },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 6000)
    return Response.json({ error: 'Message is too long.' }, { status: 413 });
  const auth = await authorized(request);
  if (!auth)
    return Response.json(
      { error: 'Session expired. Reopen support.' },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Write a message within 4,000 characters.' },
      { status: 400 },
    );
  if (!(await reserveRate(auth.key, hashToken(auth.token), 'send')))
    return Response.json(
      { error: 'You are sending messages too quickly. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('send_widget_message', {
    p_key: auth.key,
    p_origin: auth.session.origin,
    p_session_hash: hashToken(auth.token),
    p_body: parsed.data.body,
    p_client_id: parsed.data.clientId,
  });
  if (error || !data) {
    logEvent('widget.message', 'failed', {
      workspaceId: auth.session.workspace_id,
      errorClass: error?.code ?? 'unknown',
    });
    return Response.json(
      { error: 'Message not sent. Retry.' },
      { status: 503 },
    );
  }
  logEvent('widget.message', 'succeeded', {
    workspaceId: auth.session.workspace_id,
  });
  return Response.json({
    id: data,
    ...(await getTranscript(
      auth.session.workspace_id,
      auth.session.conversation_id,
    )),
  });
}
