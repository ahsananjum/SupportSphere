import { it, expect } from 'vitest';
import { expect as visible } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { browserFixture } from './browser-fixture';
import { checked } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U3-06: policy validation/pending/persistence/roles and explicit handoff consequences preserve human work',
  async () => {
    const f = await browserFixture();
    mkdirSync('test-results/u3', { recursive: true });
    try {
      const owner = await f.actor('policy-owner'),
        w = await f.workspace(owner);
      const actors: { [role: string]: Awaited<ReturnType<typeof f.actor>> } = {
        owner,
      };
      for (const role of ['admin', 'agent', 'viewer']) {
        actors[role] = await f.actor('policy-' + role);
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: w,
            user_id: actors[role].id,
            role,
            status: 'active',
          }),
        );
      }
      const page = await f.pageFor(owner),
        url = f.base + '/app/settings/ai';
      await page.goto(url);
      await visible(
        page.getByText(/Pending work rechecks current policy/),
      ).toBeVisible();
      await page.getByRole('radio', { name: /Draft only/ }).check();
      await page.getByLabel('Reply tone', { exact: true }).fill('ok');
      await page.getByLabel('Minimum confidence', { exact: true }).fill('0.69');
      await page
        .getByLabel('Minimum evidence score', { exact: true })
        .fill('0.59');
      await page.getByLabel('How-to questions', { exact: true }).check();
      await page
        .getByLabel('Workspace writing guidance', { exact: true })
        .fill('Keep my writing guidance');
      await page
        .locator('.ai-settings-form')
        .evaluate((el) => el.setAttribute('novalidate', ''));
      await page
        .getByRole('button', { name: 'Save AI policy', exact: true })
        .click();
      for (const id of ['ai-tone', 'ai-confidence', 'ai-evidence']) {
        await visible(page.locator('#' + id)).toHaveAttribute(
          'aria-invalid',
          'true',
        );
        await visible(page.locator('#' + id)).toHaveAttribute(
          'aria-describedby',
          new RegExp(id + '-error'),
        );
        await visible(page.locator('#' + id + '-error')).toBeVisible();
      }
      await visible(
        page.getByRole('radio', { name: /Draft only/ }),
      ).toBeChecked();
      await visible(
        page.getByLabel('How-to questions', { exact: true }),
      ).toBeChecked();
      expect(
        checked(
          await f.admin
            .from('ai_agent_configs')
            .select('mode')
            .eq('workspace_id', w)
            .single(),
        ).mode,
      ).toBe('off');
      await page
        .getByLabel('Reply tone', { exact: true })
        .fill('Clear, helpful and concise');
      await page.getByLabel('Minimum confidence', { exact: true }).fill('0.85');
      await page
        .getByLabel('Minimum evidence score', { exact: true })
        .fill('0.75');
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/app/settings/ai', async (route) => {
        if (route.request().method() === 'POST') await held;
        await route.continue();
      });
      const saving = page
        .getByRole('button', { name: 'Save AI policy', exact: true })
        .click();
      await visible(
        page.getByRole('button', { name: 'Saving AI policy…', exact: true }),
      ).toBeDisabled();
      await visible(
        page.getByLabel('Reply tone', { exact: true }),
      ).toBeDisabled();
      release();
      await saving;
      await page.unroute('**/app/settings/ai');
      await visible(
        page.getByText(
          'AI policy saved. New customer messages will follow this mode.',
          { exact: true },
        ),
      ).toBeVisible();
      await page.reload();
      await visible(
        page.getByRole('radio', { name: /Draft only/ }),
      ).toBeChecked();
      await visible(
        page.getByLabel('How-to questions', { exact: true }),
      ).toBeChecked();
      await page
        .getByLabel('Reply tone', { exact: true })
        .fill('Retained network-error tone');
      await page.route('**/app/settings/ai', async (route) =>
        route.request().method() === 'POST'
          ? route.abort('failed')
          : route.continue(),
      );
      await page
        .getByRole('button', { name: 'Save AI policy', exact: true })
        .click();
      await visible(
        page.getByText(/policy save was not confirmed/),
      ).toBeVisible();
      await visible(page.getByLabel('Reply tone', { exact: true })).toHaveValue(
        'Retained network-error tone',
      );
      await page.unroute('**/app/settings/ai');
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        for (const label of await page
          .locator('label')
          .filter({
            has: page.locator('input[type=radio],input[type=checkbox]'),
          })
          .all())
          expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(
            44,
          );
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
        await page.screenshot({ path: `test-results/u3/policy-${width}.png` });
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.body.scrollWidth <= innerWidth),
      ).toBe(true);
      await page
        .getByRole('button', { name: 'Save AI policy', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-results/u3/policy-zoom-390.png' });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });
      for (const role of ['admin', 'agent', 'viewer']) {
        const p = await f.pageFor(actors[role]);
        await p.goto(url);
        await visible(
          p.getByRole('button', { name: 'Save AI policy', exact: true }),
        ).toHaveCount(role === 'admin' ? 1 : 0);
        await p.close();
      }
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: w,
          p_name: 'Handoff review',
          p_email: 'handoff@example.invalid',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const c = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: w,
          p_customer_id: customer,
          p_subject: 'Review before resuming automation',
          p_channel: 'manual',
        }),
      );
      checked(
        await f.admin
          .from('conversations')
          .update({
            ai_handoff_at: new Date().toISOString(),
            ai_handoff_reason: 'HUMAN_REQUEST',
            assignee_user_id: actors.agent.id,
            status: 'closed',
          })
          .eq('id', c),
      );
      await page.goto(f.base + '/app/inbox/' + c);
      const reply = page.getByLabel('Reply', { exact: true });
      await visible(reply).toBeVisible();
      await reply.fill('My protected handoff note');
      await page.getByLabel('Internal note', { exact: true }).check();
      await page
        .getByRole('button', { name: 'Release AI handoff', exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      await visible(dialog).toContainText(
        'does not send, replay a question or clear assignment',
      );
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      expect(
        checked(
          await f.admin
            .from('conversations')
            .select('ai_handoff_at')
            .eq('id', c)
            .single(),
        ).ai_handoff_at,
      ).toBeTruthy();
      await visible(reply).toHaveValue('My protected handoff note');
      await page
        .getByRole('button', { name: 'Release AI handoff', exact: true })
        .click();
      await page.screenshot({
        path: 'test-results/u3/handoff-confirm-1440.png',
      });
      await dialog
        .getByRole('button', { name: 'Confirm', exact: true })
        .click();
      await visible(page).toHaveURL(/notice=handoff/);
      await visible(
        page.getByText('Conversation updated.', { exact: true }),
      ).toBeVisible();
      await visible(
        page.getByRole('button', { name: 'Release AI handoff', exact: true }),
      ).toHaveCount(0);
      await visible(reply).toHaveValue('My protected handoff note');
      await visible(
        page.getByLabel('Internal note', { exact: true }),
      ).toBeChecked();
      expect(
        checked(
          await f.admin
            .from('conversations')
            .select('ai_handoff_at,assignee_user_id,status')
            .eq('id', c)
            .single(),
        ),
      ).toEqual({
        ai_handoff_at: null,
        assignee_user_id: actors.agent.id,
        status: 'closed',
      });
      expect(
        checked(
          await f.admin.from('ai_runs').select('id').eq('conversation_id', c),
        ),
      ).toHaveLength(0);
      expect(
        checked(
          await f.admin.from('messages').select('id').eq('conversation_id', c),
        ),
      ).toHaveLength(0);
      const viewerPage = await f.pageFor(actors.viewer);
      await viewerPage.goto(f.base + '/app/inbox/' + c);
      await visible(
        viewerPage.getByRole('button', {
          name: 'Release AI handoff',
          exact: true,
        }),
      ).toHaveCount(0);
      expect(
        (
          await actors.viewer.client.rpc('release_ai_handoff', {
            p_workspace_id: w,
            p_conversation_id: c,
          })
        ).error,
      ).toBeTruthy();
      expect(
        checked(
          await f.admin
            .from('audit_logs')
            .select('id')
            .eq('workspace_id', w)
            .eq('action', 'ai.handoff_released'),
        ),
      ).toHaveLength(1);
    } finally {
      await f.close();
    }
  },
  150_000,
);
