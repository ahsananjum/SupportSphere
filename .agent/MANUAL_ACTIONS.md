# Owner actions

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

## MANUAL-007 — Apply P04 support operations migration

Status: VERIFIED — migration applied via Supabase CLI using the owner's local environment token on 2026-10-04; no token was pasted into chat or source.

Why: P04 support routes and RPCs require the live tables, RLS policies, indexes, composite workspace foreign keys, and RPCs before the real customer → conversation → message → ticket flow can be verified. The owner supplied the access token through the ignored local environment, so the CLI path was used.

Steps:

1. The agent loaded `SUPABASE_ACCESS_TOKEN` from the ignored local `.env` and ran `supabase db push --project-ref xviumgygixcklrbuynoh --include-all --yes`.
2. The applied versions are `20261004120000`, `20261004130000`, and `20261004131500`; the second and third add the support indexes and composite foreign-key indexes.
3. Migration history, generated types, schema lint, security/performance advisors, live security tests, and the authenticated browser journey were verified after application.
4. Provider credentials, database passwords, service-role keys, and customer data were not pasted into chat or source.

Do NOT paste: Supabase access tokens, database passwords, service-role keys, or any customer data.

Store result in: Supabase project migration history and Dashboard SQL Editor only.

Agent verification: complete. Types were regenerated from project `xviumgygixcklrbuynoh`; migration history and RLS/security advisors were inspected; P04 live cross-tenant/concurrency/browser gates passed.

Blocking phase: P04

## MANUAL-005 — Choose and configure the public production origin

Status: VERIFIED — owner supplied project `support-sphere` and origin `https://support-sphere-psi.vercel.app`; commit `7681bd5` deployed to Production as GitHub deployment `6796535046`. Live canonical URLs, robots, sitemap, routes, auth OAuth initiation, and contact delivery passed on 2026-10-02.

Why: `RULES.md` requires a production domain before launch. The app omits canonical URLs and disallows indexing until `NEXT_PUBLIC_APP_URL` is a public HTTPS origin. Local builds cannot prove the deployed canonical, OAuth callback, or live contact path.

Steps for the owner:

1. Deploy this repository in **Vercel Dashboard → Add New → Project** on the intended free-plan account. In **Project → Settings → Domains**, choose the exact production hostname. The assigned `*.vercel.app` hostname is acceptable if it is the hostname you intend to publish; a custom domain is optional. Copy the exact public HTTPS origin (scheme and hostname, no trailing path) back to the agent. Do not guess the URL before Vercel assigns it.
2. In **Project → Settings → Environment Variables**, set `NEXT_PUBLIC_APP_URL` to that exact origin for Production, plus the existing Supabase/Brevo variables from the ignored local environment. Public Supabase URL/publishable key use their `NEXT_PUBLIC_` names; `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, and any SMTP credential remain server-only. Use the verified `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`. Redeploy after setting variables.
3. In **Supabase Dashboard → SupportSphere project → Authentication → URL Configuration**, set the Site URL to the production origin and allow the exact `https://<host>/auth/callback` redirect. Preserve local development redirects only if still used. In the Google OAuth client's **Authorized JavaScript origins**, add the production origin if required by that client configuration; preserve Supabase's callback URI. Update any provider redirect setting that still points only to localhost.
4. Tell the agent the non-secret Vercel project name and exact production HTTPS origin. Keep the deployment accessible for live smoke checks.

Do NOT paste into chat or source: Supabase service/secret key, Brevo API/SMTP key, OAuth secret, database password, or Vercel account token. Store secrets only in Vercel environment variables and their provider dashboards; local copies belong in ignored `.env`/`.env.local`.

Agent verification: inspect the actual Vercel project when a connector is available; visit the production origin; confirm each public canonical, `robots.txt`, and `sitemap.xml` uses the chosen host; confirm auth callback and real contact submission; inspect the corresponding Supabase row and Brevo event. Keep P02 active until these pass.

Blocking phase: P02

## MANUAL-006 — Confirm public mailing details and review legal text

Status: VERIFIED by owner decision — on 2026-10-02 the owner explicitly approved publishing “Lahore, Pakistan” as the mailing-address choice and approved `/privacy`, `/terms`, and `/cookies` as-is. The city-level detail remains exactly owner supplied, with no invented street address. Deployed contact/legal pages show the approved identity, location, and email.

Why: The owner supplied **Ahsan Anjum**, **ahsananjum170@gmail.com**, and **Lahore, Pakistan**. The owner explicitly chose this city-level public address text and approved it for the intended launch. `RULES.md` requires owner-supplied contact details, and `PRD.md` requires owner/legal review of generated legal templates before commercial use. The site must not infer a street address.

Steps for the owner:

1. Decide whether to publish a deliverable street/office/PO-box mailing address. If so, provide the exact non-secret address text to the agent. If you prefer to publish only “Lahore, Pakistan,” obtain legal advice that this is sufficient for your intended launch and tell the agent that review is complete. The site currently displays exactly the city-level location you chose.
2. Review the actual **`/privacy`**, **`/terms`**, and **`/cookies`** pages in the deployed or local app. Check operator identity, public email, location/address, service-provider statements, data-handling statements, and product availability. Send exact edits, or explicitly confirm the pages are approved for the intended use. The operator privacy export/deletion procedure is in `docs/privacy-operations.md`.
3. If the public support/legal email should change, provide only the new public address. Keep provider credentials in the dashboards/ignored environment as described above.

Do NOT paste into chat or source: personal account credentials, provider API keys, private legal documents, or customer data. Store any legal-review notes and private address evidence outside the repository; only the approved public facts belong in source.

Agent verification: compare the approved facts with `lib/marketing/facts.ts` and all three rendered legal pages; check the deployed contact/footer facts and email link; record the owner's approval or requested edits in `.agent/QA.md`. Re-run link, metadata, and production checks.

Blocking phase: P02

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

## MANUAL-008 — Configure Gemini for P07

Status: PENDING — blocks P07 completion. A 2026-10-09 secret-name-only check of SupportSphere Supabase project `xviumgygixcklrbuynoh` found no `AI_*` Edge Function secrets. The owner superseded the earlier OpenAI selection with Google AI Studio free tier.

Why: The deployed controlled worker needs a real Google AI Studio API key and a `generateContent` model that supports native structured JSON. Controlled tests cannot prove real grounding and injection resistance. Google’s free tier has project/model quotas and may use submitted content to improve its products; verification uses synthetic data only.

Steps:

1. Open Google AI Studio → Get API key. Create or select the intended Google Cloud project and create a Gemini API key. In AI Studio, check that the project has access to a free-tier `generateContent` model with structured outputs. Google currently limits access to Gemini 2.5 models for some new projects; choose an available model such as `gemini-3.8-flash` if `gemini-2.5-flash` is unavailable. Do not use `gemini-1.5-flash` without confirming that the project still serves it.
2. Open Supabase Dashboard → project `xviumgygixcklrbuynoh` → Edge Functions → Secrets. Set `AI_PROVIDER` to `gemini`, `AI_API_KEY` to the Google AI Studio key, and `AI_MODEL_TRIAGE`, `AI_MODEL_SUPPORT`, `AI_MODEL_QUALITY` to the exact available model IDs. The same model ID can be used for all three stages. Save the secrets there, not in `NEXT_PUBLIC_*`, Git, or chat.
3. Tell the agent setup is complete and share only the non-secret model IDs. Leave the existing `supportsphere-ai-worker` cron active. Keep real workspaces in `off` mode until synthetic live scenarios and the phase gate pass.

Non-secret values to copy to the agent: `AI_PROVIDER=gemini` and the three chosen model IDs. Do NOT paste the API key, service-role key, HTTP authorization headers, or customer data into chat/source.

Store result in: Google AI Studio project API keys and Supabase Edge Function Secrets for project `xviumgygixcklrbuynoh`.

Agent verification: list secret names only; deploy/check `ai-worker`; run the ten real-provider scenarios in an isolated synthetic workspace through the scheduled worker; inspect run steps/citations/messages and Edge execution logs without exposing credentials or customer text; verify no prohibited send; clean all test fixtures; then repeat the full P07 gate. Set `VERIFYING` and `COMPLETE` only after every acceptance criterion is proven.

Blocking phase: P07
