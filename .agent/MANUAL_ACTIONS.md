# Owner actions for P01

## MANUAL-001 — Connect SupportSphere Supabase

Status: VERIFIED — project `xviumgygixcklrbuynoh` connected, two P01 migrations applied, tables/RLS/advisors inspected.

Why: MCP lists only BookPro; applying SupportSphere migrations there would change an unrelated project.

Steps:

1. In Supabase Dashboard, create or identify the SupportSphere project in the intended organization.
2. Connect that project to this Codex Supabase integration. Send its non-secret project name/ref.
3. In the project Connect panel, put its URL and publishable key in ignored .env.local as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
4. In Supabase Dashboard → Settings → API Keys, copy the service role key into ignored .env.local as SUPABASE_SERVICE_ROLE_KEY and into server-only deployment secrets. The app uses it only to inspect capability-token invitations and record real email delivery; it is never exposed to the browser.

Do NOT paste: database password, service/secret key, or access tokens into chat/source.

Store result in: Supabase connection and ignored .env.local.

Agent verification: list project by ref; inspect migrations/tables; apply reviewed migration; query RLS/advisors.

Blocking phase: P01

## MANUAL-002 — Configure Google OAuth

Status: VERIFIED — Google OAuth callback succeeded, created the real user, and led to an accepted workspace invitation.

Why: A real Google OAuth client requires owner credentials.

Steps:

1. In Google Cloud Console, configure the consent screen and create a Web application OAuth client.
2. Add the exact URI shown in Supabase Dashboard → Authentication → Providers → Google as the authorized redirect URI. Add the actual SupportSphere origins required by Google.
3. Put client ID and secret into that Supabase provider page and enable it.
4. In Supabase Authentication → URL Configuration, allow the actual app /auth/callback URL for each used environment.
Do NOT paste: Google client secret into chat or source.

Store result in: Google Cloud and Supabase provider settings.

Agent verification: real Google sign-in, callback, protected route, and logout.

Blocking phase: P01

## MANUAL-003 — Verify Brevo and configure SMTP

Status: VERIFIED — Brevo sender active; signup, invitation, and recovery messages delivered; links worked through confirmation, invitation acceptance, and password reset.

Why: Invitation and password reset delivery require a verified sender and owner-held credentials.

Steps:

1. In Brevo Dashboard → Senders, Domains & Dedicated IPs, add the real SupportSphere sender and complete the displayed verification/DNS records.
2. In Brevo Dashboard → SMTP & API → API Keys, create a transactional API key. Store it as BREVO_API_KEY in ignored .env.local and server-only deployment secrets; set BREVO_SENDER_EMAIL and BREVO_SENDER_NAME to the verified identity.
3. In Brevo Dashboard → SMTP & API → SMTP, obtain login/key. In Supabase Dashboard → Authentication → SMTP Settings, enable custom SMTP with the Brevo host, port, login, key, and same sender.
4. In Supabase Authentication → URL Configuration, set actual app redirect URLs for /auth/callback and enable email confirmation. Set NEXT_PUBLIC_APP_URL to the trusted origin per environment.

Do NOT paste: Brevo API/SMTP key, Supabase secrets, or DNS account credentials into chat/source.

Store result in: Brevo/Supabase dashboards, ignored .env.local, and server-only deployment secrets.

Agent verification: receive real invitation and password recovery messages, open both links, and confirm resulting app state.

Blocking phase: P01

## MANUAL-004 — Use token-hash links for cross-browser auth mail

Status: VERIFIED — both complete template bodies saved and live token-hash confirmation/recovery links worked in separate browser sessions. Earlier backtick parser errors were resolved.

Why: A real confirmation email opened in a different browser confirmed the Supabase user but the app callback failed with `AuthPKCECodeVerifierMissingError`. Supabase's documented SSR flow uses `TokenHash` links that the server verifies directly. Recovery links need the same treatment.

Steps:

1. Open Supabase Dashboard → project `xviumgygixcklrbuynoh` → Authentication → Email Templates (also shown as Authentication → Emails → Templates).
2. Open **Confirm signup**. Select **all** content in its HTML body editor and replace it with exactly: `<p>Confirm your email:</p><p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a></p>`. Save.
3. Open **Reset password**. Select **all** content in its HTML body editor and replace it with exactly: `<p>Reset your password:</p><p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Reset your password</a></p>`. Save.
4. The backticks enclosing examples here are Markdown formatting, not part of the HTML. No literal backtick may remain anywhere in either body. Each `href` must have its double quotes.
5. Confirm Authentication → URL Configuration still allows `http://localhost:3000/auth/callback` and uses the correct site origin. Do not use the Supabase-hosted `{{ .ConfirmationURL }}` in these two templates.

Non-secret values to copy: the two link target strings above. Do NOT paste any email link, token hash, OAuth secret, SMTP credential, or API key into chat/source.

Store result in: Supabase Email Templates for this project. No new secret or local environment variable is needed.

Agent verification: send confirmation to a new alias and recovery to a confirmed account, open each in a separate browser session, confirm callback and protected/reset state, and verify no PKCE error in app logs.

Blocking phase: P01
