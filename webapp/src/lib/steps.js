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

export const activityMetrics = ['steps', 'distance_m', 'active_calories_kcal', 'workout_minutes']

const importedMetricNames = new Set(activityMetrics)

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

function datePartsForZone(value, timeZone) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Activity record has an invalid timestamp.')
  if (!timeZone || typeof timeZone !== 'string') throw new Error('Activity record requires an IANA time zone.')
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

/**
 * Converts a provider-neutral metric record from a native bridge into the
 * validated shape used by the authenticated daily_steps ingest boundary.
 * The provider is supplied by the connection, never trusted from the record.
 */
export function normalizeImportedActivityRecord(record = {}, provider) {
  const source = String(provider || '').trim().toLowerCase()
  if (!source) throw new Error('Activity provider is required.')
  const metric = String(record.metric || '').trim().toLowerCase()
  if (!importedMetricNames.has(metric)) throw new Error('Activity record contains an unsupported metric.')
  const value = record.value
  const normalized = normalizeActivityRecord({ source, [metric]: value, confidence: record.confidence })
  const timeZone = String(record.time_zone || record.timezone || '').trim()
  const stepDate = String(record.step_date || record.local_day || record.day || '').trim() || datePartsForZone(record.start_at || record.observed_at, timeZone)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stepDate)) throw new Error('Activity record has an invalid local date.')
  return {
    source,
    metric,
    value: normalized[metric],
    step_date: stepDate,
    source_record_id: String(record.source_record_id || '').trim() || null,
    observed_at: record.observed_at || null,
    timezone: timeZone || null,
    confidence: normalized.confidence,
  }
}

/**
 * Groups native metric records into one daily row per provider. Native bridges
 * already aggregate samples by day; repeated metric IDs are therefore
 * idempotent replacements, with the newest observation winning.
 */
export function buildImportedActivityRows(records = [], provider) {
  if (!Array.isArray(records)) throw new Error('Activity records must be an array.')
  const groups = new Map()
  for (const input of records) {
    const record = normalizeImportedActivityRecord(input, provider)
    const key = record.step_date
    const current = groups.get(key) || { step_date: key, source: record.source, steps: null, distance_m: null, active_calories_kcal: null, workout_minutes: null, observed_at: null, timezone: null, confidence: null, source_record_ids: new Set() }
    const currentObserved = current.observed_at ? new Date(current.observed_at).getTime() : -Infinity
    const incomingObserved = record.observed_at ? new Date(record.observed_at).getTime() : -Infinity
    if (current[record.metric] === null || incomingObserved >= currentObserved) current[record.metric] = record.value
    if (record.observed_at && incomingObserved >= currentObserved) {
      current.observed_at = record.observed_at
      current.timezone = record.timezone
      current.confidence = record.confidence
    }
    if (record.source_record_id) current.source_record_ids.add(record.source_record_id)
    groups.set(key, current)
  }
  return [...groups.values()].sort((a, b) => a.step_date.localeCompare(b.step_date)).map((row) => ({
    ...row,
    steps: row.steps ?? 0,
    source_record_id: `${row.source}:${row.step_date}:daily:v1`,
    source_record_ids: [...row.source_record_ids].sort(),
  }))
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

// Missing dates mean Steel has no total for that day, rather than zero activity.
// The UI therefore labels this as a logged average and reports the sample size.
export function sevenDayStepAverage(rows = []) {
  const recent = dailyStepHistory(rows).slice(-7)
  const total = recent.reduce((sum, row) => sum + Number(row.steps || 0), 0)
  return { average: recent.length ? Math.round(total / recent.length) : 0, daysLogged: recent.length, total }
}
