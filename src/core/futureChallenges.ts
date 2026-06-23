/**
 * ARCHIVED: Original achievements from v0.2.0
 * These will become future challenges in a later version.
 */

import type { GameState } from '../store/types'

export type LegacyAchievementReward =
  | { type: 'autoCompose'; tierId: number }
  | { type: 'autoTempo' }
  | { type: 'globalMultiplier'; value: number }
  | { type: 'tierMultiplier'; tierId: number; value: number }

export interface LegacyAchievementConfig {
  id: string
  name: string
  description: string
  icon: string
  check: (state: GameState) => boolean
  reward: LegacyAchievementReward
  rewardDescription: string
}

export const LEGACY_ACHIEVEMENTS: LegacyAchievementConfig[] = [
  // Auto-Composer unlocks (7)
  { id: 'auto_notes', name: 'First Note', description: 'Purchase your first Note', icon: '\u{266A}', check: (s) => s.tiers[0].purchased >= 1, reward: { type: 'autoCompose', tierId: 1 }, rewardDescription: 'Unlocks Notes Auto-Composer' },
  { id: 'auto_motifs', name: 'Melodic Memory', description: 'Purchase your first Motif', icon: '\u{266C}', check: (s) => s.tiers[1].purchased >= 1, reward: { type: 'autoCompose', tierId: 2 }, rewardDescription: 'Unlocks Motifs Auto-Composer' },
  { id: 'auto_phrases', name: 'Phrase Turner', description: 'Purchase your first Phrase', icon: '\u{1D11E}', check: (s) => s.tiers[2].purchased >= 1, reward: { type: 'autoCompose', tierId: 3 }, rewardDescription: 'Unlocks Phrases Auto-Composer' },
  { id: 'auto_melodies', name: 'Song Weaver', description: 'Purchase your first Melody', icon: '\u{1D122}', check: (s) => s.tiers[3].purchased >= 1, reward: { type: 'autoCompose', tierId: 4 }, rewardDescription: 'Unlocks Melodies Auto-Composer' },
  { id: 'auto_harmonies', name: 'In Harmony', description: 'Purchase your first Harmony', icon: '\u{1D121}', check: (s) => s.tiers[4].purchased >= 1, reward: { type: 'autoCompose', tierId: 5 }, rewardDescription: 'Unlocks Harmonies Auto-Composer' },
  { id: 'auto_movements', name: 'Grand Movement', description: 'Purchase your first Movement', icon: '\u{1D106}', check: (s) => s.tiers[5].purchased >= 1, reward: { type: 'autoCompose', tierId: 6 }, rewardDescription: 'Unlocks Movements Auto-Composer' },
  { id: 'auto_symphonies', name: 'The Conductor', description: 'Purchase your first Symphony', icon: '\u{1D107}', check: (s) => s.tiers[6].purchased >= 1, reward: { type: 'autoCompose', tierId: 7 }, rewardDescription: 'Unlocks Symphonies Auto-Composer' },

  // Tempo auto-buyer
  { id: 'auto_tempo', name: 'Tempo Keeper', description: 'Upgrade Tempo 10 times', icon: '\u{23F1}', check: (s) => s.tempo.level >= 10, reward: { type: 'autoTempo' }, rewardDescription: 'Unlocks Tempo Auto-Buyer' },

  // Soundwave milestones
  { id: 'sw_1k', name: 'Crescendo', description: 'Reach 1,000 Soundwaves', icon: '\u{1F3B5}', check: (s) => s.soundwaves.gte(1e3), reward: { type: 'globalMultiplier', value: 1.5 }, rewardDescription: 'x1.5 all production' },
  { id: 'sw_1m', name: 'Forte', description: 'Reach 1,000,000 Soundwaves', icon: '\u{1F3B6}', check: (s) => s.soundwaves.gte(1e6), reward: { type: 'globalMultiplier', value: 2 }, rewardDescription: 'x2 all production' },
  { id: 'sw_1b', name: 'Fortissimo', description: 'Reach 1,000,000,000 Soundwaves', icon: '\u{1F50A}', check: (s) => s.soundwaves.gte(1e9), reward: { type: 'globalMultiplier', value: 3 }, rewardDescription: 'x3 all production' },
  { id: 'sw_1qa', name: 'Standing Ovation', description: 'Reach 1e15 Soundwaves', icon: '\u{1F44F}', check: (s) => s.soundwaves.gte(1e15), reward: { type: 'globalMultiplier', value: 5 }, rewardDescription: 'x5 all production' },
  { id: 'sw_1oc', name: 'Magnum Opus', description: 'Reach 1e25 Soundwaves', icon: '\u{1F3C6}', check: (s) => s.soundwaves.gte(1e25), reward: { type: 'globalMultiplier', value: 10 }, rewardDescription: 'x10 all production' },

  // Tier quantity milestones
  { id: 'notes_100', name: 'Note Hoarder', description: 'Own 100 Notes', icon: '\u{1F4DA}', check: (s) => s.tiers[0].purchased >= 100, reward: { type: 'tierMultiplier', tierId: 1, value: 2 }, rewardDescription: 'Notes produce x2' },
  { id: 'motifs_50', name: 'Motif Master', description: 'Own 50 Motifs', icon: '\u{270D}', check: (s) => s.tiers[1].purchased >= 50, reward: { type: 'tierMultiplier', tierId: 2, value: 2 }, rewardDescription: 'Motifs produce x2' },
  { id: 'phrases_25', name: 'Phrase Weaver', description: 'Own 25 Phrases', icon: '\u{1F9F5}', check: (s) => s.tiers[2].purchased >= 25, reward: { type: 'tierMultiplier', tierId: 3, value: 2 }, rewardDescription: 'Phrases produce x2' },

  // Tempo milestones
  { id: 'bpm_120', name: 'Allegro', description: 'Reach 120 BPM', icon: '\u{26A1}', check: (s) => s.tempo.baseBPM >= 120, reward: { type: 'globalMultiplier', value: 1.5 }, rewardDescription: 'x1.5 all production' },
  { id: 'bpm_300', name: 'Presto', description: 'Reach 300 BPM', icon: '\u{1F525}', check: (s) => s.tempo.baseBPM >= 300, reward: { type: 'globalMultiplier', value: 2 }, rewardDescription: 'x2 all production' },
  { id: 'bpm_600', name: 'Prestissimo', description: 'Reach 600 BPM', icon: '\u{2604}', check: (s) => s.tempo.baseBPM >= 600, reward: { type: 'globalMultiplier', value: 3 }, rewardDescription: 'x3 all production' },
]
