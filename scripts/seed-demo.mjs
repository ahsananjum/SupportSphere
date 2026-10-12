import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required seed variable: ${name}`);
  return value;
};

const url = required('NEXT_PUBLIC_SUPABASE_URL');
const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const ownerEmail = required('DEMO_OWNER_EMAIL').toLowerCase();
const ownerPassword = required('DEMO_OWNER_PASSWORD');
const workspaceSlug = required('DEMO_WORKSPACE_SLUG').toLowerCase();
const websiteOrigin = required('DEMO_WEBSITE_ORIGIN');
z.email().parse(ownerEmail);
z.string().min(16).parse(ownerPassword);
z.string()
  .regex(/^ss-demo-[a-z0-9-]{2,30}$/)
  .parse(workspaceSlug);
const originUrl = new URL(websiteOrigin);
if (
  originUrl.origin !== websiteOrigin ||
  (originUrl.protocol !== 'https:' &&
    !(originUrl.protocol === 'http:' && originUrl.hostname === 'localhost'))
)
  throw new Error(
    'DEMO_WEBSITE_ORIGIN must be an exact HTTPS origin or http://localhost with an optional port.',
  );

if (process.env.ALLOW_DEMO_SEED !== '1') {
  throw new Error(
    'Refusing to seed until ALLOW_DEMO_SEED=1 is set explicitly. Use a disposable/demo workspace.',
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const app = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const assertNoError = (result, label) => {
  if (result.error)
    throw new Error(
      `${label} failed (${result.error.code ?? result.error.status ?? 'PROVIDER_ERROR'}). Inspect provider diagnostics privately.`,
    );
  return result.data;
};

let owner;
for (let page = 1; ; page += 1) {
  const users = assertNoError(
    await admin.auth.admin.listUsers({ page, perPage: 100 }),
    'list demo users',
  );
  owner = users.users.find((user) => user.email?.toLowerCase() === ownerEmail);
  if (owner || users.users.length < 100) break;
}

if (!owner) {
  owner = assertNoError(
    await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: 'SupportSphere Demo Owner' },
    }),
    'create demo owner',
  ).user;
}

assertNoError(
  await app.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  }),
  'sign in demo owner',
);

let workspace = assertNoError(
  await admin
    .from('workspaces')
    .select('id, owner_user_id')
    .eq('slug', workspaceSlug)
    .maybeSingle(),
  'find demo workspace',
);

if (workspace && workspace.owner_user_id !== owner.id) {
  throw new Error(
    `Workspace slug ${workspaceSlug} already belongs to another owner; choose a new DEMO_WORKSPACE_SLUG.`,
  );
}

if (!workspace) {
  workspace = {
    id: assertNoError(
      await app.rpc('create_workspace', {
        p_name: 'SupportSphere Demo',
        p_slug: workspaceSlug,
        p_timezone: 'Asia/Karachi',
      }),
      'create demo workspace',
    ),
    owner_user_id: owner.id,
  };
}

const workspaceId = workspace.id;
assertNoError(
  await admin
    .from('workspaces')
    .update({
      company_name: 'SupportSphere Demo',
      support_name: 'SupportSphere Care',
      support_email: ownerEmail,
      website_origin: websiteOrigin,
      ai_mode: 'off',
      onboarding_step: 'complete',
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', workspaceId),
  'configure demo workspace',
);

const widget = assertNoError(
  await admin
    .from('widget_configs')
    .upsert(
      {
        workspace_id: workspaceId,
        allowed_origins: [websiteOrigin],
        enabled: true,
      },
      { onConflict: 'workspace_id' },
    )
    .select('widget_key')
    .single(),
  'configure demo widget',
);

const customerId = assertNoError(
  await app.rpc('create_or_get_customer', {
    p_workspace_id: workspaceId,
    p_name: 'Grace Hopper',
    p_email: 'grace.hopper@example.invalid',
    p_phone: '',
    p_company: 'Compiler Labs',
    p_provider: 'demo-seed',
    p_identity_key: 'grace.hopper@example.invalid',
  }),
  'create demo customer',
);

const existingConversation = assertNoError(
  await app
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('customer_id', customerId)
    .eq('subject', 'Finding the right answer')
    .maybeSingle(),
  'find demo conversation',
);
const conversationId =
  existingConversation?.id ??
  assertNoError(
    await app.rpc('create_conversation', {
      p_workspace_id: workspaceId,
      p_customer_id: customerId,
      p_subject: 'Finding the right answer',
      p_channel: 'widget',
    }),
    'create demo conversation',
  );

const existingMessage = assertNoError(
  await admin
    .from('messages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('client_id', 'supportsphere-demo-customer-question-v1')
    .maybeSingle(),
  'find seed message',
);
if (!existingMessage)
  assertNoError(
    await admin.from('messages').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      sender_type: 'customer',
      body: 'Where can I find the right answer for a billing question?',
      delivery_status: 'sent',
      client_id: 'supportsphere-demo-customer-question-v1',
    }),
    'seed customer message',
  );

assertNoError(
  await app.rpc('send_message', {
    p_workspace_id: workspaceId,
    p_conversation_id: conversationId,
    p_body:
      'Thanks for reaching out. We are checking the approved knowledge now and will follow up with a clear answer.',
    p_internal: false,
    p_client_id: 'supportsphere-demo-agent-reply-v1',
  }),
  'seed agent reply',
);

const existingTicket = assertNoError(
  await admin
    .from('tickets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('title', 'Billing answer follow-up')
    .maybeSingle(),
  'find demo ticket',
);
if (!existingTicket) {
  assertNoError(
    await app.rpc('create_ticket', {
      p_workspace_id: workspaceId,
      p_title: 'Billing answer follow-up',
      p_description:
        'Confirm the billing answer against an indexed knowledge source.',
      p_priority: 'normal',
      p_category: 'billing',
      p_customer_id: customerId,
      p_conversation_id: conversationId,
      p_assignee_user_id: owner.id,
    }),
    'seed demo ticket',
  );
}

const sourceText =
  'SupportSphere demo policy: billing questions require an evidence-backed answer and a human handoff when the evidence is incomplete.';
const existingSource = assertNoError(
  await admin
    .from('knowledge_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'SupportSphere demo policy')
    .maybeSingle(),
  'find demo knowledge source',
);
if (!existingSource) {
  assertNoError(
    await app.rpc('create_knowledge_source', {
      p_workspace_id: workspaceId,
      p_name: 'SupportSphere demo policy',
      p_type: 'paste',
      p_text: sourceText,
    }),
    'create demo knowledge source',
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workspaceSlug,
      workspaceId,
      widgetKey: widget.widget_key,
      next: 'Open the workspace, wait for scheduled knowledge indexing through /app/knowledge, then run the deployed golden journey.',
      note: 'AI remains off until the real provider gate is verified; no AI response is seeded.',
    },
    null,
    2,
  ),
);
