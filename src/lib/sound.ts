/**
 * Sound effects using Web Audio API synthesis
 * Bell chime for completion events
 */

import { getCachedUserData } from './userService'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Play a bell chime sound - major triad (C5-E5-G5) with exponential decay
 */
export function playSuccessSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const volume = 0.15
  const duration = 0.5

  // C5, E5, G5 frequencies
  const frequencies = [523.25, 659.25, 783.99]

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    // Stagger slightly for a richer chime
    const startTime = now + i * 0.03
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.05)
  })
}

/**
 * Play a short celebratory sound for achievement unlocks
 * Rising arpeggio (C5-E5-G5-C6) with a brighter timbre
 */
export function playCelebrationSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const volume = 0.12
  const noteDuration = 0.25

  // Rising arpeggio: C5, E5, G5, C6
  const frequencies = [523.25, 659.25, 783.99, 1046.5]

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq

    const startTime = now + i * 0.1
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + noteDuration + 0.05)
  })
}

/**
 * Play celebration sound only if sound is enabled in user preferences
 */
export function playCelebrationSoundIfEnabled(): void {
  const cached = getCachedUserData()
  const soundEnabled = cached?.preferences?.soundEnabled ?? true
  if (soundEnabled) {
    playCelebrationSound()
  }
}

/**
 * Play success sound only if sound is enabled in user preferences
 */
export function playSuccessSoundIfEnabled(): void {
  const cached = getCachedUserData()
  const soundEnabled = cached?.preferences?.soundEnabled ?? true
  if (soundEnabled) {
    playSuccessSound()
  }
}
