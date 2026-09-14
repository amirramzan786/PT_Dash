import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Development-only application identifier. Store registration, signing and
  // production package identifiers are intentionally handled in a later task.
  appId: 'uk.co.projectsteel.mobile',
  appName: 'Project Steel',
  webDir: 'dist',
  loggingBehavior: 'debug',
  android: {
    // Keep the WebView on a secure scheme without relaxing mixed-content rules.
    scheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    SystemBars: {
      // Capacitor injects the Android status/navigation insets as CSS
      // variables so the app content never sits underneath the system bars.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // The Steel shell is dark and edge-to-edge, so keep the system-bar
      // glyphs light enough to remain legible over the app background.
      style: 'DARK',
      hidden: false,
    },
  },
}

export default config
