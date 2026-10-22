import { expect, it } from 'vitest';
import { expect as visible } from '@playwright/test';
import { browserFixture } from './browser-fixture';
import { checked } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U5-02 UP-U5-03 UP-U5-04: task-adaptive details, settings clarity, and widget installation surface',
  async () => {
    const f = await browserFixture();
    try {
      const owner = await f.actor('surfaces-owner');
      const workspace = await f.workspace(owner);
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name:
            'A long customer name that must wrap safely on a phone viewport',
          p_email: 'surface@example.invalid',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const conversation = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject: 'A long support subject that keeps the composer reachable',
          p_channel: 'manual',
        }),
      );
      checked(
        await owner.client.rpc('configure_widget', {
          p_workspace_id: workspace,
          p_origins: ['https://customer.example'],
          p_enabled: true,
        }),
      );
      const page = await f.pageFor(owner);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 420 : 800 });
        await page.goto(`${f.base}/app/inbox/${conversation}`);
        await visible(
          page.getByRole('heading', { name: /long support subject/i }),
        ).toBeVisible();
        const inspector = page.locator('.conversation-inspector');
        const messages = page.locator('.message-list');
        await visible(inspector).toBeVisible();
        await page.screenshot({
          path: `test-results/u5/detail-${width}.png`,
          fullPage: true,
        });
        if (width < 500) {
          expect((await inspector.boundingBox())!.y).toBeLessThan(
            (await messages.boundingBox())!.y,
          );
          const send = page.getByRole('button', {
            name: 'Send message',
            exact: true,
          });
          await send.scrollIntoViewIfNeeded();
          expect((await send.boundingBox())!.y).toBeLessThan(421);
        }
        await page.goto(`${f.base}/app/settings/general`);
        await visible(
          page.getByLabel('Timezone', { exact: true }),
        ).toHaveJSProperty('tagName', 'SELECT');
        await visible(
          page.getByRole('button', { name: 'Save settings', exact: true }),
        ).toBeVisible();
        await page.goto(`${f.base}/app/settings/widget`);
        await visible(
          page.getByText('Embed on your website', { exact: true }),
        ).toBeVisible();
        await visible(page.locator('.widget-code')).toContainText(
          'data-widget-key',
        );
        await visible(
          page.getByText('One exact origin per line.', { exact: false }),
        ).toBeVisible();
      }
    } finally {
      await f.close();
    }
  },
  180_000,
);

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U5-05 UP-U5-06: public capability copy, legal navigation and whole-app width review',
  async () => {
    const f = await browserFixture();
    try {
      const page = await f.browser.newPage({ reducedMotion: 'reduce' });
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        for (const route of [
          '/',
          '/features',
          '/ai-support',
          '/knowledge-base',
          '/integrations',
        ]) {
          await page.goto(f.base + route);
          await visible(page.locator('h1').first()).toBeVisible();
          if (route === '/')
            await page.screenshot({
              path: `test-results/u5/public-home-${width}.png`,
              fullPage: true,
            });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
        }
        await page.goto(f.base + '/login');
        await visible(
          page.getByRole('link', { name: 'Terms of Service' }),
        ).toHaveAttribute('href', '/terms');
        await visible(
          page.getByRole('link', { name: 'Privacy Policy' }),
        ).toHaveAttribute('href', '/privacy');
      }
    } finally {
      await f.close();
    }
  },
  180_000,
);
