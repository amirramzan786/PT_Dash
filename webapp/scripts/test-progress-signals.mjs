import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeeklyNutritionAdherence, buildWeightTrend, startOfWeek } from '../src/lib/progressSignals.js'

test('weekly nutrition summary scores completed days only and leaves today in progress', () => {
  const summary = buildWeeklyNutritionAdherence([
    { meal_date: '2026-09-21', calories: 2050, protein_g: 171 },
    { meal_date: '2026-09-22', calories: 2255, protein_g: 154 },
    { meal_date: '2026-09-23', calories: 500, protein_g: 45 },
  ], { calories: 2050, protein_g: 170 }, '2026-09-23')

  assert.equal(startOfWeek('2026-09-23'), '2026-09-21')
  assert.equal(summary.elapsedDays, 3)
  assert.equal(summary.loggedDays, 3)
  assert.equal(summary.onTargetDays, 2)
  assert.equal(summary.scoredDays, 2)
  assert.equal(summary.adherencePercent, 100)
  assert.equal(summary.days[2].state, 'in-progress')
  assert.equal(summary.days[3].state, 'upcoming')
})

test('weekly nutrition summary counts missed past days without scoring today prematurely', () => {
  const summary = buildWeeklyNutritionAdherence([
    { meal_date: '2026-09-21', calories: 1800, protein_g: 120 },
  ], { calories: 2000, protein_g: 150 }, '2026-09-24')

  assert.equal(summary.scoredDays, 3)
  assert.equal(summary.onTargetDays, 0)
  assert.equal(summary.adherencePercent, 0)
  assert.equal(summary.days[1].state, 'missing')
  assert.equal(summary.days[3].state, 'today')
})

test('weight trend returns a weekly rate only when check-ins cover seven days', () => {
  const trend = buildWeightTrend([
    { checkin_date: '2026-08-25', weight_lb: 200 },
    { checkin_date: '2026-09-01', weight_lb: 198 },
    { checkin_date: '2026-09-08', weight_lb: 196 },
  ])

  assert.equal(trend.ready, true)
  assert.equal(trend.spanDays, 14)
  assert.ok(Math.abs(trend.weeklyRateLb + 2) < 0.01)
  assert.equal(trend.totalChangeLb, -4)

  const short = buildWeightTrend([
    { checkin_date: '2026-09-01', weight_lb: 200 },
    { checkin_date: '2026-09-03', weight_lb: 199.5 },
  ])
  assert.equal(short.ready, false)
  assert.match(short.reason, /seven days/i)
})
