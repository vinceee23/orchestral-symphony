import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CHALLENGES,
  getChallengeById,
  isChallengeUnlocked,
  getChallengeMultipliers,
  CHALLENGE_MULT_IDENTITY,
  speedScaledCapstone,
  CAPSTONE_TIME_FLOOR_MS,
  CAPSTONE_TIME_CAP_MS,
  CAPSTONE_MULT_FLOOR,
  CAPSTONE_MULT_CAP,
  getL4ChallengeAscensionPatch,
} from './challenges'

const l3Gate = {
  worldTourUnlocked: true,
  peakSoundwaves: new Decimal(0),
  encoreCount: 0,
  opusCount: 4,
}

describe('isChallengeUnlocked', () => {
  it('requires World Tour before any challenge is visible', () => {
    const solo = getChallengeById('ch_solo')!
    expect(isChallengeUnlocked({ ...l3Gate, worldTourUnlocked: false }, solo)).toBe(false)
  })

  it('unlocks Solo immediately at L3 and Duet at 4 MO', () => {
    expect(isChallengeUnlocked(l3Gate, getChallengeById('ch_solo')!)).toBe(true)
    expect(isChallengeUnlocked(l3Gate, getChallengeById('ch_duet')!)).toBe(true)
    expect(isChallengeUnlocked({ ...l3Gate, opusCount: 3 }, getChallengeById('ch_duet')!)).toBe(false)
  })

  it('spreads harder challenges across encore, MO, and peak SW', () => {
    expect(
      isChallengeUnlocked({ ...l3Gate, opusCount: 5 }, getChallengeById('ch_inflation')!),
    ).toBe(true)
    expect(
      isChallengeUnlocked({ ...l3Gate, encoreCount: 8 }, getChallengeById('ch_adagio')!),
    ).toBe(true)
    expect(
      isChallengeUnlocked(
        { ...l3Gate, peakSoundwaves: new Decimal('1e65') },
        getChallengeById('ch_flat')!,
      ),
    ).toBe(true)
    expect(
      isChallengeUnlocked(
        { ...l3Gate, peakSoundwaves: new Decimal('1e72') },
        getChallengeById('ch_unplugged')!,
      ),
    ).toBe(true)
  })

  it('matches challenge count for ach_vivaldi semantics', () => {
    expect(CHALLENGES.length).toBe(12)
  })
})

describe('getChallengeMultipliers', () => {
  it('returns identity when no challenges completed', () => {
    expect(getChallengeMultipliers([], {})).toEqual(CHALLENGE_MULT_IDENTITY)
  })

  it('stacks flat rewards from completed challenges', () => {
    const completed = ['ch_duet', 'ch_diminuendo', 'ch_inflation', 'ch_adagio', 'ch_flat']
    const mults = getChallengeMultipliers(completed, {})
    expect(mults.globalProdMult).toBeCloseTo(1.15 * 1.5)
    expect(mults.costMult).toBeCloseTo(0.90)
    expect(mults.tempoBonus).toBeCloseTo(0.15)
    expect(mults.milestoneStrength).toBeCloseTo(0.2)
    expect(mults.crescendoBonus).toBe(0)
  })

  it('applies speed-scaled capstone from ch_unplugged best-times', () => {
    const completed = CHALLENGES.map((c) => c.id)
    const slowTimes = Object.fromEntries(completed.map((id) => [id, 10 * 60 * 1000]))
    expect(getChallengeMultipliers(completed, slowTimes).globalProdMult).toBeGreaterThan(5)
    expect(speedScaledCapstone(CAPSTONE_TIME_FLOOR_MS)).toBe(CAPSTONE_MULT_FLOOR)
    expect(speedScaledCapstone(CAPSTONE_TIME_CAP_MS)).toBe(CAPSTONE_MULT_CAP)
    const mid = speedScaledCapstone((CAPSTONE_TIME_FLOOR_MS + CAPSTONE_TIME_CAP_MS) / 2)
    expect(mid).toBeCloseTo((CAPSTONE_MULT_FLOOR + CAPSTONE_MULT_CAP) / 2, 5)
  })

  it('grows capstone mult when total best-time drops', () => {
    const completed = ['ch_unplugged']
    const slow = getChallengeMultipliers(completed, { ch_unplugged: CAPSTONE_TIME_FLOOR_MS })
    const fast = getChallengeMultipliers(completed, { ch_unplugged: CAPSTONE_TIME_CAP_MS })
    expect(fast.globalProdMult).toBeGreaterThan(slow.globalProdMult)
  })
})

describe('getL4ChallengeAscensionPatch', () => {
  it('clears completedChallenges but keeps best-times unless keepChallenges', () => {
    const state = {
      completedChallenges: ['ch_solo', 'ch_duet'],
      challengeBestTimes: { ch_solo: 60_000, ch_duet: 120_000 },
      keepChallenges: false,
    }
    expect(getL4ChallengeAscensionPatch(state)).toEqual({
      completedChallenges: [],
      challengeBestTimes: { ch_solo: 60_000, ch_duet: 120_000 },
    })
    expect(getL4ChallengeAscensionPatch({ ...state, keepChallenges: true }).completedChallenges).toEqual(
      ['ch_solo', 'ch_duet'],
    )
  })
})
