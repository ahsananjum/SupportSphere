import { writeFileSync } from 'node:fs';
import { statusLabel } from '../../lib/ui/presentation';
import { it, expect } from 'vitest';
import { expect as visible } from '@playwright/test';
import { browserFixture } from './browser-fixture';
import { checked, localSql } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U2-02 UP-U2-03 UP-U2-04 UP-U2-05 UP-U2-06 UP-U2-07 UP-U2-08 UP-U2-09: persisted support work, recovery, related records and role-aware six-width tasks',
  async () => {
    const f = await browserFixture();
    const last = Number(process.env.U2_SLICE ?? 8),
      from = Number(process.env.U2_FROM ?? 2);
    try {
      const owner = await f.actor('workflow-owner'),
        agent = await f.actor('workflow-agent'),
        admin = await f.actor('workflow-admin'),
        viewer = await f.actor('workflow-viewer');
      const workspace = await f.workspace(owner);
      for (const [actor, role] of [
        [agent, 'agent'],
        [admin, 'admin'],
        [viewer, 'viewer'],
      ] as const)
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: workspace,
            user_id: actor.id,
            status: 'active',
            role,
          }),
        );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'U2 customer with a long name for support context',
          p_email: 'u2-customer-with-long-identity@example.invalid',
          p_phone: '12345',
          p_company: 'Original company',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const conversation = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject:
            'U2 support conversation with a long subject that must wrap while preserving its routing, audience and actions',
          p_channel: 'manual',
        }),
      );
      const ticket = checked(
        await owner.client.rpc('create_ticket', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_conversation_id: conversation,
          p_title: 'U2 linked ticket',
          p_description: 'Original description',
          p_priority: 'high',
          p_category: 'original',
          p_assignee_user_id: agent.id,
        }),
      );
      const page = await f.pageFor(owner),
        errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      if (from <= 2 && last >= 2) {
        for (const kind of ['inbox', 'customers', 'tickets']) {
          await page.goto(f.base + `/app/${kind}?q=no-match-u2`);
          await visible(
            page.getByRole('heading', { name: /No .*match/ }),
          ).toBeVisible();
          await page
            .getByRole('link', { name: 'Clear filters', exact: true })
            .first()
            .click();
          await visible(page.locator('main .support-list')).not.toContainText(
            'No records',
          );
          await visible(page.locator('main .support-list > li')).toHaveCount(1);
        }
        await visible(page.locator('main .support-list')).toContainText(
          agent.email,
        );
        await visible(page.locator('main .support-list')).toContainText(
          'Priority: High',
        );
      }
      if (from <= 3 && last >= 3) {
        await page.goto(f.base + `/app/inbox/${conversation}`);
        await visible(
          page.getByText(/Public reply · Visible to U2 customer/),
        ).toBeVisible();
        await page
          .getByLabel('Reply', { exact: true })
          .fill('Human draft stays private through updates');
        await page.getByLabel('Internal note', { exact: true }).check();
        await visible(
          page.getByText(
            'Internal note · Only your workspace team can see this.',
            { exact: true },
          ),
        ).toBeVisible();
        checked(
          await f.admin.from('messages').insert({
            workspace_id: workspace,
            conversation_id: conversation,
            sender_type: 'customer',
            body: 'Newer customer input',
          }),
        );
        await visible(
          page.getByText('Newer customer input', { exact: true }),
        ).toBeVisible({ timeout: 20000 });
        await visible(page.getByLabel('Reply', { exact: true })).toHaveValue(
          'Human draft stays private through updates',
        );
        localSql(
          'revoke execute on function public.send_message(uuid,uuid,text,boolean,text) from authenticated;',
        );
        try {
          await page
            .getByRole('button', { name: 'Save internal note', exact: true })
            .click();
          await visible(page.locator('.composer [role="alert"]')).toBeVisible();
          await visible(page.getByLabel('Reply', { exact: true })).toHaveValue(
            'Human draft stays private through updates',
          );
          await visible(
            page.getByLabel('Internal note', { exact: true }),
          ).toBeChecked();
        } finally {
          localSql(
            'grant execute on function public.send_message(uuid,uuid,text,boolean,text) to authenticated;',
          );
        }
        await page
          .getByRole('button', { name: 'Save internal note', exact: true })
          .click();
        await visible(
          page.getByText('Internal note saved.', { exact: true }),
        ).toBeVisible();
        await visible(page.locator('.message-list')).toContainText(
          'Human draft stays private through updates',
        );
        const notes = checked(
          await owner.client
            .from('messages')
            .select('sender_type')
            .eq('conversation_id', conversation)
            .eq('body', 'Human draft stays private through updates'),
        );
        expect(notes).toEqual([{ sender_type: 'note' }]);
      }
      if (from <= 4 && last >= 4) {
        await page.goto(f.base + `/app/customers/${customer}`);
        await visible(
          page.getByRole('heading', { name: 'Ticket history', exact: true }),
        ).toBeVisible();
        await page
          .getByRole('link', { name: /U2 support conversation with a long/ })
          .click();
        await visible(
          page.getByRole('heading', { name: 'Linked tickets', exact: true }),
        ).toBeVisible();
        await page.getByRole('link', { name: /#1 · U2 linked ticket/ }).click();
        await page
          .getByRole('link', { name: /Original conversation:/ })
          .click();
        await visible(page.locator('main h1')).toContainText(
          'U2 support conversation',
        );
        await page
          .getByRole('link', {
            name: 'View all 1 linked tickets ↗',
            exact: true,
          })
          .click();
        await visible(page.locator('main .support-list > li')).toHaveCount(1);
        await visible(page).toHaveURL(
          new RegExp(`conversation=${conversation}`),
        );
      }
      if (from <= 5 && last >= 5) {
        checked(
          await owner.client.rpc('create_or_get_customer', {
            p_workspace_id: workspace,
            p_name: 'Duplicate email fixture',
            p_email: 'duplicate-u2@example.invalid',
            p_phone: '',
            p_company: '',
            p_provider: 'manual',
            p_identity_key: '',
          }),
        );
        await page.goto(f.base + `/app/customers/${customer}`);
        await page.getByText('Edit customer details', { exact: true }).click();
        await page.locator('#edit-customer-name').fill('Corrected U2 customer');
        checked(
          await agent.client.rpc('update_customer_fields', {
            p_workspace_id: workspace,
            p_customer_id: customer,
            p_changes: { company: 'Concurrent company' },
          }),
        );
        await page
          .locator('#edit-customer-email')
          .fill('duplicate-u2@example.invalid');
        await page
          .getByRole('button', { name: 'Save customer details', exact: true })
          .click();
        await visible(page.locator('#edit-customer-email')).toHaveAttribute(
          'aria-invalid',
          'true',
        );
        await visible(page.locator('#edit-customer-name')).toHaveValue(
          'Corrected U2 customer',
        );
        await visible(
          page
            .getByRole('alert')
            .filter({ hasText: 'Another customer already uses that email' }),
        ).toContainText('Another customer already uses that email');
        await page
          .locator('#edit-customer-email')
          .fill('u2-customer-with-long-identity@example.invalid');
        const failSave = async (route: import('@playwright/test').Route) => {
          if (route.request().method() === 'POST') await route.abort('failed');
          else await route.continue();
        };
        await page.route('**/app/customers/**', failSave);
        try {
          await page
            .getByRole('button', { name: 'Save customer details', exact: true })
            .click();
          await visible(
            page.getByText(
              'We could not confirm this save. Your edits are preserved. Review the record before retrying.',
              { exact: true },
            ),
          ).toBeVisible();
          await visible(page.locator('#edit-customer-name')).toHaveValue(
            'Corrected U2 customer',
          );
        } finally {
          await page.unroute('**/app/customers/**', failSave);
        }
        await page
          .getByRole('button', { name: 'Save customer details', exact: true })
          .click();
        await visible(
          page.getByText('Customer details saved.', { exact: true }),
        ).toBeVisible();
        await visible(page.locator('#edit-customer-company')).toHaveValue(
          'Concurrent company',
        );
        await page.locator('#edit-customer-phone').fill(' 54321 ');
        await page
          .getByRole('button', { name: 'Save customer details', exact: true })
          .click();
        await visible
          .poll(async () =>
            checked(
              await owner.client
                .from('customers')
                .select('phone,company')
                .eq('id', customer)
                .single(),
            ),
          )
          .toEqual({ phone: '54321', company: 'Concurrent company' });
        await visible(page.locator('#edit-customer-phone')).toHaveValue(
          '54321',
        );
        await page.reload();
        await visible(page.locator('main h1')).toHaveText(
          'Corrected U2 customer',
        );
        expect(
          checked(
            await owner.client
              .from('customers')
              .select('email,phone,company')
              .eq('id', customer)
              .single(),
          ),
        ).toEqual({
          email: 'u2-customer-with-long-identity@example.invalid',
          phone: '54321',
          company: 'Concurrent company',
        });
        await page.goto(f.base + `/app/tickets/${ticket}`);
        await page.getByText('Edit ticket details', { exact: true }).click();
        await page.locator('#edit-ticket-title').fill('   ');
        await page
          .getByRole('button', { name: 'Save ticket details', exact: true })
          .click();
        await visible(page.locator('#edit-ticket-title')).toHaveAttribute(
          'aria-invalid',
          'true',
        );
        await visible(page.locator('#edit-ticket-title')).toHaveValue('   ');
        await page.locator('#edit-ticket-title').fill('Corrected U2 ticket');
        checked(
          await agent.client.rpc('update_ticket_fields', {
            p_workspace_id: workspace,
            p_ticket_id: ticket,
            p_changes: { description: 'Concurrent description' },
          }),
        );
        await page.locator('#edit-ticket-category').fill('');
        await page
          .getByRole('button', { name: 'Save ticket details', exact: true })
          .click();
        await visible(
          page.getByText('Ticket details saved.', { exact: true }),
        ).toBeVisible();
        await page.reload();
        await visible(page.locator('main h1')).toHaveText(
          'Corrected U2 ticket',
        );
        expect(
          checked(
            await owner.client
              .from('tickets')
              .select('description,assignee_user_id,priority,category')
              .eq('id', ticket)
              .single(),
          ),
        ).toEqual({
          description: 'Concurrent description',
          assignee_user_id: agent.id,
          priority: 'high',
          category: null,
        });
      }
      if (from <= 6 && last >= 6) {
        for (const [kind, id] of [
          ['inbox', conversation],
          ['tickets', ticket],
        ]) {
          await page.goto(f.base + `/app/${kind}/${id}`);
          await page
            .getByLabel('Assignment', { exact: true })
            .selectOption(admin.id);
          await page
            .getByRole('button', {
              name: kind === 'inbox' ? 'Save routing' : 'Save ticket',
              exact: true,
            })
            .click();
          await visible(
            page.getByRole('status').filter({
              hasText:
                kind === 'inbox' ? 'Conversation updated.' : 'Ticket updated.',
            }),
          ).toBeVisible();
          await visible(
            page.getByLabel('Assignment', { exact: true }),
          ).toHaveValue('keep');
          await page.reload();
          await visible(
            page
              .getByLabel('Assignment', { exact: true })
              .locator('option:checked'),
          ).toContainText(admin.email);
          const prefix = kind === 'inbox' ? 'conversation' : 'ticket';
          await page.locator('#' + prefix + '-status').selectOption('pending');
          checked(
            await agent.client.rpc('update_support_routing', {
              p_workspace_id: workspace,
              p_entity_type: prefix,
              p_entity_id: id,
              p_status: null,
              p_priority: 'low',
              p_assignment: 'me',
              p_assignee_id: null,
            }),
          );
          await page
            .getByRole('button', {
              name: kind === 'inbox' ? 'Save routing' : 'Save ticket',
              exact: true,
            })
            .click();
          await page.reload();
          expect(
            checked(
              await owner.client
                .from(kind === 'inbox' ? 'conversations' : 'tickets')
                .select('status,priority,assignee_user_id')
                .eq('id', id)
                .single(),
            ),
          ).toEqual({
            status: 'pending',
            priority: 'low',
            assignee_user_id: agent.id,
          });
        }
      }
      if (from <= 7 && last >= 7) {
        await page.goto(f.base + `/app/tickets/${ticket}`);
        const priorStatus = await page.locator('#ticket-status').inputValue(),
          priorPriority = await page.locator('#ticket-priority').inputValue();
        await page.locator('#ticket-status').selectOption('in_progress');
        await page.locator('#ticket-priority').selectOption('urgent');
        await page
          .getByRole('button', { name: 'Save ticket', exact: true })
          .click();
        await visible(page.locator('.timeline')).toContainText(
          `Status: ${statusLabel(priorStatus)} → In progress`,
        );
        await visible(page.locator('.timeline')).toContainText(
          `Priority: ${statusLabel(priorPriority)} → Urgent`,
        );
        await visible(page.locator('.timeline')).toContainText('You');
      }
      if (from <= 8 && last >= 8) {
        await page.goto(f.base + '/app');
        for (const [label, table, status] of [
          ['Open conversations', 'conversations', 'open'],
          ['Pending conversations', 'conversations', 'pending'],
          ['Open tickets', 'tickets', 'open'],
          ['Tickets in progress', 'tickets', 'in_progress'],
        ]) {
          const result = await owner.client
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspace)
            .eq('status', status);
          checked(result);
          const link = page
            .getByRole('list', { name: 'Current work queues' })
            .getByRole('link', { name: new RegExp(label) });
          await visible(link).toHaveText(label + result.count);
          await link.click();
          await visible(
            page.getByRole('navigation', { name: 'List pagination' }),
          ).toContainText(`${result.count} records`);
          await page.goto(f.base + '/app');
        }
        localSql('revoke select on public.conversations from authenticated;');
        try {
          await page.reload();
          await visible(
            page.getByRole('list', { name: 'Current work queues' }),
          ).toContainText('Unavailable');
        } finally {
          localSql('grant select on public.conversations to authenticated;');
        }
        const partialRule = checked(
          await f.admin
            .from('automation_rules')
            .insert({
              workspace_id: workspace,
              name: 'Presentation-only stopped rule',
              trigger_type: 'conversation_created',
              conditions: {},
              actions: [{ type: 'set_priority', value: 'normal' }],
              enabled: false,
            })
            .select('id')
            .single(),
        );
        checked(
          await f.admin.from('automation_runs').insert({
            workspace_id: workspace,
            rule_id: partialRule.id,
            trigger_type: 'conversation_created',
            trigger_entity_id: conversation,
            idempotency_key: 'u2-display-stopped-partial',
            status: 'skipped',
            result: { reason: 'HUMAN_OVERRIDE', actionsApplied: 1 },
            completed_at: new Date().toISOString(),
          }),
        );
        await page.goto(f.base + '/app/automations');
        await visible(
          page.getByText(
            '1 earlier action completed before later work stopped. Completed effects cannot be recalled.',
            { exact: true },
          ),
        ).toBeVisible();
        await visible(
          page.getByText(
            'A teammate or newer message changed this record. Pending work was stopped; review the latest conversation.',
            { exact: true },
          ),
        ).toBeVisible();
      }
      for (const [actor, role] of [
        [owner, 'owner'],
        [admin, 'admin'],
        [agent, 'agent'],
        [viewer, 'viewer'],
      ] as const) {
        const rolePage = await f.pageFor(actor, role === 'agent');
        rolePage.on('pageerror', (error) =>
          errors.push(`${role}: ${error.message}`),
        );
        for (const path of [
          `/app/inbox/${conversation}`,
          `/app/customers/${customer}`,
          `/app/tickets/${ticket}`,
          '/app',
        ]) {
          await rolePage.goto(f.base + path);
          await visible(rolePage.locator('main h1')).toBeVisible();
          if (path === `/app/tickets/${ticket}`)
            await visible(
              rolePage.locator('main .page-heading time'),
            ).toContainText('UTC');
          if (role === 'viewer') {
            await visible(
              rolePage.getByLabel('Reply', { exact: true }),
            ).toHaveCount(0);
            await visible(
              rolePage.getByLabel('Assignment', { exact: true }),
            ).toHaveCount(0);
            await visible(
              rolePage.getByText(/Edit (customer|ticket) details/),
            ).toHaveCount(0);
          }
        }
        if (role === 'admin' || role === 'agent') {
          await rolePage.goto(f.base + '/app/customers');
          await rolePage.getByText('Add customer', { exact: true }).click();
          await rolePage
            .locator('#customer-name')
            .fill(`Role ${role} customer`);
          await rolePage
            .locator('#customer-email')
            .fill(`role-${role}@example.invalid`);
          await rolePage
            .getByRole('button', { name: 'Save customer', exact: true })
            .click();
          await visible(rolePage.locator('main h1')).toHaveText(
            `Role ${role} customer`,
          );
          await rolePage
            .locator('#conversation-subject')
            .fill(`Role ${role} support journey`);
          await rolePage
            .getByRole('button', { name: 'Start conversation', exact: true })
            .click();
          await visible(rolePage.locator('main h1')).toHaveText(
            `Role ${role} support journey`,
          );
          await rolePage
            .getByLabel('Reply', { exact: true })
            .fill(`Role ${role} public reply`);
          await rolePage
            .getByRole('button', { name: 'Send message', exact: true })
            .click();
          await visible(
            rolePage.getByText('Message sent.', { exact: true }),
          ).toBeVisible();
          await rolePage
            .getByLabel('Reply', { exact: true })
            .fill(`Role ${role} private note`);
          await rolePage.getByLabel('Internal note', { exact: true }).check();
          await rolePage
            .getByRole('button', { name: 'Save internal note', exact: true })
            .click();
          await visible(
            rolePage.getByText('Internal note saved.', { exact: true }),
          ).toBeVisible();
          await rolePage
            .locator('#ticket-title')
            .fill(`Role ${role} resolution`);
          await rolePage
            .getByRole('button', { name: 'Create ticket', exact: true })
            .click();
          await visible(rolePage.locator('main h1')).toHaveText(
            `Role ${role} resolution`,
          );
          await rolePage.locator('#ticket-status').selectOption('resolved');
          await rolePage
            .getByLabel('Assignment', { exact: true })
            .selectOption('me');
          await rolePage
            .getByRole('button', { name: 'Save ticket', exact: true })
            .click();
          await visible(
            rolePage.getByText('Ticket updated.', { exact: true }),
          ).toBeVisible();
          const roleTicketId = new URL(rolePage.url()).pathname
            .split('/')
            .pop()!;
          expect(
            checked(
              await owner.client
                .from('tickets')
                .select('status,assignee_user_id')
                .eq('id', roleTicketId)
                .single(),
            ),
          ).toEqual({ status: 'resolved', assignee_user_id: actor.id });
          expect(
            checked(
              await owner.client
                .from('messages')
                .select('sender_type,sender_user_id')
                .eq('body', `Role ${role} private note`),
            ),
          ).toEqual([{ sender_type: 'note', sender_user_id: actor.id }]);
        }
        await rolePage.context().close();
      }
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        for (const [name, path] of [
          ['conversation', `/app/inbox/${conversation}`],
          ['customer', `/app/customers/${customer}`],
          ['ticket', `/app/tickets/${ticket}`],
          ['overview', '/app'],
        ]) {
          await page.goto(f.base + path);
          await visible(page.locator('main h1')).toBeVisible();
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
          });
          expect(
            await page.evaluate(() => document.body.scrollWidth),
          ).toBeLessThanOrEqual(width);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
          ).toBe(false);
          await page.screenshot({
            path: `test-results/u2/${name}-${width}.png`,
            fullPage: true,
          });
        }
      }
      await page.setViewportSize({ width: 390, height: 420 });
      await page.goto(f.base + `/app/inbox/${conversation}`);
      await visible(page.getByLabel('Reply', { exact: true })).toBeVisible();
      await page.getByLabel('Reply', { exact: true }).focus();
      await page.keyboard.type('Keyboard draft stays editable');
      await visible(page.getByLabel('Reply', { exact: true })).toHaveValue(
        'Keyboard draft stays editable',
      );
      await page.keyboard.press('Tab');
      await visible(
        page.getByLabel('Internal note', { exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Space');
      await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .scrollIntoViewIfNeeded();
      await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .focus();
      const sendBounds = await page
        .getByRole('button', { name: 'Save internal note', exact: true })
        .boundingBox();
      expect(
        sendBounds &&
          sendBounds.y >= 0 &&
          sendBounds.y + sendBounds.height <= 421,
      ).toBe(true);
      await page.screenshot({
        path: 'test-results/u2/composer-short-phone.png',
      });
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(f.base + `/app/customers/${customer}`);
      await page.getByText('Edit customer details', { exact: true }).click();
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      const zoomLayout = await page.evaluate(() => {
        const heading = document.querySelector(
          'main .page-heading .page-intro',
        )!;
        const range = document.createRange();
        range.selectNodeContents(heading);
        const menu = document
          .querySelector('.workbench-header button')!
          .getBoundingClientRect();
        return {
          viewport: innerWidth,
          textRight: Math.max(
            ...Array.from(range.getClientRects()).map((r) => r.right),
          ),
          menuLeft: menu.left,
          menuRight: menu.right,
        };
      });
      await page.screenshot({
        path: 'test-results/u2/customer-edit-text-zoom-diagnostic.png',
        fullPage: true,
      });
      writeFileSync(
        'test-results/u2/zoom-layout.json',
        JSON.stringify(zoomLayout, null, 2),
      );
      expect(zoomLayout.textRight).toBeLessThanOrEqual(zoomLayout.viewport);
      expect(zoomLayout.menuLeft).toBeGreaterThanOrEqual(0);
      expect(zoomLayout.menuRight).toBeLessThanOrEqual(zoomLayout.viewport);
      await page.screenshot({
        path: 'test-results/u2/customer-edit-text-zoom.png',
        fullPage: true,
      });
      const afterZoom = await page.evaluate(() => ({
        width: innerWidth,
        body: document.body.scrollWidth,
        menuRight: document
          .querySelector('.workbench-header button')!
          .getBoundingClientRect().right,
        headingWidth: document.querySelector('main .page-heading')!.scrollWidth,
        brandHeight: document
          .querySelector('.app-logo-name')!
          .getBoundingClientRect().height,
        brandLineHeight: Number.parseFloat(
          getComputedStyle(document.querySelector('.app-logo-name')!)
            .lineHeight,
        ),
      }));
      writeFileSync(
        'test-results/u2/zoom-after-layout.json',
        JSON.stringify(afterZoom, null, 2),
      );
      expect(afterZoom.brandHeight).toBeLessThanOrEqual(
        afterZoom.brandLineHeight * 2 + 1,
      );
      expect(afterZoom.body).toBeLessThanOrEqual(afterZoom.width);
      expect(afterZoom.menuRight).toBeLessThanOrEqual(afterZoom.width);
      expect(errors).toEqual([]);
    } finally {
      await f.close();
    }
  },
  300000,
);
