import { describe, expect, it } from 'vitest';
import {
  parsePublicSupabaseEnv,
  parseServerSupabaseEnv,
  parseStripeEnv,
} from '../../lib/validation/env';

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

describe('provider environment validation', () => {
  it('accepts a complete public configuration', () => {
    expect(parsePublicSupabaseEnv(validPublic)).toEqual(validPublic);
  });

  it('fails closed when a server credential is absent', () => {
    expect(() => parseServerSupabaseEnv(validPublic)).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  });

  it('rejects malformed provider URLs', () => {
    expect(() =>
      parsePublicSupabaseEnv({
        ...validPublic,
        NEXT_PUBLIC_SUPABASE_URL: 'bad',
      }),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('rejects live Stripe keys in sandbox billing configuration', () => {
    expect(() =>
      parseStripeEnv({
        STRIPE_SECRET_KEY: 'sk_live_not_allowed',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_example',
      }),
    ).toThrow('STRIPE_SECRET_KEY');
  });
});
