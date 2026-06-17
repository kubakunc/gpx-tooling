import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velologiclabs.gpxtools',
  appName: 'GPX Tooling Suite',
  webDir: 'build',
  android: {
    allowMixedContent: false
  }
};

export default config;
