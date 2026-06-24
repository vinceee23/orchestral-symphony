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
import { OPUS_UPGRADES, OPUS_UPGRADE_MAP, getOpusUpgradeCost } from '../core/opusUpgrades'
import { hasPerk, WARMUP_TIERS, WARMUP_BONUS_SW } from '../core/perks'
import { getOpusGain } from '../core/records'
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
import { useUiStore } from './uiStore'

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
    opusUpgrades: {},
    crescendo: 0,
    peakCrescendoMult: 1,
    recordsSold: 0,
    platinum: false,
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
  const achSet = new Set(achievementIds)
  const bonusSW = getAchievementStartingSW(achSet)
  // perk-warmup: start each run with the first WARMUP_TIERS tiers pre-bought (a milestone bracket each)
  // + bonus SW, so a veteran's early ramp is skipped. Pre-buying tier i unlocks i+1, like a real buy.
  const warmup = hasPerk(achSet, 'perk-warmup')
  return {
    soundwaves: STARTING_SOUNDWAVES.plus(bonusSW).plus(warmup ? WARMUP_BONUS_SW : 0),
    tiers: TIER_CONFIGS.map((config, idx) => {
      const preBought = warmup && idx < WARMUP_TIERS
      return {
        id: config.id,
        name: config.name,
        quantity: new Decimal(preBought ? 10 : 0),
        purchased: preBought ? 10 : 0,
        multiplier: preBought ? getMilestoneMultiplier(10) : new Decimal(1),
        unlocked: config.id === 1 || (warmup && idx <= WARMUP_TIERS),
      }
    }),
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
        const conducting = useUiStore.getState().conducting
        const updates = calculateTick(state, deltaMs, conducting)
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

      setAutobuyerBulk: (key: string, bulk: number | 'max') => {
        set((state) => {
          const ab = state.autobuyers[key]
          if (!ab) return state
          return {
            autobuyers: {
              ...state.autobuyers,
              [key]: { ...ab, bulk },
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

      buyOpusUpgrade: (id: string) => {
        set((state) => {
          const config = OPUS_UPGRADE_MAP[id] ?? OPUS_UPGRADES.find((u) => u.id === id)
          if (!config) return state
          const level = state.opusUpgrades[id] ?? 0
          if (level >= config.maxLevel) return state
          const cost = getOpusUpgradeCost(config, level)
          if (state.opusPoints < cost) return state

          let autobuyers = state.autobuyers
          const unlockMatch = id.match(/^automator-unlock-(\d+)$/)
          if (unlockMatch) {
            const tierId = unlockMatch[1]
            const key = `tier_${tierId}`
            autobuyers = {
              ...autobuyers,
              [key]: {
                unlocked: true,
                enabled: true,
                interval: AUTOBUYER_DEFAULT_INTERVAL,
                bulk: 1,
                lastTick: 0,
              },
            }
          }

          return {
            opusPoints: state.opusPoints - cost,
            opusUpgrades: { ...state.opusUpgrades, [id]: level + 1 },
            autobuyers,
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

      // === Prestige Layer 2: Magnum Opus (OP from catalog/crescendo, resets Encore layer) ===
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

        const gain = getOpusGain({
          platinum: state.platinum,
          opGainFlatLevel: state.opusUpgrades['op-gain-flat'] ?? 0,
          opusCount: state.opusCount,
          peakCrescendoMult: state.peakCrescendoMult,
          levels: state.opusUpgrades,
        })
        const newOpusCount = state.opusCount + 1

        let autobuyers = { ...state.autobuyers }
        if (newOpusCount === 1) {
          autobuyers = {
            ...autobuyers,
            tier_1: {
              unlocked: true,
              enabled: true,
              interval: AUTOBUYER_DEFAULT_INTERVAL,
              bulk: 1,
              lastTick: 0,
            },
          }
        }

        // Magnum Opus fully resets the Encore layer (production mult comes from lifetimeEncorePoints).
        // Re-master the wall: every MO must re-reach the 8-Encore wall, so even +1 OP stays earned —
        // UNLESS perk-skip-wall is earned (keep the wall reached, no re-climb). perk-keep-encore-upgrades
        // preserves the Encore shop through the reset.
        // NOTE: perks read the PRE-MO achievement set, so an opusCount-gated perk (skip-wall, warmup)
        // takes effect from the next prestige cycle after its achievement unlocks (the unlock fires on the
        // ~300ms achievement tick AFTER opusCount increments). For warmup that's invisible (it re-applies on
        // the next Encore reset); for skip-wall it costs one final wall-climb at the unlock boundary. Accepted.
        const achSet = new Set(state.achievements)
        const skipWall = hasPerk(achSet, 'perk-skip-wall')
        const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
        set({
          ...resetTiersAndSW(state.achievements),
          peakSoundwaves: new Decimal(0),
          encorePoints: 0,
          lifetimeEncorePoints: 0,
          encoreCount: 0,
          encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
          layer1WallReached: skipWall,
          opusPoints: state.opusPoints + gain,
          opusCount: newOpusCount,
          crescendo: 0,
          peakCrescendoMult: 1,
          autobuyers,
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
          toggleAutobuyer, setAutobuyerBulk, buyEncoreUpgrade, buyOpusUpgrade, checkAchievements, checkChallengeCompletion,
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
          if (!state.opusUpgrades) state.opusUpgrades = {}
          if (state.crescendo === undefined) state.crescendo = 0
          if (state.peakCrescendoMult === undefined) state.peakCrescendoMult = 1
          if (state.recordsSold === undefined) state.recordsSold = 0
          if (state.platinum === undefined) state.platinum = false
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
              opusUpgrades: state.opusUpgrades,
              crescendo: state.crescendo,
              peakCrescendoMult: state.peakCrescendoMult,
              recordsSold: state.recordsSold,
              platinum: state.platinum,
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
            state.crescendo = currentState.crescendo
            state.peakCrescendoMult = currentState.peakCrescendoMult
            state.recordsSold = currentState.recordsSold
            state.platinum = currentState.platinum
          }
          state.lastSaveTimestamp = now
        }
      },
    },
  ),
)
