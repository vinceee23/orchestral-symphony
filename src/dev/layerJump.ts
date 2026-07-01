import Decimal from 'break_infinity.js'
import {
  TIER_CONFIGS,
  AUTOBUYER_DEFAULT_INTERVAL,
  PLATINUM_THRESHOLD,
} from '../core/constants'
import { getMilestoneMultiplier, getTempoBPM, getTempoTickInterval } from '../core/formulas'
import { LAST_VENUE_ID, L3 } from '../core/worldTour'
import { OPUS_UPGRADES } from '../core/opusUpgrades'
import { ENCORE_UPGRADES } from '../core/encoreUpgrades'
import type { GameState } from '../store/types'

/**
 * DEV layer-jump: build a realistic state patch for a target layer (0–4), cumulative, with that layer's
 * automations UNLOCKED + ENABLED so they actually run. Each automation has its own valid window, so the
 * layer sets the matching one:
 *  - L1 = mid-Encore, PRE-wall → auto-encore runs (it yields to Magnum Opus once the wall hits).
 *  - L2+ = post-wall → tier autobuyers + auto-MO run.
 *  - L3+ = World Tour → auto-graduate venues.
 *  - L4 = Signature revealed (auto-tour only fires during a post-Signature re-climb, i.e. circuitComplete
 *         false; the jump lands on circuitComplete=true so you can Perform Signature, so it won't auto-tour).
 * Pure: returns the patch. Apply with hardReset() → setState(patch) → checkAchievements().
 */

const LAYER_SW = ['1e6', '1e15', '1e45', '1e120', '1e240'] as const

export const maxedTiers = (n: number): GameState['tiers'] =>
  TIER_CONFIGS.map((c) => ({
    id: c.id,
    name: c.name,
    quantity: new Decimal(n),
    purchased: n,
    multiplier: getMilestoneMultiplier(n),
    unlocked: true,
  }))

export const allTierAutobuyers = (): GameState['autobuyers'] => {
  const ab: GameState['autobuyers'] = {}
  for (let i = 1; i <= 7; i++) {
    ab[`tier_${i}`] = { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 'max', lastTick: 0 }
  }
  return ab
}

const encoreAutobuyer = () => ({
  encore: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1 as const, lastTick: 0 },
})

const maxedMap = (defs: { id: string; maxLevel: number }[]) =>
  Object.fromEntries(defs.map((u) => [u.id, u.maxLevel]))

export function buildLayerJumpPatch(layer: number): Partial<GameState> {
  const sw = new Decimal(LAYER_SW[layer])
  const level = 8 + layer * 4
  const patch: Partial<GameState> = {
    tiers: maxedTiers(layer === 0 ? 50 : 100),
    tempo: { level, tickInterval: getTempoTickInterval(level), baseBPM: getTempoBPM(level) },
    soundwaves: sw,
    peakSoundwaves: sw,
    currentRunStartTime: 0, // huge elapsed → auto-MO's re-climb delay is satisfied
  }
  if (layer >= 1) {
    // Mid-Encore. L1 stays PRE-wall so auto-encore runs; L2+ is post-wall (needed for Magnum Opus).
    patch.encoreCount = layer === 1 ? 4 : 8
    patch.layer1WallReached = layer >= 2
    patch.lifetimeEncoreCount = 8
    patch.encorePoints = 500
    patch.lifetimeEncorePoints = 500
    patch.applausePoints = 200
    patch.encoreUpgrades = maxedMap(ENCORE_UPGRADES)
    patch.autobuyers = encoreAutobuyer()
    patch.peakSoundwaves = Decimal.max(sw, new Decimal('1e17')) // clear the EP threshold so an encore yields ≥1 EP
  }
  if (layer >= 2) {
    patch.opusCount = 12
    patch.opusPoints = 500
    patch.opusUpgrades = maxedMap(OPUS_UPGRADES)
    patch.recordsSold = PLATINUM_THRESHOLD * 3
    patch.platinum = true
    patch.postPlatinumMoCount = L3.GATE_POST_PLAT_MO
    patch.peakCrescendoMult = 3
    patch.autoCollect = true
    patch.autoMO = true
    patch.autoMOEnabled = true
    patch.autobuyers = { ...allTierAutobuyers(), ...encoreAutobuyer() } // automation reveal is L2
  }
  if (layer >= 3) {
    patch.worldTourUnlocked = true
    patch.tourCount = 4
    patch.currentVenue = LAST_VENUE_ID
    patch.autoGraduate = true
    patch.lifetimeAcclaim = new Decimal('1e6')
    patch.acclaim = new Decimal('1e4')
  }
  if (layer >= 4) {
    patch.circuitComplete = true
    patch.signatureUnlocked = true
    patch.signatureCount = 5
    patch.autoTour = true
    patch.autoTourEnabled = true
    // signatureAllocation left at zero so you set your own Signature in the panel.
  }
  return patch
}
