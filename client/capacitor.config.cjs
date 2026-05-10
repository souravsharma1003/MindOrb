/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.mindorb.app',
  appName: 'MindOrb',
  webDir: 'dist',

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#08080f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#08080f',
      overlaysWebView:false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_orb',
      iconColor: '#7c6af7',
    },
  },
}

module.exports = config