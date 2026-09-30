import 'server-only';

export function logEvent(
  event: string,
  outcome: string,
  details: Record<string, string> = {},
) {
  // Deliberately restrict data to caller-selected safe identifiers and error classes.
  process.stdout.write(
    JSON.stringify({
      event,
      outcome,
      ...details,
      at: new Date().toISOString(),
    }) + '\n',
  );
}
