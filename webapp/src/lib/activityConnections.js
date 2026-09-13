export const activityProviders = [
  { id: 'apple_health', name: 'Apple Health', description: 'iPhone + Apple Watch', availability: 'Planned for the native iPhone app' },
  { id: 'health_connect', name: 'Health Connect', description: 'Android health data', availability: 'Planned for the native Android app' },
  { id: 'samsung_health', name: 'Samsung Health', description: 'Galaxy Watch ecosystem', availability: 'Under consideration' },
  { id: 'garmin', name: 'Garmin Connect', description: 'Garmin watches', availability: 'Requires partner approval' },
  { id: 'fitbit', name: 'Fitbit', description: 'Fitbit devices', availability: 'Under consideration' },
  { id: 'oura', name: 'Oura', description: 'Sleep and recovery', availability: 'Under consideration' },
  { id: 'whoop', name: 'WHOOP', description: 'Recovery and activity', availability: 'Under consideration' },
]

export const activityProviderIds = activityProviders.map(({ id }) => id)

export function isActivityProvider(value) {
  return activityProviderIds.includes(String(value || '').trim().toLowerCase())
}

export function activityConnectionState(connection) {
  const status = String(connection?.status || 'not_connected').trim().toLowerCase()
  if (status === 'connected') return { label: 'Connected', tone: 'connected' }
  if (status === 'sync_issue') return { label: 'Sync issue', tone: 'issue' }
  if (status === 'disconnected') return { label: 'Disconnected', tone: 'disconnected' }
  return { label: 'Not connected', tone: 'not-connected' }
}

export function formatActivityTimestamp(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return null
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
