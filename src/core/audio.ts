// Web Audio API — buy SFX with diatonic scale tones per tier

let audioCtx: AudioContext | null = null
let muted = false
let volume = 0.7 // 0..1, set from settings (see settingsSync.ts)

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export function setMuted(value: boolean) {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

export function setVolume(value: number) {
  volume = Math.max(0, Math.min(1, value))
}

// C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
const TIER_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88]

/** Play a short pluck tone for a tier purchase (1-indexed tierId) */
export function playBuySound(tierId: number) {
  if (muted) return
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    const freq = TIER_FREQUENCIES[(tierId - 1) % TIER_FREQUENCIES.length]
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.15 * volume, ctx.currentTime + 0.02) // 20ms attack
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2) // 200ms decay

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    // Silently fail if audio not available
  }
}

/** Play a short ascending arpeggio for tempo upgrades */
export function playTempoSound() {
  if (muted) return
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    const notes = [261.63, 329.63, 392.0] // C E G
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      const startTime = ctx.currentTime + i * 0.06
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.1 * volume, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.2)
    })
  } catch {
    // Silently fail
  }
}

/** Play a chord for prestige actions */
export function playPrestigeSound() {
  if (muted) return
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    const chord = [261.63, 329.63, 392.0, 523.25] // C E G C5
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.08 * volume, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.85)
    })
  } catch {
    // Silently fail
  }
}
