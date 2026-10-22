import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/features',
  '/ai-support',
  '/knowledge-base',
  '/integrations',
  '/pricing',
  '/security',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
] as const;

const knownPaths = new Set([
  ...publicRoutes,
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/contact',
  '/widget/unavailable',
  '/thank-you',
]);

test.describe('P12 public route audit', () => {
  test('public routes expose semantic content and complete metadata', async ({
    page,
  }) => {
    for (const route of publicRoutes) {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('h1'), route).toHaveCount(1);
      await expect(
        page.locator('meta[name="description"]'),
        route,
      ).toHaveAttribute('content', /.+/);
      await expect(page).toHaveTitle(/SupportSphere/);

      const canonical = page.locator('link[rel="canonical"]');
      const configured = process.env.NEXT_PUBLIC_APP_URL;
      const publicHost =
        configured &&
        !['localhost', '127.0.0.1'].includes(new URL(configured).hostname);
      if (publicHost) {
        await expect(canonical, route).toHaveCount(1);
        await expect(canonical).toHaveAttribute('href', /https?:\/\//);
      } else {
        await expect(canonical, route).toHaveCount(0);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
          'content',
          /noindex/,
        );
      }
    }
  });

  test('public links resolve to implemented routes', async ({ page }) => {
    for (const route of publicRoutes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter((href): href is string => Boolean(href)),
        );
      for (const href of hrefs) {
        if (href.startsWith('mailto:') || href.startsWith('#')) continue;
        const path = new URL(href, 'http://localhost').pathname;
        expect(knownPaths.has(path), `${route} links to ${path}`).toBe(true);
      }
    }
  });

  test('public routes stay within the viewport at required breakpoints', async ({
    page,
  }) => {
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of publicRoutes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
        expect(overflow, `${route} overflows at ${width}px`).toBe(false);
      }
    }
  });

  test('mobile navigation, cookie notice, and keyboard skip link work', async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('.mobile-menu summary')).toBeVisible();
    await page.locator('.mobile-menu summary').click();
    await expect(page.locator('.mobile-menu nav')).toBeVisible();
    await expect(
      page.locator('.mobile-menu nav a[href="/contact"]'),
    ).toBeVisible();

    await expect(
      page.getByRole('complementary', { name: 'Cookie notice' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(
      page.getByRole('complementary', { name: 'Cookie notice' }),
    ).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('complementary', { name: 'Cookie notice' }),
    ).toHaveCount(0);

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
  });

  test('widget fallback and custom 404 remain actionable', async ({ page }) => {
    await page.goto('/widget/unavailable', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: 'Support is unavailable' }),
    ).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /.+/,
    );

    const notFound = await page.goto('/route-that-does-not-exist', {
      waitUntil: 'networkidle',
    });
    expect(notFound?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: /different route/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /return home/i }),
    ).toHaveAttribute('href', '/');
  });
});
