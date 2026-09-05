export function localDay(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function validateSteps(value) {
  if (String(value).trim() === '') throw new Error('Enter today’s step total.')
  const steps = Number(value)
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 200000) throw new Error('Enter a whole number between 0 and 200,000.')
  return steps
}

export function validateDailyStepGoal(value) {
  const goal = Number(value)
  if (!Number.isSafeInteger(goal) || goal < 1000 || goal > 100000) throw new Error('Choose a whole-number daily goal between 1,000 and 100,000 steps.')
  return goal
}

export function stepGoalProgress(steps, goal = 10000) {
  const safeGoal = validateDailyStepGoal(goal)
  const safeSteps = Math.max(0, Number(steps) || 0)
  return { goal: safeGoal, completed: Math.min(100, Math.round((safeSteps / safeGoal) * 100)), remaining: Math.max(0, safeGoal - safeSteps) }
}

// Provider totals overlap. Choose one total per day, preferring connected data.
export function preferredSteps(rows = []) {
  return [...rows].sort((a, b) => {
    const priority = Number(b.source !== 'manual') - Number(a.source !== 'manual')
    return priority || String(b.synced_at || '').localeCompare(String(a.synced_at || ''))
  })[0] ?? null
}

export function dailyStepHistory(rows = []) {
  const days = new Map()
  for (const row of rows) days.set(row.step_date, [...(days.get(row.step_date) || []), row])
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([step_date, records]) => ({ step_date, ...preferredSteps(records) }))
}
