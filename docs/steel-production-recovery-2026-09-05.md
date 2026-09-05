# Steel production recovery — 5 September 2026

## Confirmed cause

The production deployment at 23:46 UTC on 4 September rebuilt GitHub `main` at `f1f13b4`. That checkout was behind the previously deployed application. The prior deployment `63d67935` advertised commit `66a5f48` (Fix manual steps save flow); that commit was unavailable in the current GitHub repository and inspected local clones. Its public bundle still exists and confirms the missing Journey, manual steps and reminder implementations. A GitHub 404 does not prove that the work was never committed, and the underlying history divergence has not been established.

The Cloudflare dashboard tab had stale information; a fresh API read identified `b1d58dd2` / `f1f13b4` as the canonical production deployment. The earlier assertion that production was currently serving `66a5f48` was incorrect.

## Restored in this repair

- Retain Today’s Direction / Steel Signal and time-aware greeting from PR #4.
- Collapse Your Steel Journey by default using native keyboard-accessible disclosure.
- Restore manual daily steps using the existing `daily_steps` table and unique `(user_id, step_date, source)` index. An atomic upsert replaces the manual daily total. Connected provider data takes priority and only one total contributes per date.
- Restore the existing `profiles.notification_preferences` contract: workout days/time, meal reminders, morning motivation. Save preferences to the existing profile; issue notifications only after browser permission, while Steel is open on supported browsers.
- Repair integrations layout. The original CSS exists in `v3.css`; the grid was nested inside the icon column of a two-column card. Move the provider grid to a full-width disclosure body.
- Show Apple Health, Health Connect and Samsung Health as planned; Garmin, Fitbit, Oura and WHOOP as under consideration. None is represented as connected.
- Restore visible desktop collapsed-navigation labels on hover and keyboard focus.
- Show a single recorded step value in the chart and keep the steps card compact.
- Add `version.json` and a visible commit ID to identify exactly which build is deployed.

## Database and configuration

No live schema migration or new secrets are required for this UI recovery. The live project already has `daily_steps`, its unique index and own-user SELECT/INSERT/UPDATE/DELETE policies, plus `profiles.notification_preferences` and own-profile access. Do not replace the existing database schema using the older repository schema.sql; it is not a complete snapshot of live schema.

An authenticated-role transaction verified insert and update of one manual row, returning one row and an updated total of 3333, plus an update of the existing reminder preferences. The transaction was rolled back: test values were not retained.

Production remains the Pages project `pt-dash`, GitHub `main`, build root `/webapp`, build command `npm run build`, output `dist`. Existing public Supabase URL/key configuration remains in Cloudflare.

## Verification

- `npm test`: 8 checks passed, including steps, reminder scheduling/deduplication, Home guidance and five programme-generator personas.
- `npm run lint`: checks restored components, modified app/API and build metadata configuration.
- `npm run build`: production compilation; existing large-bundle advisory is non-blocking.
- `git diff --check`.
- After merge, verify Pages canonical commit equals GitHub main, request production `/version.json`, reload the authenticated production page and check Home and Settings.

## Additional recovery work identified

The prior deployed bundle also contains richer food-catalogue/search/barcode/favourites functionality and membership-aware plan-review requests absent from the current main source. These require a separate recovery of their complete UI/backend contracts and must remain tracked as outstanding rather than silently counted as restored here. The public bundle at deployment `63d67935` is the recovery reference. Preserve it; do not delete historical deployments.

PR #3 remains subject to its original Founding 20 migration, secret configuration and real verification/entitlement test gates. This repair does not bypass those gates or add payments.

## Release procedure

1. Build from the actual target commit and run the relevant checks.
2. Merge the reviewed source into main using a normal merge (no forced history replacement).
3. Let Pages build main; inspect its canonical deployment, not merely the most recent preview.
4. Compare `/version.json` commit to GitHub main and verify the authenticated user paths.
5. Update Plane with completed fixes and any outstanding recovery items.
