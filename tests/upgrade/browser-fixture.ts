import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { fixture, checked } from './fixture';
import { localAppEnv } from './local-target.mjs';

export async function browserFixture() {
  const f = await fixture(),
    base = 'http://127.0.0.1:3101';
  const production = process.env.UPGRADE_BROWSER_PRODUCTION === '1';
  const server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      ...(production ? ['start'] : ['dev', '--webpack']),
      '--hostname',
      '127.0.0.1',
      '--port',
      '3101',
    ],
    {
      env: {
        ...localAppEnv(f.target),
        NODE_ENV: production ? 'production' : 'development',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  server.stdout.on('data', (data) => {
    log = (log + data).slice(-40000);
  });
  server.stderr.on('data', (data) => {
    log = (log + data).slice(-40000);
  });
  const browser = await chromium.launch();
  mkdirSync('test-results/u2', { recursive: true });
  async function close() {
    await browser.close();
    server.kill();
    writeFileSync('test-results/u2/workflow-server.log', log);
    await f.cleanup();
  }
  try {
    for (let n = 0; n < 90; n++) {
      if (server.exitCode !== null) throw Error('Local Next exited');
      try {
        if ((await fetch(base + '/login')).ok) break;
      } catch {
        /* bounded startup */
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (error) {
    await close();
    throw error;
  }
  async function pageFor(
    actor: { email: string; password: string },
    touch = false,
  ) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      hasTouch: touch,
    });
    const auth = createServerClient(f.target.url, f.target.key, {
      cookies: {
        getAll: () => [],
        setAll: async (cookies) => {
          await context.addCookies(
            cookies.map((c) => ({
              name: c.name,
              value: c.value,
              url: base,
              sameSite: 'Lax' as const,
            })),
          );
        },
      },
    });
    checked(
      await auth.auth.signInWithPassword({
        email: actor.email,
        password: actor.password,
      }),
    );
    return context.newPage();
  }
  return { ...f, base, browser, pageFor, close };
}
