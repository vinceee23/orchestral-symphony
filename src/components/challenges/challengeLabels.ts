import Decimal from 'break_infinity.js'
import { formatNumber } from '../../core/format'
import { MILESTONE_MULTIPLIER } from '../../core/constants'
import type { ChallengeConfig, ChallengeReward } from '../../core/challenges'

/** mm:ss for challenge best-times and summary totals. */
export function formatChallengeTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function formatChallengeReward(reward: ChallengeReward): string {
  const parts: string[] = []
  if (reward.ap > 0) parts.push(`+${reward.ap} Ovation`)
  if (reward.capstone) parts.push('Speed bonus (scales with total time)')
  if (reward.globalProdMult !== undefined) {
    const pct = Math.round((reward.globalProdMult - 1) * 100)
    parts.push(`+${pct}% production`)
  }
  if (reward.costMult !== undefined) {
    const pct = Math.round((1 - reward.costMult) * 100)
    parts.push(`−${pct}% cost`)
  }
  if (reward.tempoBonus !== undefined) parts.push(`+${reward.tempoBonus} tempo`)
  if (reward.crescendoBonus !== undefined) parts.push(`+${reward.crescendoBonus} crescendo ceiling`)
  if (reward.milestoneStrength !== undefined) {
    parts.push(`Milestones ×${MILESTONE_MULTIPLIER + reward.milestoneStrength}`)
  }
  return parts.join(' · ')
}

export function formatAutobuyerUnlock(key: string): string {
  switch (key) {
    case 'tempo':
      return 'Tempo automator'
    case 'finale_auto':
      return 'Finale automator'
    case 'all_auto':
      return 'All automators'
    default:
      return key.replace('tier_', 'Tier ').replace('_auto', ' automator')
  }
}

export function formatUnlockRequirement(
  challenge: ChallengeConfig,
  gate: {
    worldTourUnlocked: boolean
    peakSoundwaves: Decimal
    encoreCount: number
    opusCount: number
  },
): string {
  if (!gate.worldTourUnlocked) return 'Unlock World Tour first'
  const t = challenge.unlockThreshold
  if (t.opusCount !== undefined && gate.opusCount < t.opusCount) {
    return `Requires ${t.opusCount} Magnum Opus`
  }
  if (t.encoreCount !== undefined && gate.encoreCount < t.encoreCount) {
    return `Requires ${t.encoreCount} Encores`
  }
  if (t.peakSoundwaves !== undefined && !gate.peakSoundwaves.gte(t.peakSoundwaves)) {
    return `Requires ${formatNumber(new Decimal(t.peakSoundwaves))} peak Soundwaves`
  }
  return ''
}
