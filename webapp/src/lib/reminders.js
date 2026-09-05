import { localDay } from './steps.js'

export const reminderDefaults = {
  workout: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5] },
  meal: { enabled: false, time: '20:00' },
  motivation: { enabled: false, time: '08:00' },
}

export function normalizeReminders(input) {
  return Object.fromEntries(Object.entries(reminderDefaults).map(([key, defaults]) => {
    const saved = input?.[key]
    const value = { enabled: saved?.enabled === true, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(saved?.time) ? saved.time : defaults.time }
    if (key === 'workout') value.days = Array.isArray(saved?.days) ? [...new Set(saved.days.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))] : [...defaults.days]
    return [key, value]
  }))
}

export function dueReminders(preferences, now = new Date(), sent = {}) {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return Object.entries(normalizeReminders(preferences)).filter(([key, value]) => value.enabled && value.time === time && sent[key] !== localDay(now) && (key !== 'workout' || value.days.includes(now.getDay()))).map(([key]) => key)
}
