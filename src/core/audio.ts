// Web Audio API — a small warm-hall synth for Sonance.
//
// Everything routes through one master bus with a light generated reverb, so a tap sounds like an
// instrument in a room rather than a bare beep. All tones are drawn from the game's C-major palette
// so the whole game stays musically consonant no matter how fast you play.
//
// Public surface is backward-compatible: playBuySound / playTempoSound / playPrestigeSound +
// setMuted / isMuted / setVolume are unchanged in name; the new SFX (conduct, crescendo, achievement,
// challenge, milestone, story) are additive.

let audioCtx: AudioContext | null = null
let master: GainNode | null = null
let reverbSend: GainNode | null = null
let muted = false
let volume = 0.7 // 0..1, set from settings (see settingsSync.ts)

// Ambient music bed (generative pad) — its own gain so it levels/mutes independently of SFX.
let musicGain: GainNode | null = null
let musicOn = false
let musicVolume = 0.45
let musicTimer: ReturnType<typeof setTimeout> | null = null
let musicStep = 0

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    buildBus(audioCtx)
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

/** Master gain → light reverb send → destination. Built once per context. */
function buildBus(ctx: AudioContext) {
  master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)

  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1.6, 2.4)
  reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.16 // subtle hall, not a cathedral
  reverbSend.connect(convolver)
  convolver.connect(master)

  musicGain = ctx.createGain()
  musicGain.gain.value = 0 // faded up by applyMusicGain() when the bed starts
  musicGain.connect(master)
}

/** A decaying white-noise impulse response — a cheap, decent reverb tail. */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

export function setMuted(value: boolean) {
  muted = value
  applyMusicGain() // mute silences the bed too
}

export function isMuted(): boolean {
  return muted
}

export function setVolume(value: number) {
  volume = Math.max(0, Math.min(1, value))
}

type NoteOpts = {
  type?: OscillatorType
  dur?: number // total time to the silent floor
  gain?: number // pre-volume peak (0..~0.3)
  attack?: number
  when?: number // offset from now
  detune?: number
  reverb?: number // 0..1 send amount, scales reverbSend
}

/** Play one enveloped note through the bus (master + reverb send). */
function playNote(freq: number, opts: NoteOpts = {}) {
  const ctx = getContext()
  if (!master || !reverbSend) return
  const t = ctx.currentTime + (opts.when ?? 0)
  const dur = opts.dur ?? 0.3
  const attack = opts.attack ?? 0.012
  const peak = (opts.gain ?? 0.12) * volume

  const osc = ctx.createOscillator()
  osc.type = opts.type ?? 'triangle' // triangle = warmer/fuller than a bare sine
  osc.frequency.value = freq
  if (opts.detune) osc.detune.value = opts.detune

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)

  osc.connect(g)
  g.connect(master)

  if (opts.reverb !== 0) {
    const send = ctx.createGain()
    send.gain.value = opts.reverb ?? 1
    g.connect(send)
    send.connect(reverbSend)
  }

  osc.start(t)
  osc.stop(t + dur + 0.05)
}

/** Play several notes together (a chord). */
function playChord(freqs: number[], opts: NoteOpts = {}) {
  freqs.forEach((f) => playNote(f, opts))
}

// Rate-limit the rapid-fire SFX (held buy hotkeys, max-all, fast clicking) so dense input doesn't
// stack into a clipping mush. ponytail: a per-sound min-interval, not a full voice pool.
const lastPlayAt: Record<string, number> = {}
function gate(key: string, minMs: number): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if ((lastPlayAt[key] ?? -Infinity) + minMs > now) return false
  lastPlayAt[key] = now
  return true
}

// --- Note table -------------------------------------------------------------
// C-major across two octaves. Index 0 = C4.
// C4    D4     E4     F4     G4     A4     B4     C5     D5     E5     G5
const C = 261.63
const SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99]
const TIER_FREQUENCIES = SCALE.slice(0, 7) // one diatonic step per tier
// C-major pentatonic (no dissonance in any order) — used for the conduct phrase.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]

/** Play a short pluck for a tier purchase (1-indexed tierId), with a soft octave shimmer. */
export function playBuySound(tierId: number) {
  if (muted || !gate('buy', 70)) return
  try {
    const freq = TIER_FREQUENCIES[(tierId - 1) % TIER_FREQUENCIES.length]
    playNote(freq, { type: 'triangle', gain: 0.13, dur: 0.22, reverb: 0.5 })
    playNote(freq * 2, { type: 'sine', gain: 0.04, dur: 0.18, reverb: 0.5 }) // airy octave
  } catch {
    // Silently fail if audio not available
  }
}

/** Ascending C-E-G arpeggio for tempo upgrades (also used as a max-all flourish). */
export function playTempoSound() {
  if (muted || !gate('tempo', 160)) return
  try {
    ;[C, SCALE[2], SCALE[4]].forEach((freq, i) =>
      playNote(freq, { type: 'triangle', gain: 0.1, dur: 0.18, when: i * 0.06 }),
    )
  } catch {
    // Silently fail
  }
}

// --- Conduct: a living phrase ----------------------------------------------
// Each conduct tap advances up a pentatonic run, so rapid tapping plays a pleasing little melody
// instead of one repeated blip. The phrase resets after a short pause.
let conductStep = 0
let lastConductAt = 0

/** Soft note for a conduct burst — pitch climbs the pentatonic on repeated taps, resets when idle. */
export function playConductSound() {
  if (muted) return
  try {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - lastConductAt > 900) conductStep = 0 // new phrase after a pause
    lastConductAt = now
    const freq = PENTATONIC[conductStep % PENTATONIC.length]
    conductStep++
    playNote(freq, { type: 'triangle', gain: 0.09, dur: 0.2, attack: 0.008, reverb: 0.7 })
  } catch {
    // Silently fail
  }
}

/** A rising swell for crescendo — a quick four-note climb with a warm tail. */
export function playCrescendoSound() {
  if (muted) return
  try {
    ;[SCALE[0], SCALE[2], SCALE[4], SCALE[7]].forEach((freq, i) =>
      playNote(freq, { type: 'triangle', gain: 0.1, dur: 0.4, when: i * 0.05, reverb: 0.9 }),
    )
  } catch {
    // Silently fail
  }
}

/**
 * A blooming major chord for prestige actions, escalating per layer so each reset feels bigger:
 * grandeur 1 = Encore (warm cadence) · 2 = Magnum Opus (adds a low foundation) · 3 = World Tour
 * (adds a crown note + an upward resolve = the biggest hit in the trial).
 */
export function playPrestigeSound(grandeur = 1) {
  if (muted) return
  try {
    const g = Math.max(1, Math.min(3, grandeur))
    // root triad swelling in, then the octave shimmer a beat later — a hall opening up
    playChord([C, SCALE[2], SCALE[4]], { type: 'triangle', gain: 0.08, dur: 0.8 + g * 0.2, attack: 0.05, reverb: 1 })
    playChord([SCALE[7], SCALE[9]], { type: 'sine', gain: 0.05, dur: 0.9 + g * 0.2, attack: 0.08, when: 0.16, reverb: 1 })
    if (g >= 2) playNote(C / 2, { type: 'triangle', gain: 0.06, dur: 1.3, attack: 0.04, reverb: 1 }) // C3 foundation
    if (g >= 3) {
      playNote(SCALE[10], { type: 'sine', gain: 0.05, dur: 1.4, when: 0.32, reverb: 1 }) // G5 crown
      playChord([SCALE[4], SCALE[7]], { type: 'triangle', gain: 0.05, dur: 1.5, when: 0.5, reverb: 1 }) // resolve up
    }
  } catch {
    // Silently fail
  }
}

/** A bright sparkle for an achievement unlock. */
export function playAchievementSound() {
  if (muted) return
  try {
    ;[SCALE[4], SCALE[7], SCALE[9], SCALE[10]].forEach((freq, i) =>
      playNote(freq, { type: 'triangle', gain: 0.08, dur: 0.3, when: i * 0.05, reverb: 0.8 }),
    )
  } catch {
    // Silently fail
  }
}

/** A low, resolute two-note for entering a challenge. */
export function playChallengeStartSound() {
  if (muted) return
  try {
    playNote(SCALE[0] / 2, { type: 'sawtooth', gain: 0.06, dur: 0.5, reverb: 0.6 }) // C3
    playNote(SCALE[4] / 2, { type: 'triangle', gain: 0.07, dur: 0.5, when: 0.1, reverb: 0.6 }) // G3
  } catch {
    // Silently fail
  }
}

/** A triumphant resolve for completing a challenge. */
export function playChallengeCompleteSound() {
  if (muted) return
  try {
    ;[SCALE[4], SCALE[7], SCALE[9]].forEach((freq, i) =>
      playNote(freq, { type: 'triangle', gain: 0.09, dur: 0.6, when: i * 0.08, reverb: 1 }),
    )
  } catch {
    // Silently fail
  }
}

/** A gentle, warm ring for a milestone / goal reached. */
export function playMilestoneSound() {
  if (muted) return
  try {
    playChord([SCALE[2], SCALE[4], SCALE[7]], { type: 'triangle', gain: 0.07, dur: 0.7, attack: 0.04, reverb: 1 })
  } catch {
    // Silently fail
  }
}

/** A soft, low ambient tone under a story beat — felt more than heard. */
export function playStoryBeatSound() {
  if (muted) return
  try {
    playNote(SCALE[0] / 2, { type: 'sine', gain: 0.06, dur: 1.8, attack: 0.25, reverb: 1 }) // C3 swell
    playNote(SCALE[4] / 2, { type: 'sine', gain: 0.04, dur: 2.0, attack: 0.4, when: 0.2, reverb: 1 })
  } catch {
    // Silently fail
  }
}

// --- Ambient music bed ------------------------------------------------------
// A slow generative pad drifting through a warm C-major progression (I–IV–V–vi) — a hall breathing
// under the game. Long overlapping swells + heavy reverb = a continuous wash, not a melody. Routed
// through its own gain so it levels/mutes independently of the SFX.
const PAD_CHORDS = [[0, 2, 4], [3, 5, 7], [4, 6, 8], [5, 7, 9]] // SCALE indices: I, IV, V, vi

function applyMusicGain() {
  if (!musicGain || !audioCtx) return
  const target = muted || !musicOn ? 0 : musicVolume
  musicGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.8) // smooth fade in/out
}

/** One long, soft pad note through the music bus + reverb. */
function playPad(freq: number, dur: number, gain: number) {
  const ctx = getContext()
  if (!musicGain || !reverbSend) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + dur * 0.35) // slow swell in
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
  osc.connect(g)
  g.connect(musicGain)
  const send = ctx.createGain(); send.gain.value = 1; g.connect(send); send.connect(reverbSend)
  osc.start(t)
  osc.stop(t + dur + 0.1)
}

function scheduleMusic() {
  musicTimer = null
  if (!musicOn) return
  const ctx = getContext()
  if (ctx.state === 'running') {
    const chord = PAD_CHORDS[musicStep % PAD_CHORDS.length]
    chord.forEach((idx) => playPad(SCALE[idx] / 2, 7.5, 0.05)) // warm low pad (octave down)
    if (musicStep % 2 === 1) playPad(PENTATONIC[musicStep % PENTATONIC.length], 5, 0.02) // faint upper air
    musicStep++
  }
  musicTimer = setTimeout(scheduleMusic, 5200) // < the 7.5s pad length → chords overlap into a wash
}

/** Start the ambient bed. Safe on mount; latches onto the first user gesture (browser autoplay policy). */
export function startAmbientMusic() {
  if (musicOn) return
  musicOn = true
  const begin = () => {
    if (!musicOn) return
    const ctx = getContext()
    applyMusicGain()
    if (ctx.state === 'running' && !musicTimer) scheduleMusic()
  }
  begin()
  if (typeof window !== 'undefined') {
    const onGesture = () => {
      begin()
      if (audioCtx?.state === 'running') {
        window.removeEventListener('pointerdown', onGesture)
        window.removeEventListener('keydown', onGesture)
      }
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
  }
}

export function stopAmbientMusic() {
  musicOn = false
  applyMusicGain()
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null }
}

export function setMusicVolume(value: number) {
  musicVolume = Math.max(0, Math.min(1, value))
  applyMusicGain()
}

export function isMusicOn(): boolean {
  return musicOn
}
