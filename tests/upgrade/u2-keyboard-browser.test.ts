import { it, expect } from 'vitest';
import { expect as visible } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { browserFixture } from './browser-fixture';
import { checked } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U2-03: visible short-height composer preserves keyboard focus, text and mode through reloads and incoming updates',
  async () => {
    const f = await browserFixture(),
      trace: unknown[] = [];
    try {
      const owner = await f.actor('keyboard-owner'),
        workspace = await f.workspace(owner);
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'Keyboard customer',
          p_email: 'keyboard@example.invalid',
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
          p_subject:
            'Keyboard support task with a long subject on a short phone viewport',
          p_channel: 'manual',
        }),
      );
      const page = await f.pageFor(owner);
      await page.setViewportSize({ width: 390, height: 420 });
      for (let n = 0; n < 3; n++) {
        await page.goto(f.base + `/app/inbox/${conversation}`);
        const reply = page.getByLabel('Reply', { exact: true }),
          note = page.getByLabel('Internal note', { exact: true });
        // A streamed SSR segment can already match a locator while still hidden.
        await visible(reply).toBeVisible();
        await reply.focus();
        await visible(reply).toBeFocused();
        await page.keyboard.type('Keyboard draft stays editable');
        await visible(reply).toHaveValue('Keyboard draft stays editable');
        if (n === 0) {
          checked(
            await f.admin.from('messages').insert({
              workspace_id: workspace,
              conversation_id: conversation,
              sender_type: 'customer',
              body: 'Keyboard incoming update',
            }),
          );
          await visible(
            page.getByText('Keyboard incoming update', { exact: true }),
          ).toBeVisible({ timeout: 20000 });
          await visible(reply).toBeFocused();
          await visible(reply).toHaveValue('Keyboard draft stays editable');
        }
        await page.keyboard.press('Tab');
        await visible(note).toBeFocused();
        await page.keyboard.press('Space');
        await visible(note).toBeChecked();
        await page.keyboard.press('Shift+Tab');
        await visible(reply).toBeFocused();
        await page
          .locator('.composer')
          .getByRole('button', { name: 'Save internal note', exact: true })
          .scrollIntoViewIfNeeded();
        await page
          .locator('.composer')
          .getByRole('button', { name: 'Save internal note', exact: true })
          .focus();
        const bounds = await page
          .locator('.composer')
          .getByRole('button', { name: 'Save internal note', exact: true })
          .boundingBox();
        trace.push({
          reload: n,
          bounds,
          viewport: await page.evaluate(() => ({
            height: innerHeight,
            scrollY,
          })),
        });
        await page.screenshot({
          path: `test-results/u2/keyboard-bounds-${n}.png`,
        });
        // Integral scroll offsets can leave less than one CSS pixel at the edge.
        expect(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 421).toBe(
          true,
        );
        trace.push({
          reload: n,
          focusAndMode: 'PASS',
          viewport: '390x420',
          incomingUpdate: n === 0,
        });
        await page.screenshot({
          path: `test-results/u2/keyboard-short-${n}.png`,
        });
      }
    } finally {
      writeFileSync(
        'test-results/u2/keyboard-trace.json',
        JSON.stringify(trace, null, 2),
      );
      await f.close();
    }
  },
  120000,
);
