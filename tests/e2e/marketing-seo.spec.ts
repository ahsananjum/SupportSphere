import { expect, test } from '@playwright/test';

test('marketing navigation, mobile menu, and SEO files are coherent', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Support should feel more human',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /SupportSphere is building/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  for (const anchor of ['approach', 'workflow', 'security', 'faq']) {
    await expect(page.locator(`#${anchor}`)).toBeAttached();
  }
  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => Boolean(href)),
    );
  for (const href of new Set(hrefs)) {
    const [path, fragment] = href.split('#');
    if (fragment) await expect(page.locator(`#${fragment}`)).toBeAttached();
    if (path?.startsWith('/'))
      expect((await request.get(path)).status(), href).toBeLessThan(400);
  }
  await page
    .getByRole('link', { name: /Create a workspace/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.mobile-menu summary').click();
  await expect(
    page.getByRole('navigation', { name: 'Mobile navigation' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Security' })
    .click();
  await expect(page).toHaveURL(/\/security$/);
  await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open', '');

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Disallow: /');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const image = await request.get('/opengraph-image');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  await page.goto('/a-page-that-does-not-exist');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'This page took a different route.',
    }),
  ).toBeVisible();
});

test('marketing visual is legible at desktop and mobile sizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  });
});

test('reduced motion keeps the product story readable', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('pageerror', (error) => {
    if (/Hydration failed|A tree hydrated but/.test(error.message))
      hydrationErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Hydration failed|A tree hydrated but/.test(message.text())
    )
      hydrationErrors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Receive with context')).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe('auto');
  expect(
    await page
      .locator('.workflow-visual')
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe('none');
  expect(hydrationErrors).toEqual([]);
});
