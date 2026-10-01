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
  '/thank-you',
];

test('public routes have unique metadata, one heading, and no console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const route of publicRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(title.length, route).toBeGreaterThan(15);
    expect(description?.length ?? 0, route).toBeGreaterThan(40);
    expect(titles.has(title), route).toBe(false);
    expect(descriptions.has(description!), route).toBe(false);
    titles.add(title);
    descriptions.add(description!);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(
      1,
    );
  }
  expect(errors).toEqual([]);
});

test('every public internal link resolves and local SEO assets are present', async ({
  page,
  request,
}) => {
  const targets = new Set<string>();
  for (const route of publicRoutes) {
    await page.goto(route);
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute('href'))
          .filter((href): href is string => Boolean(href)),
      );
    for (const href of hrefs) {
      if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      const target = new URL(href, `http://127.0.0.1:3100${route}`);
      if (target.origin !== 'http://127.0.0.1:3100') continue;
      if (target.hash && target.pathname === route) {
        await expect(page.locator(target.hash)).toBeAttached();
      }
      targets.add(target.pathname);
    }
  }
  for (const target of targets) {
    const response = await request.get(target);
    expect(response.status(), target).toBeLessThan(400);
  }
  const icon = await request.get('/icon.svg');
  expect(icon.ok()).toBe(true);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
});

test('required widths have no document overflow and fixed controls do not collide', async ({
  page,
}) => {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/features',
      '/pricing',
      '/contact',
      '/privacy',
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
    if (width <= 390) {
      await page.goto('/');
      const notice = page.locator('.cookie-notice');
      const cta = page.locator('.mobile-sticky-cta');
      await expect(notice).toBeVisible();
      await expect(cta).toBeVisible();
      const noticeBox = await notice.boundingBox();
      const ctaBox = await cta.boundingBox();
      expect(
        noticeBox && ctaBox && noticeBox.y + noticeBox.height <= ctaBox.y,
      ).toBe(true);
    }
  }
});

test('workflow controls, mobile navigation, keyboard, and contact validation work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  const knowledge = page.getByRole('button', { name: /Relevant knowledge/ });
  await knowledge.click();
  await expect(knowledge).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText(
      'Approved knowledge is designed to sit beside a proposed response.',
    ),
  ).toBeVisible();
  const menu = page.locator('.mobile-menu summary');
  await menu.click();
  await expect(
    page.getByRole('navigation', { name: 'Mobile navigation' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open', '');

  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeFocused();
  await page.screenshot({
    path: 'test-results/p02-contact-mobile.png',
    fullPage: true,
  });
});

test('contact endpoint rejects invalid input and cross-site requests before persistence', async ({
  request,
}) => {
  const invalid = await request.post('/api/contact', {
    data: {
      fullName: 'A',
      email: 'invalid',
      company: '',
      topic: 'general',
      message: 'short',
      website: '',
    },
  });
  expect(invalid.status()).toBe(422);
  const body = await invalid.json();
  expect(body.errors.fullName?.[0]).toBeTruthy();
  expect(body.errors.email?.[0]).toBeTruthy();

  const sameOrigin = await request.post('/api/contact', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: {
      fullName: 'A',
      email: 'invalid',
      company: '',
      topic: 'general',
      message: 'short',
      website: '',
    },
  });
  expect(sameOrigin.status()).toBe(422);

  const crossSite = await request.post('/api/contact', {
    headers: { origin: 'https://example.invalid' },
    data: {
      fullName: 'Test User',
      email: 'test@example.invalid',
      company: '',
      topic: 'general',
      message: 'This request must not be accepted.',
      website: '',
    },
  });
  expect(crossSite.status()).toBe(403);
});
