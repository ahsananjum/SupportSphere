# Demo seed runbook

The P13 seed is an operator-run script, not UI fixture data. It writes to the selected Supabase project through Supabase Auth, role-checked RPCs, RLS-protected tables, and the existing knowledge ingestion queue.

## Safety

- Use a dedicated demo owner account and a `ss-demo-*` workspace slug.
- Set `ALLOW_DEMO_SEED=1` in the private shell immediately before the run.
- Use an exact HTTPS `DEMO_WEBSITE_ORIGIN` that you own and have configured for the widget.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_OWNER_PASSWORD`, and all provider secrets in an ignored env file only.
- The script never seeds an AI response, fake analytics value, or fake connected integration. It forces the workspace AI mode to `off`.

## Run

Create `.env.demo.local` locally with the existing Supabase public URL/key and service credential plus:

```text
DEMO_OWNER_EMAIL=demo-owner@example.com
DEMO_OWNER_PASSWORD=<private password, 16+ characters>
DEMO_WORKSPACE_SLUG=ss-demo-supportsphere
DEMO_WEBSITE_ORIGIN=https://your-real-widget-host.example
ALLOW_DEMO_SEED=1
```

Then run from the repository root:

```sh
node --env-file=.env.demo.local scripts/seed-demo.mjs
```

The script is idempotent for the named workspace. It creates or reuses the owner, workspace, widget configuration, Grace Hopper customer, widget conversation, customer question, agent reply, follow-up ticket, and a paste knowledge source queued through `create_knowledge_source`. It refuses to reuse a workspace owned by a different account.

## After the run

1. Sign in as the demo owner at the deployed origin.
2. Confirm the queued source reaches `ready` through the scheduled knowledge worker.
3. Open the widget on the exact configured website origin and send a new customer message.
4. Verify the realtime inbox, evidence/draft or explicit AI handoff, human reply, ticket, and analytics records.
5. Keep the workspace in AI `off` mode until the Gemini manual gate passes with synthetic fixtures. Do not present the seeded agent reply as an AI response.
