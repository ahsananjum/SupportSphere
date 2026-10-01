const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;

export function siteOrigin() {
  if (!configuredOrigin) return undefined;
  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return undefined;
  }
}

export function isPublicOrigin() {
  const origin = siteOrigin();
  if (!origin) return false;
  const hostname = new URL(origin).hostname;
  return !['localhost', '127.0.0.1'].includes(hostname);
}
