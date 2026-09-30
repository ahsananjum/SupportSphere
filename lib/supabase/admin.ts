import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseEnv } from '../env';

export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    getServerSupabaseEnv();
  return createSupabaseClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
