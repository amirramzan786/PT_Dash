export function localDay(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function validateSteps(value) {
  if (String(value).trim() === '') throw new Error('Enter today’s step total.')
  const steps = Number(value)
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 200000) throw new Error('Enter a whole number between 0 and 200,000.')
  return steps
}

export const activityMetrics = ['steps', 'distance_m', 'active_calories_kcal', 'workout_minutes']

const sourcePriorities = {
  manual: 10,
  apple_health: 80,
  health_connect: 80,
  samsung_health: 70,
  garmin: 70,
  fitbit: 70,
  oura: 60,
  whoop: 60,
}

function validOptionalMetric(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const metric = Number(value)
  if (!Number.isSafeInteger(metric) || metric < 0) throw new Error(`${label} must be a whole number of zero or more.`)
  return metric
}

// Produces a safe, predictable object for current daily totals and future
// imported summaries. Null means that a provider did not supply that metric.
export function normalizeActivityRecord(record = {}) {
  const source = String(record.source || 'manual').trim().toLowerCase() || 'manual'
  const confidence = record.confidence === undefined || record.confidence === null || record.confidence === '' ? null : Number(record.confidence)
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw new Error('Activity confidence must be between 0 and 1.')

  return {
    ...record,
    source,
    steps: validOptionalMetric(record.steps, 'Steps'),
    distance_m: validOptionalMetric(record.distance_m, 'Distance'),
    active_calories_kcal: validOptionalMetric(record.active_calories_kcal, 'Active calories'),
    workout_minutes: validOptionalMetric(record.workout_minutes, 'Workout minutes'),
    confidence,
  }
}

export function activitySourcePriority(source, preferredSource = null) {
  const normalisedSource = String(source || 'manual').trim().toLowerCase() || 'manual'
  const preferred = String(preferredSource || '').trim().toLowerCase()
  return (normalisedSource === preferred ? 1000 : 0) + (sourcePriorities[normalisedSource] || 50)
}

function newestTimestamp(record) {
  return String(record.observed_at || record.synced_at || record.updated_at || '')
}

// Providers can overlap. Select one complete daily total rather than summing
// sources; a saved user preference wins, followed by source class, confidence
// and the newest provider observation. This preserves the existing manual
// fallback behaviour while making future provider selection deterministic.
export function preferredActivity(rows = [], { preferredSource = null } = {}) {
  return [...rows].map(normalizeActivityRecord).sort((a, b) => {
    const priority = activitySourcePriority(b.source, preferredSource) - activitySourcePriority(a.source, preferredSource)
    if (priority) return priority
    const confidence = Number(b.confidence ?? 0) - Number(a.confidence ?? 0)
    if (confidence) return confidence
    const timestamp = newestTimestamp(b).localeCompare(newestTimestamp(a))
    if (timestamp) return timestamp
    return String(a.source_record_id || a.source || '').localeCompare(String(b.source_record_id || b.source || ''))
  })[0] ?? null
}

// Compatibility wrapper for the deployed Home and Progress reads.
export function preferredSteps(rows = []) {
  return preferredActivity(rows)
}

export function dailyActivityHistory(rows = [], options = {}) {
  const days = new Map()
  for (const row of rows) days.set(row.step_date, [...(days.get(row.step_date) || []), row])
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([step_date, records]) => ({ step_date, ...preferredActivity(records, options) }))
}

export function dailyStepHistory(rows = []) {
  return dailyActivityHistory(rows)
}
