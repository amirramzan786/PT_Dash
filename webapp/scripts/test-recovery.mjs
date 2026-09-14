import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { activitySourcePriority, buildImportedActivityRows, dailyActivityHistory, localDay, normalizeActivityRecord, normalizeImportedActivityRecord, sevenDayStepAverage, stepGoalProgress, validateDailyStepGoal, validateSteps, preferredActivity, preferredSteps, dailyStepHistory } from '../src/lib/steps.js'
import { buildNativeReminderSchedules, nativeReminderIds, normalizeReminders, dueReminders } from '../src/lib/reminders.js'
import { activityConnectionState, formatActivityTimestamp, isActivityProvider } from '../src/lib/activityConnections.js'

test('steps accept zero but reject blank, fractions, negative and excessive totals', () => {
  assert.equal(validateSteps('0'), 0)
  assert.equal(validateSteps('2222'), 2222)
  for (const value of ['', ' ', '-1', '12.5', 'NaN', Infinity, '200001']) assert.throws(() => validateSteps(value))
})

test('overlapping providers contribute exactly one daily total, with manual fallback', () => {
  const rows = [
    { step_date: '2026-09-04', steps: 2222, source: 'manual', synced_at: '2026-09-04T20:00:00Z' },
    { step_date: '2026-09-04', steps: 4000, source: 'apple_health', synced_at: '2026-09-04T18:00:00Z' },
    { step_date: '2026-09-04', steps: 5000, source: 'health_connect', synced_at: '2026-09-04T19:00:00Z' },
    { step_date: '2026-09-05', steps: 0, source: 'manual' },
  ]
  assert.equal(preferredSteps(rows.slice(0, 3)).steps, 5000)
  assert.deepEqual(dailyStepHistory(rows).map(row => row.steps), [5000, 0])
  assert.equal(preferredSteps([]), null)
})

test('activity model retains optional metrics and validates confidence', () => {
  assert.deepEqual(normalizeActivityRecord({ source: ' Apple_Health ', steps: '4200', distance_m: '3100', active_calories_kcal: null, workout_minutes: 45, confidence: '.9' }), {
    source: 'apple_health', steps: 4200, distance_m: 3100, active_calories_kcal: null, workout_minutes: 45, confidence: 0.9,
  })
  assert.throws(() => normalizeActivityRecord({ steps: -1 }))
  assert.throws(() => normalizeActivityRecord({ confidence: 1.1 }))
})

test('activity selection is deterministic and honours a chosen source', () => {
  const rows = [
    { step_date: '2026-09-06', steps: 4300, source: 'manual', synced_at: '2026-09-06T21:00:00Z' },
    { step_date: '2026-09-06', steps: 6200, source: 'garmin', confidence: 0.8, observed_at: '2026-09-06T20:00:00Z' },
    { step_date: '2026-09-06', steps: 6100, source: 'apple_health', confidence: 0.7, observed_at: '2026-09-06T19:00:00Z' },
  ]
  assert.equal(preferredActivity(rows).source, 'apple_health')
  assert.equal(preferredActivity(rows, { preferredSource: 'garmin' }).steps, 6200)
  assert.ok(activitySourcePriority('apple_health') > activitySourcePriority('manual'))
  assert.deepEqual(dailyActivityHistory(rows).map(row => row.steps), [6100])
})

test('native activity records are date-normalised, deduplicated and provider-scoped', () => {
  const rows = buildImportedActivityRows([
    { metric: 'steps', value: 4100, start_at: '2026-09-05T23:30:00Z', observed_at: '2026-09-06T00:00:00Z', time_zone: 'Europe/London', source_record_id: 'apple_health:2026-09-06:steps:v1', confidence: 0.9 },
    { metric: 'steps', value: 4100, start_at: '2026-09-05T23:30:00Z', observed_at: '2026-09-06T00:00:00Z', time_zone: 'Europe/London', source_record_id: 'apple_health:2026-09-06:steps:v1', confidence: 0.9 },
    { metric: 'workout_minutes', value: 45, start_at: '2026-09-06T12:00:00Z', observed_at: '2026-09-06T13:00:00Z', time_zone: 'Europe/London', source_record_id: 'apple_health:2026-09-06:workout_minutes:v1', confidence: 0.9 },
  ], 'apple_health')
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], {
    step_date: '2026-09-06', source: 'apple_health', steps: 4100, distance_m: null, active_calories_kcal: null, workout_minutes: 45,
    observed_at: '2026-09-06T13:00:00Z', timezone: 'Europe/London', confidence: 0.9,
    source_record_id: 'apple_health:2026-09-06:daily:v1',
    source_record_ids: ['apple_health:2026-09-06:steps:v1', 'apple_health:2026-09-06:workout_minutes:v1'],
  })
  assert.deepEqual(buildImportedActivityRows([], 'apple_health'), [])
  assert.throws(() => normalizeImportedActivityRecord({ metric: 'sleep', value: 1, step_date: '2026-09-06' }, 'apple_health'), /unsupported metric/i)
  assert.throws(() => normalizeImportedActivityRecord({ metric: 'steps', step_date: '2026-09-06' }, 'apple_health'), /value is required/i)
})

test('native activity dates honour the supplied IANA timezone across UTC boundaries', () => {
  const [row] = buildImportedActivityRows([{ metric: 'steps', value: 100, start_at: '2026-11-01T04:30:00Z', observed_at: '2026-11-01T05:00:00Z', time_zone: 'America/New_York' }], 'apple_health')
  assert.equal(row.step_date, '2026-11-01')
})

test('activity ingest migration closes the source vocabulary and scopes RLS to authenticated owners', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260914090000_activity_ingest_hardening.sql', import.meta.url), 'utf8')
  assert.match(migration, /daily_steps_source_allowed/)
  assert.match(migration, /for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.match(migration, /for update to authenticated[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/)
  assert.doesNotMatch(migration, /security definer/i)
})

test('step goals and seven-day averages make missing data explicit', () => {
  assert.deepEqual(stepGoalProgress(6250, 10000), { goal: 10000, completed: 63, remaining: 3750 })
  assert.throws(() => validateDailyStepGoal(999))
  const average = sevenDayStepAverage([{ step_date: '2026-09-01', steps: 4000, source: 'manual' }, { step_date: '2026-09-02', steps: 6000, source: 'manual' }])
  assert.deepEqual(average, { average: 5000, daysLogged: 2, total: 10000 })
})

test('date keys use the local calendar date near midnight', () => {
  const now = new Date(2026, 8, 5, 0, 1)
  assert.equal(localDay(now), '2026-09-05')
})

test('activity connection states are truthful and provider IDs are constrained', () => {
  assert.deepEqual(activityConnectionState(null), { label: 'Not connected', tone: 'not-connected' })
  assert.deepEqual(activityConnectionState({ status: 'connected' }), { label: 'Connected', tone: 'connected' })
  assert.deepEqual(activityConnectionState({ status: 'sync_issue' }), { label: 'Sync issue', tone: 'issue' })
  assert.deepEqual(activityConnectionState({ status: 'disconnected' }), { label: 'Disconnected', tone: 'disconnected' })
  assert.equal(isActivityProvider('garmin'), true)
  assert.equal(isActivityProvider('manual'), false)
  assert.match(formatActivityTimestamp('2026-09-13T09:15:00Z'), /13 Sept 2026/)
  assert.equal(formatActivityTimestamp('not-a-date'), null)
})

test('stored reminder preferences retain schedules and reject malformed fields', () => {
  const normalized = normalizeReminders({ workout: { enabled: true, time: '24:99', days: [1, 1, 9, '2'] }, meal: { enabled: true, time: '21:30' } })
  assert.deepEqual(normalized.workout, { enabled: true, time: '18:00', days: [1] })
  assert.deepEqual(normalized.meal, { enabled: true, time: '21:30' })
  assert.equal(normalized.motivation.enabled, false)
})

test('reminders respect selected days and deduplicate all three on the same day', () => {
  const now = new Date(2026, 8, 7, 18, 0)
  const settings = { workout: { enabled: true, time: '18:00', days: [1] }, meal: { enabled: true, time: '18:00' }, motivation: { enabled: true, time: '18:00' } }
  assert.deepEqual(dueReminders(settings, now), ['workout', 'meal', 'motivation'])
  const sent = Object.fromEntries(['workout', 'meal', 'motivation'].map(key => [key, localDay(now)]))
  assert.deepEqual(dueReminders(settings, now, sent), [])
  assert.deepEqual(dueReminders(settings, new Date(2026, 8, 8, 18, 0)), ['meal', 'motivation'])
  assert.deepEqual(dueReminders(settings, new Date(2026, 8, 7, 18, 1)), [])
})

test('native reminder schedules use stable IDs and device-local weekday semantics', () => {
  const schedules = buildNativeReminderSchedules({
    workout: { enabled: true, time: '07:05', days: [0, 2] },
    meal: { enabled: true, time: '20:30' },
    motivation: { enabled: false },
  })
  assert.deepEqual(schedules.slice(0, 2).map(({ id }) => id), [1100, 1102])
  assert.deepEqual(schedules[0].schedule, { on: { weekday: 1, hour: 7, minute: 5 }, allowWhileIdle: true })
  assert.equal(schedules.filter(({ extra }) => extra.reminder === 'meal').length, 7)
  assert.equal(new Set(nativeReminderIds()).size, nativeReminderIds().length)
  assert.equal(nativeReminderIds().length, 21)
})
