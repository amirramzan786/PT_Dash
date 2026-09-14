# HealthKit bridge fixture

`sample-activity.json` is a deterministic, provider-neutral fixture for the
read-only HealthKit bridge contract. It is used by the web-side contract test;
it is not real health data and is not bundled into the production app.

The fixture deliberately contains only the two pilot metrics: `steps` and
`workout_minutes`. Every record includes a local time zone, observed timestamp,
and stable source record ID so the ingest layer can deduplicate safely.
