import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { fixture, checked, localSql } from './fixture';
import { localAppEnv } from './local-target.mjs';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U0-01 UP-U0-02 UP-U0-03 UP-U0-04 UP-U0-07: authenticated routing, draft survival, labels, dates and related-error UI at six widths',
  async () => {
    const f = await fixture();
    const base = 'http://127.0.0.1:3101';
    const production = process.env.UPGRADE_BROWSER_PRODUCTION === '1';
    const appEnv: NodeJS.ProcessEnv = {
      ...localAppEnv(f.target),
      NODE_ENV: production ? 'production' : 'development',
    };
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
        env: appEnv,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let serverLog = '';
    server.stdout.on('data', (data) => {
      serverLog = (serverLog + String(data)).slice(-40_000);
    });
    server.stderr.on('data', (data) => {
      serverLog = (serverLog + String(data)).slice(-40_000);
    });
    const browser = await chromium.launch();
    mkdirSync('test-results/u0', { recursive: true });
    try {
      for (let n = 0; n < 90; n++) {
        if (server.exitCode !== null)
          throw new Error(
            'Local application exited before browser verification.',
          );
        try {
          if ((await fetch(base + '/login')).ok) break;
        } catch {
          /* bounded startup */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const owner = await f.actor('browser-owner'),
        other = await f.actor('browser-agent'),
        viewer = await f.actor('browser-viewer'),
        admin = await f.actor('browser-admin');
      const w = await f.workspace(owner);
      for (const [actor, role] of [
        [other, 'agent'],
        [viewer, 'viewer'],
        [admin, 'admin'],
      ] as const)
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: w,
            user_id: actor.id,
            role,
            status: 'active',
          }),
        );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: w,
          p_name: 'Synthetic long-name customer for U0 verification',
          p_email: 'synthetic@example.invalid',
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
          p_subject:
            'Synthetic conversation: preserve human work through live updates',
          p_channel: 'manual',
        }),
      );
      const t = checked(
        await owner.client.rpc('create_ticket', {
          p_workspace_id: w,
          p_title: 'Synthetic U0 linked ticket',
          p_description: 'Local verification',
          p_priority: 'normal',
          p_category: 'qa',
          p_customer_id: customer,
          p_conversation_id: c,
          p_assignee_user_id: other.id,
        }),
      );
      checked(
        await owner.client.rpc('update_conversation', {
          p_workspace_id: w,
          p_conversation_id: c,
          p_assignee_user_id: other.id,
        }),
      );
      checked(
        await other.client.rpc('send_message', {
          p_workspace_id: w,
          p_conversation_id: c,
          p_body: 'A teammate reply.',
          p_internal: false,
          p_client_id: crypto.randomUUID(),
        }),
      );
      checked(
        await owner.client.rpc('send_message', {
          p_workspace_id: w,
          p_conversation_id: c,
          p_body: 'An owner reply.',
          p_internal: false,
          p_client_id: crypto.randomUUID(),
        }),
      );
      const pageFor = async (actor: typeof owner) => {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        });
        const auth = createServerClient(f.target.url, f.target.key, {
          cookies: {
            getAll: () => [],
            setAll: async (cookies) => {
              await context.addCookies(
                cookies.map((cookie) => ({
                  name: cookie.name,
                  value: cookie.value,
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
      page.on('pageerror', (error) => errors.push(error.name));
      await page.goto(`${base}/app/inbox/${c}`);
      await page
        .getByRole('heading', { name: /Synthetic conversation:/ })
        .waitFor();
      expect(await page.getByText('Teammate', { exact: true }).count()).toBe(1);
      expect(await page.getByText('You', { exact: true }).count()).toBe(1);
      await page.locator('#conversation-priority').selectOption('high');
      await page
        .getByRole('button', { name: 'Save routing', exact: true })
        .click();
      await page.getByText('Conversation updated.', { exact: true }).waitFor();
      expect(
        checked(
          await f.admin
            .from('conversations')
            .select('assignee_user_id')
            .eq('id', c)
            .single(),
        ).assignee_user_id,
      ).toBe(other.id);
      const reply = page.getByLabel('Reply', { exact: true });
      await reply.fill('My human draft survives.');
      await page.getByLabel('Internal note').check();
      const draft = checked(
        await f.admin
          .from('ai_runs')
          .insert({
            workspace_id: w,
            conversation_id: c,
            policy_version: 1,
            status: 'completed',
            decision: 'draft',
            output_text: 'A private AI suggestion.',
          })
          .select('id')
          .single(),
      );
      await page
        .getByRole('heading', { name: 'Draft for human review' })
        .waitFor();
      expect(await reply.inputValue()).toBe('My human draft survives.');
      expect(await page.getByLabel('Internal note').isChecked()).toBe(true);
      await page
        .getByRole('button', { name: 'Use this draft', exact: true })
        .click();
      expect(await reply.inputValue()).toBe('My human draft survives.');
      await page
        .getByRole('button', { name: 'Keep my writing', exact: true })
        .click();
      checked(
        await f.admin.from('messages').insert({
          workspace_id: w,
          conversation_id: c,
          sender_type: 'customer',
          body: 'A new incoming synthetic message.',
        }),
      );
      await page
        .getByText('A new incoming synthetic message.', { exact: true })
        .waitFor();
      expect(await reply.inputValue()).toBe('My human draft survives.');
      // A real persistence rejection leaves the in-memory draft/mode intact.
      checked(
        await f.admin
          .from('workspace_members')
          .update({ role: 'viewer' })
          .eq('workspace_id', w)
          .eq('user_id', owner.id),
      );
      await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .click();
      await page
        .getByText('Viewer access is read-only for support records.', {
          exact: true,
        })
        .waitFor();
      expect(await reply.inputValue()).toBe('My human draft survives.');
      expect(await page.getByLabel('Internal note').isChecked()).toBe(true);
      checked(
        await f.admin
          .from('workspace_members')
          .update({ role: 'owner' })
          .eq('workspace_id', w)
          .eq('user_id', owner.id),
      );
      await reply.fill('');
      await page.getByRole('button', { name: 'Use this draft' }).click();
      expect(await reply.inputValue()).toBe('A private AI suggestion.');
      await reply.fill('Deliberate human note.');
      await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .click();
      await page.getByText('Internal note saved.', { exact: true }).waitFor();
      expect(await reply.inputValue()).toBe('');
      expect(
        checked(
          await f.admin
            .from('messages')
            .select('body,sender_type')
            .eq('conversation_id', c)
            .eq('body', 'Deliberate human note.'),
        ),
      ).toEqual([{ body: 'Deliberate human note.', sender_type: 'note' }]);
      for (const status of ['failed', 'skipped']) {
        checked(
          await f.admin
            .from('ai_runs')
            .update({ status, decision: 'escalated' })
            .eq('id', draft.id),
        );
        await page.getByRole('heading', { name: `AI run ${status}` }).waitFor();
      }
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await reply.fill(`Preserved draft at ${width}`);
        await page.screenshot({
          path: `test-results/u0/conversation-${width}.png`,
          fullPage: true,
        });
      }
      await page.goto(`${base}/app/tickets/${t}`);
      await page.getByLabel('Priority', { exact: true }).selectOption('urgent');
      await page
        .getByRole('button', { name: 'Save ticket', exact: true })
        .click();
      await page.getByText('Ticket updated.', { exact: true }).waitFor();
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await page
          .getByRole('button', { name: 'Save ticket', exact: true })
          .scrollIntoViewIfNeeded();
      }
      expect(
        checked(
          await f.admin
            .from('tickets')
            .select('assignee_user_id')
            .eq('id', t)
            .single(),
        ).assignee_user_id,
      ).toBe(other.id);
      await page.goto(`${base}/app/analytics?from=2026-03-02&to=2026-03-01`);
      await page
        .getByText('End date must be on or after the start date.', {
          exact: true,
        })
        .waitFor();
      expect(
        await page
          .getByLabel('To', { exact: true })
          .getAttribute('aria-invalid'),
      ).toBe('true');
      await page.goto(`${base}/app/analytics?from=2026-02-30&to=2026-03-01`);
      await page
        .getByText('Enter a valid start date.', { exact: true })
        .waitFor();
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      checked(
        await f.admin.from('messages').insert(
          Array.from({ length: 32 }, (_, index) => ({
            workspace_id: w,
            conversation_id: c,
            sender_type: 'customer',
            body: 'Synthetic long-history message ' + index,
          })),
        ),
      );
      const routes = [
        '/app',
        '/app/inbox',
        `/app/customers/${customer}`,
        `/app/tickets/${t}`,
        '/app/knowledge',
        `/app/ai/runs/${draft.id}`,
        '/app/automations',
        '/app/analytics',
        '/app/settings/integrations',
      ];
      for (const [index, route] of routes.entries()) {
        await page.goto(base + route);
        await page.locator('h1').first().waitFor();
        await page.screenshot({
          path: `test-results/u0/reference-owner-${index}.png`,
          fullPage: true,
        });
      }
      for (const [label, actor] of [
        ['viewer', viewer],
        ['agent', other],
        ['admin', admin],
      ] as const) {
        const rolePage = await pageFor(actor);
        await rolePage.goto(`${base}/app/inbox/${c}`);
        await rolePage
          .getByRole('heading', { name: /Synthetic conversation:/ })
          .waitFor();
        expect(
          await rolePage.getByLabel('Reply', { exact: true }).count(),
        ).toBe(label === 'viewer' ? 0 : 1);
        await rolePage.screenshot({
          path: `test-results/u0/reference-${label}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
      // Exercise actual server query failures; restore grants even after an assertion.
      try {
        localSql('revoke select on public.customers from authenticated;');
        await page.goto(`${base}/app/inbox/${c}`);
        await page
          .getByRole('heading', { name: 'Workspace unavailable' })
          .waitFor();
      } finally {
        localSql('grant select on public.customers to authenticated;');
      }
      try {
        localSql(
          'revoke select on public.evaluation_cases from authenticated;',
        );
        await page.goto(`${base}/app/analytics`);
        await page
          .getByText(
            'Evaluation data is unavailable. Refresh to retry; no empty result or score is implied.',
            { exact: true },
          )
          .waitFor();
        expect(
          await page.getByText('No run yet.', { exact: true }).count(),
        ).toBe(0);
      } finally {
        localSql('grant select on public.evaluation_cases to authenticated;');
      }
    } finally {
      await browser.close();
      server.kill();
      writeFileSync('test-results/u0/browser-server.log', serverLog);
      await f.cleanup();
    }
  },
  240_000,
);
