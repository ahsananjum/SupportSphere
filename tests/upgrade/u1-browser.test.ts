import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, expect as visible } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { fixture, checked, localSql } from './fixture';
import { localAppEnv } from './local-target.mjs';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U1-01 UP-U1-02 UP-U1-03 UP-U1-04 UP-U1-05 UP-U1-06 UP-U1-07: shared UI, persisted feedback, role navigation and accessible review at six widths',
  async () => {
    const f = await fixture();
    const base = 'http://127.0.0.1:3101';
    const slice = Number(process.env.U1_SLICE ?? 7);
    const from = Number(process.env.U1_FROM ?? 1);
    const production = process.env.UPGRADE_BROWSER_PRODUCTION === '1';
    const server = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        ...(production ? ['start'] : ['dev', '--webpack']),
        '--hostname',
        '127.0.0.1',
        '--port',
        '3101',
      ],
      {
        env: {
          ...localAppEnv(f.target),
          NODE_ENV: production ? 'production' : 'development',
        },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let serverLog = '';
    server.stdout.on('data', (d) => {
      serverLog = (serverLog + String(d)).slice(-40000);
    });
    server.stderr.on('data', (d) => {
      serverLog = (serverLog + String(d)).slice(-40000);
    });
    const browser = await chromium.launch();
    mkdirSync('test-results/u1', { recursive: true });
    const metrics: unknown[] = [];
    try {
      for (let n = 0; n < 90; n++) {
        if (server.exitCode !== null)
          throw new Error('Local Next server exited.');
        try {
          if ((await fetch(base + '/login')).ok) break;
        } catch {
          /* bounded startup */
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      const owner = await f.actor('u1-owner');
      const workspace = await f.workspace(owner);
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'U1 long customer name for wrapping verification',
          p_email: 'u1@example.invalid',
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
            'U1 conversation with a long subject that must wrap without losing actions',
          p_channel: 'manual',
        }),
      );
      const pageFor = async (actor: typeof owner, touch = false) => {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: 'reduce',
          hasTouch: touch,
        });
        const auth = createServerClient(f.target.url, f.target.key, {
          cookies: {
            getAll: () => [],
            setAll: async (cookies) => {
              await context.addCookies(
                cookies.map((c) => ({
                  name: c.name,
                  value: c.value,
                  url: base,
                  sameSite: 'Lax' as const,
                })),
              );
            },
          },
        });
        checked(
          await auth.auth.signInWithPassword({
            email: actor.email,
            password: actor.password,
          }),
        );
        return context.newPage();
      };
      const page = await pageFor(owner);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const width of from <= 1 ? [320, 360, 390, 768, 1024, 1440] : []) {
        await page.setViewportSize({ width, height: 800 });
        for (const path of [
          '/app/inbox',
          '/app/settings/general',
          `/app/inbox/${conversation}`,
        ]) {
          await page.goto(base + path);
          await visible(page.locator('main h1')).toBeVisible();
          const measure = await page.evaluate(() => {
            const main = document.querySelector('main')!;
            const title = main.querySelector('h1')!;
            return {
              size: parseFloat(getComputedStyle(title).fontSize),
              gutter: parseFloat(getComputedStyle(main).paddingLeft),
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          metrics.push({ width, path, ...measure });
          await page.screenshot({
            path: `test-results/u1/${process.env.U1_BASELINE ? 'before' : 'after'}-${path.includes('general') ? 'settings' : path.endsWith('inbox') ? 'inbox' : 'conversation'}-${width}.png`,
            fullPage: true,
          });
          if (!process.env.U1_BASELINE) {
            expect(measure.size).toBeLessThanOrEqual(36);
            expect(measure.size).toBeGreaterThanOrEqual(24);
            expect(measure.gutter).toBeGreaterThanOrEqual(16);
            expect(measure.gutter).toBeLessThanOrEqual(32);
            expect(measure.overflow).toBe(false);
          }
        }
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      if (from <= 1) {
        await page.goto(base + '/app/settings/general');
        try {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
          });
          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
            ),
          ).toBe(false);
          await visible(
            page.getByRole('button', { name: 'Save settings', exact: true }),
          ).toBeVisible();
          await page.screenshot({
            path: 'test-results/u1/settings-text-zoom.png',
            fullPage: true,
          });
        } finally {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '';
          });
        }
      }
      if (slice >= 2 && from <= 2) {
        await page.goto(base + '/app/settings/general');
        const timezone = page.getByLabel('Timezone', { exact: true });
        const support = page.getByLabel('Support team name', { exact: true });
        await support.fill('Retained U1 support identity');
        await timezone.evaluate((element) => {
          const select = element as HTMLSelectElement;
          const option = document.createElement('option');
          option.value = 'Not/AZone';
          option.textContent = 'Not/AZone';
          select.append(option);
          select.value = 'Not/AZone';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page
          .getByRole('button', { name: 'Save settings', exact: true })
          .click();
        await visible(timezone).toHaveAttribute('aria-invalid', 'true');
        await visible(timezone).toHaveAttribute(
          'aria-describedby',
          'timezone-help timezone-error',
        );
        await visible(page.locator('#timezone-error')).toBeVisible();
        await visible(page.locator('#timezone-error')).toHaveAttribute(
          'role',
          'alert',
        );
        await visible(support).toHaveValue('Retained U1 support identity');
        await visible(timezone).toHaveValue('Not/AZone');
        await visible(
          page.getByText('Workspace settings saved.', { exact: true }),
        ).toHaveCount(0);
        await page.screenshot({
          path: 'test-results/u1/settings-error.png',
          fullPage: true,
        });
        await timezone.selectOption('Asia/Karachi');
        // Hold the real POST briefly to make pending observable; no response is mocked.
        await page.route('**/app/settings/general', async (route) => {
          if (route.request().method() === 'POST')
            await new Promise((r) => setTimeout(r, 900));
          await route.continue();
        });
        await page
          .getByRole('button', { name: 'Save settings', exact: true })
          .click();
        await visible(
          page.getByRole('button', { name: 'Saving settings…', exact: true }),
        ).toBeDisabled();
        await visible(page.locator('.general-form')).toHaveAttribute(
          'aria-busy',
          'true',
        );
        await visible(
          page.getByText('Workspace settings saved.', { exact: true }),
        ).toBeVisible();
        await page.unroute('**/app/settings/general');
        await page.reload();
        await visible(support).toHaveValue('Retained U1 support identity');
        expect(
          checked(
            await f.admin
              .from('workspaces')
              .select('support_name,timezone')
              .eq('id', workspace)
              .single(),
          ),
        ).toMatchObject({
          support_name: 'Retained U1 support identity',
          timezone: 'Asia/Karachi',
        });
      }
      if (slice >= 3 && from <= 3) {
        const emptyOwner = await f.actor('u1-empty-owner');
        await f.workspace(emptyOwner);
        const emptyPage = await pageFor(emptyOwner);
        await emptyPage.goto(base + '/app/inbox');
        await visible(
          emptyPage.getByRole('heading', { name: 'Your inbox is clear' }),
        ).toBeVisible();
        await emptyPage.context().close();
        await page.goto(base + '/app/inbox');
        await visible(
          page
            .getByRole('link', { name: /U1 conversation with a long/ })
            .getByText('Open', { exact: true }),
        ).toBeVisible();
        await visible(page.locator('main time')).toContainText('Asia/Karachi');
        await page.goto(base + '/app/inbox?q=no-match-u1');
        await visible(
          page.getByRole('heading', {
            name: 'No conversations match these filters',
          }),
        ).toBeVisible();
        try {
          localSql('revoke select on public.conversations from authenticated;');
          await page.goto(base + '/app/inbox');
          await visible(
            page.getByRole('heading', { name: 'Inbox unavailable' }),
          ).toBeVisible();
          await visible(page.locator('main').getByRole('alert')).toContainText(
            'We could not load conversations.',
          );
          await visible(
            page.getByRole('heading', { name: 'Your inbox is clear' }),
          ).toHaveCount(0);
        } finally {
          localSql('grant select on public.conversations to authenticated;');
        }
        await page.goto(base + '/app/inbox');
        await visible(
          page.getByRole('heading', { name: 'Inbox', exact: true }),
        ).toBeVisible();
      }
      if (slice >= 4 && from <= 4) {
        for (const role of ['owner', 'admin', 'agent', 'viewer'] as const) {
          let actor = owner;
          if (role !== 'owner') {
            actor = await f.actor('u1-' + role);
            checked(
              await f.admin.from('workspace_members').insert({
                workspace_id: workspace,
                user_id: actor.id,
                role,
                status: 'active',
              }),
            );
          }
          const rolePage = role === 'owner' ? page : await pageFor(actor);
          await rolePage.setViewportSize({ width: 1440, height: 480 });
          await rolePage.goto(base + '/app/inbox');
          const nav = rolePage.getByRole('navigation', {
            name: 'Application navigation',
          });
          for (const group of ['Work', 'Operations', 'Workspace'])
            await visible(
              nav.getByRole('group', { name: group, exact: true }),
            ).toBeVisible();
          await visible(
            nav.getByRole('link', { name: 'Inbox', exact: true }),
          ).toHaveAttribute('aria-current', 'page');
          const expected = [
            '/app',
            '/app/inbox',
            '/app/tickets',
            '/app/customers',
            '/app/knowledge',
            '/app/automations',
            '/app/analytics',
            '/app/ai/runs',
            '/app/team',
            '/app/notifications',
            ...(['owner', 'admin'].includes(role)
              ? [
                  '/app/settings/general',
                  '/app/settings/widget',
                  '/app/settings/ai',
                  '/app/settings/integrations',
                ]
              : []),
            ...(role === 'owner' ? ['/app/settings/security'] : []),
          ];
          expect(
            await nav
              .locator('a')
              .evaluateAll((links) =>
                links.map((link) => link.getAttribute('href')),
              ),
          ).toEqual(expected);
          await rolePage
            .getByRole('button', { name: 'Sign out', exact: true })
            .scrollIntoViewIfNeeded();
          await visible(
            rolePage.getByRole('button', { name: 'Sign out', exact: true }),
          ).toBeInViewport();
          await rolePage.screenshot({
            path: `test-results/u1/navigation-${role}-short.png`,
          });
          if (!['owner', 'admin'].includes(role)) {
            await rolePage.goto(base + '/app/settings/general');
            await visible(
              rolePage.locator('main').getByRole('alert'),
            ).toContainText('Your role cannot change workspace settings.');
          }
          await rolePage.setViewportSize({ width: 390, height: 420 });
          await rolePage.goto(base + '/app/inbox');
          await rolePage
            .getByRole('button', { name: 'Open workspace menu' })
            .click();
          await rolePage
            .getByRole('button', { name: 'Sign out', exact: true })
            .scrollIntoViewIfNeeded();
          await visible(
            rolePage.getByRole('button', { name: 'Sign out', exact: true }),
          ).toBeInViewport();
          await rolePage.screenshot({
            path: `test-results/u1/navigation-${role}-phone.png`,
          });
          await rolePage.keyboard.press('Escape');
          await visible(
            rolePage.getByRole('button', { name: 'Open workspace menu' }),
          ).toBeFocused();
          if (rolePage !== page) await rolePage.context().close();
        }
      }
      if (slice >= 5 && from <= 5) {
        for (const width of [390, 768]) {
          await page.setViewportSize({ width, height: 420 });
          await page.goto(base + '/app/inbox');
          const menu = page.getByRole('button', {
            name: 'Open workspace menu',
          });
          await menu.click();
          const drawer = page.getByRole('dialog', {
            name: 'Workspace menu',
            exact: true,
          });
          const close = drawer.getByRole('button', {
            name: 'Close workspace menu',
          });
          await page.screenshot({ path: 'test-results/u1/drawer-focus.png' });
          writeFileSync(
            'test-results/u1/focus.json',
            JSON.stringify(
              await page.evaluate(() => ({
                active: {
                  tag: document.activeElement?.tagName,
                  id: document.activeElement?.id,
                  text:
                    document.activeElement?.tagName === 'BODY'
                      ? 'body'
                      : document.activeElement?.textContent?.slice(0, 80),
                },
                buttons: Array.from(
                  document.querySelectorAll('[role=dialog] button'),
                ).map((e) => ({
                  text: e.textContent,
                  visible: getComputedStyle(e).visibility,
                  display: getComputedStyle(e).display,
                  inert: e.closest('[inert]')?.tagName,
                })),
              })),
              null,
              2,
            ),
          );
          await visible(close).toBeFocused();
          expect(
            await page
              .locator('main')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(true);
          expect(
            await page
              .locator('.skip-link')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(true);
          expect(await page.evaluate(() => document.body.style.overflow)).toBe(
            'hidden',
          );
          await page.locator('main').focus();
          await visible(close).toBeFocused();
          await page.keyboard.press('Shift+Tab');
          await visible(
            drawer.getByRole('button', { name: 'Sign out', exact: true }),
          ).toBeFocused();
          await page.keyboard.press('Tab');
          await visible(close).toBeFocused();
          await close.click();
          await visible(menu).toBeFocused();
          expect(
            await page
              .locator('main')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(false);
          expect(
            await page.evaluate(() => document.body.style.overflow),
          ).not.toBe('hidden');
          await menu.click();
          await drawer
            .getByRole('link', { name: 'Customers', exact: true })
            .click();
          await visible(page.locator('main')).toBeFocused();
        }
        await page.setViewportSize({ width: 390, height: 420 });
        await page.goto(base + '/app/customers');
        const disclosure = page.getByText('Add customer', { exact: true });
        await disclosure.focus();
        await page.keyboard.press('Enter');
        await visible(page.getByLabel('Name', { exact: true })).toBeVisible();
        await page.getByLabel('Name', { exact: true }).focus();
        await page.keyboard.press('Escape');
        await visible(page.getByLabel('Name', { exact: true })).toBeHidden();
        await visible(disclosure).toBeFocused();
        const source = checked(
          await f.admin
            .from('knowledge_sources')
            .insert({
              workspace_id: workspace,
              name: 'U1 disposable confirmation source',
              source_type: 'paste',
              input_text: 'Synthetic local confirmation fixture',
              status: 'queued',
            })
            .select('id')
            .single(),
        );
        await page.goto(base + '/app/knowledge/' + source.id);
        const remove = page.getByRole('button', {
          name: 'Delete',
          exact: true,
        });
        await remove.click();
        const confirmation = page.getByRole('dialog', {
          name: 'Confirm action',
          exact: true,
        });
        await visible(confirmation).toContainText(
          'U1 disposable confirmation source',
        );
        await visible(
          confirmation.getByRole('button', { name: 'Cancel', exact: true }),
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await visible(remove).toBeFocused();
        expect(
          checked(
            await f.admin
              .from('knowledge_sources')
              .select('id')
              .eq('id', source.id),
          ).length,
        ).toBe(1);
        await remove.click();
        await page.screenshot({
          path: 'test-results/u1/confirmation-phone.png',
        });
        await confirmation
          .getByRole('button', { name: 'Cancel', exact: true })
          .click();
        await visible(remove).toBeFocused();
        await remove.click();
        await confirmation
          .getByRole('button', { name: 'Confirm', exact: true })
          .click();
        await page.waitForURL(base + '/app/knowledge');
        expect(
          checked(
            await f.admin
              .from('knowledge_sources')
              .select('id')
              .eq('id', source.id),
          ),
        ).toHaveLength(0);
        expect(
          checked(
            await f.admin
              .from('audit_logs')
              .select('action')
              .eq('workspace_id', workspace)
              .eq('target_id', source.id)
              .eq('action', 'knowledge.deleted'),
          ),
        ).toHaveLength(1);
        const touchPage = await pageFor(owner, true);
        await touchPage.setViewportSize({ width: 390, height: 640 });
        await touchPage.goto(base + '/app/inbox');
        await touchPage
          .getByRole('button', { name: 'Open workspace menu' })
          .tap();
        await touchPage
          .getByRole('dialog', { name: 'Workspace menu', exact: true })
          .getByRole('button', { name: 'Close workspace menu' })
          .tap();
        await visible(
          touchPage.getByRole('button', { name: 'Open workspace menu' }),
        ).toBeFocused();
        await touchPage.context().close();
      }
      if (slice >= 7 && from <= 7) {
        const statuses = [
          { status: 'queued', attempt: 0, decision: null },
          { status: 'processing', attempt: 1, decision: null },
          { status: 'queued', attempt: 1, decision: null },
          {
            status: 'failed',
            attempt: 3,
            decision: null,
            reason_code: 'NO_RELIABLE_EVIDENCE',
          },
          {
            status: 'skipped',
            attempt: 0,
            decision: null,
            reason_code: 'RULE_DISABLED',
          },
          {
            status: 'completed',
            attempt: 1,
            decision: 'draft',
            output_text: 'U1 explicit private suggestion',
          },
        ];
        const runs = checked(
          await f.admin
            .from('ai_runs')
            .insert(
              statuses.map((run, i) => ({
                ...run,
                workspace_id: workspace,
                conversation_id: conversation,
                policy_version: 1,
                created_at: new Date(Date.now() + i * 1000).toISOString(),
              })),
            )
            .select('id,status'),
        );
        await page.setViewportSize({ width: 390, height: 700 });
        await page.goto(base + '/app/ai/runs');
        expect(
          await page
            .locator('main h1')
            .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
        ).toBeLessThanOrEqual(28);
        for (const title of [
          'AI run queued',
          'AI is processing',
          'AI run retrying',
          'AI run failed',
          'AI run skipped',
          'Draft for human review',
        ])
          await visible(
            page
              .getByRole('link')
              .filter({ has: page.getByText(title, { exact: true }) }),
          ).toBeVisible();
        await visible(
          page
            .getByText('No completed result is confirmed yet.', {
              exact: false,
            })
            .first(),
        ).toBeVisible();
        await page.screenshot({
          path: 'test-results/u1/ai-states-phone.png',
          fullPage: true,
        });
        const draft = runs.find((r) => r.status === 'completed')!;
        await page.goto(base + '/app/ai/runs/' + draft.id);
        await visible(
          page.getByRole('heading', { name: 'Draft for human review' }),
        ).toBeVisible();
        await visible(page.getByText(/Adopt it explicitly/)).toBeVisible();
        await page.goto(base + '/app/inbox/' + conversation);
        const reply = page.getByLabel('Reply', { exact: true });
        await reply.fill('My U1 human writing');
        await page
          .getByRole('button', { name: 'Use this draft', exact: true })
          .click();
        await visible(reply).toHaveValue('My U1 human writing');
        await page
          .getByRole('button', { name: 'Keep my writing', exact: true })
          .click();
        await reply.fill('');
        await page
          .getByRole('button', { name: 'Use this draft', exact: true })
          .click();
        await visible(reply).toHaveValue('U1 explicit private suggestion');
        expect(
          checked(
            await f.admin
              .from('messages')
              .select('id')
              .eq('conversation_id', conversation),
          ),
        ).toHaveLength(0);
        const rule = checked(
          await f.admin
            .from('automation_rules')
            .insert({
              workspace_id: workspace,
              name: 'U1 presentation only rule',
              trigger_type: 'conversation_created',
              actions: [{ type: 'set_priority', value: 'high' }],
              enabled: false,
            })
            .select('id')
            .single(),
        );
        checked(
          await f.admin.from('automation_runs').insert({
            workspace_id: workspace,
            rule_id: rule.id,
            trigger_type: 'conversation_created',
            idempotency_key: 'u1-display-only',
            status: 'succeeded',
            attempt: 1,
          }),
        );
        await page.goto(base + '/app/automations');
        await visible(
          page.getByText(
            'Rule actions finished. Any queued AI work has a separate result in AI runs.',
            { exact: true },
          ),
        ).toBeVisible();
        const endpoint = {
          id: checked(
            await owner.client.rpc('create_webhook_endpoint', {
              p_workspace_id: workspace,
              p_name: 'U1 presentation only endpoint',
              p_destination_url: 'https://example.com/u1-fixture',
              p_secret: (crypto.randomUUID() + crypto.randomUUID()).replaceAll(
                '-',
                '',
              ),
              p_event_types: ['webhook.test'],
            }),
          ),
        };
        checked(
          await f.admin
            .from('webhook_endpoints')
            .update({ enabled: false })
            .eq('id', endpoint.id),
        );
        checked(
          await f.admin.from('webhook_deliveries').insert({
            workspace_id: workspace,
            endpoint_id: endpoint.id,
            event_id: 'u1-display-only',
            event_type: 'webhook.test',
            status: 'queued',
            attempts: 1,
            last_error: 'ENDPOINT_REVOKED',
          }),
        );
        await page.goto(base + '/app/settings/integrations');
        await visible(
          page.getByText('Retrying', { exact: true }).first(),
        ).toBeVisible();
        await visible(
          page.getByText(
            'The endpoint was revoked. No further delivery is authorized.',
            { exact: true },
          ),
        ).toBeVisible();
        await page.getByText('Edit endpoint', { exact: true }).click();
        await page.keyboard.press('Escape');
        await visible(
          page.getByText('Edit endpoint', { exact: true }),
        ).toBeFocused();
      }
      expect(errors).toEqual([]);
    } finally {
      writeFileSync(
        'test-results/u1/layout-metrics.json',
        JSON.stringify(metrics, null, 2),
      );
      await browser.close();
      server.kill();
      writeFileSync('test-results/u1/browser-server.log', serverLog);
      await f.cleanup();
    }
  },
  240000,
);
