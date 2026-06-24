import { describe, it, expect } from 'vitest'
import { PERKS, hasPerk } from './perks'
import { ACHIEVEMENTS } from './achievements'

describe('perks', () => {
  it('every perk links to a real achievement that grants it', () => {
    const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
    for (const perk of PERKS) {
      const ach = byId.get(perk.achievementId)
      expect(ach, `perk ${perk.id} -> missing achievement ${perk.achievementId}`).toBeDefined()
      // the linked achievement must actually award this perk (else hasPerk is silently always false)
      expect(ach!.reward.perk).toBe(perk.id)
    }
  })

  it('hasPerk gates on the linked achievement being unlocked', () => {
    const perk = PERKS[0]
    expect(hasPerk(new Set(), perk.id)).toBe(false)
    expect(hasPerk(new Set([perk.achievementId]), perk.id)).toBe(true)
  })
})
