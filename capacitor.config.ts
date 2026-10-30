import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jpeza.chesstrainer',
  appName: 'Chess Grandmaster AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
