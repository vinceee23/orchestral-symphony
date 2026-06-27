import Decimal from 'break_infinity.js'
import type { BuyAmount } from '../core/constants'

export interface TierState {
  id: number
  name: string
  quantity: Decimal
  purchased: number
  multiplier: Decimal
  unlocked: boolean
}

export interface TempoState {
  level: number
  tickInterval: number
  baseBPM: number
}

export interface AutobuyerState {
  unlocked: boolean
  enabled: boolean
  interval: number       // ms (500 default)
  bulk: number | 'max'   // 1, 10, 100, 512, 'max'
  lastTick: number       // timestamp of last auto-buy
}

export interface ActiveChallengeState {
  challengeId: string
  startTime: number
}

export interface PreChallengeSnapshot {
  soundwaves: Decimal
  tiers: TierState[]
  tempo: TempoState
}

export interface GameState {
  soundwaves: Decimal
  tiers: TierState[]
  tempo: TempoState
  buyAmount: BuyAmount
  achievements: string[]
  /** L3 challenge clears — resets on L4 ascension unless keepChallenges (LAYER3-SPEC §2.8). */
  completedChallenges: string[]
  /** Best completion time (ms) per challenge id — persists across L4 ascension. */
  challengeBestTimes: Record<string, number>
  /** L4-era unlock: preserve completed-challenge reward multipliers across Signature ascension. */
  keepChallenges: boolean

  // Layer 1 Encore shop — id -> level (spends encorePoints)
  encoreUpgrades: Record<string, number>

  // Autobuyers
  autobuyers: Record<string, AutobuyerState>

  // Challenge system (run-based)
  activeChallenge: ActiveChallengeState | null
  preChallengeState: PreChallengeSnapshot | null

  // Prestige Layer 1: Encore. encorePoints = spendable EP; lifetimeEncorePoints drives the
  // production multiplier (never drops when you spend in the shop).
  encorePoints: number
  lifetimeEncorePoints: number
  encoreCount: number
  /** Monotonic total Encores ever performed (encoreCount resets each MO; this never does). Gates deep perks. */
  lifetimeEncoreCount: number

  // Layer-1 automation currency: Applause Points. Earned per Encore (alongside EP); spent to unlock
  // autobuyers (tiers 1-7, tempo, auto-encore, auto-MO). MO upgrades raise automation power.
  // number (not Decimal) — matches EP/OP/records; pre-L4 magnitudes stay well within range. Persists across resets.
  applausePoints: number

  // Cliffhanger gate: layers 2-6 stay locked until the Layer-1 wall is reached.
  layer1WallReached: boolean

  // Prestige Layer 2: Magnum Opus
  opusPoints: number      // spendable OP (spent on the opusUpgrades tree)
  opusCount: number       // lifetime Magnum Opuses (monotonic; drives record sales)
  opusUpgrades: Record<string, number>  // OP tree — id -> level
  crescendo: number       // current crescendo intensity, 0..1 fraction of ceiling (ephemeral feel, but persisted for offline)
  peakCrescendoMult: number  // highest crescendo multiplier reached this run — feeds OP gain
  recordsSold: number     // cumulative records sold; 1,000,000 => Go Platinum
  platinum: boolean       // has Gone Platinum (flips OP gain to the post-break formula)

  // Prestige Layer 3: World Tour (touring ensemble — venues + Acclaim)
  acclaim: Decimal
  lifetimeAcclaim: Decimal
  tourCount: number
  currentVenue: number
  venueBuffer: Decimal
  /** True when the venue sold out after banking — accrual pauses until upgrade/graduate. */
  venueSoldOut: boolean
  components: Record<string, number>
  catalogueSnapshot: Decimal
  worldTourUnlocked: boolean
  /** V1 Instruments unlock — venue auto-banks buffer into Acclaim on sell-out. */
  autoCollect: boolean
  keepAutobuyers: boolean
  /** Mid-ladder unlock — auto-performs Magnum Opus when profitable. */
  autoMO: boolean
  /** Toggle for Auto-MO (defaults on when unlocked). */
  autoMOEnabled: boolean
  /** Late-ladder unlock — graduates a venue once all components are maxed. */
  autoGraduate: boolean
  /** Break-phase capstone (AP-bought) — auto-performs the World Tour when the catalogue has regrown. */
  autoTour: boolean
  /** Toggle for Auto-Tour (defaults on when unlocked). */
  autoTourEnabled: boolean
  /** Full venue circuit graduated — Acclaim rate uses live catalogue. */
  circuitComplete: boolean
  /** MOs performed after Platinum — drives the hybrid L3 unlock gate. */
  postPlatinumMoCount: number

  // Prestige Layer 6: Grand Finale (the "infinity" reset at 1.79e308 SW)
  finalePoints: number
  finaleCount: number

  // Tracking
  peakSoundwaves: Decimal
  producedThisRun: Decimal
  /** Manual Tempo purchases this Encore/MO run (excludes head-start level). */
  tempoPurchasesThisRun: number
  /** Encore cycles completed without buying Tempo that run. */
  silentEncoresCompleted: number
  /** Set when the 8th Encore is completed without buying Tempo that cycle. */
  wallReachedWithoutTempo: boolean
  /** Active-play ms when wallReachedWithoutTempo was first earned (for patron deferral). */
  wallReachedWithoutTempoAtActiveMs: number
  totalTimePlayed: number
  /** Foreground play only — excludes offline catch-up ticks. */
  activeTimePlayed: number
  lastSaveTimestamp: number
  currentRunStartTime: number
  version: string
}

export interface GameActions {
  tick: (deltaMs: number) => void
  buyTier: (tierId: number, amount?: number) => void
  buyMaxTier: (tierId: number) => void
  buyTempo: () => void
  buyMaxTempo: () => void
  setBuyAmount: (amount: BuyAmount) => void
  toggleAutobuyer: (key: string) => void
  setAutobuyerBulk: (key: string, bulk: number | 'max') => void
  unlockWithApplause: (key: 'encore' | 'autoTour') => void
  setAutoTourEnabled: (enabled: boolean) => void
  buyEncoreUpgrade: (id: string) => void
  buyOpusUpgrade: (id: string) => void
  checkAchievements: () => void
  checkChallengeCompletion: () => void
  startChallenge: (id: string) => void
  abandonChallenge: () => void
  performEncore: () => void
  performMagnumOpus: () => void
  performGrandFinale: () => void
  buyComponent: (componentId: string) => void
  buyKeepAutobuyers: () => void
  graduateVenue: () => void
  performTour: () => void
  unlockWorldTour: () => void
  bankVenueAcclaim: () => void
  setAutoMOEnabled: (enabled: boolean) => void
  hardReset: () => void
}
