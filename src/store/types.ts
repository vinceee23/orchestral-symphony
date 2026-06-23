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
  completedChallenges: string[]

  // Autobuyers
  autobuyers: Record<string, AutobuyerState>

  // Challenge system (run-based)
  activeChallenge: ActiveChallengeState | null
  preChallengeState: PreChallengeSnapshot | null

  // Prestige Layer 1: Encore (+1 per reset, x2 all production each)
  encorePoints: number
  lifetimeEncorePoints: number
  encoreCount: number

  // Prestige Layer 2: Magnum Opus (+1 per reset, x2 BPM each)
  opusPoints: number
  opusCount: number

  // Prestige Layer 3: Grand Finale (the "infinity" reset at 1.79e308 SW)
  finalePoints: number
  finaleCount: number

  // Tracking
  peakSoundwaves: Decimal
  totalTimePlayed: number
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
  checkAchievements: () => void
  checkChallengeCompletion: () => void
  startChallenge: (id: string) => void
  abandonChallenge: () => void
  performEncore: () => void
  performMagnumOpus: () => void
  performGrandFinale: () => void
  hardReset: () => void
}
