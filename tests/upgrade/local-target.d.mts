export function localTarget(): { url: string; key: string; secret: string };
export function localAppEnv(
  target: ReturnType<typeof localTarget>,
  port?: number,
): NodeJS.ProcessEnv;
