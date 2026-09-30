import { describe, expect, it } from 'vitest';
import { safeNextPath } from '../../lib/auth/redirect';
import { inviteSchema, workspaceSchema } from '../../lib/validation/auth';

describe('post-auth redirects', () => {
  it.each([
    '/app',
    '/app/team',
    '/app?invite=accepted',
    '/reset-password',
    '/invite/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  ])('keeps allowed internal path %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/app//evil.example',
    '/app/../admin',
    '/\\evil.example',
    '/auth/callback',
    '/invite/short',
    '/app%2f%2fevil.example',
  ])('rejects unsafe path %s', (path) => {
    expect(safeNextPath(path)).toBe('/app');
  });
});

describe('workspace and invitation validation', () => {
  it('rejects forged roles and malformed workspace fields', () => {
    expect(
      inviteSchema.safeParse({
        email: 'person@example.com',
        role: 'owner-admin',
      }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({ name: 'Good', slug: 'a', timezone: 'UTC' })
        .success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        name: 'Good',
        slug: 'good-team',
        timezone: 'Not/A_Zone',
      }).success,
    ).toBe(false);
  });

  it('accepts a valid workspace definition', () => {
    expect(
      workspaceSchema.safeParse({
        name: 'Good Team',
        slug: 'good-team',
        timezone: 'UTC',
      }).success,
    ).toBe(true);
  });
});
