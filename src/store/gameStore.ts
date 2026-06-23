import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Decimal from 'break_infinity.js'
import type { GameState, GameActions, AutobuyerState } from './types'
import type { BuyAmount } from '../core/constants'
import {
  TIER_CONFIGS, STARTING_SOUNDWAVES, MAX_OFFLINE_MS,
  getEncoreCost, getMagnumOpusCost,
  GRAND_FINALE_SW_THRESHOLD,
  AUTOBUYER_DEFAULT_INTERVAL,
  ENCORE_WALL_COUNT,
} from '../core/constants'
import {
  ENCORE_UPGRADE_MAP, getEncoreUpgradeCost,
  getSightReadingStartNotes, getOvertureGainMultiplier,
} from '../core/encoreUpgrades'
import { calculateTick } from '../core/tick'
import {
  getTierCost,
  getMilestoneMultiplier,
  getTempoTickInterval,
  getTempoBPM,
  getTempoCost,
  getMaxBuyable,
  getMaxTempoLevels,
  getEncoreGain,
} from '../core/formulas'
import { ACHIEVEMENTS, getAchievementStartingSW, getAchievementCostReduction, getAchievementTierCostReduction } from '../core/achievements'
import { getChallengeById, getActiveChallengeModifiers } from '../core/challenges'
import { createDecimalStorage } from '../core/save'

function createDefaultAutobuyer(): AutobuyerState {
  return {
    unlocked: false,
    enabled: false,
    interval: AUTOBUYER_DEFAULT_INTERVAL,
    bulk: 1,
    lastTick: 0,
  }
}

function createInitialState(): GameState {
  return {
    soundwaves: new Decimal(STARTING_SOUNDWAVES),
    tiers: TIER_CONFIGS.map((config) => ({
      id: config.id,
      name: config.name,
      quantity: new Decimal(0),
      purchased: 0,
      multiplier: new Decimal(1),
      unlocked: config.id === 1,
    })),
    tempo: {
      level: 0,
      tickInterval: 1000,
      baseBPM: 60,
    },
    buyAmount: 1,
    achievements: [],
    completedChallenges: [],
    encoreUpgrades: {},
    autobuyers: {},
    activeChallenge: null,
    preChallengeState: null,
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    layer1WallReached: false,
    opusPoints: 0,
    opusCount: 0,
    finalePoints: 0,
    finaleCount: 0,
    peakSoundwaves: new Decimal(0),
    totalTimePlayed: 0,
    lastSaveTimestamp: Date.now(),
    currentRunStartTime: Date.now(),
    version: '0.6.0',
  }
}

/** Reset tiers, soundwaves, and tempo to initial state, with achievement starting SW bonus */
function resetTiersAndSW(achievementIds: string[]): Partial<GameState> {
  const bonusSW = getAchievementStartingSW(new Set(achievementIds))
  return {
    soundwaves: STARTING_SOUNDWAVES.plus(bonusSW),
    tiers: TIER_CONFIGS.map((config) => ({
      id: config.id,
      name: config.name,
      quantity: new Decimal(0),
      purchased: 0,
      multiplier: new Decimal(1),
      unlocked: config.id === 1,
    })),
    tempo: {
      level: 0,
      tickInterval: 1000,
      baseBPM: 60,
    },
    currentRunStartTime: Date.now(),
  }
}

/** Get effective cost multiplier for buying tiers */
function getEffectiveCostMultiplier(state: GameState, tierId: number): number {
  const achSet = new Set(state.achievements)
  const globalCostRed = getAchievementCostReduction(achSet)
  const tierCostRed = getAchievementTierCostReduction(achSet, tierId)

  // Challenge cost multiplier
  const challenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(challenge)

  // Rising costs
  let risingFactor = 1
  if (mods.risingCostRate > 0 && state.activeChallenge) {
    const elapsedSec = (Date.now() - state.activeChallenge.startTime) / 1000
    risingFactor = Math.pow(mods.risingCostRate, elapsedSec)
  }

  return mods.costMultiplier * globalCostRed * tierCostRed * risingFactor
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      tick: (deltaMs: number) => {
        const state = get()
        const updates = calculateTick(state, deltaMs)
        set(updates)
      },

      buyTier: (tierId: number, amount: number = 1) => {
        set((state) => {
          const tierIndex = tierId - 1
          const tier = state.tiers[tierIndex]
          const config = TIER_CONFIGS[tierIndex]
          if (!tier || !tier.unlocked) return state

          // Challenge: check tier availability
          const challenge = state.activeChallenge
            ? getChallengeById(state.activeChallenge.challengeId) ?? null
            : null
          const mods = getActiveChallengeModifiers(challenge)
          if (mods.singleTierId !== null && tierId !== mods.singleTierId) return state
          if (tierIndex >= mods.maxTiers) return state

          const costMult = getEffectiveCostMultiplier(state, tierId)

          let sw = new Decimal(state.soundwaves)
          let bought = 0

          // Challenge: maxPerTier limit
          const maxAllowed = mods.maxPerTier !== null
            ? Math.min(amount, mods.maxPerTier - tier.purchased)
            : amount
          if (maxAllowed <= 0) return state

          for (let i = 0; i < maxAllowed; i++) {
            const cost = getTierCost(config, tier.purchased + bought, costMult)
            if (sw.lt(cost)) break
            sw = sw.minus(cost)
            bought++
          }

          if (bought === 0) return state

          const newTiers = state.tiers.map((t, idx) => {
            if (idx === tierIndex) {
              const newPurchased = t.purchased + bought
              return {
                ...t,
                quantity: t.quantity.plus(bought),
                purchased: newPurchased,
                multiplier: mods.noMilestones ? new Decimal(1) : getMilestoneMultiplier(newPurchased),
              }
            }
            return t
          })

          return { tiers: newTiers, soundwaves: sw }
        })
      },

      buyMaxTier: (tierId: number) => {
        const state = get()
        const tierIndex = tierId - 1
        const tier = state.tiers[tierIndex]
        const config = TIER_CONFIGS[tierIndex]
        if (!tier || !tier.unlocked) return

        const costMult = getEffectiveCostMultiplier(state, tierId)

        // Challenge: maxPerTier
        const challenge = state.activeChallenge
          ? getChallengeById(state.activeChallenge.challengeId) ?? null
          : null
        const mods = getActiveChallengeModifiers(challenge)
        let maxBuyable = getMaxBuyable(config, tier.purchased, state.soundwaves, costMult)
        if (mods.maxPerTier !== null) {
          maxBuyable = Math.min(maxBuyable, mods.maxPerTier - tier.purchased)
        }

        if (maxBuyable > 0) {
          get().buyTier(tierId, maxBuyable)
        }
      },

      buyTempo: () => {
        set((state) => {
          // Challenge: noTempo
          const challenge = state.activeChallenge
            ? getChallengeById(state.activeChallenge.challengeId) ?? null
            : null
          const mods = getActiveChallengeModifiers(challenge)
          if (mods.noTempo) return state

          const cost = getTempoCost(state.tempo.level)
          if (state.soundwaves.lt(cost)) return state

          const newLevel = state.tempo.level + 1
          return {
            soundwaves: state.soundwaves.minus(cost),
            tempo: {
              level: newLevel,
              tickInterval: getTempoTickInterval(newLevel),
              baseBPM: getTempoBPM(newLevel),
            },
          }
        })
      },

      buyMaxTempo: () => {
        set((state) => {
          // Challenge: noTempo
          const challenge = state.activeChallenge
            ? getChallengeById(state.activeChallenge.challengeId) ?? null
            : null
          const mods = getActiveChallengeModifiers(challenge)
          if (mods.noTempo) return state

          const levels = getMaxTempoLevels(state.tempo.level, state.soundwaves)
          if (levels === 0) return state

          let sw = new Decimal(state.soundwaves)
          let level = state.tempo.level
          for (let i = 0; i < levels; i++) {
            const cost = getTempoCost(level)
            sw = sw.minus(cost)
            level++
          }

          return {
            soundwaves: sw,
            tempo: {
              level,
              tickInterval: getTempoTickInterval(level),
              baseBPM: getTempoBPM(level),
            },
          }
        })
      },

      setBuyAmount: (amount: BuyAmount) => {
        set({ buyAmount: amount })
      },

      toggleAutobuyer: (key: string) => {
        set((state) => {
          const ab = state.autobuyers[key]
          if (!ab || !ab.unlocked) return state
          return {
            autobuyers: {
              ...state.autobuyers,
              [key]: { ...ab, enabled: !ab.enabled },
            },
          }
        })
      },

      buyEncoreUpgrade: (id: string) => {
        set((state) => {
          const config = ENCORE_UPGRADE_MAP[id]
          if (!config) return state
          const level = state.encoreUpgrades[id] ?? 0
          if (level >= config.maxLevel) return state
          const cost = getEncoreUpgradeCost(config, level)
          if (state.encorePoints < cost) return state
          return {
            encorePoints: state.encorePoints - cost,
            encoreUpgrades: { ...state.encoreUpgrades, [id]: level + 1 },
          }
        })
      },

      checkAchievements: () => {
        const state = get()
        const currentSet = new Set(state.achievements)
        const newAchievements: string[] = []

        for (const ach of ACHIEVEMENTS) {
          if (currentSet.has(ach.id)) continue
          if (ach.check(state)) {
            newAchievements.push(ach.id)
          }
        }

        if (newAchievements.length > 0) {
          set({ achievements: [...state.achievements, ...newAchievements] })
        }
      },

      checkChallengeCompletion: () => {
        const state = get()
        if (!state.activeChallenge) return

        const challenge = getChallengeById(state.activeChallenge.challengeId)
        if (!challenge) return

        // Check if target SW reached
        if (state.soundwaves.gte(challenge.targetSoundwaves)) {
          // Complete the challenge
          const newCompleted = [...state.completedChallenges, challenge.id]

          // Unlock autobuyer
          let newAutobuyers = { ...state.autobuyers }
          if (!newAutobuyers[challenge.unlocksAutobuyer]) {
            newAutobuyers[challenge.unlocksAutobuyer] = createDefaultAutobuyer()
          }
          newAutobuyers = {
            ...newAutobuyers,
            [challenge.unlocksAutobuyer]: {
              ...newAutobuyers[challenge.unlocksAutobuyer],
              unlocked: true,
            },
          }

          // Restore pre-challenge state
          const pre = state.preChallengeState
          if (pre) {
            set({
              soundwaves: pre.soundwaves,
              tiers: pre.tiers,
              tempo: pre.tempo,
              completedChallenges: newCompleted,
              autobuyers: newAutobuyers,
              activeChallenge: null,
              preChallengeState: null,
            })
          } else {
            set({
              completedChallenges: newCompleted,
              autobuyers: newAutobuyers,
              activeChallenge: null,
              preChallengeState: null,
            })
          }
        }
      },

      startChallenge: (id: string) => {
        const state = get()
        if (state.activeChallenge) return // already in a challenge
        if (state.completedChallenges.includes(id)) return // already completed

        const challenge = getChallengeById(id)
        if (!challenge) return

        // Snapshot current state
        const snapshot = {
          soundwaves: new Decimal(state.soundwaves),
          tiers: state.tiers.map((t) => ({
            ...t,
            quantity: new Decimal(t.quantity),
            multiplier: new Decimal(t.multiplier),
          })),
          tempo: { ...state.tempo },
        }

        // Determine which tiers to unlock based on challenge constraints
        const mods = getActiveChallengeModifiers(challenge)
        const challengeTiers = TIER_CONFIGS.map((config, i) => ({
          id: config.id,
          name: config.name,
          quantity: new Decimal(0),
          purchased: 0,
          multiplier: new Decimal(1),
          unlocked: mods.singleTierId !== null
            ? config.id === mods.singleTierId
            : i === 0, // only first tier unlocked by default
        }))

        set({
          activeChallenge: { challengeId: id, startTime: Date.now() },
          preChallengeState: snapshot,
          soundwaves: new Decimal(STARTING_SOUNDWAVES),
          tiers: challengeTiers,
          tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
          currentRunStartTime: Date.now(),
        })
      },

      abandonChallenge: () => {
        const state = get()
        if (!state.activeChallenge) return

        const pre = state.preChallengeState
        if (pre) {
          set({
            soundwaves: pre.soundwaves,
            tiers: pre.tiers,
            tempo: pre.tempo,
            activeChallenge: null,
            preChallengeState: null,
          })
        } else {
          set({
            activeChallenge: null,
            preChallengeState: null,
          })
        }
      },

      // === Prestige Layer 1: Encore (always +1 EP, x2 production each) ===
      performEncore: () => {
        const state = get()

        // Block prestige during noPrestige challenge
        if (state.activeChallenge) {
          const ch = getChallengeById(state.activeChallenge.challengeId)
          if (ch) {
            const mods = getActiveChallengeModifiers(ch)
            if (mods.noPrestige) return
          }
        }

        const cost = getEncoreCost(state.encoreCount)
        const purchased = state.tiers[cost.tierIndex]?.purchased ?? 0
        if (purchased < cost.amount) return

        // EP gained from this run's peak (additive), boosted by the Overture upgrade.
        const overtureMult = getOvertureGainMultiplier(state.encoreUpgrades)
        const gain = Math.floor(getEncoreGain(state.peakSoundwaves) * overtureMult)

        const reset = resetTiersAndSW(state.achievements)
        // Sight-Reading: begin the new run with free Notes (tier 1).
        const startNotes = getSightReadingStartNotes(state.encoreUpgrades)
        if (startNotes > 0 && reset.tiers) {
          reset.tiers[0] = {
            ...reset.tiers[0],
            quantity: new Decimal(startNotes),
            purchased: startNotes,
            multiplier: getMilestoneMultiplier(startNotes),
          }
        }

        const newEncoreCount = state.encoreCount + 1
        set({
          ...reset,
          peakSoundwaves: new Decimal(0),
          encorePoints: state.encorePoints + gain,
          lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
          encoreCount: newEncoreCount,
          layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
        })
      },

      // === Prestige Layer 2: Magnum Opus (always +1 OP, x2 BPM each, resets EP) ===
      performMagnumOpus: () => {
        const state = get()

        if (!state.layer1WallReached) return // locked until the Layer-1 cliffhanger

        if (state.activeChallenge) {
          const ch = getChallengeById(state.activeChallenge.challengeId)
          if (ch) {
            const mods = getActiveChallengeModifiers(ch)
            if (mods.noPrestige) return
          }
        }

        const moCost = getMagnumOpusCost(state.opusCount)
        const moPurchased = state.tiers[moCost.tierIndex]?.purchased ?? 0
        if (moPurchased < moCost.amount) return

        // Magnum Opus fully resets the Encore layer (production mult comes from lifetimeEncorePoints).
        set({
          ...resetTiersAndSW(state.achievements),
          peakSoundwaves: new Decimal(0),
          encorePoints: 0,
          lifetimeEncorePoints: 0,
          encoreCount: 0,
          encoreUpgrades: {},
          opusPoints: state.opusPoints + 1,
          opusCount: state.opusCount + 1,
        })
      },

      // === Prestige Layer 3: Grand Finale (the "infinity" at 1.79e308, resets EP+OP) ===
      performGrandFinale: () => {
        const state = get()

        if (!state.layer1WallReached) return // locked until the Layer-1 cliffhanger

        if (state.activeChallenge) {
          const ch = getChallengeById(state.activeChallenge.challengeId)
          if (ch) {
            const mods = getActiveChallengeModifiers(ch)
            if (mods.noPrestige) return
          }
        }

        if (state.soundwaves.lt(GRAND_FINALE_SW_THRESHOLD)) return

        // Grand Finale resets the Encore + Magnum Opus layers.
        set({
          ...resetTiersAndSW(state.achievements),
          peakSoundwaves: new Decimal(0),
          encorePoints: 0,
          lifetimeEncorePoints: 0,
          encoreCount: 0,
          encoreUpgrades: {},
          opusPoints: 0,
          opusCount: 0,
          finalePoints: state.finalePoints + 1,
          finaleCount: state.finaleCount + 1,
        })
      },

      hardReset: () => {
        set(createInitialState())
      },
    }),
    {
      name: 'orchestral-symphony-v6',
      storage: createDecimalStorage(),
      partialize: (state): GameState => {
        const {
          tick, buyTier, buyMaxTier, buyTempo, buyMaxTempo, setBuyAmount,
          toggleAutobuyer, buyEncoreUpgrade, checkAchievements, checkChallengeCompletion,
          startChallenge, abandonChallenge,
          performEncore, performMagnumOpus, performGrandFinale,
          hardReset,
          ...data
        } = state
        return data
      },
      onRehydrateStorage: () => {
        return (state: (GameState & GameActions) | undefined) => {
          if (!state) return

          // Ensure new fields exist for saves from older versions
          if (!state.achievements) state.achievements = []
          if (!state.completedChallenges) state.completedChallenges = []
          if (!state.autobuyers) state.autobuyers = {}
          if (!state.encoreUpgrades) state.encoreUpgrades = {}
          if (state.layer1WallReached === undefined) state.layer1WallReached = false
          if (!state.buyAmount) state.buyAmount = 1
          if (state.activeChallenge === undefined) state.activeChallenge = null
          if (state.preChallengeState === undefined) state.preChallengeState = null
          if (state.encorePoints === undefined) state.encorePoints = 0
          if (state.lifetimeEncorePoints === undefined) state.lifetimeEncorePoints = 0
          if (state.encoreCount === undefined) state.encoreCount = 0
          if (state.opusPoints === undefined) state.opusPoints = 0
          if (state.opusCount === undefined) state.opusCount = 0
          if (state.finalePoints === undefined) state.finalePoints = 0
          if (state.finaleCount === undefined) state.finaleCount = 0
          state.peakSoundwaves = state.peakSoundwaves instanceof Decimal
            ? state.peakSoundwaves
            : new Decimal(state.peakSoundwaves || 0)
          if (!state.currentRunStartTime) state.currentRunStartTime = Date.now()

          const now = Date.now()
          const offlineMs = Math.min(now - state.lastSaveTimestamp, MAX_OFFLINE_MS)
          if (offlineMs > 1000) {
            const chunkMs = 1000
            let remaining = offlineMs
            let currentState: GameState = {
              soundwaves: state.soundwaves,
              tiers: state.tiers,
              tempo: state.tempo,
              buyAmount: state.buyAmount,
              achievements: state.achievements,
              completedChallenges: state.completedChallenges,
              encoreUpgrades: state.encoreUpgrades,
              autobuyers: state.autobuyers,
              activeChallenge: state.activeChallenge,
              preChallengeState: state.preChallengeState,
              encorePoints: state.encorePoints,
              lifetimeEncorePoints: state.lifetimeEncorePoints,
              encoreCount: state.encoreCount,
              layer1WallReached: state.layer1WallReached,
              opusPoints: state.opusPoints,
              opusCount: state.opusCount,
              finalePoints: state.finalePoints,
              finaleCount: state.finaleCount,
              peakSoundwaves: state.peakSoundwaves,
              totalTimePlayed: state.totalTimePlayed,
              lastSaveTimestamp: state.lastSaveTimestamp,
              currentRunStartTime: state.currentRunStartTime,
              version: state.version,
            }
            while (remaining > 0) {
              const step = Math.min(remaining, chunkMs)
              const updates = calculateTick(currentState, step)
              currentState = { ...currentState, ...updates }
              remaining -= step
            }
            state.soundwaves = currentState.soundwaves
            state.tiers = currentState.tiers
            state.tempo = currentState.tempo
            state.autobuyers = currentState.autobuyers
            state.totalTimePlayed = currentState.totalTimePlayed
            state.peakSoundwaves = currentState.peakSoundwaves
          }
          state.lastSaveTimestamp = now
        }
      },
    },
  ),
)
