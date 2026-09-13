import assert from 'node:assert/strict'
import test from 'node:test'
import { activitySourcePriority, dailyActivityHistory, localDay, normalizeActivityRecord, validateSteps, preferredActivity, preferredSteps, dailyStepHistory } from '../src/lib/steps.js'
import { normalizeReminders, dueReminders } from '../src/lib/reminders.js'

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

test('date keys use the local calendar date near midnight', () => {
  const now = new Date(2026, 8, 5, 0, 1)
  assert.equal(localDay(now), '2026-09-05')
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
