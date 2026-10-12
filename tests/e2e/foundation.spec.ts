import { expect, test } from '@playwright/test';

test('foundation page renders without mobile overflow', async ({ page }) => {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
});

test('response headers expose the security baseline', async ({ request }) => {
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['referrer-policy']).toBe(
    'strict-origin-when-cross-origin',
  );
  expect(response.headers()['content-security-policy']).toContain(
    "frame-ancestors 'self'",
  );
  expect(response.headers()['x-powered-by']).toBeUndefined();

  const widget = await request.get('/widget/unavailable');
  expect(widget.headers()['content-security-policy']).toContain(
    'frame-ancestors *',
  );
  expect(widget.headers()['x-powered-by']).toBeUndefined();
});
