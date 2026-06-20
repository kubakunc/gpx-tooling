import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velologiclabs.gpxtools',
  appName: 'GPX Editor',
  webDir: 'build',
  android: {
    allowMixedContent: false
  }
};

export default config;
