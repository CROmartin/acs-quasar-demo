import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.cordova.quasar.app',
  appName: 'Azure Communication',
  webDir: 'dist/spa',
  server: {
    androidScheme: 'https'
  }
};

export default config;
