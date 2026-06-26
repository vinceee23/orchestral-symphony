import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Decimal from 'break_infinity.js'
import type { GameState, GameActions, AutobuyerState } from './types'
import type { BuyAmount } from '../core/constants'
import {
  TIER_CONFIGS, STARTING_SOUNDWAVES, MAX_OFFLINE_MS,
  getEncoreCost, getMagnumOpusCost, getApplauseGain, getAutoEncoreInterval,
  AP_UNLOCK,
  GRAND_FINALE_SW_THRESHOLD,
  ENCORE_EP_THRESHOLD,
  AUTOBUYER_DEFAULT_INTERVAL,
  ENCORE_WALL_COUNT,
  PLATINUM_THRESHOLD,
} from '../core/constants'
import {
  ENCORE_UPGRADE_MAP, getEncoreUpgradeCost,
  getHeadStartExponent, getRehearsalCostReduction, getOvertureGainMultiplier,
} from '../core/encoreUpgrades'
import { OPUS_UPGRADES, OPUS_UPGRADE_MAP, getOpusUpgradeCost } from '../core/opusUpgrades'
import { FAME_NODE_MAP, FAME_NODES, getFameNodeCost, getFameGain } from '../core/fameTree'
import { hasPerk, WARMUP_TIERS, WARMUP_BONUS_SW, TEMPO_HEADSTART_LEVEL, CRESCENDO_HEADSTART, ENCORE_UPGRADE_DISCOUNT } from '../core/perks'
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
import { ACHIEVEMENTS, getAchievementStartingSW, getAchievementCostReduction, getAchievementTierCostReduction, getAchievementHeadStartBoost } from '../core/achievements'
import { getChallengeById, getActiveChallengeModifiers, isChallengeUnlocked } from '../core/challenges'
import { createDecimalStorage } from '../core/save'
import { useUiStore } from './uiStore'
import {
  L3, getCatalogueSnapshot, getComponentCost, isVenueGraduatable,
  canUnlockWorldTour, getVenue, getComponentMaxTier,
  canAutoPerformMagnumOpus, getUnlockFlagsFromComponent, buildVenueGraduationPatch,
} from '../core/worldTour'

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
    applausePoints: 0,
    layer1WallReached: false,
    opusPoints: 0,
    opusCount: 0,
    opusUpgrades: {},
    crescendo: 0,
    peakCrescendoMult: 1,
    recordsSold: 0,
    platinum: false,
    acclaim: new Decimal(0),
    lifetimeAcclaim: new Decimal(0),
    tourCount: 0,
    currentVenue: 0,
    venueBuffer: new Decimal(0),
    venueSoldOut: false,
    components: {},
    catalogueSnapshot: new Decimal(1),
    worldTourUnlocked: false,
    autoCollect: false,
    keepAutobuyers: false,
    autoMO: false,
    autoMOEnabled: true,
    autoGraduate: false,
    circuitComplete: false,
    postPlatinumMoCount: 0,
    spendableFame: 0,
    lifetimeFame: 0,
    fameUpgrades: {},
    finalePoints: 0,
    finaleCount: 0,
    peakSoundwaves: new Decimal(0),
    producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0,
    silentEncoresCompleted: 0,
    wallReachedWithoutTempo: false,
    wallReachedWithoutTempoAtActiveMs: 0,
    totalTimePlayed: 0,
    activeTimePlayed: 0,
    lastSaveTimestamp: Date.now(),
    currentRunStartTime: Date.now(),
    version: '0.6.0',
  }
}

/** Reset tiers, soundwaves, and tempo to initial state, with achievement starting SW bonus */
function resetTiersAndSW(achievementIds: string[]): Partial<GameState> {
  const achSet = new Set(achievementIds)
  const bonusSW = getAchievementStartingSW(achSet)
  // Distinct head-start perks (all gated behind their achievements):
  // - warmup: first WARMUP_TIERS tiers pre-bought (a milestone bracket each) + bonus SW
  // - tempo-headstart: begin each run at Tempo level TEMPO_HEADSTART_LEVEL
  // - crescendo-headstart: begin each run with Crescendo seeded (only added when the perk is owned, so
  //   non-perk Encore behaviour — crescendo persisting across the reset — is unchanged)
  const warmup = hasPerk(achSet, 'perk-warmup')
  const tempoLevel = hasPerk(achSet, 'perk-tempo-headstart') ? TEMPO_HEADSTART_LEVEL : 0
  const crescHeadstart = hasPerk(achSet, 'perk-crescendo-headstart')
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
      level: tempoLevel,
      tickInterval: getTempoTickInterval(tempoLevel),
      baseBPM: getTempoBPM(tempoLevel),
    },
    ...(crescHeadstart ? { crescendo: CRESCENDO_HEADSTART } : {}),
    currentRunStartTime: Date.now(),
    producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0,
  }
}

/** Get effective cost multiplier for buying tiers */
function getEffectiveCostMultiplier(state: GameState, tierId: number): number {
  const achSet = new Set(state.achievements)
  const globalCostRed = getAchievementCostReduction(achSet)
  const tierCostRed = getAchievementTierCostReduction(achSet, tierId)
  // Rehearsal (Encore shop): -5%/level all tier costs
  const rehearsal = 1 - getRehearsalCostReduction(state.encoreUpgrades)

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

  return mods.costMultiplier * globalCostRed * tierCostRed * rehearsal * risingFactor
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      tick: (deltaMs: number) => {
        const state = get()
        const conducting = useUiStore.getState().conducting
        const updates = calculateTick(state, deltaMs, conducting)
        set({ ...updates, activeTimePlayed: state.activeTimePlayed + deltaMs })
        const after = get()

        // Auto-prestige self-sufficiency: when auto-encore OR auto-MO is active, build toward the CURRENT
        // prestige gate tier (encore gate pre-wall, Magnum Opus gate — Symphonies — post-wall). Without this
        // the automations are dead weight, because nothing auto-buys the gate tier until that tier's own
        // autobuyer unlocks (OP-gated, ~opus 27) — so auto-MO could never fire hands-free. Targeted: only the
        // gate tier, only while automating; buyTier is affordability-checked so it just converts production.
        const autoPrestigeActive =
          (after.autobuyers['encore']?.unlocked && after.autobuyers['encore']?.enabled) ||
          (after.autoMO && after.autoMOEnabled)
        if (autoPrestigeActive && !after.activeChallenge) {
          const gate = after.layer1WallReached
            ? getMagnumOpusCost(after.opusCount)
            : getEncoreCost(after.encoreCount)
          const gt = after.tiers[gate.tierIndex]
          if (gt?.unlocked && gt.purchased < gate.amount) {
            get().buyTier(gate.tierIndex + 1, gate.amount - gt.purchased)
          }
        }

        // Auto-encore (L1 automation): the `encore` autobuyer, throttled + MO-upgraded. Fires the SAME
        // performEncore() the player would — only when unlocked, enabled, not in a challenge, and an
        // encore would yield ≥1 EP (peak past the threshold) so it never auto-prestiges a net-loss.
        // performEncore() itself still gates on the tier-cost, so a premature fire just no-ops.
        const enc = after.autobuyers['encore']
        // Auto-encore re-climbs TO the 8-encore wall, then yields: gate on !layer1WallReached so it can't
        // keep resetting the board past the wall and starve auto-MO (which needs 72 Symphonies). After an
        // auto-MO the wall flag clears, so the next re-climb resumes. Also stops it from wiping a board the
        // player is hand-saving for a Magnum Opus.
        // .gt (not .gte): getEncoreGain returns 0 at peak == threshold (formulas.ts), so equality would auto-reset for 0 EP.
        if (enc?.unlocked && enc.enabled && !after.activeChallenge && !after.layer1WallReached && after.peakSoundwaves.gt(ENCORE_EP_THRESHOLD)) {
          const now = Date.now()
          if (now - (enc.lastTick ?? 0) >= getAutoEncoreInterval(after.opusCount)) {
            get().performEncore()
            set((st) => ({
              autobuyers: { ...st.autobuyers, encore: { ...(st.autobuyers['encore'] ?? enc), lastTick: now } },
            }))
          }
        }

        if (!after.worldTourUnlocked && canUnlockWorldTour(after)) {
          get().unlockWorldTour()
        }
        if (
          after.worldTourUnlocked &&
          after.autoGraduate &&
          !after.circuitComplete &&
          isVenueGraduatable(after.components, after.currentVenue)
        ) {
          const gradPatch = buildVenueGraduationPatch(after)
          if (gradPatch) set(gradPatch)
        }
        const postGrad = get()
        if (canAutoPerformMagnumOpus(postGrad)) {
          get().performMagnumOpus()
        }
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
            tempoPurchasesThisRun: (state.tempoPurchasesThisRun ?? 0) + 1,
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
            tempoPurchasesThisRun: (state.tempoPurchasesThisRun ?? 0) + levels,
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

      // Spend Applause Points to unlock a prestige automation in L2 (auto-encore / auto-MO).
      // Gated by opusCount so the first climb (and a few MO decisions) are hand-played first.
      unlockWithApplause: (key: 'encore' | 'autoMO') => {
        set((state) => {
          const cfg = AP_UNLOCK[key]
          if (!cfg || state.opusCount < cfg.minOpusCount || state.applausePoints < cfg.cost) return state
          if (key === 'autoMO') {
            if (state.autoMO) return state
            return { applausePoints: state.applausePoints - cfg.cost, autoMO: true, autoMOEnabled: true }
          }
          if (state.autobuyers['encore']?.unlocked) return state
          return {
            applausePoints: state.applausePoints - cfg.cost,
            autobuyers: {
              ...state.autobuyers,
              encore: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 },
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
          const discount = hasPerk(new Set(state.achievements), 'perk-encore-discount') ? ENCORE_UPGRADE_DISCOUNT : 0
          const cost = getEncoreUpgradeCost(config, level, discount)
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

      buyFameUpgrade: (id: string) => {
        set((state) => {
          const config = FAME_NODE_MAP[id] ?? FAME_NODES.find((n) => n.id === id)
          if (!config) return state
          const level = state.fameUpgrades[id] ?? 0
          if (level >= config.maxLevel) return state
          const cost = getFameNodeCost(config, level)
          if (state.spendableFame < cost) return state
          return {
            spendableFame: state.spendableFame - cost,
            fameUpgrades: { ...state.fameUpgrades, [id]: level + 1 },
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
        if (!isChallengeUnlocked(state, challenge)) return

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

        // perk-second-wind: the FIRST Encore of each Magnum Opus cycle (encoreCount resets to 0 on MO)
        // skips the tier-gate — one free Encore per cycle.
        const freeEncore = hasPerk(new Set(state.achievements), 'perk-second-wind') && state.encoreCount === 0
        const cost = getEncoreCost(state.encoreCount)
        const purchased = state.tiers[cost.tierIndex]?.purchased ?? 0
        if (!freeEncore && purchased < cost.amount) return

        // EP gained from this run's peak (additive), boosted by the Overture upgrade.
        const overtureMult = getOvertureGainMultiplier(state.encoreUpgrades)
        const gain = Math.floor(getEncoreGain(state.peakSoundwaves) * overtureMult)

        const reset = resetTiersAndSW(state.achievements)
        // Sight-Reading head-start: begin the new run with SW = (this run's peak)^exp, so you skip the
        // tedious redundant re-climb (only on Encore — MO/Finale reset the multiplier, so a pre-reset
        // peak seed would be wildly out of regime). exp grows with the unlock + head-start achievements.
        const headExp = getHeadStartExponent(state.encoreUpgrades, getAchievementHeadStartBoost(new Set(state.achievements)))
        if (headExp > 0 && state.peakSoundwaves.gt(1)) {
          reset.soundwaves = Decimal.max(reset.soundwaves ?? STARTING_SOUNDWAVES, state.peakSoundwaves.pow(headExp))
        }

        const newEncoreCount = state.encoreCount + 1
        const runActiveMs = Date.now() - state.currentRunStartTime
        const silentRun =
          !freeEncore &&
          (state.tempoPurchasesThisRun ?? 0) <= 8 &&
          runActiveMs >= 3 * 60_000
        const qualifiedPatron =
          newEncoreCount >= ENCORE_WALL_COUNT && silentRun
        const patronActiveMs = state.wallReachedWithoutTempoAtActiveMs || state.activeTimePlayed
        set({
          ...reset,
          peakSoundwaves: new Decimal(0),
          encorePoints: state.encorePoints + gain,
          lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
          applausePoints: state.applausePoints + getApplauseGain(gain),
          encoreCount: newEncoreCount,
          layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
          silentEncoresCompleted: state.silentEncoresCompleted + (silentRun ? 1 : 0),
          wallReachedWithoutTempo: state.wallReachedWithoutTempo || qualifiedPatron,
          wallReachedWithoutTempoAtActiveMs: qualifiedPatron ? patronActiveMs : state.wallReachedWithoutTempoAtActiveMs,
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
        const wasPlatinum = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
        // Break phase: each post-Platinum MO mints Fame (0 pre-Platinum). Spendable + lifetime both grow;
        // Fame is meta, so it survives this reset (not listed below = preserved by the partial set()).
        const fameGain = wasPlatinum ? getFameGain(state.recordsSold, state.fameUpgrades) : 0
        set({
          ...resetTiersAndSW(state.achievements),
          spendableFame: state.spendableFame + fameGain,
          lifetimeFame: state.lifetimeFame + fameGain,
          peakSoundwaves: new Decimal(0),
          encorePoints: 0,
          lifetimeEncorePoints: 0,
          encoreCount: 0,
          encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
          layer1WallReached: skipWall,
          opusPoints: state.opusPoints + gain,
          opusCount: newOpusCount,
          // honor perk-crescendo-headstart (resetTiersAndSW's value is overridden by this explicit key)
          crescendo: hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0,
          peakCrescendoMult: 1,
          autobuyers,
          postPlatinumMoCount: wasPlatinum ? state.postPlatinumMoCount + 1 : state.postPlatinumMoCount,
        })
      },

      // === Layer 3: World Tour (resets L1+L2, persists venue ladder + Acclaim) ===
      unlockWorldTour: () => {
        const state = get()
        if (state.worldTourUnlocked || !canUnlockWorldTour(state)) return
        const snapshot = getCatalogueSnapshot(state.opusCount, state.recordsSold)
        set({
          worldTourUnlocked: true,
          catalogueSnapshot: new Decimal(snapshot),
          currentVenue: 0,
          components: {},
          venueBuffer: new Decimal(0),
          venueSoldOut: false,
        })
      },

      buyComponent: (componentId: string) => {
        set((state) => {
          if (!state.worldTourUnlocked) return state
          const venue = getVenue(state.currentVenue)
          if (!venue.componentIds.includes(componentId as typeof venue.componentIds[number])) return state
          if (!(componentId in L3.COMPONENTS)) return state
          const level = state.components[componentId] ?? 0
          if (level >= getComponentMaxTier(componentId)) return state
          const cost = getComponentCost(componentId, level, state.currentVenue)
          const acclaim = state.acclaim instanceof Decimal ? state.acclaim : new Decimal(state.acclaim ?? 0)
          if (acclaim.lt(cost)) return state
          const nextComponents = { ...state.components, [componentId]: level + 1 }
          const unlockFlags = getUnlockFlagsFromComponent(componentId)
          const patch: Partial<GameState> = {
            acclaim: acclaim.minus(cost),
            components: nextComponents,
            venueSoldOut: false,
            ...unlockFlags,
          }
          if (
            state.autoGraduate &&
            !state.circuitComplete &&
            isVenueGraduatable(nextComponents, state.currentVenue)
          ) {
            const gradPatch = buildVenueGraduationPatch(state)
            if (gradPatch) Object.assign(patch, gradPatch)
          }
          return patch
        })
      },

      buyKeepAutobuyers: () => {
        const state = get()
        if (!state.worldTourUnlocked || state.keepAutobuyers) return
        const venue = getVenue(state.currentVenue)
        if (venue.componentIds.includes('keepAutobuyers')) {
          get().buyComponent('keepAutobuyers')
        }
      },

      graduateVenue: () => {
        set((state) => {
          if (!state.worldTourUnlocked) return state
          if (!isVenueGraduatable(state.components, state.currentVenue)) return state
          const patch = buildVenueGraduationPatch(state)
          return patch ?? state
        })
      },

      setAutoMOEnabled: (enabled: boolean) => {
        set((state) => {
          if (!state.autoMO) return state
          return { autoMOEnabled: enabled }
        })
      },

      bankVenueAcclaim: () => {
        set((state) => {
          if (!state.worldTourUnlocked) return state
          const buffer = state.venueBuffer instanceof Decimal ? state.venueBuffer : new Decimal(state.venueBuffer ?? 0)
          if (buffer.lte(0)) return state
          let acclaim = state.acclaim instanceof Decimal ? state.acclaim : new Decimal(state.acclaim ?? 0)
          let lifetimeAcclaim = state.lifetimeAcclaim instanceof Decimal ? state.lifetimeAcclaim : new Decimal(state.lifetimeAcclaim ?? 0)
          acclaim = acclaim.plus(buffer)
          lifetimeAcclaim = lifetimeAcclaim.plus(buffer)
          return {
            acclaim,
            lifetimeAcclaim,
            venueBuffer: new Decimal(0),
            venueSoldOut: false,
          }
        })
      },

      performTour: () => {
        const state = get()
        if (!state.worldTourUnlocked) return

        const carriedRecords = Math.floor(state.recordsSold * L3.LEGACY_RECORDS_FRACTION)
        const achSet = new Set(state.achievements)
        const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
        const opusCount = state.opusCount
        const keptAutobuyers = state.keepAutobuyers ? { ...state.autobuyers } : {}
        const newTourCount = state.tourCount + 1

        set({
          ...resetTiersAndSW(state.achievements),
          peakSoundwaves: new Decimal(0),
          encorePoints: 0,
          lifetimeEncorePoints: 0,
          encoreCount: 3,
          encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
          layer1WallReached: true,
          opusPoints: 0,
          opusCount,
          opusUpgrades: {},
          crescendo: hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0,
          peakCrescendoMult: 1,
          recordsSold: carriedRecords,
          platinum: carriedRecords >= PLATINUM_THRESHOLD,
          autobuyers: keptAutobuyers,
          tourCount: newTourCount,
          catalogueSnapshot: new Decimal(getCatalogueSnapshot(opusCount, carriedRecords)),
          venueBuffer: new Decimal(0),
          venueSoldOut: false,
        })
      },

      // === Prestige Layer 6: Grand Finale (the "infinity" at 1.79e308, resets EP+OP) ===
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
          toggleAutobuyer, setAutobuyerBulk, unlockWithApplause, buyEncoreUpgrade, buyOpusUpgrade, checkAchievements, checkChallengeCompletion,
          startChallenge, abandonChallenge,
          performEncore, performMagnumOpus, performGrandFinale,
          buyComponent, buyKeepAutobuyers, graduateVenue, performTour, unlockWorldTour, bankVenueAcclaim,
          setAutoMOEnabled,
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
          if (typeof state.applausePoints !== 'number' || !isFinite(state.applausePoints)) state.applausePoints = 0
          if (state.opusPoints === undefined) state.opusPoints = 0
          if (state.opusCount === undefined) state.opusCount = 0
          if (!state.opusUpgrades) state.opusUpgrades = {}
          if (state.crescendo === undefined) state.crescendo = 0
          if (state.peakCrescendoMult === undefined) state.peakCrescendoMult = 1
          if (state.recordsSold === undefined) state.recordsSold = 0
          if (state.platinum === undefined) state.platinum = false
          if (state.acclaim === undefined) state.acclaim = new Decimal(0)
          else state.acclaim = state.acclaim instanceof Decimal ? state.acclaim : new Decimal(state.acclaim ?? 0)
          if (state.lifetimeAcclaim === undefined) state.lifetimeAcclaim = new Decimal(0)
          else state.lifetimeAcclaim = state.lifetimeAcclaim instanceof Decimal ? state.lifetimeAcclaim : new Decimal(state.lifetimeAcclaim ?? 0)
          if (state.tourCount === undefined) state.tourCount = 0
          if (state.currentVenue === undefined) state.currentVenue = 0
          if (state.venueBuffer === undefined) state.venueBuffer = new Decimal(0)
          else state.venueBuffer = state.venueBuffer instanceof Decimal ? state.venueBuffer : new Decimal(state.venueBuffer ?? 0)
          if (state.venueSoldOut === undefined) state.venueSoldOut = false
          if (!state.components) state.components = {}
          if (state.catalogueSnapshot === undefined) state.catalogueSnapshot = new Decimal(1)
          else state.catalogueSnapshot = state.catalogueSnapshot instanceof Decimal ? state.catalogueSnapshot : new Decimal(state.catalogueSnapshot ?? 1)
          if (state.worldTourUnlocked === undefined) state.worldTourUnlocked = false
          if (state.autoCollect === undefined) state.autoCollect = false
          if (state.keepAutobuyers === undefined) state.keepAutobuyers = false
          if (state.autoMO === undefined) state.autoMO = false
          if (state.autoMOEnabled === undefined) state.autoMOEnabled = true
          if (state.autoGraduate === undefined) state.autoGraduate = false
          if (state.circuitComplete === undefined) state.circuitComplete = false
          if (state.postPlatinumMoCount === undefined) state.postPlatinumMoCount = 0
          if (typeof state.spendableFame !== 'number' || !isFinite(state.spendableFame)) state.spendableFame = 0
          if (typeof state.lifetimeFame !== 'number' || !isFinite(state.lifetimeFame)) state.lifetimeFame = 0
          if (!state.fameUpgrades) state.fameUpgrades = {}
          if (state.finalePoints === undefined) state.finalePoints = 0
          if (state.finaleCount === undefined) state.finaleCount = 0
          if (state.tempoPurchasesThisRun === undefined) state.tempoPurchasesThisRun = 0
          if (state.silentEncoresCompleted === undefined) state.silentEncoresCompleted = 0
          if (state.wallReachedWithoutTempo === undefined) state.wallReachedWithoutTempo = false
          if (state.wallReachedWithoutTempoAtActiveMs === undefined) state.wallReachedWithoutTempoAtActiveMs = 0
          if (state.activeTimePlayed === undefined) state.activeTimePlayed = 0
          state.peakSoundwaves = state.peakSoundwaves instanceof Decimal
            ? state.peakSoundwaves
            : new Decimal(state.peakSoundwaves || 0)
          if (!state.currentRunStartTime) state.currentRunStartTime = Date.now()
          state.producedThisRun = state.producedThisRun instanceof Decimal
            ? state.producedThisRun
            : new Decimal(state.producedThisRun ?? 0)

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
              applausePoints: state.applausePoints,
              layer1WallReached: state.layer1WallReached,
              opusPoints: state.opusPoints,
              opusCount: state.opusCount,
              opusUpgrades: state.opusUpgrades,
              crescendo: state.crescendo,
              peakCrescendoMult: state.peakCrescendoMult,
              recordsSold: state.recordsSold,
              platinum: state.platinum,
              acclaim: state.acclaim,
              lifetimeAcclaim: state.lifetimeAcclaim,
              tourCount: state.tourCount,
              currentVenue: state.currentVenue,
              venueBuffer: state.venueBuffer,
              venueSoldOut: state.venueSoldOut,
              components: state.components,
              catalogueSnapshot: state.catalogueSnapshot,
              worldTourUnlocked: state.worldTourUnlocked,
              autoCollect: state.autoCollect,
              keepAutobuyers: state.keepAutobuyers,
              autoMO: state.autoMO,
              autoMOEnabled: state.autoMOEnabled,
              autoGraduate: state.autoGraduate,
              circuitComplete: state.circuitComplete,
              postPlatinumMoCount: state.postPlatinumMoCount,
              spendableFame: state.spendableFame,
              lifetimeFame: state.lifetimeFame,
              fameUpgrades: state.fameUpgrades,
              finalePoints: state.finalePoints,
              finaleCount: state.finaleCount,
              peakSoundwaves: state.peakSoundwaves,
              producedThisRun: state.producedThisRun,
              tempoPurchasesThisRun: state.tempoPurchasesThisRun,
              silentEncoresCompleted: state.silentEncoresCompleted,
              wallReachedWithoutTempo: state.wallReachedWithoutTempo,
              wallReachedWithoutTempoAtActiveMs: state.wallReachedWithoutTempoAtActiveMs,
              totalTimePlayed: state.totalTimePlayed,
              activeTimePlayed: state.activeTimePlayed,
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
            state.producedThisRun = currentState.producedThisRun
            state.crescendo = currentState.crescendo
            state.peakCrescendoMult = currentState.peakCrescendoMult
            state.recordsSold = currentState.recordsSold
            state.platinum = currentState.platinum
            state.acclaim = currentState.acclaim
            state.lifetimeAcclaim = currentState.lifetimeAcclaim
            state.venueBuffer = currentState.venueBuffer
            state.venueSoldOut = currentState.venueSoldOut
          }

          // Dev shortcut: ?l3 seeds World Tour for instant playtesting
          if (/(?:[?&#])l3\b/.test(location.search + location.hash)) {
            const snapshot = getCatalogueSnapshot(4, 750_000)
            state.worldTourUnlocked = true
            state.catalogueSnapshot = new Decimal(snapshot)
            state.currentVenue = 0
            state.components = {}
            state.venueBuffer = new Decimal(0)
            state.venueSoldOut = false
            state.layer1WallReached = true
            state.opusCount = Math.max(state.opusCount, 4)
            state.platinum = true
            state.recordsSold = Math.max(state.recordsSold, 750_000)
            state.postPlatinumMoCount = Math.max(state.postPlatinumMoCount, L3.GATE_POST_PLAT_MO)
            try {
              const url = new URL(location.href)
              url.searchParams.delete('l3')
              url.hash = url.hash.replace(/([?&#])l3\b&?/g, '$1').replace(/[?&#]+$/, '')
              history.replaceState(null, '', url.pathname + url.search + url.hash)
            } catch { /* noop */ }
            // eslint-disable-next-line no-console
            console.info('[playtest] ?l3 — World Tour unlocked with seeded catalogue')
          }

          state.lastSaveTimestamp = now
        }
      },
    },
  ),
)
