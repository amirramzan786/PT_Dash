import assert from 'node:assert/strict'
import test from 'node:test'
import { localDay, validateSteps, preferredSteps, dailyStepHistory } from '../src/lib/steps.js'
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
