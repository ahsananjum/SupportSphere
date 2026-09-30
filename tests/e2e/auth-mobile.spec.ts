import { expect, test } from '@playwright/test';

test('auth screens remain usable at required widths', async ({ page }) => {
  for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/login', '/signup', '/forgot-password']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflow at ${width}px`).toBe(false);
    }
  }
});

test('auth forms show associated validation errors and invalid invitation state', async ({
  page,
}) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByLabel('Your name')).toBeFocused();
  const clientRejectedEmptyEmail = await page
    .getByLabel('Email address')
    .evaluate((element) => (element as HTMLInputElement).validity.valueMissing);
  expect(clientRejectedEmptyEmail).toBe(true);
  await page
    .locator('form')
    .first()
    .evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Invalid email address')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveAttribute(
    'aria-invalid',
    'true',
  );

  await page.goto('/invite/short');
  await expect(
    page.getByRole('heading', { name: 'Invitation unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByText('This invitation link is invalid.'),
  ).toBeVisible();
});

test('public auth links resolve and keyboard skip link receives focus', async ({
  page,
  request,
}) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  for (const path of ['/', '/login', '/signup', '/forgot-password']) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute('href')),
      );
    for (const href of hrefs) {
      if (!href) continue;
      const response = await request.get(href);
      expect(response.status(), `${path} links to ${href}`).toBeLessThan(400);
    }
  }
});
