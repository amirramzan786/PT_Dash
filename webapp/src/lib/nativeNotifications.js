import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { buildNativeReminderSchedules, nativeReminderIds } from './reminders.js'

export function isNativeReminderRuntime() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications')
}

export async function getNativeReminderPermission() {
  if (!isNativeReminderRuntime()) return 'unsupported'
  try {
    const result = await LocalNotifications.checkPermissions()
    return result.display || 'prompt'
  } catch {
    return 'prompt'
  }
}

export async function requestNativeReminderPermission() {
  if (!isNativeReminderRuntime()) return 'unsupported'
  try {
    const result = await LocalNotifications.requestPermissions()
    return result.display || 'prompt'
  } catch {
    return 'denied'
  }
}

export async function syncNativeReminders(preferences, { requestPermission = false } = {}) {
  if (!isNativeReminderRuntime()) return { status: 'unsupported', count: 0 }

  let permission = await getNativeReminderPermission()
  if (permission !== 'granted' && requestPermission) permission = await requestNativeReminderPermission()
  if (permission !== 'granted') return { status: permission, count: 0 }

  try {
    await LocalNotifications.cancel({ notifications: nativeReminderIds().map(id => ({ id })) })
    const notifications = buildNativeReminderSchedules(preferences)
    if (!notifications.length) return { status: 'scheduled', count: 0 }
    try {
      await LocalNotifications.createChannel({
        id: 'steel-reminders',
        name: 'Steel reminders',
        description: 'Workout, meal and motivation reminders from Project Steel.',
        importance: 4,
        visibility: 1,
      })
    } catch {
      // Android channels are not available on iOS; scheduling remains valid.
    }
    const result = await LocalNotifications.schedule({ notifications })
    return { status: 'scheduled', count: notifications.length, warning: result.warning }
  } catch (error) {
    return { status: 'error', count: 0, error }
  }
}
