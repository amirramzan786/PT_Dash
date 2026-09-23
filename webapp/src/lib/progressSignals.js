function toLocalDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function fromDateKey(key) {
  const [year, month, day] = String(key).slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(key, amount) {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + amount)
  return toLocalDateKey(date)
}

function daysBetween(start, end) {
  const startDate = fromDateKey(start)
  const endDate = fromDateKey(end)
  return Math.round((endDate - startDate) / 86400000)
}

export function startOfWeek(dateKey = toLocalDateKey()) {
  const date = fromDateKey(dateKey)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return toLocalDateKey(date)
}

function nutritionDayIndex(dateKey) {
  return (fromDateKey(dateKey).getDay() + 6) % 7
}

function assignedNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : Number(fallback || 0)
}

export function nutritionTargetForDate(target, dateKey = toLocalDateKey()) {
  const trainingDays = [...new Set((Array.isArray(target?.training_day_indices) ? target.training_day_indices : [])
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
  const hasSplit = trainingDays.length > 0
    && Number(target?.training_calories) > 0
    && Number(target?.training_protein_g) > 0
    && Number(target?.rest_calories) > 0
    && Number(target?.rest_protein_g) > 0
  if (!hasSplit) return {
    kind: 'standard',
    calories: assignedNumber(target?.calories, 0),
    protein_g: assignedNumber(target?.protein_g, 0),
  }

  const kind = trainingDays.includes(nutritionDayIndex(dateKey)) ? 'training' : 'rest'
  return kind === 'training'
    ? { kind, calories: assignedNumber(target?.training_calories, target?.calories), protein_g: assignedNumber(target?.training_protein_g, target?.protein_g) }
    : { kind, calories: assignedNumber(target?.rest_calories, target?.calories), protein_g: assignedNumber(target?.rest_protein_g, target?.protein_g) }
}

export function buildWeeklyNutritionAdherence(entries, target, todayKey = toLocalDateKey()) {
  const start = startOfWeek(todayKey)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const logs = (entries || []).filter((entry) => String(entry.meal_date || '').slice(0, 10) === date)
    const calories = logs.reduce((total, entry) => total + Number(entry.calories || 0), 0)
    const protein = logs.reduce((total, entry) => total + Number(entry.protein_g || 0), 0)
    const assignedTarget = nutritionTargetForDate(target, date)
    const state = date > todayKey ? 'upcoming' : date === todayKey ? (logs.length ? 'in-progress' : 'today') : (logs.length ? 'logged' : 'missing')
    const calorieOnTarget = calories >= assignedTarget.calories * 0.9 && calories <= assignedTarget.calories * 1.1
    const proteinOnTarget = protein >= assignedTarget.protein_g * 0.9
    return {
      date,
      shortLabel: fromDateKey(date).toLocaleDateString('en-GB', { weekday: 'narrow' }),
      logs: logs.length,
      calories,
      protein,
      target: assignedTarget,
      state,
      onTarget: state === 'logged' && calorieOnTarget && proteinOnTarget,
    }
  })
  const elapsed = days.filter((day) => day.date <= todayKey)
  const completed = days.filter((day) => day.date < todayKey)
  const loggedDays = elapsed.filter((day) => day.logs > 0)
  const onTargetDays = completed.filter((day) => day.onTarget)
  const scoredDays = completed.length
  const adherencePercent = scoredDays ? Math.round((onTargetDays.length / scoredDays) * 100) : null
  return {
    start,
    end: addDays(start, 6),
    days,
    elapsedDays: elapsed.length,
    loggedDays: loggedDays.length,
    onTargetDays: onTargetDays.length,
    scoredDays,
    adherencePercent,
    target: nutritionTargetForDate(target, todayKey),
  }
}

export function buildWeightTrend(entries, { windowDays = 28 } = {}) {
  const points = (entries || [])
    .map((entry) => ({ date: String(entry.checkin_date || '').slice(0, 10), weight: Number(entry.weight_lb) }))
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && Number.isFinite(entry.weight))
    .sort((left, right) => left.date.localeCompare(right.date))
  if (points.length < 2) return { ready: false, points, reason: 'Log two check-ins to start a weekly trend.' }

  const latestDate = points[points.length - 1].date
  const cutoff = addDays(latestDate, -(Math.max(7, windowDays) - 1))
  const windowed = points.filter((point) => point.date >= cutoff)
  const first = windowed[0]
  const last = windowed[windowed.length - 1]
  const spanDays = daysBetween(first.date, last.date)
  if (windowed.length < 2 || spanDays < 7) return { ready: false, points: windowed, reason: 'Add check-ins at least seven days apart to show a weekly rate.' }

  const xMean = windowed.reduce((total, point) => total + daysBetween(first.date, point.date), 0) / windowed.length
  const yMean = windowed.reduce((total, point) => total + point.weight, 0) / windowed.length
  const denominator = windowed.reduce((total, point) => {
    const distance = daysBetween(first.date, point.date) - xMean
    return total + distance * distance
  }, 0)
  const slopePerDay = denominator ? windowed.reduce((total, point) => {
    const xDistance = daysBetween(first.date, point.date) - xMean
    return total + xDistance * (point.weight - yMean)
  }, 0) / denominator : 0
  return {
    ready: true,
    points: windowed,
    from: first.date,
    to: last.date,
    spanDays,
    weeklyRateLb: slopePerDay * 7,
    totalChangeLb: last.weight - first.weight,
  }
}
