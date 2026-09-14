import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAiCoachInsight, buildDailySummary, buildExerciseDropoffInsight, buildNutritionConsistencyInsight, buildTrainingConsistencyInsight, buildTrainingRecommendation, dailyQuote } from '../src/lib/homeGuidance.js'

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

test('AI Coach insight is explainable, bounded and absent without an eligible signal', () => {
  const insight = buildAiCoachInsight({ checkin: { energy: 2, sleep: 3, stress: 2, soreness: 2 }, hasWorkout: true })
  assert.equal(insight.type, 'recovery_context')
  assert.match(insight.observation, /energy 2\/5/)
  assert.equal(insight.options.at(-1), 'Not now')
  assert.equal(buildAiCoachInsight({ checkin: { energy: 4, sleep: 4 }, hasWorkout: true }), null)
  assert.equal(buildAiCoachInsight({ checkin: null, hasWorkout: true }), null)
})

test('AI Coach signal contracts stay conservative with sparse data', () => {
  const missed = buildTrainingConsistencyInsight({ plannedSessions: [{ logged: false }, { logged: true }, { logged: false }] })
  assert.equal(missed.type, 'training_consistency')
  assert.match(missed.uncertainty, /can’t tell/i)
  assert.equal(buildTrainingConsistencyInsight({ plannedSessions: [{ logged: false }] }), null)

  const skipped = buildExerciseDropoffInsight({ exerciseName: 'Barbell row', appearances: [true, false, false] })
  assert.equal(skipped.type, 'exercise_dropoff')
  assert.equal(buildExerciseDropoffInsight({ appearances: [false, false] }), null)

  const nutrition = buildNutritionConsistencyInsight({ recentDays: 3, baselineDays: 6 })
  assert.equal(nutrition, null)
  assert.equal(buildNutritionConsistencyInsight({ recentDays: 4, baselineDays: 8 }).type, 'nutrition_consistency')
})
