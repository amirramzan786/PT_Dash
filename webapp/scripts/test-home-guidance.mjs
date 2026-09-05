import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDailySummary, buildTrainingRecommendation, dailyQuote } from '../src/lib/homeGuidance.js'

test('daily summary is time-aware and uses current training context', () => {
  const morning = buildDailySummary({ now: new Date(2026, 8, 4, 9), hasWorkout: true })
  assert.equal(morning.eyebrow, 'GOOD MORNING,')
  assert.equal(morning.title, 'Your next session is ready.')

  const evening = buildDailySummary({ now: new Date(2026, 8, 4, 20), latestSessionDate: '2026-09-04', hasWorkout: true })
  assert.equal(evening.eyebrow, 'GOOD EVENING,')
  assert.equal(evening.title, 'The work is done for today.')
})

test('the home quote is stable for a day and is used in the daily summary', () => {
  const date = new Date(2026, 8, 5, 14)
  const quote = dailyQuote(date)
  assert.equal(dailyQuote(new Date(2026, 8, 5, 20)), quote)
  assert.equal(buildDailySummary({ now: date, hasWorkout: true }).detail, quote)
})

test('recommendation explains the signal and changes mode conservatively', () => {
  const recover = buildTrainingRecommendation({ checkin: { energy: 2, sleep: 3, stress: 2, soreness: 2 }, hasWorkout: true })
  assert.equal(recover.mode, 'RECOVER')
  assert.match(recover.detail, /energy 2\/5/)

  const reduce = buildTrainingRecommendation({ checkin: { energy: 4, sleep: 4, stress: 4, soreness: 2 }, hasWorkout: true })
  assert.equal(reduce.mode, 'REDUCE')

  const train = buildTrainingRecommendation({ checkin: null, hasWorkout: true })
  assert.equal(train.mode, 'TRAIN')
  assert.match(train.detail, /active session/)

  const partial = buildTrainingRecommendation({ checkin: { energy: null, sleep: null }, hasWorkout: true })
  assert.equal(partial.mode, 'TRAIN')
})
