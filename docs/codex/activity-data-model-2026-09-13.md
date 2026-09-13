# Sprint 01 activity data model

Status: implementation contract prepared locally; no migration has been applied
to production and no provider connection is live.

## Purpose

Steel needs one explainable daily view of a member's activity without adding
overlapping totals from a phone, watch and manual entry. The existing
`daily_steps` table remains the compatibility surface for the Home and Progress
pages. This contract extends it rather than replacing it.

## Daily activity record

One record is a provider's summary for one user, one local calendar day and one
source. `daily_steps` stores the following values:

| Field | Meaning |
| --- | --- |
| `user_id`, `step_date`, `source` | Existing identity. The unique tuple stays one daily total per provider. |
| `steps` | Required non-negative step total; retained for the deployed experience. |
| `distance_m`, `active_calories_kcal`, `workout_minutes` | Optional non-negative metrics. `null` means the source did not supply a value. |
| `source_record_id` | Stable provider aggregate identifier used to make an import idempotent. |
| `observed_at`, `synced_at`, `timezone` | Separate measurement timing from the time Steel received it. |
| `confidence` | Optional value from 0 to 1. It describes data quality, not medical certainty. |

The migration adds a partial unique index on `(user_id, source,
source_record_id)` only when the provider supplies an identifier. Existing and
manual rows remain valid.

## Connection and consent lifecycle

`activity_connections` is a separate owner-scoped table. It holds the provider,
connection state, granted scopes, consent time, sync/error times, disconnect
time and the time imported data was deleted. The UI may say **Connect**, but the
stored state is one of `not_connected`, `connected`, `sync_issue` or
`disconnected`.

No token, refresh token or raw provider payload belongs in this table. Provider
credentials must remain server-side when a native integration is approved.

## Source selection and deduplication

Steel selects one complete daily total; it never sums daily totals from multiple
providers. A member's future preferred source wins. Otherwise the deterministic
order is native health sources, other connected providers, unknown providers,
then manual entry. Within a source class, higher confidence and the newest
provider observation win. This preserves the deployed manual fallback while
preventing obvious phone/watch double counting.

Raw-event-level deduplication is intentionally deferred until native bridges
exist. The future importer must use `source_record_id`, provider event identity
where available, a local-day/timezone boundary, and the selected-source rule
above before writing a daily total.

## Privacy and product boundary

Activity data is private account data: RLS permits only the owning authenticated
member to read or change records. A connection must not be presented as active
until explicit consent, the native bridge and provider approval are in place.
Disconnect and imported-data deletion are distinct actions; the later Sprint 01
UI must make this clear before removing data. The model supports fitness
tracking only and does not make diagnostic or injury-prediction claims.

## Verification and next slice

The prepared migration was checked against production's read-only baseline:
`daily_steps` currently has owner RLS, a unique `(user_id, step_date, source)`
key and the existing manual fields; no activity connection table exists. The
model helper tests cover optional metrics, confidence validation and
deterministic source selection. The next work item is `STEEL-27`: surface a
seven-day average and user goal using this model, while keeping migration
application and deployment separately authorised.
