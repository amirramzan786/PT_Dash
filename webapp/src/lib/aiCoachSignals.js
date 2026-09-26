/**
 * Deterministic, insight-only signal rules for the backend Steel AI Coach
 * boundary. These functions never change a plan and deliberately return null
 * until there is enough recent evidence to ask a useful question.
 */
export function buildEffortRecoverySignal(aggregate = {}) {
  const training = aggregate.training || {}
  const checkin = aggregate.latest_checkin || {}
  const sessions = Number(training.logged_sessions_recent || 0)
  const recentRpe = Number(training.average_rpe_recent)
  const baselineRpe = Number(training.average_rpe_baseline)
  const energy = Number(checkin.energy)
  const soreness = Number(checkin.soreness)
  if (sessions < 3 || !Number.isFinite(recentRpe)) return null

  const elevatedEffort = recentRpe >= 7.5
  const risingEffort = Number.isFinite(baselineRpe) && recentRpe - baselineRpe >= 1.5
  const limitedRecovery = (Number.isFinite(energy) && energy <= 2) || (Number.isFinite(soreness) && soreness >= 4)
  if ((!elevatedEffort && !risingEffort) || !limitedRecovery) return null

  const signals = [`${sessions} sessions`, `recent effort ${recentRpe}/10`]
  if (Number.isFinite(baselineRpe)) signals.push(`baseline effort ${baselineRpe}/10`)
  if (Number.isFinite(energy)) signals.push(`energy ${energy}/5`)
  if (Number.isFinite(soreness)) signals.push(`soreness ${soreness}/5`)
  return {
    type: 'effort_recovery',
    confidence: 'Based on at least three recent sessions and your latest check-in',
    title: 'Your recent effort may need a closer look.',
    observation: `Steel recorded ${signals.join(' · ')}.`,
    uncertainty: 'This does not diagnose a problem or decide your plan; it is a prompt to check context before changing anything.',
    question: 'What best explains how training has felt lately?',
    options: ['Normal training fatigue', 'I need more recovery', 'The plan feels too hard', 'Not now'],
    signals,
  }
}

export function buildAdherenceSignals(aggregate = {}) {
  const training = aggregate.training || {}
  const nutrition = aggregate.nutrition || {}
  const recentSessions = Number(training.logged_sessions_recent || 0)
  const baselineSessions = Number(training.logged_sessions_baseline || 0)
  const recentMealDays = Number(nutrition.logged_days_recent || 0)
  const baselineMealDays = Number(nutrition.logged_days_baseline || 0)
  const signals = []

  // Counts are deliberately framed as prompts, never as a judgement. Require
  // a meaningful baseline and a clear change before surfacing anything.
  if (baselineSessions >= 3 && recentSessions <= baselineSessions - 2) {
    signals.push({
      type: 'training_consistency',
      confidence: 'Based on recent and baseline logged-session counts',
      title: 'Training consistency has dipped.',
      observation: `Steel recorded ${recentSessions} recent sessions versus ${baselineSessions} in the comparison window.`,
      uncertainty: 'A log cannot show whether time, energy, access or the plan itself was the barrier.',
      question: 'What got in the way of training?',
      options: ['Time or schedule', 'Energy or recovery', 'The plan needs changing', 'Not now'],
    })
  }
  if (baselineMealDays >= 4 && recentMealDays <= baselineMealDays - 2) {
    signals.push({
      type: 'nutrition_consistency',
      confidence: 'Based on recent and baseline meal-log day counts',
      title: 'Nutrition logging has become less consistent.',
      observation: `Steel recorded ${recentMealDays} recent logged days versus ${baselineMealDays} in the comparison window.`,
      uncertainty: 'Fewer logged days may reflect an intentional change or missing entries, not a change in eating.',
      question: 'What would make food logging easier this week?',
      options: ['A simpler plan', 'More flexible choices', 'A reminder', 'Not now'],
    })
  }
  return signals
}

export function buildWeeklyCoachReport(aggregate = {}) {
  const effort = buildEffortRecoverySignal(aggregate)
  const adherence = buildAdherenceSignals(aggregate)
  const signals = [effort, ...adherence].filter(Boolean)
  const priority = { effort_recovery: 1, training_consistency: 2, nutrition_consistency: 3 }
  signals.sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))
  return {
    schemaVersion: 'steel-ai-coach-weekly-v1',
    status: signals.length ? 'actionable' : 'no_actionable_signal',
    generatedAt: new Date().toISOString(),
    primary: signals[0] || null,
    signals,
    guardrails: ['read_only', 'member_context_required', 'no_automatic_plan_changes'],
  }
}

