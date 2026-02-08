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
 * Play success sound only if sound is enabled in user preferences
 */
export function playSuccessSoundIfEnabled(): void {
  const cached = getCachedUserData()
  const soundEnabled = cached?.preferences?.soundEnabled ?? true
  if (soundEnabled) {
    playSuccessSound()
  }
}
