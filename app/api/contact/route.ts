import { NextResponse } from 'next/server';
import { contactSchema } from '../../../lib/contact/schema';
import { createReceipt, submitContact } from '../../../lib/contact/service';
import { logEvent } from '../../../lib/observability/log';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    let sameOrigin = false;
    try {
      const browserOrigin = new URL(origin);
      const requestProtocol =
        request.headers.get('x-forwarded-proto') ??
        new URL(request.url).protocol.slice(0, -1);
      sameOrigin =
        browserOrigin.host === request.headers.get('host') &&
        browserOrigin.protocol === `${requestProtocol}:`;
    } catch {
      // Malformed Origin is treated as a cross-site request.
    }
    if (!sameOrigin) {
      logEvent('contact.origin', 'blocked', {});
      return NextResponse.json(
        { message: 'This request must come from SupportSphere.' },
        { status: 403 },
      );
    }
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json(
      { message: 'Use the contact form to send your message.' },
      { status: 415 },
    );
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) {
      return NextResponse.json(
        { message: 'Your message is too long.' },
        { status: 413 },
      );
    }
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { message: 'Check the form and try again.' },
      { status: 400 },
    );
  }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'Check the highlighted fields.',
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const forwardedIp =
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for');
  const ip = forwardedIp?.split(',')[0]?.trim() || 'local-unknown';
  try {
    const result = await submitContact(parsed.data, ip);
    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        {
          status: result.status,
          headers:
            result.status === 429 ? { 'Retry-After': '3600' } : undefined,
        },
      );
    }
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set('ss_contact_receipt', createReceipt(result.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/thank-you',
    });
    return response;
  } catch (error) {
    logEvent('contact.route', 'failed', {
      errorClass: error instanceof Error ? error.name : 'Unknown',
    });
    return NextResponse.json(
      {
        message:
          'The contact form is temporarily unavailable. Please try again shortly.',
      },
      { status: 503 },
    );
  }
}
