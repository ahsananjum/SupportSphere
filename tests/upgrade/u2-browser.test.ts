import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, expect as visible } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { fixture, checked } from './fixture';
import { localAppEnv } from './local-target.mjs';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U2-01: traverse 67 tied records per list, full-dataset search and safe Back context',
  async () => {
    const f = await fixture();
    const base = 'http://127.0.0.1:3101';
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
    server.stdout.on('data', (d) => {
      log = (log + d).slice(-40000);
    });
    server.stderr.on('data', (d) => {
      log = (log + d).slice(-40000);
    });
    const browser = await chromium.launch();
    mkdirSync('test-results/u2', { recursive: true });
    try {
      for (let n = 0; n < 90; n++) {
        if (server.exitCode !== null) throw new Error('Local Next exited');
        try {
          if ((await fetch(base + '/login')).ok) break;
        } catch {
          /* startup */
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      const owner = await f.actor('u2-owner'),
        workspace = await f.workspace(owner);
      const ids = Array.from({ length: 67 }, () => randomUUID())
        .sort()
        .reverse();
      const stamp = '2026-10-10T12:00:00Z';
      checked(
        await f.admin.from('customers').insert(
          ids.map((id, i) => ({
            id,
            workspace_id: workspace,
            name: `Traversal ${i}`,
            email: `traversal-${i}@example.invalid`,
            updated_at: stamp,
          })),
        ),
      );
      checked(
        await f.admin.from('conversations').insert(
          ids.map((id, i) => ({
            id,
            workspace_id: workspace,
            customer_id: ids[i],
            subject: `Traversal ${i}`,
            updated_at: stamp,
          })),
        ),
      );
      checked(
        await f.admin.from('tickets').insert(
          ids.map((id, i) => ({
            id,
            workspace_id: workspace,
            customer_id: ids[i],
            conversation_id: ids[i],
            ticket_number: i + 1,
            title: `Traversal ${i}`,
            updated_at: stamp,
          })),
        ),
      );
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
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
          email: owner.email,
          password: owner.password,
        }),
      );
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const kind of ['inbox', 'customers', 'tickets']) {
        await page.goto(base + `/app/${kind}`);
        const seen: string[] = [];
        for (let n = 1; n <= 3; n++) {
          await visible(
            page.getByRole('navigation', { name: 'List pagination' }),
          ).toContainText(`Page ${n} of 3`);
          const links = page.locator('main .support-list > li > a');
          seen.push(
            ...(await links.evaluateAll((elements) =>
              elements.map((e) =>
                new URL((e as HTMLAnchorElement).href).pathname
                  .split('/')
                  .pop()!,
              ),
            )),
          );
          if (n < 3)
            await page
              .getByRole('link', { name: 'Next page', exact: true })
              .click();
        }
        expect(seen).toEqual(ids);
        await page.reload();
        await visible(
          page.getByRole('navigation', { name: 'List pagination' }),
        ).toContainText('Page 3 of 3');
        await page.locator('main .support-list > li > a').first().click();
        await page
          .getByRole('link', {
            name: `← ${kind === 'inbox' ? 'Inbox' : kind === 'customers' ? 'Customers' : 'Tickets'}`,
            exact: true,
          })
          .click();
        await visible(page).toHaveURL(new RegExp(`/app/${kind}\\?page=3$`));
        await page.goto(base + `/app/${kind}?q=Traversal+66`);
        await visible(page.locator('main .support-list > li')).toHaveCount(1);
        await visible(page.locator('main .support-list')).toContainText(
          'Traversal 66',
        );
        await page.goto(
          base + `/app/${kind}?page=-1&status=invalid&priority=invalid`,
        );
        await visible(
          page.getByRole('navigation', { name: 'List pagination' }),
        ).toContainText('Page 1 of 3');
        await page.goto(base + `/app/${kind}?page=999999`);
        await page
          .getByRole('link', { name: 'First page', exact: true })
          .click();
        await visible(page.locator('main .support-list > li')).toHaveCount(25);
        for (const width of [320, 360, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 800 });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
          ).toBe(false);
          await page.screenshot({
            path: `test-results/u2/${kind}-${width}.png`,
            fullPage: true,
          });
        }
      }
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
      server.kill();
      writeFileSync('test-results/u2/browser-server.log', log);
      await f.cleanup();
    }
  },
  240000,
);
