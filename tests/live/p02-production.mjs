// Read-only production smoke test. Set P02_PRODUCTION_ORIGIN explicitly.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.P02_PRODUCTION_ORIGIN;
assert(origin && new URL(origin).protocol === 'https:');
assert.equal(new URL(origin).origin, origin);

const indexablePaths = [
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
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const targets = new Set();
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

try {
  const titles = new Set();
  const descriptions = new Set();
  for (const path of indexablePaths) {
    const response = await page.goto(`${origin}${path}`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response?.status(), 200, path);
    assert.equal(await page.locator('h1').count(), 1, path);
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    assert(title.length > 15, path);
    assert(description?.length > 40, path);
    assert(!titles.has(title), `Duplicate title on ${path}`);
    assert(!descriptions.has(description), `Duplicate description on ${path}`);
    titles.add(title);
    descriptions.add(description);
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      `${origin}${path === '/' ? '' : path}`,
      path,
    );
    assert.match(
      (await page.locator('meta[name="robots"]').getAttribute('content')) ?? '',
      /index, follow/,
      path,
    );
    assert.equal(await page.locator('meta[property="og:title"]').count(), 1);
    assert.equal(
      await page.locator('meta[property="og:description"]').count(),
      1,
    );
    assert.equal(await page.locator('img:not([alt])').count(), 0, path);
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
      );
    for (const href of hrefs) {
      if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      const target = new URL(href, `${origin}${path}`);
      if (target.origin !== origin) continue;
      if (target.hash && target.pathname === path) {
        assert.equal(await page.locator(target.hash).count(), 1, href);
      }
      targets.add(target.pathname);
    }
  }

  for (const path of ['/thank-you', '/login', '/signup', '/forgot-password']) {
    const response = await page.goto(`${origin}${path}`);
    assert.equal(response?.status(), 200, path);
    assert.match(
      (await page.locator('meta[name="robots"]').getAttribute('content')) ?? '',
      /noindex/,
      path,
    );
  }

  for (const path of targets) {
    const response = await fetch(`${origin}${path}`);
    assert(response.status < 400, `${path}: ${response.status}`);
  }

  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/thank-you/);
  assert.match(robots, /Disallow: \/api/);
  assert.match(robots, new RegExp(`${origin}/sitemap\\.xml`));
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  for (const path of indexablePaths) {
    assert(
      sitemap.includes(`<loc>${origin}${path === '/' ? '/' : path}</loc>`),
      `Sitemap missing ${path}`,
    );
  }
  assert(!sitemap.includes('<loc>' + origin + '/thank-you</loc>'));

  const icon = await fetch(`${origin}/icon.svg`);
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get('content-type') ?? '', /image\/svg\+xml/);
  assert.deepEqual(errors, []);
  const notFound = await page.goto(`${origin}/p02-unknown-page`);
  assert.equal(notFound?.status(), 404);
  await page
    .getByRole('heading', { name: 'This page took a different route.' })
    .waitFor();
  errors.length = 0; // The intentionally missing page may log its 404 resource.

  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/features', '/pricing', '/contact', '/privacy']) {
      await page.goto(`${origin}${path}`);
      assert(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `Overflow: ${path} at ${width}`,
      );
    }
    if (width <= 390) {
      await page.goto(origin);
      const notice = await page.locator('.cookie-notice').boundingBox();
      const cta = await page.locator('.mobile-sticky-cta').boundingBox();
      assert(notice && cta && notice.y + notice.height <= cta.y);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.keyboard.press('Tab');
  assert.equal(
    await page
      .getByRole('link', { name: 'Skip to content' })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.locator('.mobile-menu summary').click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.mobile-menu').getAttribute('open'), null);
  assert.deepEqual(errors, []);
  console.log(
    `P02 production read-only smoke passed: ${indexablePaths.length} public pages, ${targets.size} internal targets, six widths, SEO, keyboard, console.`,
  );
} finally {
  await browser.close();
}
