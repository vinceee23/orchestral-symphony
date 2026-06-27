import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { CHALLENGES, getChallengeById, isChallengeUnlocked } from './challenges'

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
