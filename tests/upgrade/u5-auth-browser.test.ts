import { mkdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { expect as visible } from '@playwright/test';
import { browserFixture } from './browser-fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U5-01: form-first auth, legal links, password-manager fields and recovery',
  async () => {
    const f = await browserFixture();
    mkdirSync('test-results/u5', { recursive: true });
    try {
      const page = await f.browser.newPage({ reducedMotion: 'reduce' });
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        for (const route of ['/login', '/signup', '/forgot-password']) {
          await page.goto(f.base + route);
          await page.evaluate(() => document.fonts.ready);
          const field = page.locator('input:not([type=hidden])').first();
          await visible(field).toBeVisible();
          await page.screenshot({
            path: `test-results/u5/auth-${process.env.U5_BASELINE ? 'before' : 'after'}-${route.slice(1)}-${width}.png`,
            fullPage: true,
          });
          if (process.env.U5_BASELINE) continue;
          expect((await field.boundingBox())!.y).toBeLessThan(600);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          if (route !== '/forgot-password') {
            await visible(
              page.getByRole('link', { name: 'Terms of Service' }),
            ).toHaveAttribute('href', '/terms');
            await visible(
              page.getByRole('link', { name: 'Privacy Policy' }),
            ).toHaveAttribute('href', '/privacy');
          }
        }
      }
      if (process.env.U5_BASELINE) return;
      const actor = await f.actor('auth');
      await page.goto(f.base + '/login');
      await page
        .getByLabel('Email address', { exact: false })
        .fill(actor.email);
      await page
        .getByRole('button', { name: 'Continue with email', exact: true })
        .click();
      await visible(page.getByLabel('Password', { exact: true })).toBeFocused();
      await visible(page.locator('input[name=email]')).toHaveAttribute(
        'autocomplete',
        'username',
      );
      await page
        .getByLabel('Password', { exact: true })
        .fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await visible(page.locator('p.form-error')).toContainText(
        'Email or password was not accepted',
      );
      await visible(page.locator('input[name=email]')).toHaveValue(actor.email);
      await page.getByLabel('Password', { exact: true }).fill(actor.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await visible(page).toHaveURL(/\/app/);
      const signedOut = await f.browser.newPage();
      await signedOut.goto(f.base + '/reset-password');
      await visible(
        signedOut.getByRole('heading', { name: 'Reset link unavailable' }),
      ).toBeVisible();
      await visible(
        signedOut.getByRole('link', { name: 'Request a new link' }),
      ).toHaveAttribute('href', '/forgot-password');
      for (const route of ['/terms', '/privacy'])
        expect((await signedOut.goto(f.base + route))!.status()).toBe(200);
    } finally {
      await f.close();
    }
  },
  180_000,
);
