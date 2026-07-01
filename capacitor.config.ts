import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4736a6cd41bc4d12851a0e989c9c9dcd',
  appName: 'KONGOSSA',
  webDir: 'dist',
  backgroundColor: '#00C49A',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#00C49A',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
