import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, expect as visible } from '@playwright/test';
import { localTarget, localAppEnv } from './local-target.mjs';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U1-06: production public/auth/invite pixels survive shell style scoping',
  async () => {
    const target = localTarget();
    const base = 'http://127.0.0.1:3101';
    const capture = process.env.U1_STYLE_CAPTURE === '1';
    const server = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3101',
      ],
      {
        env: { ...localAppEnv(target), NODE_ENV: 'production' },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let log = '';
    server.stdout.on('data', (d) => {
      log = (log + d).slice(-20000);
    });
    server.stderr.on('data', (d) => {
      log = (log + d).slice(-20000);
    });
    const browser = await chromium.launch();
    mkdirSync('test-results/u1/style', { recursive: true });
    try {
      for (let n = 0; n < 60; n++) {
        if (server.exitCode !== null)
          throw new Error('Production server exited before style comparison.');
        try {
          if ((await fetch(base + '/login')).ok) break;
        } catch {
          /* bounded startup */
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      for (const width of [390, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        for (const [label, path] of [
          ['public', '/'],
          ['auth', '/login'],
          ['invite', '/invite/not-a-real-token'],
        ]) {
          await page.goto(base + path);
          await page.evaluate(() => document.fonts.ready);
          await page.locator('h1').waitFor();
          if (label === 'auth') {
            const form = page.locator('section[aria-labelledby="auth-title"]');
            await visible(form).toHaveCSS('opacity', '1');
            await visible(form).toHaveCSS('transform', 'none');
          }
          const name = `test-results/u1/style/${label}-${width}`;
          const pixels = await page.screenshot({
            path: `${name}-${capture ? 'before' : 'after'}.png`,
            animations: 'disabled',
          });
          if (!capture)
            expect(
              pixels.equals(readFileSync(`${name}-before.png`)),
              `${label} ${width}px production pixels changed`,
            ).toBe(true);
        }
        await context.close();
      }
    } finally {
      await browser.close();
      server.kill();
      writeFileSync('test-results/u1/style/server.log', log);
    }
  },
  120000,
);
