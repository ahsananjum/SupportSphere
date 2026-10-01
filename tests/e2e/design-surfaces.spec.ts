import { expect, test } from '@playwright/test';

test('auth and invitation surfaces retain legibility and noindex behavior', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `test-results/login-${width}.png`,
      fullPage: true,
    });

    await page.goto('/invite/not-a-real-token');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Invitation unavailable' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `test-results/invite-${width}.png`,
      fullPage: true,
    });
  }
});
