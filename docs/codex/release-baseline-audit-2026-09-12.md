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
- The verified account completed the callback flow and received a Founder
  allocation, confirming the live allocation path reached the app successfully.
- After a normal sign-out and sign-in, the Founder state remained present,
  confirming entitlement persistence for the approved test account.

These checks do **not** yet prove full onboarding completion, account recovery,
or mobile Home and Settings behaviour in an active authenticated session.

Authenticated desktop QA subsequently passed for Founder #01: Settings showed
the persistent Premium-for-life entitlement, truthful planned/unconnected
health-provider states and reminder controls. Home showed the daily summary,
quick actions, next-session state, movement history, manual-steps entry point
and workout list.

## Production configuration review

- The production Supabase project is `devpjwpirhhctrwizzab` on its `main`
  production branch.
- The two Founder entitlement/security migrations are present in the expected
  order: `20260908210702_founder_entitlement_constraints` followed by
  `20260908210824_restrict_internal_trigger_functions`.
- The deployed function inventory includes `beta-signup`, `beta-status`,
  `beta-verify` and `beta-admin`. The signup and verification functions were
  updated within the recent release window; the live signup check recorded
  above used that path without a 5xx response.
- The Security Advisor reports zero errors, but seven warnings. They include a
  public-listable avatars bucket, five intentionally callable
  `SECURITY DEFINER` application functions, and disabled leaked-password
  protection. These warnings require explicit review and dispositions before a
  broader release claim.

## Release blockers and follow-ups

- Production migration history does **not** list
  `20260906103400_membership_plan_change_and_pt_seats`, and a read-only
  production query confirms the gap: its three tables
  (`plan_change_windows`, `trainer_premium_seat_pools`, and
  `trainer_premium_grants`) and three functions
  (`enforce_programme_change_window`, `get_my_plan_change_status`, and
  `admin_grant_trainer_premium`) are absent. Do not merge or deploy related
  membership/coach work until a reviewed, authorised forward application plan
  is agreed.
- Mobile authenticated Home and Settings QA remains required.

## Release status: HOLD

Do not merge or deploy this branch yet. Complete and record the following controlled production checks first:

1. Reconcile the missing `20260906103400_membership_plan_change_and_pt_seats`
   migration with production before any membership or coach release uses it.
2. Verify the deployed Edge Function source and environment allow-list use the
   app callback origin exactly as documented.
3. Review and record a disposition for all seven Security Advisor warnings;
   enable leaked-password protection unless there is a documented reason not
   to.
4. Verify the restricted internal functions are not callable through the
   public Data API while the `beta-verify` server path still completes
   allocation.
5. Check mobile signup/account setup and authenticated Home and Settings on
   the deployed app; desktop Home and Settings has passed.
6. Update the related Plane work items with this audit, the production smoke
   result, and the explicit merge decision.

## Plane note

`STEEL-108 — Release gate — reconcile Founder 20 production baseline` is now
open as a high-priority Todo item. It contains the release hold, test evidence,
acceptance criteria and confirmed migration gap. No production migration,
deployment or merge was performed.
