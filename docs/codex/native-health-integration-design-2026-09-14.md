# Project Steel native health integration design

Date: 14 September 2026  
Plane: STEEL-112  
Status: design in progress; no native health permission or device data access

## Decision summary

The first connected-health pilot is deliberately narrow and read-only. Steel
will request access only to:

1. daily step totals; and
2. completed workout/exercise session duration, expressed as workout minutes.

The first release is foreground-only. A member starts a connection from the
native app, sees the provider permission sheet, and then chooses when Steel
reads and syncs data. There is no background delivery, historical backfill,
write-back to a provider, route/GPS access, medical data, sleep, HRV, heart
rate, calories, or AI Coach access in this work item.

The native bridge is the only layer allowed to speak to HealthKit or Health
Connect. It returns a small, provider-neutral activity payload to the React
client. The client sends normalized daily records through the existing
authenticated Supabase boundary. The server remains the owner-scoped source
of truth; the native platform is never treated as a database the browser can
query directly.

## Why this boundary

The current repository already contains the additive `daily_steps` activity
model and `activity_connections` lifecycle. It also has:

- provider-specific connection state and consent version;
- a unique `(user_id, source, source_record_id)` index for idempotent imports;
- deterministic source priority in `src/lib/steps.js` (manual data remains the
  fallback, while a connected provider can be preferred);
- an owner-scoped, `security invoker` deletion function that deletes only
  recognized provider rows and preserves manual entries; and
- UI states for not connected, connected, sync issue and disconnected.

Native implementation must use these contracts. It must not add a second
activity table, sum overlapping providers, or make a connection look live
before consent and a successful read.

## Provider contracts

### iOS — HealthKit

The iOS shell will add the HealthKit capability only in the implementation
task, not in this design task. The first bridge contract is:

```text
healthkit.isAvailable() -> { available: boolean, reason?: string }
healthkit.requestAuthorization({
  read: ["steps", "workout_minutes"],
  write: []
}) -> { granted: boolean, deniedScopes: string[] }
healthkit.readActivity({
  start: ISO timestamp,
  end: ISO timestamp,
  timeZone: IANA time zone
}) -> NativeActivityRecord[]
healthkit.openSettings() -> void
```

The implementation should map `HKQuantityTypeIdentifier.stepCount` to steps
and HealthKit workout objects to duration. It must not request write types,
workout routes, heart rate, energy, body measurements or any clinical type.
The bridge should report unavailable when HealthKit cannot be used on the
device or simulator, rather than presenting a misleading Connect action.

Authorization is not proof that data is readable. After the request, the
bridge must perform a small read and return a successful-read timestamp. If
the member grants only part of the request, the connection is a `sync_issue`
with the denied scope recorded; the app must explain which metric is missing.

### Android — Health Connect

The Android implementation will declare only the read permissions required by
the pilot:

```text
android.permission.health.READ_STEPS
android.permission.health.READ_EXERCISE
```

It will read `StepsRecord` and `ExerciseSessionRecord` data and aggregate by
the member's local calendar day. It must not request background-read or
historical-read permissions, and it must not request write permissions.

Health Connect requires per-app, per-data-type consent. The bridge must check
availability before showing Connect, request the declared permissions in the
foreground, then perform a bounded read. On Android 14/API 34 and later, the
implementation must follow the current on-device step attribution behavior:
do not hard-code a data-origin package name and do not filter out the
device-specific synthetic package name. Aggregated totals should include the
on-device source unless the user has selected a provider preference that says
otherwise.

If Health Connect is unavailable, out of date, or a required permission is
denied, the app shows a recoverable state and a route to the system/provider
settings. It never records `connected` from a permission result alone.

## Provider-neutral payload

The bridge returns records in this shape; it does not return raw HealthKit or
Health Connect objects:

```js
{
  source: 'apple_health' | 'health_connect',
  metric: 'steps' | 'workout_minutes',
  value: number,
  start_at: string,       // ISO-8601 instant
  end_at: string,         // ISO-8601 instant
  time_zone: string,      // IANA name from the device
  source_record_id: string,
  observed_at: string,    // ISO-8601 instant
  confidence: number|null
}
```

Rules:

- `value` is a non-negative integer. The bridge rejects NaN, negative values,
  fractional steps and invalid dates before returning a record.
- `source_record_id` is stable for the provider record. For an aggregate daily
  query, use a deterministic key containing provider, local day, metric and
  contract version (for example, `apple_health:2026-09-14:steps:v1`). A retry
  must upsert the same logical row, never create another total.
- The client derives `step_date` from the provider's local day and stores the
  device time zone in `timezone`. UTC truncation must not be used for a member
  whose local day crosses midnight.
- `observed_at` is when the provider was read, not when the member opened the
  app. `synced_at` is when Supabase accepted the record.
- Null means the provider did not supply a metric. Missing data is not zero
  activity and must not inflate a logged average.

The first implementation can send daily aggregates for a bounded window (the
current local day and a small recent window needed to repair missed
foreground syncs). It must not silently backfill an arbitrary history.

## Supabase write and ownership contract

The native client uses the signed-in user's Supabase session and publishable
client key. It never carries a service-role key. All writes remain owner
scoped by RLS:

### `activity_connections`

On Connect, create or update the member's provider row only after consent and
the first successful read:

```text
provider = apple_health | health_connect
status = connected
scopes = ["steps", "workout_minutes"] (only the scopes actually granted)
consented_at = current time
consent_version = "native-activity-v1"
last_synced_at = current time
disconnected_at = null
last_error_* = null
```

If consent is denied, leave the row absent or `not_connected`. If a later
read fails, retain the consent record but set `sync_issue`, `last_error_at`
and a stable, non-sensitive `last_error_code`.

Disconnect changes only the connection state and timestamps. Imported rows
remain available until the member separately confirms **Delete imported data**.
Deletion must call the existing owner-scoped
`delete_activity_provider_data(provider)` function. No client-side loop may
delete rows one at a time.

### `daily_steps`

Use the existing additive columns and current upsert contract:

```text
user_id, step_date, steps, source,
distance_m, active_calories_kcal, workout_minutes,
observed_at, timezone, source_record_id, confidence,
synced_at, updated_at
```

For V1, `distance_m` and `active_calories_kcal` stay null because they are not
requested. A provider's `workout_minutes` may share the same daily row as its
steps only if the existing schema/upsert path can preserve both values without
overwriting an earlier metric. Otherwise the implementation must use a
provider record per metric and the reader must merge metrics within the same
source/day before selecting a source total. This must be covered by fixtures
before a migration is considered.

## Source selection and double-counting

Steel must select one authoritative daily total rather than add Apple Health,
Health Connect and manual totals together. The existing `preferredActivity`
policy remains the starting point:

1. an explicit member source preference, if introduced, wins;
2. a connected native provider outranks manual fallback;
3. confidence and newest observation break ties; and
4. source ID gives a stable final tie-break.

The selected record is shown with its source label. Other provider rows may be
retained for audit and future reconciliation but are not summed into Home,
Progress or AI Coach signals. If two providers disagree materially, surface a
sync issue or source-choice prompt rather than silently averaging them.

## Consent and member experience

The native flow has four explicit stages:

1. **Explain** — “Steel can read steps and workout time to show your activity
   progress. It will not write to your health app or read sleep, heart rate or
   medical data.”
2. **Choose** — the member selects Apple Health or Health Connect and can
   continue with manual entry instead.
3. **Authorize** — the system permission sheet is shown in the foreground.
4. **Confirm** — Steel performs a bounded read and displays the provider,
   granted metrics and last successful sync time.

The Settings card must distinguish:

- Not connected — no provider consent recorded;
- Connected — consent recorded and a successful read completed;
- Sync issue — consent exists but the latest read failed or a scope is
  missing; and
- Disconnected — future reads stopped, imported data retained.

Every state includes a manual-entry fallback. Reconnecting never silently
restores a previously deleted import; it creates new provider rows through the
same consent and first-read gate.

## Failure and safety cases

- **Permission denied:** remain Not connected; explain the missing scope and
  offer provider settings/manual entry.
- **Partial permission:** connect only the granted metric or mark Sync issue;
  never imply both metrics are available.
- **No records:** a successful empty read is connected with zero imported
  rows, not a fabricated zero-activity row.
- **Clock/time-zone change:** use the current device time zone for new reads;
  do not rewrite historical `step_date` values without a separate repair task.
- **Duplicate provider records:** deduplicate by stable source record ID and
  deterministic aggregate key.
- **Provider unavailable or revoked:** set Sync issue, retain prior imported
  data, and provide a reconnect/settings path.
- **Account deletion or imported-data deletion:** use the existing owner-only
  function and verify that manual rows survive.
- **AI Coach:** no native activity data enters Steel AI Coach until the member
  has separately opted into that product and its server-side signal contract
  is approved.

## Test fixtures and release gates

Before adding a real HealthKit or Health Connect dependency, add provider-
neutral fixtures for:

- one daily steps record;
- multiple overlapping records from one provider;
- two providers with different totals;
- a manual row plus a provider row on the same day;
- duplicate retries with the same `source_record_id`;
- partial permission and provider unavailable;
- daylight-saving/time-zone boundary;
- empty successful read; and
- imported-data deletion preserving manual steps.

The implementation is not ready for a founder pilot until:

1. the web suite, lint and production build remain green;
2. native sync/build passes for both shells;
3. a simulator test demonstrates denied, partial and granted permission paths;
4. a real-device test confirms provider settings and revocation recovery;
5. Supabase RLS/advisor review confirms owner-only reads/writes and no exposed
   privileged function; and
6. the member-facing consent copy and data-use declaration are reviewed before
   any store submission.

## Follow-up Plane work items

Split implementation only after this design is accepted:

- **STEEL-113** — iOS HealthKit read-only bridge and simulator fixtures.
- **STEEL-114** — Android Health Connect read-only bridge and emulator fixtures.
- **STEEL-115** — Authenticated activity ingest, source selection and RLS
  integration tests.
- **STEEL-116** — Native connection UI, consent copy and settings/revocation
  recovery.

These IDs are proposed names for the next planning pass; they are not created
by this design task unless explicitly added in Plane.

## Sources checked

- Apple Developer, [Authorizing access to health data](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data).
- Android Developers, [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types).
- Android Developers, [Track steps](https://developer.android.com/health-and-fitness/health-connect/features/steps).
- Android Developers, [Health Connect architecture](https://developer.android.com/health-and-fitness/health-connect/architecture).

