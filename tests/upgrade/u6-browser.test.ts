import { expect, it } from 'vitest';
import { expect as visible } from '@playwright/test';
import { browserFixture } from './browser-fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U6-03 UP-U6-05 UP-U6-06: six-width accessibility, task smoke and bounded lab timing',
  async () => {
    const f = await browserFixture();
    try {
      const page = await f.browser.newPage({ reducedMotion: 'reduce' });
      const timings: Array<{ width: number; route: string; ms: number }> = [];
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 420 : 800 });
        for (const route of ['/login', '/signup', '/', '/features']) {
          const started = Date.now();
          const response = await page.goto(f.base + route);
          expect(response?.status()).toBe(200);
          await visible(page.locator('h1').first()).toBeVisible();
          await visible(page.locator('main')).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          const unlabeled = await page
            .locator('input:not([type="hidden"]),textarea,select')
            .evaluateAll(
              (els) =>
                els.filter((el) => {
                  const id = el.getAttribute('id');
                  return (
                    !el.getAttribute('aria-label') &&
                    !el.getAttribute('aria-labelledby') &&
                    !(id && document.querySelector(`label[for="${id}"]`))
                  );
                }).length,
            );
          expect(
            unlabeled,
            `${route} at ${width}px has unlabeled controls`,
          ).toBe(0);
          timings.push({ width, route, ms: Date.now() - started });
        }
      }
      await page.setViewportSize({ width: 320, height: 420 });
      await page.goto(f.base + '/login');
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(320 + 1);
      expect(
        await page
          .locator('input:not([type="hidden"])')
          .first()
          .getAttribute('autocomplete'),
      ).toBeTruthy();
      await page.screenshot({
        path: 'test-results/u6/accessibility-login-320-zoom.png',
        fullPage: true,
      });
      const average =
        timings.reduce((sum, item) => sum + item.ms, 0) / timings.length;
      expect(average).toBeLessThan(5000);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });
      await page.close();
      expect(timings.length).toBe(24);
    } finally {
      await f.close();
    }
  },
  240_000,
);
