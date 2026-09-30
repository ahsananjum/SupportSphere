const allowedPaths =
  /^\/(?:app(?:\/[a-z0-9\-/]*)?|invite\/[A-Za-z0-9_-]{32,256}|reset-password)(?:\?[a-zA-Z0-9_=&%-]*)?$/;

export function safeNextPath(value: string | null | undefined): string {
  if (
    !value ||
    !allowedPaths.test(value) ||
    value.includes('//') ||
    value.includes('\\')
  ) {
    return '/app';
  }
  return value;
}

export function trustedUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) throw new Error('App origin is not configured');
  const parsed = new URL(origin);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('App origin is invalid');
  }
  return new URL(path, parsed.origin).toString();
}
