import { localDay } from './steps.js'

export const reminderDefaults = {
  workout: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5] },
  meal: { enabled: false, time: '20:00' },
  motivation: { enabled: false, time: '08:00' },
}

export const reminderCopy = {
  workout: { title: 'Workout reminder', body: 'Your Project Steel workout is ready when you are.' },
  meal: { title: 'Meal completion reminder', body: 'Review what you ate and keep your diary current.' },
  motivation: { title: 'Morning motivation', body: 'Small steps today build a stronger you.' },
}

const nativeReminderBaseIds = { workout: 1100, meal: 1200, motivation: 1300 }
const everyDay = [0, 1, 2, 3, 4, 5, 6]

export function nativeReminderId(key, weekday) {
  return nativeReminderBaseIds[key] + weekday
}

export function nativeReminderIds() {
  return Object.keys(nativeReminderBaseIds).flatMap(key => everyDay.map(weekday => nativeReminderId(key, weekday)))
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

/**
 * Build the platform-neutral schedule descriptors consumed by Capacitor Local
 * Notifications. Weekday values use the plugin's 1=Sunday .. 7=Saturday
 * convention while stored preferences continue to use JavaScript's 0..6.
 */
export function buildNativeReminderSchedules(preferences) {
  return Object.entries(normalizeReminders(preferences)).flatMap(([key, value]) => {
    if (!value.enabled) return []
    const days = key === 'workout' ? value.days : everyDay
    const [hour, minute] = value.time.split(':').map(Number)
    return days.map(weekday => ({
      id: nativeReminderId(key, weekday),
      title: reminderCopy[key].title,
      body: reminderCopy[key].body,
      channelId: 'steel-reminders',
      extra: { reminder: key, weekday },
      schedule: { on: { weekday: weekday + 1, hour, minute }, allowWhileIdle: true },
    }))
  })
}
