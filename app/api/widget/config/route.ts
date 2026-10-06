import { getWidgetConfig, reserveRate } from '../../../../lib/widget/service';
import {
  normalizeOrigin,
  signBootstrap,
} from '../../../../lib/widget/security';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const origin = normalizeOrigin(request.headers.get('origin'));
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!origin)
    return Response.json({ error: 'Origin required.' }, { status: 403 });
  const config = await getWidgetConfig(key, origin);
  if (!config)
    return Response.json(
      { error: 'Widget unavailable for this website.' },
      { status: 403 },
    );
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown';
  if (!(await reserveRate(key, ip, 'open')))
    return Response.json(
      { error: 'Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Access-Control-Allow-Origin': origin,
          Vary: 'Origin',
        },
      },
    );
  return Response.json(
    {
      framePath: `/widget?bootstrap=${encodeURIComponent(signBootstrap(key, origin))}`,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
        'Cache-Control': 'no-store',
      },
    },
  );
}
