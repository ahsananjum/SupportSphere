export function isPublicWebhookIpv4(address: string): boolean {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)) return false;
  const [a, b, c, d] = address.split('.').map(Number);
  if ([a, b, c, d].some((part) => part < 0 || part > 255)) return false;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function parseWebhookDestination(value: string): URL {
  const url = new URL(value);
  if (
    value.length > 2048 ||
    /[\s\\]/.test(value) ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      url.hostname,
    ) ||
    /\.(localhost|local|internal|test|invalid|example)$/.test(url.hostname)
  )
    throw new Error('DESTINATION_BLOCKED');
  return url;
}
export async function validateWebhookDestination(raw: string) {
  const url = parseWebhookDestination(raw);
  const addresses = await Deno.resolveDns(url.hostname, 'A').catch(
    () => [] as string[],
  );
  if (
    !addresses.length ||
    addresses.some((address) => !isPublicWebhookIpv4(address))
  )
    throw new Error('DESTINATION_BLOCKED');
  return url;
}
export function safeWebhookFailure(error: unknown) {
  if (
    error instanceof Error &&
    ['TIMEOUT', 'DNS_UNAVAILABLE', 'DESTINATION_BLOCKED'].includes(
      error.message,
    )
  )
    return error.message;
  return 'NETWORK_ERROR';
}
