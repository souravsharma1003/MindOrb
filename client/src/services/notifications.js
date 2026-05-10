import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import api from './api'

const isNative = Capacitor.isNativePlatform()

/**
 * Schedule a daily streak reminder at a given hour (24h).
 * Safe to call multiple times — cancels previous before scheduling.
 */
export async function scheduleDailyStreakReminder(hour = 20) {
  if (!isNative) return false

  const { display } = await LocalNotifications.requestPermissions()
  if (display !== 'granted') return false

  // Android requires channel to exist before scheduling
  await LocalNotifications.createChannel({
    id: 'streak-reminder',
    name: 'Streak Reminders',
    description: 'Daily reminder to keep your MindOrb streak alive',
    importance: 4,
    visibility: 1,
    sound: 'default',
    vibration: true,
    lights: true,
    lightColor: '#7c6af7',
  })

  // Cancel existing to prevent duplicates
  await LocalNotifications.cancel({ notifications: [{ id: 1001 }] })

  await LocalNotifications.schedule({
    notifications: [{
      id: 1001,
      title: '🔮 MindOrb',
      body: "Don't break your streak — 60 seconds of reflection waiting.",
      schedule: {
        on: { hour, minute: 0 },
        repeats: true,
        allowWhileIdle: true,
      },
      channelId: 'streak-reminder',
      smallIcon: 'ic_stat_orb',
    }],
  })
  return true
}

export async function cancelStreakReminder() {
  if (!isNative) return
  await LocalNotifications.cancel({ notifications: [{ id: 1001 }] })
}

/**
 * Register for push notifications and send token to server.
 * Call once after login.
 */
export async function initPushNotifications() {
  if (!isNative) return

  const { receive } = await PushNotifications.requestPermissions()
  if (receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async (token) => {
    try {
      await api.patch('/users/profile', { pushToken: token.value })
    } catch (_) { /* non-fatal */ }
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration failed:', err)
  })
}