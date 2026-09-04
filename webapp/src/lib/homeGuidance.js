function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function timeOfDay(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'MORNING'
  if (hour < 18) return 'AFTERNOON'
  return 'EVENING'
}

export function buildDailySummary({ now = new Date(), todaySteps = 0, latestSessionDate = null, hasWorkout = false }) {
  const trainedToday = latestSessionDate && dateKey(now) === String(latestSessionDate).slice(0, 10)
  const steps = Number(todaySteps) || 0
  if (trainedToday) return { eyebrow: `GOOD ${timeOfDay(now)},`, title: 'The work is done for today.', detail: 'Let the session settle. Recovery is part of the standard.' }
  if (steps >= 8000) return { eyebrow: `GOOD ${timeOfDay(now)},`, title: 'Movement is already in the bank.', detail: 'Keep the next decision useful: train with intent, or make space to recover.' }
  if (hasWorkout) return { eyebrow: `GOOD ${timeOfDay(now)},`, title: 'Your next session is ready.', detail: 'Make the next useful decision obvious. Start the work when you are ready.' }
  return { eyebrow: `GOOD ${timeOfDay(now)},`, title: 'Build the next useful step.', detail: 'Your data will become more useful as you train, check in and return.' }
}

export function buildTrainingRecommendation({ checkin = null, hasWorkout = false }) {
  const signalValue = (value) => value == null || value === '' ? Number.NaN : Number(value)
  const energy = signalValue(checkin?.energy)
  const sleep = signalValue(checkin?.sleep)
  const stress = signalValue(checkin?.stress)
  const soreness = signalValue(checkin?.soreness)
  const signals = []
  if (Number.isFinite(energy)) signals.push(`energy ${energy}/5`)
  if (Number.isFinite(sleep)) signals.push(`sleep ${sleep}/5`)
  if (Number.isFinite(stress)) signals.push(`stress ${stress}/5`)
  if (Number.isFinite(soreness)) signals.push(`soreness ${soreness}/5`)

  if ((Number.isFinite(energy) && energy <= 2) || (Number.isFinite(sleep) && sleep <= 2)) {
    return { mode: 'RECOVER', title: 'Protect the next session.', detail: `Recent check-in: ${signals.join(' · ')}. Keep today easy or take the recovery option.`, signals }
  }
  if ((Number.isFinite(stress) && stress >= 4) || (Number.isFinite(soreness) && soreness >= 4)) {
    return { mode: 'REDUCE', title: 'Keep the work controlled.', detail: `Recent check-in: ${signals.join(' · ')}. Reduce intensity or volume and leave something in reserve.`, signals }
  }
  if (signals.length) return { mode: 'TRAIN', title: 'The plan is ready to move.', detail: `Recent check-in: ${signals.join(' · ')}. Train as planned and keep every rep controlled.`, signals }
  if (hasWorkout) return { mode: 'TRAIN', title: 'Start with the plan.', detail: 'No recent check-in is available, so Steel is using your active session as the starting point.', signals: ['active plan'] }
  return { mode: 'RECOVER', title: 'Build your starting point.', detail: 'No active session or recent check-in is available yet. Add a workout or weekly check-in to make this signal more useful.', signals: ['limited data'] }
}
