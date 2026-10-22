import { it, expect } from 'vitest';
import { expect as visible } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from './browser-fixture';
import { checked, localSql } from './fixture';
import { indexedSource } from './knowledge-fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U3-01: library-first, complete stable traversal, full-library search and page recovery',
  async () => {
    const f = await browserFixture();
    mkdirSync('test-results/u3', { recursive: true });
    try {
      const owner = await f.actor('u3-owner');
      const workspace = await f.workspace(owner);
      const page = await f.pageFor(owner);
      await page.goto(f.base + '/app/knowledge');
      await visible(
        page.getByText(
          'No sources yet. Add text or upload a file to start indexing.',
          { exact: true },
        ),
      ).toBeVisible();
      const ids = Array.from({ length: 67 }, () => randomUUID())
        .sort()
        .reverse();
      checked(
        await f.admin.from('knowledge_sources').insert(
          ids.map((id, i) => ({
            id,
            workspace_id: workspace,
            name: `Library ${String(i).padStart(2, '0')}`,
            source_type: 'paste',
            input_text: 'Synthetic library traversal source.',
            status: 'ready',
            created_at: '2026-10-10T12:00:00Z',
          })),
        ),
      );
      await page.goto(f.base + '/app/knowledge');
      await visible(
        page.getByRole('heading', { name: 'Sources', exact: true }),
      ).toBeVisible();
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({
          path: `test-results/u3/library-${process.env.U3_BASELINE === '1' ? 'before' : 'after'}-${width}.png`,
          fullPage: true,
        });
      }
      if (process.env.U3_BASELINE === '1') return;
      await visible(
        page.getByRole('searchbox', { name: 'Search sources' }),
      ).toBeVisible();
      await visible(
        page.getByRole('button', { name: 'Add text source', exact: true }),
      ).toBeHidden();
      const seen: string[] = [];
      for (let n = 0; n < 3; n++) {
        const rows = page.locator('.knowledge-source-row h3 a');
        await visible(rows).toHaveCount(n === 2 ? 17 : 25);
        seen.push(...(await rows.allTextContents()));
        if (n < 2) {
          await page
            .getByRole('link', { name: 'Next page', exact: true })
            .click();
          await visible(
            page.getByRole('navigation', { name: 'Source pages' }),
          ).toContainText(`Page ${n + 2}`);
        }
      }
      expect(seen).toEqual(
        ids.map((_, i) => `Library ${String(i).padStart(2, '0')}`),
      );
      await page
        .getByRole('searchbox', { name: 'Search sources' })
        .fill('Library 66');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await visible(page.locator('.knowledge-source-row h3 a')).toHaveText([
        'Library 66',
      ]);
      await visible(
        page.getByRole('navigation', { name: 'Source pages' }),
      ).toContainText('Page 1 of 1');
      await page.goto(f.base + '/app/knowledge?q=absent');
      await visible(page.getByText('No matching sources.')).toBeVisible();
      await page.goto(f.base + '/app/knowledge?page=999999');
      await visible(
        page.getByRole('navigation', { name: 'Source pages' }),
      ).toContainText('Page 3 of 3');
      await page.goto(f.base + '/app/knowledge?page=bad&page=2');
      await visible(
        page.getByRole('navigation', { name: 'Source pages' }),
      ).toContainText('Page 1 of 3');
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        const searchBounds = await page
          .getByRole('searchbox', { name: 'Search sources' })
          .boundingBox();
        expect(searchBounds!.height).toBeLessThanOrEqual(64);
        expect(searchBounds!.y).toBeLessThan(600);
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/u3/library-after-${width}.png`,
          fullPage: false,
        });
      }
      await page.getByText('Add knowledge', { exact: true }).click();
      await visible(
        page.getByRole('button', { name: 'Add text source', exact: true }),
      ).toBeVisible();
      localSql('revoke select on public.knowledge_sources from authenticated;');
      try {
        await page.reload();
        await visible(
          page.getByText('Sources could not be loaded.', { exact: true }),
        ).toBeVisible();
        await visible(
          page.getByText('No matching sources.', { exact: true }),
        ).toHaveCount(0);
      } finally {
        localSql('grant select on public.knowledge_sources to authenticated;');
      }
      await page.getByRole('link', { name: 'Retry', exact: true }).click();
      await visible(page.locator('.knowledge-source-row')).toHaveCount(25);
      await page.getByText('Add knowledge', { exact: true }).click();
      const textForm = page
        .locator('form')
        .filter({ has: page.locator('#knowledge-text-content') });
      await textForm.evaluate((el) => el.setAttribute('novalidate', ''));
      await page
        .getByLabel('Content', { exact: true })
        .fill('Preserved source content during a rejected save.');
      await page
        .getByRole('button', { name: 'Add text source', exact: true })
        .click();
      await visible(page.locator('#knowledge-text-name-error')).toBeVisible();
      await visible(page.getByLabel('Content', { exact: true })).toHaveValue(
        'Preserved source content during a rejected save.',
      );
      const longName = 'Explicit source ' + 'x'.repeat(144);
      await page.locator('#knowledge-text-name').fill(longName);
      await page
        .getByRole('button', { name: 'Add text source', exact: true })
        .click();
      await visible(
        page.getByText('Source queued. Indexing continues in the background.', {
          exact: true,
        }),
      ).toBeVisible();
      const saved = checked(
        await f.admin
          .from('knowledge_sources')
          .select('id,status,input_text')
          .eq('workspace_id', workspace)
          .eq('name', longName)
          .single(),
      );
      expect(saved).toMatchObject({
        status: 'queued',
        input_text: 'Preserved source content during a rejected save.',
      });
      expect(
        checked(
          await f.admin
            .from('ingestion_jobs')
            .select('id')
            .eq('source_id', saved.id)
            .eq('status', 'queued'),
        ),
      ).toHaveLength(1);
      const longLink = page.getByRole('link', { name: longName, exact: true });
      await visible(longLink).toBeVisible();
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await longLink.scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(() => document.body.scrollWidth <= innerWidth),
        ).toBe(true);
      }
      await page.screenshot({ path: 'test-results/u3/library-long-1440.png' });
    } finally {
      await f.close();
    }
  },
  150_000,
);

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U3-02: real ingestion readiness, disabled/reindex/retry/permanent-error recovery and read-only roles',
  async () => {
    const f = await browserFixture();
    mkdirSync('test-results/u3', { recursive: true });
    try {
      const owner = await f.actor('readiness-owner'),
        workspace = await f.workspace(owner);
      const source = await indexedSource(
        f.admin,
        owner.client,
        workspace,
        'Lunar ' + 'x'.repeat(154),
      );
      const page = await f.pageFor(owner);
      const url = f.base + '/app/knowledge/' + source;
      await page.goto(url);
      await visible(
        page.getByText('Ready for AI', { exact: true }),
      ).toBeVisible();
      await visible(page.getByLabel('Latest ingestion attempt')).toContainText(
        'Attempts started: 1 of 3',
      );
      await visible(
        page.getByRole('heading', { name: 'Preview', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Disable', exact: true }).click();
      await visible(page.getByText('Disabled', { exact: true })).toBeVisible();
      expect(
        checked(
          await owner.client
            .from('knowledge_sources')
            .select('enabled')
            .eq('id', source)
            .single(),
        ).enabled,
      ).toBe(false);
      await page.getByRole('button', { name: 'Enable', exact: true }).click();
      await visible(
        page.getByText('Ready for AI', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Reindex', exact: true }).click();
      await visible(
        page.getByText('Waiting for indexing', { exact: true }),
      ).toBeVisible();
      const job = checked(await f.admin.rpc('claim_ingestion_job')) as {
        job_id: string;
        lease_token: string;
      };
      checked(
        await f.admin.rpc('fail_ingestion_job', {
          p_job_id: job.job_id,
          p_lease_token: job.lease_token,
          p_code: 'WORKER_TIMEOUT',
          p_message: 'Indexing timed out.',
          p_retry: true,
        }),
      );
      await page.reload();
      await visible(page.getByLabel('Latest ingestion attempt')).toContainText(
        'Retry scheduled',
      );
      await visible(page.getByLabel('Latest ingestion attempt')).toContainText(
        'earliest eligible start time',
      );
      checked(
        await f.admin
          .from('ingestion_jobs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', job.job_id),
      );
      checked(
        await f.admin
          .from('knowledge_sources')
          .update({
            status: 'failed',
            error_code: 'WORKER_TIMEOUT',
            error_message: 'Indexing timed out.',
          })
          .eq('id', source),
      );
      await page.reload();
      await visible(
        page.getByText('Indexing failed', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await visible(
        page.getByText('Waiting for indexing', { exact: true }),
      ).toBeVisible();
      expect(
        checked(
          await f.admin
            .from('ingestion_jobs')
            .select('id')
            .eq('source_id', source)
            .eq('status', 'queued'),
        ),
      ).toHaveLength(1);
      checked(
        await f.admin
          .from('knowledge_sources')
          .update({
            status: 'failed',
            error_code: 'PDF_NO_TEXT',
            error_message: 'No selectable text found.',
          })
          .eq('id', source),
      );
      checked(
        await f.admin
          .from('ingestion_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_code: 'PDF_NO_TEXT',
          })
          .eq('source_id', source)
          .eq('status', 'queued'),
      );
      await page.reload();
      await visible(
        page.getByText(/Correct the source, then delete it/),
      ).toBeVisible();
      await visible(
        page.getByRole('button', { name: 'Retry', exact: true }),
      ).toHaveCount(0);
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({
          path: `test-results/u3/readiness-${width}.png`,
        });
        const bounds = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          width: innerWidth,
          overflow: [...document.querySelectorAll('main *')].flatMap((el) => {
            const r = el.getBoundingClientRect();
            return r.right > innerWidth + 1
              ? [
                  {
                    tag: el.tagName,
                    cls: el.className,
                    text: el.textContent?.slice(0, 100),
                    right: r.right,
                    width: r.width,
                  },
                ]
              : [];
          }),
        }));
        if (bounds.body > bounds.width)
          writeFileSync(
            `test-results/u3/readiness-bounds-${width}.json`,
            JSON.stringify(bounds, null, 2),
          );
        expect(bounds.body <= bounds.width).toBe(true);
      }
      for (const role of ['admin', 'agent', 'viewer']) {
        const actor = await f.actor('readiness-' + role);
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: workspace,
            user_id: actor.id,
            role,
            status: 'active',
          }),
        );
        const p = await f.pageFor(actor);
        await p.goto(url);
        await visible(
          p.getByText('Indexing failed', { exact: true }),
        ).toBeVisible();
        await visible(
          p.getByRole('button', { name: 'Delete', exact: true }),
        ).toHaveCount(role === 'admin' ? 1 : 0);
        if (role !== 'admin')
          expect(
            (
              await actor.client.rpc('reindex_knowledge_source', {
                p_workspace_id: workspace,
                p_source_id: source,
              })
            ).error,
          ).toBeTruthy();
        await p.close();
      }
    } finally {
      await f.close();
    }
  },
  150_000,
);
