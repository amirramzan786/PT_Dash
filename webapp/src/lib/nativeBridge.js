import { Capacitor } from '@capacitor/core'

/**
 * This is the single client-side seam between the shared Steel web experience
 * and future first-party native bridges. It intentionally registers no plugin,
 * asks for no permissions, and reads no device or health data.
 */
export function getNativeRuntime() {
  const platform = Capacitor.getPlatform()
  const isNative = Capacitor.isNativePlatform()

  return {
    platform,
    isNative,
    healthBridgeAvailable: false,
    reason: isNative
      ? 'The native shell is installed, but health integrations are not available yet.'
      : 'Native integrations are available only in the Project Steel mobile shell.',
  }
}

export function isNativeShell() {
  return getNativeRuntime().isNative
}
