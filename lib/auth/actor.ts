import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '../supabase/server';

export async function requireActor(next = '/app') {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect('/login?next=' + encodeURIComponent(next));
  }
  return { supabase, user: data.user };
}
