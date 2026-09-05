# Founding 20 beta signup setup

The implementation lives in `webapp/supabase/` and the preserved Cloudflare-ready marketing bundle lives in `marketing-site/`.

## Supabase

Apply every migration in `webapp/supabase/migrations/` in timestamp order to project `devpjwpirhhctrwizzab` before deploying the functions. They are additive and keep raw beta signup rows inaccessible to `anon` and `authenticated`.

Deploy the four functions:

```bash
supabase functions deploy beta-signup
supabase functions deploy beta-status
supabase functions deploy beta-verify
supabase functions deploy beta-admin
```

Set these Edge Function secrets in the Supabase dashboard or with the CLI. Never put the secret values in the frontend or Git:

- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret key.
- `RATE_LIMIT_HASH_SALT` — a separate random secret used to key short-lived abuse-prevention hashes.
- `MARKETING_ALLOWED_ORIGINS` — comma-separated exact origins, including `https://project-steel-sitepagesdev.u1165153.workers.dev` and any local dev origin used.
- `TURNSTILE_ALLOWED_HOSTNAMES` — comma-separated hostnames configured on the Turnstile widget.
- `MARKETING_VERIFICATION_REDIRECT_URL` — the exact marketing URL Supabase Auth should return to, for example `https://project-steel-sitepagesdev.u1165153.workers.dev/#beta-verified`.
- `RESEND_API_KEY` — server-only Resend API key for post-verification Founder/waitlist confirmation emails.
- `TRANSACTIONAL_EMAIL_FROM` — a verified sender, for example `Project Steel <hello@projectsteel.co.uk>` once the domain is verified. Do not use an unverified address.
- `TRANSACTIONAL_EMAIL_REPLY_TO` — support mailbox for replies, for example `support@projectsteel.co.uk`.
- `STEEL_APP_URL` — exact app URL used only by the post-verification email CTA.

The functions use Supabase’s built-in `SUPABASE_URL`, publishable-key and secret-key environment values. No service-role key is read by browser code.

In Supabase Auth URL Configuration, add the verification redirect URL and local equivalent. Ensure email confirmation is enabled and the Auth magic-link template links to `{{ .ConfirmationURL }}` and uses the approved verification copy. Turn off link tracking in the transactional sender for this template so the secure verification link is not rewritten.

## Cloudflare marketing site

`marketing-site/index.html` is the currently deployed Steel page with its visual design preserved. `marketing-site/steel-config.js` contains only public browser configuration. Set `turnstileSiteKey` to the public site key for a widget whose hostname includes the production marketing hostname and local dev hosts. Do not put the Turnstile secret there.

The page loads the pinned browser Supabase client from jsDelivr and calls only `beta-signup`, `beta-status` and `beta-verify`. The counter starts unknown and is painted only from the aggregate backend response; the browser never increments it.

Upload the contents of `marketing-site/` to the existing Cloudflare Worker/Pages static deployment. If the deployment uses a build step, keep `steel-config.js` at the public root and ensure `_headers` is copied to the output.

## Account completion

The beta request uses Supabase Auth magic-link infrastructure, so the first verification creates or signs into the Supabase user associated with the email. The verification landing state shows the Founder/waitlist result and links to the existing Steel app. A user can use the app’s existing password-reset flow if they want a password for normal email/password sign-in.

After allocation, `beta-verify` sends the approved Founder or waitlist confirmation through Resend. The provider request has a stable 24-hour idempotency key and private delivery state, so a normal repeat callback does not resend it. If the provider is unavailable, allocation remains successful and the delivery row records the retryable failure; do not claim real delivery until a live external-email smoke test passes.

## Admin review

An authenticated user whose `user_roles.role` is `admin` can call `beta-admin` with the existing Steel session. `GET` lists email, dates, verification state, Founder number, waitlist state and linked user id. `POST` accepts `approve`, `reject` or `reconcile` for a signup id. This endpoint is not available to anonymous users and is not exposed through public RLS policies.

## Operational notes

- Founder places are allocated only by `complete_beta_verification`, after Supabase Auth confirms the email.
- A transaction-scoped advisory lock serialises allocation at the #20 boundary.
- Pending records expire after 24 hours and remain as audit state; expired rate-limit hashes can be removed with `cleanup_beta_rate_limits()`.
- Rejecting an already allocated Founder is an explicit abuse-remediation action: it clears that allocation and removes only the matching Founder lifetime entitlement so the place can be deliberately reused.
- Billing/payment is intentionally not included. The Founder entitlement is `steel-core-premium-founder-lifetime`, with `ends_at = null` and explicit metadata.
- Review the draft legal copy in the marketing footer before widening beta collection. It intentionally does not invent company registration details or claim final compliance.
