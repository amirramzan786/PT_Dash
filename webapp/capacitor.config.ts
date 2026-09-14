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
}

export default config
