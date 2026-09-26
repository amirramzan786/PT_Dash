/** Shared contracts for the Coach client record workspace. */

export const COACH_CLIENT_DETAIL_TABS = Object.freeze([
  Object.freeze({ id: 'overview', label: 'Overview' }),
  Object.freeze({ id: 'checkins', label: 'Check-ins' }),
  Object.freeze({ id: 'progress', label: 'Progress' }),
  Object.freeze({ id: 'notes', label: 'Notes' }),
])

function timestamp(value) {
  const result = new Date(value || 0).getTime()
  return Number.isFinite(result) ? result : 0
}

export function buildCheckinTimeline(current, history = []) {
  const entries = [current, ...(Array.isArray(history) ? history : [])].filter(Boolean)
  const seen = new Set()
  return entries
    .filter((entry) => {
      const key = entry.id || entry.week_start
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => timestamp(b.week_start || b.submitted_at) - timestamp(a.week_start || a.submitted_at))
}

export function checkinReviewKey(clientId, weekStart) {
  return `${clientId || 'client'}:${weekStart || 'unknown'}`
}

export function normaliseReviewMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, reviewed]) => key && reviewed === true))
}

export function normaliseCoachNote(value, maxLength = 2400) {
  return String(value || '').trim().slice(0, maxLength)
}

/**
 * Build conservative, coach-facing prompts from the two newest consented
 * check-ins. This is insight-only: it never changes a member plan or labels a
 * health condition, and it stays neutral when there is not enough evidence.
 */
export function buildClientCoachInsights(timeline = []) {
  const entries = Array.isArray(timeline) ? timeline.filter(Boolean) : []
  if (entries.length < 2) return { status: 'insufficient_data', signals: [], comparedWeeks: entries.length }

  const recent = entries[0]
  const previous = entries[1]
  const number = (value) => value === '' || value === null || value === undefined ? Number.NaN : Number(value)
  const signals = []
  const recentWorkouts = number(recent.workouts_completed)
  const previousWorkouts = number(previous.workouts_completed)
  if (Number.isFinite(recentWorkouts) && Number.isFinite(previousWorkouts) && recentWorkouts <= previousWorkouts - 2) {
    signals.push({
      id: 'training_dip',
      title: 'Training volume dipped this week.',
      summary: `${recentWorkouts} logged workouts versus ${previousWorkouts} in the previous check-in.`,
      detail: 'A check-in cannot show whether time, access, energy or the plan itself was the barrier. Ask before adjusting anything.',
      confidence: 'Based on two consecutive submitted check-ins',
    })
  }
  const recentNutrition = number(recent.nutrition_days)
  const previousNutrition = number(previous.nutrition_days)
  if (Number.isFinite(recentNutrition) && Number.isFinite(previousNutrition) && recentNutrition <= previousNutrition - 2) {
    signals.push({
      id: 'nutrition_dip',
      title: 'Nutrition logging dipped this week.',
      summary: `${recentNutrition}/7 logged days versus ${previousNutrition}/7 previously.`,
      detail: 'Fewer logged days may reflect missing entries or an intentional change, not a change in eating. Use this as a conversation prompt.',
      confidence: 'Based on two consecutive submitted check-ins',
    })
  }
  const recentEnergy = number(recent.energy)
  const previousEnergy = number(previous.energy)
  if (Number.isFinite(recentEnergy) && Number.isFinite(previousEnergy) && recentEnergy <= previousEnergy - 2) {
    signals.push({
      id: 'energy_dip',
      title: 'Self-reported energy is lower.',
      summary: `Energy moved from ${previousEnergy}/5 to ${recentEnergy}/5.`,
      detail: 'Energy is a client-reported context signal, not a diagnosis. Ask what changed before making a coaching decision.',
      confidence: 'Based on two consecutive submitted check-ins',
    })
  }
  const recentSoreness = number(recent.soreness)
  if (Number.isFinite(recentSoreness) && recentSoreness >= 4) {
    signals.push({
      id: 'soreness_context',
      title: 'Soreness is elevated.',
      summary: `The latest check-in records ${recentSoreness}/5 soreness.`,
      detail: 'Review movement quality and recovery context with the client. This prompt does not diagnose injury or prescribe a deload.',
      confidence: 'Based on the latest submitted check-in',
    })
  }
  return {
    status: signals.length ? 'actionable' : 'no_actionable_signal',
    signals,
    comparedWeeks: 2,
    guardrails: ['read_only', 'consented_checkins_only', 'no_automatic_plan_changes'],
  }
}

