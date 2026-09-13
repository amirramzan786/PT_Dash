# Supabase Security Advisor disposition — 13 September 2026

## Result

Production Security Advisor reports **zero errors and seven warnings** after
the avatar-listing restriction in
`20260913010000_prevent_avatar_bucket_listing`.

## Closed warning

`storage.avatars` no longer has a broad public `SELECT` policy. The bucket is
still public deliberately: profile images are served through stable public
URLs, and the browser client uses `getPublicUrl` rather than Storage listing.
The replacement policy permits only object retrieval operations and rejects
`object.list`. Owner-scoped upload, update and delete policies are unchanged.

## Remaining reviewed warnings

| Warning | Disposition |
| --- | --- |
| `get_my_founder_status()` | Required by the signed-in client to read only the caller's Founder status from private Founder data. It has a fixed `public, pg_catalog` search path, is unavailable to anonymous users, and predicates all reads on `auth.uid()`. |
| `get_my_plan_change_status()` | Required by the signed-in client to read only the caller's plan-change window. It has a fixed `public, pg_catalog` search path, rejects a missing user, and returns derived status only. |
| `record_alpha_event(text, jsonb)` | Required for constrained authenticated telemetry. It rejects missing users, allow-lists events and properties, caps payload size, and derives the user and source server-side. |
| `replace_generated_programme(jsonb)` | Deliberately performs an atomic, caller-owned programme replacement. It validates the payload and caller, locks relevant rows, and needs elevated access because normal RLS does not grant all of its coordinated writes. |
| `review_plan_change_request(uuid, text, text)` | Deliberately performs an atomic trainer/admin review. It requires a signed-in caller and verifies assigned-trainer or admin authority via private helpers. |
| `submit_plan_change_request(jsonb)` | Deliberately performs an atomic caller-owned request and audit-event write. It validates bounded inputs, membership limits and caller identity. |
| Leaked password protection | Not configurable on the current Supabase Free plan. Reassess and enable it on a supporting plan before broader commercial release. |

All six functions explicitly revoke `PUBLIC` and anonymous execution and grant
only `authenticated`; their source and live grants were checked on 13
September. This is an accepted, intentionally narrow API surface—not a reason
to remove user-facing functionality merely to silence the linter.

## Next release controls

1. Complete authenticated mobile Home and Settings QA.
2. Verify the deployed beta-function callback configuration and the public
   Data API boundary.
3. Revisit the password-protection decision at the first paid-plan review.
4. Record the merge-or-close decision in `STEEL-108`.
