# Production callback and Data API verification — 13 September 2026

## Auth redirect configuration

The production Supabase Auth configuration was checked directly. The Site URL
is `https://projectsteel.co.uk`; allowed redirect URLs include both
`https://projectsteel.co.uk/**` and `https://app.projectsteel.co.uk/**`.

## Live browser-origin boundary

Read-only requests to the deployed `beta-status` Edge Function returned:

- `200` for `Origin: https://projectsteel.co.uk`, with
  `Access-Control-Allow-Origin: https://projectsteel.co.uk` and the expected
  beta capacity response.
- `403` with `This origin is not allowed.` for an untrusted origin.

This verifies the deployed `MARKETING_ALLOWED_ORIGINS` configuration accepts
the canonical marketing site and does not rely on the local fallback list.
The previously completed Founder smoke test additionally verified the email
callback path through the live app flow.

## Public Data API boundary

Read-only production privilege checks confirmed:

- Anonymous and authenticated roles cannot `SELECT` `beta_signups`,
  `analytics_events` or `plan_change_windows`.
- Anonymous and authenticated roles cannot execute the internal
  `enforce_programme_change_window()` trigger function.
- Anonymous and authenticated roles cannot execute
  `complete_beta_verification(uuid, text)` or
  `admin_grant_trainer_premium(uuid, uuid)`.
- Both procedures remain executable to `service_role` only.

## Result

The final technical release gate passes. No deployment or merge was performed;
the remaining action is the explicit merge decision for the reconciliation
branch and closure of `STEEL-108` after that decision.
