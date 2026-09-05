# Project Steel — Founding 20 verified beta signup system

## Goal
Build a production-ready beta signup flow for the Steel marketing site that prevents bots/fake signups, verifies email ownership, keeps a truthful live Founding 20 counter, and permanently grants core Steel Premium free for life to the first 20 accepted/verified founders.

## Existing context
- Main app lives in `webapp/` and already uses Supabase Auth.
- Supabase project ref: `devpjwpirhhctrwizzab`.
- Existing client: `webapp/src/lib/supabase.js` using `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Existing auth UI: `webapp/src/AuthGate.jsx` uses email/password signup + email confirmation.
- Existing `public.membership_entitlements` table already grants app access per `user_id`; use/extend it rather than inventing a parallel entitlement system.
- Existing active Edge Functions include `steel-ai-onboarding` and `food-catalog`.
- Current marketing site is deployed separately on Cloudflare Workers at `https://project-steel-sitepagesdev.u1165153.workers.dev/`. Pull the currently deployed HTML into a `marketing-site/` folder if it is not already version-controlled, preserving the existing design.

## Commercial rule
The Founding 20 offer is real scarcity, not cosmetic.
- Capacity = 20 total founding places.
- A pending/unverified email does NOT consume a founding place.
- A place is secured only after successful email verification and server-side atomic allocation.
- Counter must reflect verified/allocated places only.
- First 20 accepted beta members keep **core Steel Premium at £0 for the lifetime of their account**.
- Do not imply that every future separate product/service/add-on is included forever.

## Required UX
### Marketing site
Keep the current Steel visual design. Wire both hero and beta signup forms to the real backend.

Submission states:
1. idle
2. validating / Turnstile
3. submitted — “Check your email to verify your place.”
4. duplicate verified — “You’re already on the list.”
5. duplicate pending — allow resend subject to cooldown
6. Founding 20 full — still allow waitlist signup, but clearly state lifetime Premium places are full
7. rate limited / invalid / disposable email — clear non-technical message

Under the beta form show a restrained live counter:
`7 CLAIMED · 13 REMAINING`
Do not increment optimistically in the browser.

### Verification landing state
On successful verification:
- show confirmation
- if founding place allocated: `You’re Founder #07 of 20.`
- if all 20 already allocated: confirm waitlist status, do not promise lifetime Premium
- provide next-step CTA to create/finish the Steel account if needed

## Abuse prevention
1. Cloudflare Turnstile on public signup form.
2. Validate Turnstile server-side in a Supabase Edge Function using the Turnstile secret.
3. Never expose service-role / secret keys in frontend code.
4. Normalise email (`trim`, lowercase) and enforce uniqueness server-side.
5. Reject obvious disposable-email domains using a maintained deny-list/helper; do not reject normal privacy-forwarding providers merely for being aliases.
6. Add server-side rate limiting/cooldown for repeated submissions/resends. Avoid storing raw IP indefinitely; if persistence is required, store a keyed hash with short retention.
7. Pending/unverified attempts expire after 24h and are eligible for cleanup.
8. Public counter endpoint returns only aggregate counts, never signup emails or PII.
9. Enable RLS on all new public tables. Public clients must not get direct insert/update/select access to raw signup rows.

## Preferred architecture
### New table: `public.beta_signups`
Suggested fields (adjust only with a clear reason):
- `id uuid primary key default gen_random_uuid()`
- `email text not null`
- `email_normalized text not null unique`
- `status text not null` constrained to `pending | verified | approved | waitlist | rejected | expired`
- `verification_token_hash text` (if using custom verification tokens)
- `verification_expires_at timestamptz`
- `verified_at timestamptz`
- `approved_at timestamptz`
- `founding_number smallint unique` constrained 1..20 when non-null
- `user_id uuid null references auth.users(id)`
- `source text not null default 'marketing-site'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

If Supabase Auth magic links/OTP are used instead of custom tokens, keep the table lean and associate the verified `auth.users.id` after verification.

### Founding allocation
Must be server-side and atomic.
Use a transaction-safe SQL function/RPC or equivalent locking strategy so concurrent verifications cannot both receive the same final slot.
Rules:
- count/allocate only verified/approved founders
- assign next available integer 1..20
- once 20 are allocated, verified users become `waitlist`
- never trust a number supplied by the client

### Entitlement
When a founder is linked to an authenticated Steel user:
- upsert `public.membership_entitlements` for that `user_id`
- preserve existing schema conventions
- represent Founding lifetime Premium explicitly and safely (e.g. dedicated `plan_key`/status/metadata or migration adding suitable fields)
- entitlement must survive logout, device changes, browser changes, and future billing integration
- do not grant via localStorage/cookie

If schema changes are needed, use a migration and retain backwards compatibility with current beta users.

## Edge Functions
Implement public functions with custom validation (they cannot require an existing user JWT because the visitor is not signed in yet). Keep allowed origins restricted to the Steel marketing domain(s) and local dev.

Recommended endpoints/functions:
1. `beta-signup`
   - accepts email + Turnstile token + source
   - validates origin, Turnstile, email, rate limit, duplicate state
   - creates/refreshes pending signup
   - sends verification via Supabase Auth or secure verification flow
   - returns generic success that does not leak unnecessary account existence details

2. `beta-status`
   - GET/public aggregate only
   - returns `{ capacity:20, claimed:n, remaining:20-n, full:boolean }`
   - no PII

3. verification completion path
   - either dedicated `beta-verify` Edge Function or callback handler using Supabase Auth
   - verifies email ownership
   - atomically allocates Founding number or waitlist
   - links `user_id` when available
   - grants lifetime Premium entitlement when account exists / when subsequently linked

Do not log full verification tokens or secrets.

## Email verification
Prefer leveraging Supabase Auth confirmation/magic-link infrastructure where practical because Steel already uses Supabase Auth and confirmation emails. Do not create a second password system.
If verification creates a Supabase user, ensure the marketing flow explains the next account-completion step and remains compatible with the existing password sign-in UI.
Configure redirect URLs rather than hardcoding development origins.

## Cloudflare Turnstile
- frontend site key is public config
- secret lives only in Supabase secrets
- server-side validation is mandatory
- handle expiry/retry gracefully

Expected secrets/config (names may be refined):
- `TURNSTILE_SECRET_KEY`
- public site key in marketing build config / safe constant
- marketing origin(s)

## Admin / review
Create a minimal admin capability appropriate to current Steel architecture. At minimum provide an authenticated/admin-only way to list:
- email
- signup date
- verified status
- founding number / waitlist
- linked user id
- approve/reject if manual approval remains enabled

Do not expose this through public RLS.

## Tests / acceptance criteria
Must demonstrate:
- valid human email + valid Turnstile can submit
- invalid Turnstile rejected
- malformed email rejected
- disposable email denied
- duplicate normalised email does not create duplicate row
- resend cooldown enforced
- unverified signup does not change claimed counter
- verification changes state once
- two concurrent verifications around slot 20 cannot allocate duplicate slot / exceed 20
- founder #1..#20 each has unique number
- user #21 becomes waitlist
- counter returns 20/0 when full
- no public endpoint leaks signup PII
- RLS prevents anon direct reads/writes of signup table
- founder entitlement is linked to account and persists
- existing Steel sign-in/signup still works
- mobile + desktop marketing forms both work
- graceful loading/error/success states

## Delivery
- Work only on branch `codex/founding20-beta-signups`.
- Do not commit `node_modules`, build output, `.env`, service-role keys, Turnstile secret, or other secrets.
- Use migrations for DB changes.
- Add/update tests where practical.
- Add a concise setup README covering required Supabase secrets, Turnstile site setup, redirect URLs, and deployment steps.
- Run relevant tests/build/lint before finalising.
- Open a PR to `main` with a summary, security notes, migration notes, and any manual configuration still required.

## Do not do
- Do not fake the live counter.
- Do not allocate a founder place in frontend JavaScript.
- Do not expose a service-role key.
- Do not weaken current app RLS/auth.
- Do not redesign the Steel marketing site during this task.
- Do not add payment/billing yet.
