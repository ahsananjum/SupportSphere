import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { localTarget } from './local-target.mjs';

export function checked<
  R extends { data: unknown; error: { message: string } | null },
>({ data, error }: R): NonNullable<R['data']> {
  if (error) throw new Error(error.message);
  return data as NonNullable<R['data']>;
}
export async function fixture() {
  const target = localTarget();
  const admin = createClient(target.url, target.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users: string[] = [],
    workspaces: string[] = [];
  const ledger = `u0-${randomUUID()}`;
  const directory = 'test-results/u0/fixtures';
  mkdirSync(directory, { recursive: true });
  for (const file of readdirSync(directory)) {
    const prior = JSON.parse(readFileSync(`${directory}/${file}`, 'utf8'));
    if (prior.status !== 'CLEAN')
      throw new Error(
        `Reconcile pending local fixture ledger before replay: ${directory}/${file}`,
      );
  }
  const checkpoint = (status: string) =>
    writeFileSync(
      `${directory}/${ledger}.json`,
      JSON.stringify(
        {
          ledger,
          target: target.url,
          status,
          users,
          workspaces,
          updated: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  checkpoint('ACTIVE');
  async function actor(label: string) {
    const email = `${ledger}-${label}@example.invalid`;
    const password = `Qa!${randomBytes(24).toString('base64url')}`;
    const created = checked(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    );
    if (!created.user) throw new Error('Fixture user missing');
    users.push(created.user.id);
    checkpoint('ACTIVE');
    const client = createClient(target.url, target.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    checked(await client.auth.signInWithPassword({ email, password }));
    return { id: created.user.id, client, email, password };
  }
  async function workspace(owner: Awaited<ReturnType<typeof actor>>) {
    const id = checked(
      await owner.client.rpc('create_workspace', {
        p_name: 'U0 synthetic QA',
        p_slug: `u0-${randomUUID().slice(0, 12)}`,
        p_timezone: 'UTC',
      }),
    ) as string;
    workspaces.push(id);
    checkpoint('ACTIVE');
    checked(
      await admin
        .from('workspaces')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
          company_name: 'Synthetic QA',
          support_name: 'QA support',
          support_email: 'qa@example.invalid',
        })
        .eq('id', id),
    );
    return id;
  }
  async function cleanup() {
    const failures: string[] = [];
    for (const id of workspaces) {
      // Audit retention intentionally restricts workspace deletion; these are
      // only IDs created by this disposable fixture, never discovered tenants.
      checked(await admin.from('audit_logs').delete().eq('workspace_id', id));
      checked(
        await admin.from('workspace_members').delete().eq('workspace_id', id),
      );
      const result = await admin.from('workspaces').delete().eq('id', id);
      if (result.error) failures.push(`workspace:${id}`);
    }
    for (const id of users) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) failures.push(`user:${id}`);
    }
    if (failures.length)
      throw new Error(`Fixture cleanup required: ${failures.join(', ')}`);
    const remaining = checked(
      await admin.from('workspaces').select('id').in('id', workspaces),
    );
    if (remaining.length) throw new Error('Fixture workspace remains');
    checkpoint('CLEAN');
  }
  return { target, admin, actor, workspace, cleanup, ledger };
}

/** Fixed local container, no shell interpolation or remote database option. */
export function localSql(sql: string) {
  localTarget();
  return execFileSync(
    'docker',
    [
      'exec',
      'supabase_db_supportsphere-u0-local',
      'psql',
      '-U',
      'supabase_admin',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-c',
      sql,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 },
  );
}
