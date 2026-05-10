import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

// Only fires on real Android/iOS — silently no-ops in browser
const isNative = Capacitor.isNativePlatform()

/**
 * Light tap — fires on every word submit
 */
export async function wordSubmitHaptic() {
  if (!isNative) return
  await Haptics.impact({ style: ImpactStyle.Light })
}

/**
 * Scales with emotion intensity — called after orb reacts
 * @param {number} intensity  0.0 – 1.0
 */
export async function orbReactionHaptic(intensity = 0.5) {
  if (!isNative) return
  const style =
    intensity > 0.75 ? ImpactStyle.Heavy  :
    intensity > 0.40 ? ImpactStyle.Medium :
                       ImpactStyle.Light
  await Haptics.impact({ style })
}

/**
 * Success pulse — fires when all 10 words are done and story starts generating
 */
export async function sessionCompleteHaptic() {
  if (!isNative) return
  await Haptics.notification({ type: NotificationType.Success })
}

/**
 * Error buzz — fires on word validation failure
 */
export async function validationErrorHaptic() {
  if (!isNative) return
  await Haptics.notification({ type: NotificationType.Error })
}