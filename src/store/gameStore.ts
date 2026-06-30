import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Decimal from 'break_infinity.js'
import type { GameState, GameActions, AutobuyerState, SignatureDomain } from './types'
import type { BuyAmount } from '../core/constants'
import {
  TIER_CONFIGS, STARTING_SOUNDWAVES, MAX_OFFLINE_MS,
  getEncoreCost, getMagnumOpusCost, getApplauseGain, getAutoEncoreInterval,
  AP_UNLOCK, AP_UNLOCK_AUTO_TOUR,
  GRAND_FINALE_SW_THRESHOLD,
  ENCORE_EP_THRESHOLD,
  AUTOBUYER_DEFAULT_INTERVAL,
  ENCORE_WALL_COUNT,
  PLATINUM_THRESHOLD,
  WARMUP_ACTIVITY_WINDOW_MS,
  DEFAULT_SETTINGS,
} from '../core/constants'
import {
  ENCORE_UPGRADE_MAP, getEncoreUpgradeCost,
  getHeadStartExponent, getRehearsalCostReduction, getOvertureGainMultiplier,
} from '../core/encoreUpgrades'
import { OPUS_UPGRADES, OPUS_UPGRADE_MAP, getOpusUpgradeCost } from '../core/opusUpgrades'
import { hasPerk, ENCORE_UPGRADE_DISCOUNT } from '../core/perks'
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
import { ACHIEVEMENTS, getAchievementCostReduction, getAchievementTierCostReduction, getAchievementHeadStartBoost, getAchievementTempoBonus } from '../core/achievements'
import { getChallengeById, getActiveChallengeModifiers, isChallengeUnlocked, getChallengeStartingSoundwaves, getChallengeMultipliers } from '../core/challenges'
import { createDecimalStorage, SAVE_KEY } from '../core/save'
import { applySettings } from '../core/settingsSync'
import { playChallengeCompleteSound } from '../core/audio'
import { useUiStore } from './uiStore'
import {
  L3, getCatalogueSnapshot, getComponentCost, isVenueGraduatable,
  canUnlockWorldTour, getVenue, getComponentMaxTier,
  canAutoPerformMagnumOpus, canAutoPerformTour, getUnlockFlagsFromComponent, buildVenueGraduationPatch,
} from '../core/worldTour'
import {
  seedSeenStoryBeatsFromProgress,
} from '../components/story/beats'
import { seedSeenHintsFromProgress } from '../components/onboarding/hints'
import { createInitialState } from './initialState'
import { migratePersistedSave } from './saveMigration'
import { applyReset } from '../core/resets'
import {
  SIGNATURE_BUDGET,
  SIGNATURE_DOMAINS,
  ZERO_SIGNATURE_ALLOCATION,
  getSignatureEffects,
  getSignatureEfficiency,
} from '../core/signature'

function createDefaultAutobuyer(): AutobuyerState {
  return {
    unlocked: false,
    enabled: false,
    interval: AUTOBUYER_DEFAULT_INTERVAL,
    bulk: 1,
    lastTick: 0,
  }
}

function mergeSeenHintIds(existing: string[] | undefined, seeded: string[]): string[] {
  if (seeded.length === 0) return existing ?? []
  const seen = new Set(existing ?? [])
  for (const id of seeded) seen.add(id)
  return [...seen]
}

function seedSeenHintsForCurrentProgress(state: GameState): void {
  state.seenHints = mergeSeenHintIds(state.seenHints, seedSeenHintsFromProgress(state))
}

function isNoPrestigeBlocked(state: GameState): boolean {
  if (!state.activeChallenge) return false
  const ch = getChallengeById(state.activeChallenge.challengeId)
  return ch ? getActiveChallengeModifiers(ch).noPrestige : false
}

function getSignatureEffectsForState(state: GameState) {
  const noPrestige = isNoPrestigeBlocked(state)
  return getSignatureEffects(
    noPrestige ? ZERO_SIGNATURE_ALLOCATION : (state.signatureAllocation ?? ZERO_SIGNATURE_ALLOCATION),
    getSignatureEfficiency(noPrestige ? 0 : (state.signatureCount ?? 0)),
  )
}

function isAtSignatureRespecPoint(state: GameState): boolean {
  if (!state.signatureUnlocked || state.activeChallenge) return false
  const produced = state.producedThisRun instanceof Decimal
    ? state.producedThisRun
    : new Decimal(state.producedThisRun ?? 0)
  const peak = state.peakSoundwaves instanceof Decimal
    ? state.peakSoundwaves
    : new Decimal(state.peakSoundwaves ?? 0)
  return produced.lte(0) && peak.lte(0)
}

function validateSignatureAllocation(
  alloc: Record<SignatureDomain, number>,
): Record<SignatureDomain, number> | null {
  const keys = Object.keys(alloc)
  if (keys.some((key) => !SIGNATURE_DOMAINS.includes(key as SignatureDomain))) return null

  const next = { ...ZERO_SIGNATURE_ALLOCATION }
  let total = 0
  for (const domain of SIGNATURE_DOMAINS) {
    const value = alloc[domain]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    if (value < 0 || value > 1) return null
    next[domain] = value
    total += value
  }

  return total <= SIGNATURE_BUDGET + 1e-9 ? next : null
}

function capturePeakDomainAlignment(
  previous: Record<SignatureDomain, number>,
  alloc: Record<SignatureDomain, number>,
): Record<SignatureDomain, number> {
  const next = { ...previous }
  for (const domain of SIGNATURE_DOMAINS) {
    next[domain] = Math.max(previous[domain] ?? 0, alloc[domain] ?? 0)
  }
  return next
}

/** Get effective cost multiplier for buying tiers */
function getEffectiveCostMultiplier(state: GameState, tierId: number): number {
  const achSet = new Set(state.achievements)
  const globalCostRed = getAchievementCostReduction(achSet)
  const tierCostRed = getAchievementTierCostReduction(achSet, tierId)
  // Rehearsal (Encore shop): -5%/level all tier costs
  const rehearsal = 1 - getRehearsalCostReduction(state.encoreUpgrades)

  const challengeMults = getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  )

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

  return mods.costMultiplier
    * globalCostRed
    * tierCostRed
    * rehearsal
    * risingFactor
    * challengeMults.costMult
    * getSignatureEffectsForState(state).costMult
}

function getTotalTempoBonus(state: GameState): number {
  const achBonus = getAchievementTempoBonus(new Set(state.achievements))
  const chBonus = getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  ).tempoBonus
  return achBonus + chBonus + getSignatureEffectsForState(state).tempoBonus
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
          const autoEncoreInterval = getAutoEncoreInterval(after.opusCount)
          if (now - (enc.lastTick ?? 0) >= autoEncoreInterval) {
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
        const afterGrad = get()
        if (afterGrad.circuitComplete && !afterGrad.signatureUnlocked) {
          set({ signatureUnlocked: true })
        }
        const postGrad = get()
        if (canAutoPerformMagnumOpus(postGrad)) {
          get().performMagnumOpus()
        }
        // Auto-Tour capstone: once the catalogue has regrown past the ratio, re-tour hands-free. Checked
        // after auto-MO so the freshly-minted opus/records growth counts toward this tour's snapshot.
        if (canAutoPerformTour(get())) {
          get().performTour()
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

          const challengeMults = getChallengeMultipliers(
            state.completedChallenges,
            state.challengeBestTimes ?? {},
            state.keepChallenges ?? false,
          )
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
                multiplier: mods.noMilestones
                  ? new Decimal(1)
                  : getMilestoneMultiplier(newPurchased, challengeMults.milestoneStrength),
              }
            }
            return t
          })

          return { tiers: newTiers, soundwaves: sw, activityGraceMs: WARMUP_ACTIVITY_WINDOW_MS }
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
          const tempoBonus = getTotalTempoBonus(state)
          return {
            soundwaves: state.soundwaves.minus(cost),
            activityGraceMs: WARMUP_ACTIVITY_WINDOW_MS,
            tempoPurchasesThisRun: (state.tempoPurchasesThisRun ?? 0) + 1,
            tempo: {
              level: newLevel,
              tickInterval: getTempoTickInterval(newLevel, tempoBonus),
              baseBPM: getTempoBPM(newLevel, tempoBonus),
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
            activityGraceMs: WARMUP_ACTIVITY_WINDOW_MS,
            tempoPurchasesThisRun: (state.tempoPurchasesThisRun ?? 0) + levels,
            tempo: {
              level,
              tickInterval: getTempoTickInterval(level, getTotalTempoBonus(state)),
              baseBPM: getTempoBPM(level, getTotalTempoBonus(state)),
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

      // Spend Applause Points to unlock a prestige automation in L2 (auto-encore).
      // Gated by opusCount so the first climb (and a few MO decisions) are hand-played first.
      unlockWithApplause: (key: 'encore' | 'autoTour') => {
        set((state) => {
          if (key === 'autoTour') {
            if (!state.signatureUnlocked || state.autoTour || !state.worldTourUnlocked) return state
            const cfg = AP_UNLOCK_AUTO_TOUR
            if (state.opusCount < cfg.minOpusCount || state.applausePoints < cfg.cost) return state
            return { applausePoints: state.applausePoints - cfg.cost, autoTour: true, autoTourEnabled: true }
          }
          const cfg = AP_UNLOCK[key]
          if (!cfg || state.opusCount < cfg.minOpusCount || state.applausePoints < cfg.cost) return state
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
          playChallengeCompleteSound() // fires once — activeChallenge is cleared below so we don't re-enter
          const runTimeMs = Date.now() - state.activeChallenge.startTime
          const prevBest = state.challengeBestTimes[challenge.id]
          const newBestTimes = {
            ...state.challengeBestTimes,
            [challenge.id]: prevBest !== undefined ? Math.min(prevBest, runTimeMs) : runTimeMs,
          }

          const isFirstClear = !state.completedChallenges.includes(challenge.id)
          const newCompleted = isFirstClear
            ? [...state.completedChallenges, challenge.id]
            : state.completedChallenges
          const apGrant = isFirstClear ? challenge.reward.ap : 0

          // Grant automation unlock only for challenges that have one (idempotent)
          let newAutobuyers = { ...state.autobuyers }
          if (challenge.unlocksAutobuyer) {
            const key = challenge.unlocksAutobuyer
            if (!newAutobuyers[key]) {
              newAutobuyers[key] = createDefaultAutobuyer()
            }
            if (!newAutobuyers[key].unlocked) {
              newAutobuyers = {
                ...newAutobuyers,
                [key]: { ...newAutobuyers[key], unlocked: true },
              }
            }
          }

          const applausePoints = state.applausePoints + apGrant

          // Restore pre-challenge state
          const pre = state.preChallengeState
          if (pre) {
            set({
              soundwaves: pre.soundwaves,
              tiers: pre.tiers,
              tempo: pre.tempo,
              completedChallenges: newCompleted,
              challengeBestTimes: newBestTimes,
              autobuyers: newAutobuyers,
              applausePoints,
              activeChallenge: null,
              preChallengeState: null,
            })
          } else {
            set({
              completedChallenges: newCompleted,
              challengeBestTimes: newBestTimes,
              autobuyers: newAutobuyers,
              applausePoints,
              activeChallenge: null,
              preChallengeState: null,
            })
          }
        }
      },

      startChallenge: (id: string) => {
        const state = get()
        if (state.activeChallenge) return // already in a challenge

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
          soundwaves: getChallengeStartingSoundwaves(challenge, state.achievements),
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

        const reset = applyReset(state, 'encore')
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
          applausePoints: state.applausePoints + Math.floor(getApplauseGain(gain)),
          encoreCount: newEncoreCount,
          lifetimeEncoreCount: (state.lifetimeEncoreCount ?? 0) + 1,
          layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
          silentEncoresCompleted: state.silentEncoresCompleted + (silentRun ? 1 : 0),
          wallReachedWithoutTempo: state.wallReachedWithoutTempo || qualifiedPatron,
          wallReachedWithoutTempoAtActiveMs: qualifiedPatron ? patronActiveMs : state.wallReachedWithoutTempoAtActiveMs,
          activityGraceMs: WARMUP_ACTIVITY_WINDOW_MS,
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
        const wasPlatinum = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
        const resetPatch = applyReset(state, 'magnumOpus')
        set({
          ...resetPatch,
          opusPoints: state.opusPoints + gain,
          opusCount: newOpusCount,
          autobuyers,
          postPlatinumMoCount: wasPlatinum ? state.postPlatinumMoCount + 1 : state.postPlatinumMoCount,
          activityGraceMs: WARMUP_ACTIVITY_WINDOW_MS,
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

      setAutoTourEnabled: (enabled: boolean) => {
        set((state) => {
          if (!state.autoTour) return state
          return { autoTourEnabled: enabled }
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
        const opusCount = state.opusCount
        const newTourCount = state.tourCount + 1

        set({
          ...applyReset(state, 'tour'),
          opusCount,
          recordsSold: carriedRecords,
          platinum: carriedRecords >= PLATINUM_THRESHOLD,
          // Automations reset unless Roadies (keepAutobuyers) — re-buy with persisted AP. auto-MO is a
          // separate boolean (not in the autobuyers map), so it needs the same reset as auto-encore above.
          // (AP, lifetimeEncoreCount, opusCount + the venue ladder/Acclaim all persist by omission.)
          autoMO: state.keepAutobuyers ? state.autoMO : false,
          autoMOEnabled: state.keepAutobuyers ? state.autoMOEnabled : true,
          // Auto-Tour resets unless Roadies too — symmetric with auto-MO/auto-encore. Without Roadies the
          // player re-buys it from persisted AP after each tour.
          autoTour: state.keepAutobuyers ? state.autoTour : false,
          autoTourEnabled: state.keepAutobuyers ? state.autoTourEnabled : true,
          tourCount: newTourCount,
          catalogueSnapshot: new Decimal(getCatalogueSnapshot(opusCount, carriedRecords)),
          venueBuffer: new Decimal(0),
          venueSoldOut: false,
        })
      },

      // === Layer 4: Signature (identity) ===
      setSignatureAllocation: (alloc) => {
        set((state) => {
          if (!isAtSignatureRespecPoint(state)) return state
          const nextAllocation = validateSignatureAllocation(alloc)
          if (!nextAllocation) return state

          return {
            signatureAllocation: nextAllocation,
            peakDomainAlignment: capturePeakDomainAlignment(
              state.peakDomainAlignment,
              nextAllocation,
            ),
          }
        })
      },

      performSignature: () => {
        const state = get()
        if (!state.signatureUnlocked) return
        // TBD-tune (sim/playtest): the first placeholder gate is the L3 circuit break itself.
        if (!state.circuitComplete) return
        if (isNoPrestigeBlocked(state)) return

        set({
          ...applyReset(state, 'signature'),
          signatureCount: state.signatureCount + 1,
          peakDomainAlignment: capturePeakDomainAlignment(
            state.peakDomainAlignment,
            state.signatureAllocation,
          ),
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
          ...applyReset(state, 'grandFinale'),
          finalePoints: state.finalePoints + 1,
          finaleCount: state.finaleCount + 1,
        })
      },

      setStoryBeatSeen: (id) => {
        set((state) => {
          if (state.seenStoryBeats.includes(id)) return state
          return { seenStoryBeats: [...state.seenStoryBeats, id] }
        })
      },

      markHintSeen: (id) => {
        set((state) => {
          const seenHints = state.seenHints ?? []
          if (seenHints.includes(id)) return state
          return { seenHints: [...seenHints, id] }
        })
      },

      updateSettings: (patch) => {
        const next = { ...get().settings, ...patch }
        set({ settings: next })
        applySettings(next, typeof document !== 'undefined' && document.hidden)
      },

      resetSettings: () => {
        const next = { ...DEFAULT_SETTINGS }
        set({ settings: next })
        applySettings(next, typeof document !== 'undefined' && document.hidden)
      },

      hardReset: () => {
        // Wipe progress but KEEP player prefs — settings aren't "progress".
        set({ ...createInitialState(), settings: get().settings })
      },
    }),
    {
      name: SAVE_KEY,
      storage: createDecimalStorage(),
      partialize: (state): GameState => {
        const {
          tick, buyTier, buyMaxTier, buyTempo, buyMaxTempo, setBuyAmount,
          toggleAutobuyer, setAutobuyerBulk, unlockWithApplause, buyEncoreUpgrade, buyOpusUpgrade, checkAchievements, checkChallengeCompletion,
          startChallenge, abandonChallenge,
          performEncore, performMagnumOpus, performGrandFinale,
          buyComponent, buyKeepAutobuyers, graduateVenue, performTour, performSignature, setSignatureAllocation,
          unlockWorldTour, bankVenueAcclaim,
          setAutoMOEnabled, setAutoTourEnabled,
          setStoryBeatSeen, markHintSeen,
          updateSettings, resetSettings,
          hardReset,
          ...data
        } = state
        return data
      },
      onRehydrateStorage: () => {
        return (state: (GameState & GameActions) | undefined) => {
          if (!state) return

          const hadSeenHints = Array.isArray((state as Partial<GameState>).seenHints)
          migratePersistedSave(state)
          if (!hadSeenHints) {
            seedSeenHintsForCurrentProgress(state)
          }
          // Push loaded prefs into the audio/format singletons (migration 3 guarantees state.settings).
          applySettings(state.settings, typeof document !== 'undefined' && document.hidden)

          const now = Date.now()
          const offlineMs = Math.min(now - state.lastSaveTimestamp, MAX_OFFLINE_MS)
          if (offlineMs > 1000 && state.settings.offlineEnabled) {
            const beforeSoundwaves = new Decimal(state.soundwaves)
            const beforeRecords = state.recordsSold
            const beforeAcclaim = new Decimal(state.lifetimeAcclaim ?? 0)
            const chunkMs = 1000
            let remaining = offlineMs
            let currentState: GameState = { ...state }
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
            state.warmUpLevel = currentState.warmUpLevel
            state.activityGraceMs = currentState.activityGraceMs
            state.acclaim = currentState.acclaim
            state.lifetimeAcclaim = currentState.lifetimeAcclaim
            state.venueBuffer = currentState.venueBuffer
            state.venueSoldOut = currentState.venueSoldOut
            seedSeenHintsForCurrentProgress(state)

            // "Welcome back" offline-earnings summary — only for a meaningful absence with real gains.
            const swGained = state.soundwaves.minus(beforeSoundwaves)
            const recGained = state.recordsSold - beforeRecords
            const accGained = new Decimal(state.lifetimeAcclaim ?? 0).minus(beforeAcclaim)
            if (offlineMs > 60_000 && (swGained.gt(0) || recGained > 0 || accGained.gt(0))) {
              useUiStore.getState().setOfflineSummary({
                awayMs: offlineMs,
                soundwaves: swGained,
                records: recGained,
                acclaim: accGained,
              })
            }
          }

          // Dev shortcut: ?l3 seeds World Tour for instant playtesting. DEV-only — never in the
          // public trial build (it would let anyone skip L0-L2; matches the DevPanel gate).
          if (import.meta.env.DEV && /(?:[?&#])l3\b/.test(location.search + location.hash)) {
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
            state.seenStoryBeats = seedSeenStoryBeatsFromProgress(state)
            seedSeenHintsForCurrentProgress(state)
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
