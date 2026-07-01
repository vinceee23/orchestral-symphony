import { describe, it, expect } from 'vitest'
import { resetTiersAndSW } from '../src/core/resets'

// Guards the +100 starting-Soundwaves reward (ach_love_you): it MUST add to the post-prestige soundwaves.
describe('achievement starting-SW reward applies on reset', () => {
  it('adds +100 when ach_love_you is unlocked (10 base → 110)', () => {
    const withAch = resetTiersAndSW(['ach_love_you'])
    expect(withAch.soundwaves?.toNumber()).toBe(110)
  })

  it('is exactly the base (10) with no starting-SW achievements', () => {
    const without = resetTiersAndSW([])
    expect(without.soundwaves?.toNumber()).toBe(10)
  })
})
