import { z } from 'zod';
import { createAdminClient } from '../../../../lib/supabase/admin';
import {
  getWidgetConfig,
  getTranscript,
  reserveRate,
} from '../../../../lib/widget/service';
import {
  hashToken,
  newSessionToken,
  verifyBootstrap,
} from '../../../../lib/widget/security';
import { logEvent } from '../../../../lib/observability/log';

export const runtime = 'nodejs';
const schema = z.object({
  bootstrap: z.string().max(1200),
  existingToken: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 3000)
    return Response.json({ error: 'Request too large.' }, { status: 413 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid session request.' },
      { status: 400 },
    );
  const proof = verifyBootstrap(parsed.data.bootstrap);
  if (!proof || !(await getWidgetConfig(proof.key, proof.origin)))
    return Response.json({ error: 'Widget unavailable.' }, { status: 403 });
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown';
  if (!(await reserveRate(proof.key, ip, 'open')))
    return Response.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  const token = newSessionToken();
  const existing =
    parsed.data.existingToken &&
    /^[A-Za-z0-9_-]{40,100}$/.test(parsed.data.existingToken)
      ? hashToken(parsed.data.existingToken)
      : null;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('open_widget_session', {
    p_key: proof.key,
    p_origin: proof.origin,
    p_token_hash: hashToken(token),
    p_existing_hash: existing ?? undefined,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    logEvent('widget.session', 'failed', {
      errorClass: error?.code ?? 'unknown',
    });
    return Response.json(
      { error: 'Could not open support. Try again.' },
      { status: 503 },
    );
  }
  const result = data as { conversation_id: string; reused: boolean };
  const sessionToken =
    result.reused && parsed.data.existingToken
      ? parsed.data.existingToken
      : token;
  const session = await admin
    .from('widget_sessions')
    .select('workspace_id')
    .eq('conversation_id', result.conversation_id)
    .single();
  if (!session.data)
    return Response.json({ error: 'Could not load support.' }, { status: 503 });
  const transcript = await getTranscript(
    session.data.workspace_id,
    result.conversation_id,
  );
  logEvent('widget.session', 'succeeded', {
    workspaceId: session.data.workspace_id,
  });
  return Response.json(
    {
      token: sessionToken,
      ...transcript,
      name: (await getWidgetConfig(proof.key, proof.origin))?.name,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
