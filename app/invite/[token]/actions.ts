'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireActor } from '../../../lib/auth/actor';

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) redirect('/app?invite=invalid');
  const { supabase } = await requireActor('/invite/' + token);
  const hash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token_hash: hash,
  });
  if (error) redirect('/invite/' + token + '?result=error');
  if (data === 'accepted' || data === 'already_member')
    redirect('/app?invite=' + data);
  redirect('/invite/' + token + '?result=' + encodeURIComponent(String(data)));
}
