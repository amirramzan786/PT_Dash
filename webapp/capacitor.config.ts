import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.projectsteel.app',
  appName: 'Project Steel',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
