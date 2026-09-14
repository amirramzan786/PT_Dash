import { Capacitor, registerPlugin } from '@capacitor/core'

const webHealthKit = {
  isAvailable: async () => ({ available: false, reason: 'HealthKit is available only in the native iOS app.' }),
  requestAuthorization: async () => ({ granted: false, deniedScopes: ['steps', 'workout_minutes'] }),
  readActivity: async () => { throw new Error('HealthKit is available only in the native iOS app.') },
  openSettings: async () => undefined,
}

export const SteelHealthKit = registerPlugin('SteelHealthKit', { web: () => webHealthKit })

/**
 * This is the single client-side seam between the shared Steel web experience
 * and first-party native bridges. The web implementation is an explicit
 * unavailable fallback; only the native iOS shell can read health data.
 */
export function getNativeRuntime() {
  const platform = Capacitor.getPlatform()
  const isNative = Capacitor.isNativePlatform()

  return {
    platform,
    isNative,
    healthBridgeAvailable: isNative && Capacitor.isPluginAvailable('SteelHealthKit'),
    reason: isNative
      ? 'The native shell exposes the read-only HealthKit bridge.'
      : 'Native integrations are available only in the Project Steel mobile shell.',
  }
}

export function isNativeShell() {
  return getNativeRuntime().isNative
}
