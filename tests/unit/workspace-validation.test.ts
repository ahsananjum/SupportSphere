import { describe, expect, it } from 'vitest';
import {
  generalSettingsSchema,
  originSchema,
} from '../../lib/validation/workspace';

describe('workspace origin validation', () => {
  it('normalizes HTTPS origins while rejecting paths, credentials and insecure remote hosts', () => {
    expect(
      originSchema.parse({ websiteOrigin: 'https://example.com/' })
        .websiteOrigin,
    ).toBe('https://example.com');
    expect(
      originSchema.parse({ websiteOrigin: 'http://localhost:3100/' })
        .websiteOrigin,
    ).toBe('http://localhost:3100');
    for (const websiteOrigin of [
      'http://example.com',
      'https://example.com/path',
      'https://user:pass@example.com',
      'https://example.com/?query=1',
    ]) {
      expect(originSchema.safeParse({ websiteOrigin }).success).toBe(false);
    }
  });

  it('requires an identity when saving a completed workspace', () => {
    const values = {
      name: 'SupportSphere',
      slug: 'support-sphere',
      timezone: 'UTC',
      companyName: 'Company',
      supportName: 'Care team',
      supportEmail: 'help@example.com',
      websiteOrigin: '',
    };
    expect(generalSettingsSchema.safeParse(values).success).toBe(true);
    expect(
      generalSettingsSchema.safeParse({ ...values, supportEmail: '' }).success,
    ).toBe(false);
  });
});
