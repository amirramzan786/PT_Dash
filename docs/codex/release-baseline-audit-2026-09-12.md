# Release baseline audit — 12 September 2026

## Scope

Audit the unmerged Founder 20 release branch before any merge, deployment, or remote migration action.

- Integration baseline: `origin/main` at `0ca34d2`
- Audited branch: `origin/codex/founding20-beta-signups` at `a9c09a1`
- Difference: 13 commits, 15 changed files

## What passed locally

- `webapp/npm test`: 36 tests passed.
- `webapp/npm run lint`: passed.
- `webapp/npm run build`: passed.
- `git diff --check origin/main...origin/codex/founding20-beta-signups`: passed.

The production build completes successfully. Vite reports a pre-existing 638 kB minified JavaScript entry chunk; this is a performance follow-up, not a release-blocking build failure for this audit.

## Review findings

The branch makes the right kind of changes for the Founder 20 flow:

- Verification redirects to the dedicated app origin, preserving the `beta-verified=1` intent independently of Supabase's fragment-based session data.
- Founder allocation and entitlement creation remain server-side.
- The compatibility migration keeps the Founder zero programme-change limit while retaining a valid 28-day entitlement period.
- Internal trigger functions are revoked from Data API roles.
- The browser bundle contains only public configuration; service-role, email, and Turnstile secrets are not present.

## Live smoke-test evidence

- `https://projectsteel.co.uk` loads and presents the private-beta entry point.
- `https://app.projectsteel.co.uk` loads and presents the Steel sign-in screen.
- An approved test address passed the Cloudflare human check and the beta form
  confirmed that a verification email was sent with a 24-hour expiry.

No account was created and the verification link has not yet been opened. These
checks do **not** yet prove email arrival, verification, Founder/waitlist
allocation, entitlement persistence, onboarding, or account recovery.

## Release status: HOLD

Do not merge or deploy this branch yet. Complete and record the following controlled production checks first:

1. Confirm the two new Founder entitlement/security migrations are present in the intended Supabase project and in the expected order.
2. Verify the deployed Edge Functions and environment allow-list use the app callback origin exactly as documented.
3. Continue the Alpha 20 smoke flow with the approved test email: open and verify the email, complete account setup, confirm Founder/waitlist state, sign out/in, and confirm the entitlement persists.
4. Verify the restricted internal functions are not callable through the public Data API while the `beta-verify` server path still completes allocation.
5. Check mobile and desktop signup/account setup, plus Home and Settings, on the deployed app.
6. Update the related Plane work items with this audit, the production smoke result, and the explicit merge decision.

## Plane note

The local Plane server was unavailable during this audit, so its task update is pending. No Plane state was changed.
