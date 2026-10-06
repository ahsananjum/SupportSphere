# Website widget

Workspace owners and admins configure the widget at `/app/settings/widget`. Save one to ten exact allowed website origins. The page generates a public scoped key and displays the async `<script>` tag to install before the host page's closing `body` tag. The key is an identifier, not a secret. Disabling the widget or removing an origin blocks new sessions and messages for that origin.

The script runs on the customer site, fetches configuration with the browser's Origin header, and inserts a SupportSphere-hosted iframe. The iframe keeps customer styles isolated. A short-lived signed bootstrap proof binds the iframe to the configured origin. The widget stores a random session bearer token in its own origin's storage; the database stores only the token hash. A valid token restores the conversation after reload. If browser storage is unavailable, the current in-memory session remains usable until reload.

Customer messages are inserted through a service-only, workspace-scoped RPC. Team inbox clients receive RLS-authorized Supabase Postgres Changes and reconcile against persisted rows. The widget refetches recent messages while open and offers older-history pagination. Internal notes are never returned to the widget. Message bodies render as plain text. Rate limits use private database buckets and return a visible 429 state.

## Local external host

Run the app on a local origin, configure `http://localhost:4177` as an allowed widget origin, then supply the generated key to the separate test host:

```powershell
$env:WIDGET_TEST_KEY='wgt_<key from workspace settings>'
$env:WIDGET_APP_ORIGIN='http://127.0.0.1:3100'
node tests/widget-host/server.mjs
```

Open `http://localhost:4177`. The host HTML is served separately from the app and embeds the same loader tag used on a customer site. The opt-in live golden test is `node --env-file=.env tests/live/p05-widget.mjs` with `P05_LIVE_TEST_PROJECT_REF=xviumgygixcklrbuynoh` and a local production build at `P05_LIVE_BASE_URL`. It creates and removes its own users/workspaces/records in the configured SupportSphere project.
