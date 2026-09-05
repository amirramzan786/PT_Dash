export function localDay(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function validateSteps(value) {
  if (String(value).trim() === '') throw new Error('Enter today’s step total.')
  const steps = Number(value)
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 200000) throw new Error('Enter a whole number between 0 and 200,000.')
  return steps
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
