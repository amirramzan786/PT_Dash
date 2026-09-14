# Native health architecture decision — 14 September 2026

**Plane:** STEEL-29
**Status:** decided; implementation remains planned

## Decision

Adopt **Capacitor** as the native container for the existing React/Vite Steel
client. Keep the public web app as a first-class client, and add small,
first-party native bridges for Apple Health and Android Health Connect rather
than trying to access either platform from the browser.

This is the smallest credible route to iPhone and Android health data: it
reuses the Steel interface, authentication and Supabase contract, while leaving
the platform-specific privacy prompts, data queries and background behaviour in
Swift and Kotlin where they belong. Capacitor can be added to an existing modern
JavaScript project and provides a native plugin boundary. [Capacitor
documentation](https://capacitorjs.com/docs)

## Why this route

| Option | Decision | Reason |
| --- | --- | --- |
| Keep web only | Reject | Browsers cannot provide the required Apple Health or Health Connect integrations. |
| Full React Native rewrite | Defer | It replaces a working, deployed client before the health-data value is validated. |
| Capacitor shell + native plugins | Adopt | Preserves the web investment and gives direct access to iOS/Android SDKs when the native pilot starts. |
| Generic third-party health abstraction | Do not use in v1 | It adds a vendor, privacy surface and capability uncertainty before first validation. |

## Client shape

```text
React/Vite Steel client
        |
        +-- Web: same current Supabase-backed experience; no device-health reads
        |
        +-- Capacitor iOS app -> Swift Apple Health bridge (HealthKit)
        |
        +-- Capacitor Android app -> Kotlin Health Connect bridge

Native bridge -> explicit member consent -> authenticated Steel ingestion path
              -> daily_steps / activity_connections -> existing source selection
```

The native bridges expose only availability, request-consent,
read-current-activity, refresh and revoke/disconnect. They do not expose raw
health records to arbitrary client screens.

## V1 data boundary

Request only the activity categories Steel can explain in its immediate UI:

- step count;
- walking/running distance;
- active energy;
- workouts / workout duration.

Do not request sleep stages, HRV, resting heart rate, clinical records,
reproductive health, location routes or other sensitive categories in the first
pilot. Steel will not write data back to Apple Health or Health Connect in v1.

Each imported observation retains provider, observed date/time, timezone,
source record identifier and confidence. The existing activity contract,
`activity_connections` ownership boundary and manual-entry preservation policy
remain the server-side contract. A member can disconnect (stop future imports)
and separately delete that provider's already imported data.

## Consent and privacy rules

1. Ask in context after the member chooses **Connect**; never on install,
   sign-in or app launch.
2. Show the platform permission sheet, exact categories and plain-language
   Steel purpose before importing anything.
3. Store Steel's consent version, requested scopes, native availability and last
   successful sync in `activity_connections`. A permission prompt is not proof
   that readable data exists.
4. Treat an empty Apple result as **no records available**, not a denied
   permission; Apple intentionally does not reveal read denial. [Apple
   authorization guidance](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data)
5. Do not use health data for advertising, profiling or sale. Do not disclose it
   to a coach or another party without separate, explicit member control.
   [Apple privacy requirements](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)
6. For Android, declare only data-type permissions needed by the enabled flow;
   background and historical reads require separate permissions and are not in
   v1. [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)

## Sync model

**V1 is member-initiated foreground refresh.** Refresh after consent and when
the member taps refresh in Settings. Import only the permitted window and use
source-record deduplication. Show the latest successful sync, not a promise of
continuous syncing.

Background delivery and historical backfill are later, separately approved
work. HealthKit data can be unavailable while an iPhone is locked, and Android
requires additional Health Connect permissions for background/history.

## Delivery sequence

1. Create the Capacitor shell in a dedicated mobile work item; do not modify the
   deployed web path.
2. Add verified iOS/Android signing, app links/deep links and Supabase
   mobile-auth redirect configuration.
3. Implement the narrow bridges with platform availability checks and contract
   tests.
4. Add an authenticated, validated ingestion batch contract; never grant a
   mobile client access to another member's activity.
5. Pilot iPhone steps only with one internal account, then a consenting coach
   and client. Add Android Health Connect only after the same checks pass.
6. Only then consider extra activity types, background sync or partner providers.

## Acceptance gates before a native pilot

- iOS and Android builds install with correct signing and production auth
  redirects.
- Permission copy names the exact categories and purpose; a decline leaves the
  app fully usable.
- Imports are owner-scoped, deduplicated and never overwrite manual entries.
- Disconnect and provider-only deletion are demonstrably effective.
- The UI does not imply medical monitoring, readiness diagnosis or continuous
  background sync.
- A privacy review confirms retention, coach visibility and support copy.

## Explicit non-goals

- Apple Watch standalone app;
- background sync, health alerts or diagnosis;
- Garmin, WHOOP, Oura, Fitbit or Samsung provider integrations;
- coach data sharing by default;
- replacing the deployed React web client.
