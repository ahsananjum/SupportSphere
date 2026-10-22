import { it, expect } from 'vitest';
import { expect as visible } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { browserFixture } from './browser-fixture';
import { checked, localSql } from './fixture';
import { indexedSource, syntheticText } from './knowledge-fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U3-03 / UP-U3-04 / UP-U3-05: adjacent evidence, protected adoption and outcome-first run/trace/feedback recovery',
  async () => {
    const f = await browserFixture();
    mkdirSync('test-results/u3', { recursive: true });
    try {
      const owner = await f.actor('evidence-owner'),
        w = await f.workspace(owner);
      const source = await indexedSource(f.admin, owner.client, w);
      const chunk = checked(
        await f.admin
          .from('knowledge_chunks')
          .select('id')
          .eq('source_id', source)
          .single(),
      );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: w,
          p_name: 'Lunar reviewer',
          p_email: 'review@example.invalid',
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
          p_subject: 'Review an export answer',
          p_channel: 'manual',
        }),
      );
      // Presentation fixture only: execution/provider evidence comes from U3.7.
      const run = checked(
        await f.admin
          .from('ai_runs')
          .insert({
            workspace_id: w,
            conversation_id: c,
            policy_version: 1,
            status: 'completed',
            decision: 'draft',
            output_text: 'Open Settings, Reports, Export PDF [1].',
            reason_code: 'DRAFT_MODE',
          })
          .select('id')
          .single(),
      );
      checked(
        await f.admin.from('ai_run_steps').insert({
          workspace_id: w,
          run_id: run.id,
          ordinal: 0,
          step_type: 'triage',
          status: 'passed',
          duration_ms: 1,
          metadata: { test: 'controlled trace' },
        }),
      );
      checked(
        await f.admin.from('ai_citations').insert({
          workspace_id: w,
          run_id: run.id,
          source_id: source,
          chunk_id: chunk.id,
          ordinal: 1,
          score: 1,
          snippet: syntheticText,
        }),
      );
      const page = await f.pageFor(owner);
      await page.goto(f.base + '/app/inbox/' + c);
      const reply = page.getByRole('textbox', { name: 'Reply', exact: true });
      await visible(reply).toBeVisible();
      await reply.fill('My unsaved human answer.');
      const evidence = page.getByRole('region', {
        name: 'Evidence for this answer',
      });
      await visible(evidence).toContainText('[1] Lunar export guide');
      await visible(evidence).toContainText(syntheticText);
      const popup = page.waitForEvent('popup');
      await evidence
        .getByRole('link', { name: /Open Lunar export guide in a new tab/ })
        .click();
      const sourcePage = await popup;
      await visible(
        sourcePage.getByRole('heading', {
          name: 'Lunar export guide',
          exact: true,
          level: 1,
        }),
      ).toBeVisible();
      await sourcePage
        .getByRole('button', { name: 'Disable', exact: true })
        .click();
      await visible(
        sourcePage.getByText('Disabled', { exact: true }),
      ).toBeVisible();
      await sourcePage.close();
      await page.bringToFront();
      await visible(reply).toHaveValue('My unsaved human answer.');
      await visible(evidence).toContainText('Current source: Disabled');
      const longName = 'Lunar ' + 'x'.repeat(154);
      checked(
        await f.admin
          .from('knowledge_sources')
          .update({ name: longName })
          .eq('id', source),
      );
      await visible(evidence).toContainText(longName, { timeout: 15000 });
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await evidence.scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
        if (width === 320 || width === 1440)
          await page.screenshot({
            path: `test-results/u3/evidence-named-long-${width}.png`,
          });
      }
      checked(
        await f.admin.from('knowledge_sources').delete().eq('id', source),
      );
      await visible(evidence).toContainText('Source removed or unavailable');
      await visible(evidence).toContainText('recorded snippet is historical');
      await visible(reply).toHaveValue('My unsaved human answer.');
      localSql('revoke select on public.ai_citations from authenticated;');
      try {
        await visible(evidence.getByRole('alert')).toHaveText(
          'Evidence could not be loaded.',
          { timeout: 15000 },
        );
        await visible(reply).toHaveValue('My unsaved human answer.');
      } finally {
        localSql('grant select on public.ai_citations to authenticated;');
      }
      await evidence.getByRole('button', { name: 'Refresh review' }).click();
      await visible(evidence).toContainText('Source removed or unavailable');
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await evidence.scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/u3/evidence-${width}.png`,
        });
      }
      await page.getByLabel('Internal note', { exact: true }).check();
      const adopt = page.getByRole('button', {
        name: 'Use this draft',
        exact: true,
      });
      await adopt.click();
      await visible(reply).toHaveValue('My unsaved human answer.');
      await page.setViewportSize({ width: 390, height: 900 });
      await page
        .getByRole('region', { name: 'Replace your writing?' })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-results/u3/adoption-390.png' });
      await page
        .getByRole('button', { name: 'Keep my writing', exact: true })
        .click();
      await adopt.click();
      await reply.fill('Newer human text');
      await visible(
        page.getByRole('button', {
          name: 'Replace with reviewed draft',
          exact: true,
        }),
      ).toBeDisabled();
      await adopt.click();
      checked(
        await f.admin
          .from('ai_runs')
          .update({ output_text: 'Updated suggestion [1].' })
          .eq('id', run.id),
      );
      await visible(page.locator('.ai-output')).toHaveText(
        'Updated suggestion [1].',
        { timeout: 15000 },
      );
      await visible(
        page.getByRole('button', {
          name: 'Replace with reviewed draft',
          exact: true,
        }),
      ).toBeDisabled();
      await visible(reply).toHaveValue('Newer human text');
      await adopt.click();
      checked(
        await owner.client.rpc('update_ai_config', {
          p_workspace_id: w,
          p_mode: 'off',
          p_tone: 'Updated review policy',
          p_confidence: 0.85,
          p_evidence: 0.75,
          p_custom_instructions: '',
          p_excluded_intents: [
            'billing',
            'security',
            'privacy',
            'legal',
            'account_change',
          ],
        }),
      );
      await visible(
        page.getByRole('button', {
          name: 'Replace with reviewed draft',
          exact: true,
        }),
      ).toBeDisabled({ timeout: 15000 });
      await adopt.click();
      await page
        .getByRole('button', {
          name: 'Replace with reviewed draft',
          exact: true,
        })
        .click();
      await visible(reply).toHaveValue('Updated suggestion [1].');
      await visible(reply).toBeFocused();
      await visible(
        page.getByLabel('Internal note', { exact: true }),
      ).toBeChecked();
      expect(
        checked(
          await f.admin.from('messages').select('id').eq('conversation_id', c),
        ),
      ).toHaveLength(0);
      await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .click();
      await visible(reply).toHaveValue('');
      expect(
        checked(
          await f.admin
            .from('messages')
            .select('body,sender_type')
            .eq('conversation_id', c),
        ),
      ).toEqual([{ body: 'Updated suggestion [1].', sender_type: 'note' }]);
      await page.goto(f.base + '/app/ai/runs/' + run.id);
      await visible(
        page.getByRole('heading', { name: 'Next action', exact: true }),
      ).toBeVisible();
      await visible(
        page.getByRole('heading', { name: 'Answer', exact: true }),
      ).toBeVisible();
      await visible(
        page.getByText('Technical reason code', { exact: true }),
      ).toBeHidden();
      const comment = page.getByLabel('Comment', { exact: true });
      await comment.fill('My retained feedback');
      checked(
        await f.admin
          .from('workspace_members')
          .update({ role: 'viewer' })
          .eq('workspace_id', w)
          .eq('user_id', owner.id),
      );
      await page
        .getByRole('button', { name: 'Save feedback', exact: true })
        .click();
      await visible(
        page.getByText('Your role cannot save AI feedback.', { exact: true }),
      ).toBeVisible();
      await visible(comment).toHaveValue('My retained feedback');
      checked(
        await f.admin
          .from('workspace_members')
          .update({ role: 'owner' })
          .eq('workspace_id', w)
          .eq('user_id', owner.id),
      );
      await page
        .getByRole('button', { name: 'Save feedback', exact: true })
        .click();
      await visible(
        page.getByText('Feedback saved.', { exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Save feedback', exact: true })
        .click();
      expect(
        checked(
          await f.admin
            .from('ai_feedback')
            .select('comment')
            .eq('run_id', run.id),
        ),
      ).toEqual([{ comment: 'My retained feedback' }]);
      localSql('revoke select on public.ai_run_steps from authenticated;');
      try {
        await page.reload();
        await visible(
          page.getByRole('heading', { name: 'Answer', exact: true }),
        ).toBeVisible();
        await visible(
          page.getByRole('heading', { name: 'Next action', exact: true }),
        ).toBeVisible();
        await page.getByText('Technical details', { exact: true }).click();
        await visible(
          page.getByText('Step trace unavailable.', { exact: true }),
        ).toBeVisible();
      } finally {
        localSql('grant select on public.ai_run_steps to authenticated;');
      }
      await page.reload();
      await page.getByText('Technical details', { exact: true }).click();
      await visible(
        page.getByText('Technical reason code', { exact: true }),
      ).toBeVisible();
      await visible(page.getByText(/controlled trace/)).toBeVisible();
      await visible(page.locator('.ai-step-list')).toContainText(
        'Triage · Passed',
      );
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page
        .getByRole('heading', { name: 'Citation metadata', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-results/u3/technical-390.png' });
      await page.keyboard.press('Escape');
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole('heading', { name: 'Next action', exact: true })
          .scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
        await page.screenshot({ path: `test-results/u3/run-${width}.png` });
      }
      await visible(
        page.getByRole('region', { name: 'Evidence for this answer' }),
      ).toContainText('Source removed or unavailable');
      expect(
        checked(
          await f.admin.from('messages').select('id').eq('conversation_id', c),
        ),
      ).toHaveLength(1);
      for (const role of ['admin', 'agent', 'viewer']) {
        const actor = await f.actor('ai-review-' + role);
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: w,
            user_id: actor.id,
            role,
            status: 'active',
          }),
        );
        const p = await f.pageFor(actor);
        await p.setViewportSize({ width: 390, height: 900 });
        await p.goto(f.base + '/app/ai/runs/' + run.id);
        await visible(
          p.getByRole('heading', { name: 'Next action', exact: true }),
        ).toBeVisible();
        await visible(
          p.getByRole('button', { name: 'Save feedback', exact: true }),
        ).toHaveCount(role === 'viewer' ? 0 : 1);
        await visible(
          p.getByRole('link', { name: 'Review AI policy', exact: true }),
        ).toHaveCount(role === 'admin' ? 1 : 0);
        await p.screenshot({ path: `test-results/u3/run-${role}-390.png` });
        await p.goto(f.base + '/app/inbox/' + c);
        await visible(
          p.getByRole('region', { name: 'Evidence for this answer' }),
        ).toContainText('Source removed or unavailable');
        await visible(p.getByLabel('Reply', { exact: true })).toHaveCount(
          role === 'viewer' ? 0 : 1,
        );
        await p.close();
      }
    } finally {
      await f.close();
    }
  },
  150_000,
);
