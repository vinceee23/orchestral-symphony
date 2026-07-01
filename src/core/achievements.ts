import Decimal from 'break_infinity.js'
import { CHALLENGES } from './challenges'
import { GRAND_FINALE_SW_THRESHOLD } from './constants'
import { getCrescendoMultiplier } from './crescendo'
import {
  getCrescendoCeiling,
  isAutomatorUnlocked,
  OPUS_UPGRADES,
  type OpusUpgradeTrack,
} from './opusUpgrades'
import type { GameState } from '../store/types'
import type { PerkId } from './perks'

export interface AchievementReward {
  globalPercent?: number
  tierPercent?: { tierId: number; value: number }
  tempoBonus?: number
  costReduction?: number
  tierCostReduction?: { tierId: number; value: number }
  startingSW?: number
  headStartBoost?: number
  perk?: PerkId
  none?: true
}

export interface AchievementConfig {
  id: string
  name: string
  description: string
  icon: string
  check: (state: GameState) => boolean
  reward: AchievementReward
  rewardDescription: string
  /** Easter eggs stay mysterious until unlocked. */
  hidden?: boolean
}

function isAnyOpusTrackMaxed(levels: Record<string, number>): boolean {
  return countMaxedOpusTracks(levels) >= 1
}

function countMaxedOpusTracks(levels: Record<string, number>): number {
  const tracks: OpusUpgradeTrack[] = ['AUTOMATORS', 'CRESCENDO', 'TEMPO', 'OP_GAIN']
  return tracks.filter((track) => {
    const upgrades = OPUS_UPGRADES.filter((u) => u.track === track)
    return upgrades.length > 0 && upgrades.every((u) => (levels[u.id] ?? 0) >= u.maxLevel)
  }).length
}

function totalOpusUpgradeLevels(levels: Record<string, number>): number {
  return Object.values(levels).reduce((a, b) => a + b, 0)
}

function isAtCrescendoCeiling(state: GameState): boolean {
  const ceiling = getCrescendoCeiling(state.opusUpgrades)
  return getCrescendoMultiplier(state.crescendo, state.opusUpgrades) >= ceiling - 0.02
}

/** Foreground play time only — excludes offline catch-up. */
function activePlayMs(s: GameState): number {
  return s.activeTimePlayed ?? 0
}

/** True when all 7 tier auto-buyers are unlocked AND enabled (the full hands-free rig). */
function allTierAutobuyersRunning(s: GameState): boolean {
  for (let i = 1; i <= 7; i++) {
    const ab = s.autobuyers[`tier_${i}`]
    if (!ab || !ab.unlocked || !ab.enabled) return false
  }
  return true
}

/**
 * ACHIEVEMENTS — curated for MEANING, not drip. (2026-06-29 overhaul: cut ~285 number-padding /
 * playtime-ladder filler that existed only to satisfy the pacing sim's old "reward every ≤20 min" rule.
 * Pacing is the economy's job now; achievements reward firsts, completion, mastery, playstyle, speed,
 * discovery, and challenge depth. Production lost from the deleted filler was folded back into the kept
 * milestones — see the rebalanced globalPercent values, sim-guarded by human-pacing's globalAtPlat band.)
 */
export const ACHIEVEMENTS: AchievementConfig[] = [
  // === Early game — firsts & first soundwaves ===
  {
    id: 'ach_real_life',
    name: 'Is This the Real Life?',
    description: 'Own 1 Note',
    icon: '\u{1F3A4}',
    check: (s) => s.tiers[0].purchased >= 1,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_let_it_be',
    name: 'Let It Be',
    description: 'Reach 100 Soundwaves',
    icon: '\u{1F3B9}',
    check: (s) => s.soundwaves.gte(100),
    reward: { globalPercent: 0.03 },
    rewardDescription: '+3% all production',
  },
  {
    id: 'ach_dont_stop',
    name: "Don't Stop Believin'",
    description: 'Buy 10 Notes',
    icon: '\u{1F3B8}',
    check: (s) => s.tiers[0].purchased >= 10,
    reward: { tierPercent: { tierId: 1, value: 0.10 } },
    rewardDescription: '+10% Notes production',
  },
  {
    id: 'ach_sweet_child',
    name: "Sweet Child O' Mine",
    description: 'Buy 50 Notes',
    icon: '\u{1F476}',
    check: (s) => s.tiers[0].purchased >= 50,
    reward: { tierPercent: { tierId: 1, value: 0.15 } },
    rewardDescription: '+15% Notes production',
  },
  {
    id: 'ach_dust',
    name: 'Another One Bites the Dust',
    description: 'Complete your first Encore',
    icon: '\u{1F451}',
    check: (s) => s.encoreCount >= 1,
    reward: { tierCostReduction: { tierId: 1, value: 0.05 } },
    rewardDescription: '-5% Notes cost',
  },
  {
    id: 'ach_pressure',
    name: 'Under Pressure',
    description: 'Upgrade Tempo once',
    icon: '\u{23F1}',
    check: (s) => s.tempo.level >= 1,
    reward: { tempoBonus: 0.10 },
    rewardDescription: '+10% tempo speed',
  },
  {
    id: 'ach_take_on_me',
    name: 'Take On Me',
    description: 'Own 1 Motif',
    icon: '\u{1F3B6}',
    check: (s) => s.tiers[1].purchased >= 1,
    reward: { tierPercent: { tierId: 2, value: 0.10 } },
    rewardDescription: '+10% Motifs production',
  },
  {
    id: 'ach_rickroll',
    name: 'Never Gonna Give You Up',
    description: 'Own 42 Notes',
    icon: '\u{1F57A}',
    hidden: true,
    check: (s) => s.tiers[0].purchased >= 42,
    reward: { startingSW: 42 },
    rewardDescription: '+42 starting Soundwaves',
  },

  // === Pre-Encore — tiers unlock, the climb begins ===
  {
    id: 'ach_stairway',
    name: 'Stairway to Heaven',
    description: 'Own 1 Phrase',
    icon: '\u{1FA87}',
    check: (s) => s.tiers[2].purchased >= 1,
    reward: { tierPercent: { tierId: 3, value: 0.10 } },
    rewardDescription: '+10% Phrases production',
  },
  {
    id: 'ach_thunder',
    name: 'Thunderstruck',
    description: 'Reach 1,000,000 Soundwaves',
    icon: '\u{26A1}',
    check: (s) => s.soundwaves.gte(1e6),
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_rock_you',
    name: 'We Will Rock You',
    description: 'Reach 120 BPM',
    icon: '\u{270A}',
    check: (s) => s.tempo.baseBPM >= 120,
    reward: { tempoBonus: 0.15 },
    rewardDescription: '+15% tempo speed',
  },
  {
    id: 'ach_fur_elise',
    name: 'Für Elise',
    description: 'Own 1 Melody',
    icon: '\u{1F3BB}',
    check: (s) => s.tiers[3].purchased >= 1,
    reward: { tierPercent: { tierId: 4, value: 0.10 } },
    rewardDescription: '+10% Melodies production',
  },
  {
    id: 'ach_bohemian',
    name: 'Bohemian Rhapsody',
    description: 'Own 100 of 3 different tiers',
    icon: '\u{1F3AD}',
    check: (s) => s.tiers.filter((t) => t.purchased >= 100).length >= 3,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_mass_b_minor',
    name: 'Mass in B Minor',
    description: 'Own 100 of a single tier',
    icon: '\u{1F4DC}',
    check: (s) => s.tiers.some((t) => t.purchased >= 100),
    reward: { costReduction: 0.04 },
    rewardDescription: '-4% all costs',
  },

  // === Encore era ===
  {
    id: 'ach_hotel',
    name: 'Hotel California',
    description: 'Own 1 Harmony',
    icon: '\u{1F3E8}',
    check: (s) => s.tiers[4].purchased >= 1,
    reward: { tierPercent: { tierId: 5, value: 0.10 } },
    rewardDescription: '+10% Harmonies production',
  },
  {
    id: 'ach_beat_it',
    name: 'Beat It',
    description: 'Complete 3 Encores',
    icon: '\u{1F94A}',
    check: (s) => s.encoreCount >= 3,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_teen_spirit',
    name: 'Despacito',
    description: 'Complete 5 Encores',
    icon: '\u{1F4BF}',
    check: (s) => s.encoreCount >= 5,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_seven_nation',
    name: 'Seven Nation Army',
    description: 'Complete 7 Encores',
    icon: '\u{1F941}',
    check: (s) => s.encoreCount >= 7,
    reward: { globalPercent: 0.07 },
    rewardDescription: '+7% all production',
  },
  {
    id: 'ach_feeling',
    name: "Can't Stop the Feeling",
    description: 'Own 1 Movement',
    icon: '\u{1F483}',
    check: (s) => s.tiers[5].purchased >= 1,
    reward: { tierPercent: { tierId: 6, value: 0.10 } },
    rewardDescription: '+10% Movements production',
  },
  {
    id: 'ach_all_star',
    name: "Hey Now, You're an All Star",
    description: 'Own 10+ of every tier',
    icon: '\u{2B50}',
    check: (s) => s.tiers.every((t) => t.purchased >= 10),
    reward: { globalPercent: 0.06, costReduction: 0.04 },
    rewardDescription: '+6% all production · -4% all costs',
  },
  {
    id: 'ach_higher_ground',
    name: 'Higher Ground',
    description: 'Reach 1e22 Soundwaves',
    icon: '\u{26F0}',
    check: (s) => s.soundwaves.gte('1e22'),
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_one_more',
    name: 'One More Time',
    description: 'Earn 10 lifetime Encore Points before your first Magnum Opus',
    icon: '\u{1F504}',
    check: (s) => s.opusCount === 0 && s.lifetimeEncorePoints >= 10,
    reward: { globalPercent: 0.12, headStartBoost: 0.04 },
    rewardDescription: '+12% all production · +4% Encore head-start (more of last run carried forward)',
  },
  {
    id: 'ach_yesterday',
    name: 'Yesterday',
    description: 'Play for 30 active minutes',
    icon: '\u{231B}',
    check: (s) => activePlayMs(s) >= 30 * 60 * 1000,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_purist',
    name: 'The Purist',
    description: 'Reach the 8-Encore wall having never upgraded Tempo this run',
    icon: '\u{1F9D8}',
    hidden: true,
    // Playstyle feat: hard restraint (zero Tempo). The sim's greedy model always buys Tempo, so this only
    // pops for a deliberate player — never auto-handed. (perk-patron is the looser ≤8-Tempo cousin.)
    check: (s) => s.opusCount === 0 && s.encoreCount >= 8 && s.tempo.level === 0,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_flash_encore',
    name: 'Flash Encore',
    description: 'Reach the 8-Encore wall in under 50 active minutes',
    icon: '\u{26A1}',
    hidden: true,
    check: (s) => s.opusCount === 0 && s.encoreCount >= 8 && activePlayMs(s) < 50 * 60 * 1000,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },

  // === Symphony & Magnum Opus gate ===
  {
    id: 'ach_champions',
    name: 'We Are the Champions',
    description: 'Own 1 Symphony',
    icon: '\u{1F3C6}',
    check: (s) => s.tiers[6].purchased >= 1,
    reward: { tierPercent: { tierId: 7, value: 0.15 } },
    rewardDescription: '+15% Symphonies production',
  },
  {
    id: 'ach_symphony_no5',
    name: 'Symphony No. 5',
    description: 'Own 5 Symphonies',
    icon: '\u{1F3BC}',
    check: (s) => s.tiers[6].purchased >= 5,
    reward: { tierPercent: { tierId: 7, value: 0.20 } },
    rewardDescription: '+20% Symphonies production',
  },
  {
    id: 'ach_symphony_horde',
    name: 'Orchestra Pit',
    description: 'Own 25 Symphonies',
    icon: '\u{1F3A4}',
    check: (s) => s.tiers[6].purchased >= 25,
    reward: { tierPercent: { tierId: 7, value: 0.10 } },
    rewardDescription: '+10% Symphonies production',
  },
  {
    id: 'ach_symphony_forty',
    name: 'Full Orchestra',
    description: 'Own 40 Symphonies',
    icon: '\u{1F3BC}',
    check: (s) => s.tiers[6].purchased >= 40,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_love_you',
    name: 'I Will Always Love You',
    description: 'Reach 1e18 Soundwaves',
    icon: '\u{2764}',
    check: (s) => s.soundwaves.gte('1e18'),
    reward: { startingSW: 100 },
    rewardDescription: '+100 starting Soundwaves',
  },
  {
    id: 'ach_imagine',
    name: 'Imagine',
    description: 'Unlock all 7 tiers',
    icon: '\u{1F308}',
    check: (s) => s.tiers.filter((t) => t.unlocked).length >= 7,
    reward: { globalPercent: 0.06, costReduction: 0.07 },
    rewardDescription: '+6% all production · -7% all costs',
  },
  {
    id: 'ach_hello',
    name: 'Eye of the Tiger',
    description: 'Own 500 of a single tier',
    icon: '\u{1F405}',
    check: (s) => s.tiers.some((t) => t.purchased >= 500),
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_purple_rain',
    name: 'Purple Rain',
    description: 'Reach the Magnum Opus era',
    icon: '\u{1F7E3}',
    check: (s) => s.layer1WallReached,
    reward: { globalPercent: 0.14 },
    rewardDescription: '+14% all production',
  },
  {
    id: 'ach_magnum',
    name: 'Magnum Opus',
    description: 'Complete your first Magnum Opus',
    icon: '\u{1F3C5}',
    check: (s) => s.opusCount >= 1,
    reward: { globalPercent: 0.25 },
    rewardDescription: '+25% all production',
  },
  {
    id: 'ach_prodigy',
    name: 'Prodigy',
    description: 'Reach your first Magnum Opus in under 45 active minutes',
    icon: '\u{1F31F}',
    hidden: true,
    check: (s) => s.opusCount >= 1 && activePlayMs(s) < 45 * 60 * 1000,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },

  // === Layer 2 — Conducting, Records & the Opus tree ===
  {
    id: 'ach_raise_baton',
    name: 'Raise the Baton',
    description: 'Conduct for the first time',
    icon: '\u{1F3BA}',
    check: (s) => s.crescendo > 0,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_studio_time',
    name: 'Studio Time',
    description: 'Buy your first Opus upgrade',
    icon: '\u{1F399}',
    check: (s) => Object.keys(s.opusUpgrades).length > 0,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_crescendo_forte',
    name: 'Mezzo Forte',
    description: 'Peak crescendo multiplier reaches x3',
    icon: '\u{1F3BA}',
    check: (s) => s.opusCount > 0 && s.peakCrescendoMult >= 3,
    reward: { tempoBonus: 0.05 },
    rewardDescription: '+5% tempo speed',
  },
  {
    id: 'ach_turn_it_up',
    name: 'Turn It Up to Eleven',
    description: 'Hit the crescendo ceiling',
    icon: '\u{1F50A}',
    check: (s) => s.opusCount > 0 && (s.peakCrescendoMult >= 3 || isAtCrescendoCeiling(s)),
    reward: { tempoBonus: 0.05 },
    rewardDescription: '+5% tempo speed',
  },
  {
    id: 'ach_dont_stop_me',
    name: "Don't Stop Me Now",
    description: 'Peak crescendo multiplier reaches x2 after your first Magnum Opus',
    icon: '\u{1F525}',
    check: (s) => s.opusCount >= 1 && s.peakCrescendoMult >= 2,
    reward: { tempoBonus: 0.20 },
    rewardDescription: '+20% tempo speed',
  },
  {
    id: 'ach_session_player',
    name: 'Session Player',
    description: 'Unlock the Phrases auto-buyer',
    icon: '\u{1F3B8}',
    check: (s) => (s.opusUpgrades['automator-unlock-3'] ?? 0) >= 1,
    reward: { tierPercent: { tierId: 3, value: 0.10 } },
    rewardDescription: '+10% Phrases production',
  },
  {
    id: 'ach_melody_machine',
    name: 'Melody Machine',
    description: 'Unlock the Melodies auto-buyer',
    icon: '\u{1F3B9}',
    check: (s) => (s.opusUpgrades['automator-unlock-4'] ?? 0) >= 1,
    reward: { tierPercent: { tierId: 4, value: 0.10 } },
    rewardDescription: '+10% Melodies production',
  },
  {
    id: 'ach_harmony_bot',
    name: 'Harmony Bot',
    description: 'Unlock the Harmonies auto-buyer',
    icon: '\u{1F916}',
    check: (s) => (s.opusUpgrades['automator-unlock-5'] ?? 0) >= 1,
    reward: { tierPercent: { tierId: 5, value: 0.10 } },
    rewardDescription: '+10% Harmonies production',
  },
  {
    id: 'ach_set_forget',
    name: 'Set It and Forget It',
    description: 'Unlock all tier auto-buyers',
    icon: '\u{1F916}',
    check: (s) => {
      for (let i = 1; i <= 7; i++) {
        if (!isAutomatorUnlocked(s.opusUpgrades, i)) return false
      }
      return true
    },
    reward: { costReduction: 0.03 },
    rewardDescription: '-3% all costs',
  },
  {
    id: 'ach_twinkle',
    name: 'Twinkle Twinkle Little Star',
    description: 'Have all 7 tier autobuyers enabled simultaneously',
    icon: '\u{2728}',
    check: (s) => allTierAutobuyersRunning(s),
    reward: { startingSW: 500 },
    rewardDescription: '+500 starting Soundwaves',
  },
  {
    id: 'ach_gold_record',
    name: 'Gold Record',
    description: 'Sell 100,000 records',
    icon: '\u{1F4BF}',
    check: (s) => s.recordsSold >= 100_000,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_going_platinum',
    name: 'Going Platinum',
    description: 'Go Platinum — 1,000,000 records sold',
    icon: '\u{1F4FA}',
    check: (s) => s.platinum || s.recordsSold >= 1_000_000,
    reward: { globalPercent: 0.18 },
    rewardDescription: '+18% all production',
    hidden: true, // mystery: stays "???" until you cross 1M records — the reveal IS the payoff
  },
  {
    id: 'ach_autopilot',
    name: 'Set the Tempo, Walk Away',
    description: 'Go Platinum with all 7 tier autobuyers running',
    icon: '\u{1F6E0}',
    // Playstyle feat: rewards the full hands-free rig carrying you to Platinum.
    check: (s) => s.platinum && allTierAutobuyersRunning(s),
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_diamond_hands',
    name: 'Diamond Hands',
    description: 'Sell 10,000,000 records',
    icon: '\u{1F48E}',
    check: (s) => s.recordsSold >= 10_000_000,
    reward: { costReduction: 0.03 },
    rewardDescription: '-3% all costs',
  },
  {
    id: 'ach_royalty_check',
    name: 'Royalty Check',
    description: 'Sell 50,000,000 records',
    icon: '\u{1F4B0}',
    check: (s) => s.recordsSold >= 50_000_000,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_cultural_icon',
    name: 'Cultural Icon',
    description: 'Sell 100,000,000 records',
    icon: '\u{1F30D}',
    check: (s) => s.recordsSold >= 100_000_000,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_diamond_certified',
    name: 'Diamond Certified',
    description: 'Sell 250,000,000 records',
    icon: '\u{1F48E}',
    hidden: true,
    check: (s) => s.recordsSold >= 250_000_000,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_blitz_platinum',
    name: 'Blitz Platinum',
    description: 'Go Platinum in under 14 active hours',
    icon: '\u{1F3C1}',
    hidden: true,
    check: (s) => s.platinum && activePlayMs(s) < 14 * 60 * 60 * 1000,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },

  // === Magnum Opus progression ===
  {
    id: 'ach_double_feature',
    name: 'Double Feature',
    description: 'Complete 2 Magnum Opuses',
    icon: '\u{1F3AC}',
    check: (s) => s.opusCount >= 2,
    reward: { globalPercent: 0.07, perk: 'perk-keep-encore-upgrades' },
    rewardDescription: '+7% all production Â· PERK: keep your Encore upgrades through a Magnum Opus',
  },
  {
    id: 'ach_opus_three',
    name: 'Three-peat',
    description: 'Complete 3 Magnum Opuses',
    icon: '\u{1F948}',
    check: (s) => s.opusCount >= 3,
    reward: { globalPercent: 0.10 },
    rewardDescription: '+10% all production',
  },
  {
    id: 'ach_sold_out_tour',
    name: 'Sold Out Tour',
    description: 'Complete 5 Magnum Opuses',
    icon: '\u{1F3DF}',
    check: (s) => s.opusCount >= 5,
    reward: { globalPercent: 0.08 },
    rewardDescription: '+8% all production',
  },
  {
    id: 'ach_opus_ten',
    name: 'Perfect Ten',
    description: 'Complete 10 Magnum Opuses',
    icon: '\u{1F947}',
    check: (s) => s.opusCount >= 10,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_twenty_pieces',
    name: 'Twenty-Twenty Hindsight',
    description: 'Complete 20 Magnum Opuses',
    icon: '\u{1F4F0}',
    check: (s) => s.opusCount >= 20,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_the_long_game',
    name: 'The Long Game',
    description: 'Complete 25 Magnum Opuses',
    icon: '\u{267E}',
    check: (s) => s.opusCount >= 25,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_remaster_wall',
    name: 'Back to the Wall',
    description: 'Re-reach the 8-Encore wall after a Magnum Opus',
    icon: '\u{1F9F1}',
    check: (s) => s.opusCount >= 1 && s.encoreCount >= 8,
    reward: { headStartBoost: 0.04 },
    rewardDescription: '+4% Encore head-start (start each run with more of your last run carried forward)',
  },
  {
    id: 'ach_one_more_really',
    name: 'One More Time (Seriously)',
    description: 'Complete 24 Encores',
    icon: '\u{1F501}',
    check: (s) => s.encoreCount >= 24,
    reward: { globalPercent: 0.05, headStartBoost: 0.04 },
    rewardDescription: '+5% all production · +4% Encore head-start (more of last run carried forward)',
  },
  {
    id: 'ach_encore_of_encores',
    name: 'Encore of Encores',
    description: 'Complete 50 Encores',
    icon: '\u{1F501}',
    check: (s) => s.encoreCount >= 50,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },

  // === Opus tree mastery ===
  {
    id: 'ach_whole_catalogue',
    name: 'The Whole Catalogue',
    description: 'Max out one full Opus upgrade track',
    icon: '\u{1F4DA}',
    check: (s) => isAnyOpusTrackMaxed(s.opusUpgrades),
    reward: { costReduction: 0.03 },
    rewardDescription: '-3% all costs',
  },
  {
    id: 'ach_second_movement',
    name: 'Second Movement',
    description: 'Max out two full Opus upgrade tracks',
    icon: '\u{1F3BB}',
    check: (s) => countMaxedOpusTracks(s.opusUpgrades) >= 2,
    reward: { costReduction: 0.04 },
    rewardDescription: '-4% all costs',
  },
  {
    id: 'ach_third_movement',
    name: 'Third Movement',
    description: 'Max out three full Opus upgrade tracks',
    icon: '\u{1F3BA}',
    check: (s) => countMaxedOpusTracks(s.opusUpgrades) >= 3,
    reward: { costReduction: 0.04 },
    rewardDescription: '-4% all costs',
  },
  {
    id: 'ach_maestro',
    name: 'Maestro',
    description: 'Max out all four Opus upgrade tracks',
    icon: '\u{1F39C}',
    check: (s) => countMaxedOpusTracks(s.opusUpgrades) >= 4,
    reward: { costReduction: 0.05 },
    rewardDescription: '-5% all costs',
  },
  {
    id: 'ach_tree_climber',
    name: "Climb Ev'ry Mountain",
    description: 'Reach 10 total Opus-tree upgrade levels',
    icon: '\u{1F332}',
    check: (s) => totalOpusUpgradeLevels(s.opusUpgrades) >= 10,
    reward: { tierCostReduction: { tierId: 6, value: 0.02 } },
    rewardDescription: '-2% Movements cost',
  },
  {
    id: 'ach_tree_legacy',
    name: 'Legacy Recording',
    description: 'Reach 40 total Opus-tree upgrade levels',
    icon: '\u{1F4DC}',
    check: (s) => s.opusCount > 0 && totalOpusUpgradeLevels(s.opusUpgrades) >= 40,
    reward: { tierCostReduction: { tierId: 6, value: 0.02 } },
    rewardDescription: '-2% Movements cost',
  },

  // === Completionist / deep tiers ===
  {
    id: 'ach_renaissance',
    name: 'Renaissance',
    description: 'Own 100 of every tier',
    icon: '\u{1F3DB}',
    check: (s) => s.tiers.every((t) => t.purchased >= 100),
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_smooth_criminal',
    name: 'Smooth Criminal',
    description: 'Own 250 of every tier',
    icon: '\u{1F574}',
    check: (s) => s.tiers.every((t) => t.purchased >= 250),
    reward: { tierCostReduction: { tierId: 7, value: 0.08 } },
    rewardDescription: '-8% Symphonies cost',
  },
  {
    id: 'ach_ode_to_joy',
    name: 'Ode to Joy',
    description: 'Own 1,000 of every tier',
    icon: '\u{1F389}',
    check: (s) => s.tiers.every((t) => t.purchased >= 1000),
    reward: { costReduction: 0.07 },
    rewardDescription: '-7% all costs',
  },
  {
    id: 'ach_lose_yourself',
    name: 'Lose Yourself',
    description: 'Own 300 of a tier after the wall',
    icon: '\u{1F3A4}',
    check: (s) => s.layer1WallReached && s.tiers.some((t) => t.purchased >= 300),
    reward: { costReduction: 0.04 },
    rewardDescription: '-4% all costs',
  },

  // === Tempo / speed ===
  {
    id: 'ach_night_fever',
    name: 'Night Fever',
    description: 'Reach 2,500 BPM',
    icon: '\u{1F31C}',
    check: (s) => s.tempo.baseBPM >= 2500,
    reward: { tempoBonus: 0.25 },
    rewardDescription: '+25% tempo speed',
  },
  {
    id: 'ach_rush',
    name: 'The Spirit of Radio',
    description: 'Reach 50 ticks per second',
    icon: '\u{1F4FB}',
    check: (s) => s.tempo.tickInterval <= 20,
    reward: { tempoBonus: 0.15 },
    rewardDescription: '+15% tempo speed',
  },
  {
    id: 'ach_speed_demon',
    name: 'Through the Fire and Flames',
    description: 'Reach 100 ticks per second',
    icon: '\u{1F525}',
    check: (s) => s.tempo.tickInterval <= 10,
    reward: { tempoBonus: 0.30 },
    rewardDescription: '+30% tempo speed',
  },

  // === Challenges & mastery ===
  {
    id: 'ach_around_world',
    name: 'Around the World',
    description: 'Complete 5 challenges',
    icon: '\u{1F30D}',
    check: (s) => s.completedChallenges.length >= 5,
    reward: { costReduction: 0.05 },
    rewardDescription: '-5% all costs',
  },
  {
    id: 'ach_vivaldi',
    name: 'The Four Seasons',
    description: 'Complete all challenges',
    icon: '\u{1F342}',
    check: (s) => s.completedChallenges.length >= CHALLENGES.length,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_polymath',
    name: 'Polymath',
    description: 'Complete all challenges AND max all four Opus tracks',
    icon: '\u{1F393}',
    check: (s) =>
      s.completedChallenges.length >= CHALLENGES.length && countMaxedOpusTracks(s.opusUpgrades) >= 4,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },

  // === High soundwaves & hidden thresholds ===
  {
    id: 'ach_stardust',
    name: 'Ziggy Stardust',
    description: 'Reach 1e200 Soundwaves',
    icon: '\u{1FA90}',
    check: (s) => s.soundwaves.gte('1e200'),
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_free_bird',
    name: 'Free Bird',
    description: 'Reach 1e220 Soundwaves',
    icon: '\u{1F985}',
    check: (s) => s.soundwaves.gte('1e220'),
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_the_sonance',
    name: 'The Sonance',
    description: 'Reach 1e108 peak Soundwaves',
    icon: '\u{1F52E}',
    hidden: true,
    check: (s) => s.peakSoundwaves.gte('1e108'),
    reward: { none: true },
    rewardDescription: 'Collectible — the phenomenon stirs',
  },
  {
    id: 'ach_big_bang',
    name: 'Big Bang',
    description: 'Reach 1e300 peak Soundwaves',
    icon: '\u{1F4A5}',
    hidden: true,
    check: (s) => s.peakSoundwaves.gte('1e300'),
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },

  // === Grand Finale ===
  {
    id: 'ach_final_countdown',
    name: 'The Final Countdown',
    description: 'Reach the Grand Finale wall',
    icon: '\u{23F0}',
    check: (s) => s.peakSoundwaves.gte(GRAND_FINALE_SW_THRESHOLD),
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_grand_finale',
    name: 'Grand Finale!',
    description: 'Complete your first Grand Finale',
    icon: '\u{1F386}',
    check: (s) => s.finaleCount >= 1,
    reward: { globalPercent: 0.07 },
    rewardDescription: '+7% all production',
  },
  {
    id: 'ach_back_in_black',
    name: 'Back in Black',
    description: 'Complete 2 Grand Finales',
    icon: '\u{1F5A4}',
    check: (s) => s.finaleCount >= 2,
    reward: { globalPercent: 0.08 },
    rewardDescription: '+8% all production',
  },
  {
    id: 'ach_grand_tour',
    name: 'Grand Tour',
    description: 'Complete 3 Grand Finales',
    icon: '\u{1F30C}',
    check: (s) => s.finaleCount >= 3,
    reward: { globalPercent: 0.06 },
    rewardDescription: '+6% all production',
  },
  {
    id: 'ach_second_universe',
    name: 'Second Verse, Same as the First',
    description: 'Record a Magnum Opus in a new universe (post-Grand Finale)',
    icon: '\u{1F30C}',
    check: (s) => s.finaleCount >= 1 && s.opusCount >= 1,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },

  // === Hidden easter eggs ===
  {
    id: 'ach_sandstorm',
    name: 'Darude — Sandstorm',
    description: 'Reach Notes quantity × multiplier over 1e20',
    icon: '\u{1F3B5}',
    hidden: true,
    check: (s) => {
      const t = s.tiers[0]
      if (t.quantity.eq(0)) return false
      return t.quantity.times(t.multiplier).gte(1e20)
    },
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_nyan',
    name: 'Nyan Cat Theme',
    description: 'Own 999+ of a single tier',
    icon: '\u{1F431}',
    hidden: true,
    check: (s) => s.tiers.some((t) => t.quantity.gte(999)),
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },

  // === Long play ===
  {
    id: 'ach_comfortably_numb',
    name: 'Comfortably Numb',
    description: 'Play for 3.5 active hours',
    icon: '\u{1F4A4}',
    check: (s) => activePlayMs(s) >= 3.5 * 60 * 60 * 1000,
    reward: { startingSW: 1000 },
    rewardDescription: '+1,000 starting Soundwaves',
  },

  // === Perk achievements (load-bearing — perks.ts maps these IDs to perks) ===
  {
    id: 'ach_perk_skip_wall',
    name: 'No Encore Required',
    description: 'Complete 5 Magnum Opuses',
    icon: '\u{1F6A9}',
    check: (s) => s.opusCount >= 5,
    reward: { perk: 'perk-skip-wall' },
    rewardDescription: 'PERK: Magnum Opus no longer requires re-reaching the 8-Encore wall',
  },
  {
    id: 'ach_perk_muscle_memory',
    name: 'Muscle Memory',
    description: 'Go Platinum',
    icon: '\u{1F4FA}',
    check: (s) => s.platinum === true,
    reward: { none: true },
    rewardDescription: 'Collectible Â· Muscle Memory is now earned earlier from Double Feature',
    hidden: true, // legacy Platinum collectible; the perk gate moved to Double Feature for the trial
  },
  {
    id: 'ach_perk_warmup',
    name: 'Sound Check',
    description: 'Complete 3 Magnum Opuses',
    icon: '\u{1F3A4}',
    check: (s) => s.opusCount >= 3,
    reward: { perk: 'perk-warmup' },
    rewardDescription: 'PERK: start each run with 2 tiers pre-bought + bonus Soundwaves',
  },
  {
    id: 'ach_perk_session_musicians',
    name: 'Session Musicians',
    description: 'Unlock automators for every tier',
    icon: '\u{1F916}',
    check: (s) => [2, 3, 4, 5, 6, 7].every((t) => isAutomatorUnlocked(s.opusUpgrades, t)),
    reward: { perk: 'perk-fast-automators' },
    rewardDescription: 'PERK: automators run one speed tier faster',
  },
  {
    id: 'ach_perk_tempo_headstart',
    name: 'Speed of Sound',
    description: 'On an early Magnum Opus run (no Sight-Reading head-start), produce 1e40 Soundwaves within 12 minutes',
    icon: '\u{23F1}',
    // Early-game speed race: gated to the first couple of MO runs AND no Sight-Reading head-start, so a
    // developed player's huge production can't trivially auto-pop it. Not strandable (pre-Platinum, MO
    // resets Encore upgrades, so a no-Sight-Reading run is always available).
    check: (s) => {
      const elapsed = Date.now() - s.currentRunStartTime
      if (elapsed > 720000 || s.opusCount < 1 || s.opusCount > 2) return false
      if ((s.encoreUpgrades['sightReading'] ?? 0) >= 1) return false
      return s.producedThisRun.gte('1e40')
    },
    reward: { perk: 'perk-tempo-headstart' },
    rewardDescription: 'PERK: start each run at Tempo level 8',
  },
  {
    id: 'ach_perk_sustained_note',
    name: 'Legato to the Limit',
    description: 'Sustain Crescendo at its ceiling',
    icon: '\u{1F3BB}',
    check: (s) => s.opusCount > 0 && isAtCrescendoCeiling(s),
    reward: { perk: 'perk-crescendo-headstart' },
    rewardDescription: 'PERK: start each run with Crescendo at 40%',
  },
  {
    id: 'ach_perk_patron',
    name: 'The Sound of Silence',
    description: 'Reach the 8-Encore wall on a run with at most eight Tempo purchases (3+ minutes)',
    icon: '\u{1F507}',
    check: (s) =>
      s.wallReachedWithoutTempo &&
      s.wallReachedWithoutTempoAtActiveMs > 0 &&
      activePlayMs(s) >= s.wallReachedWithoutTempoAtActiveMs + 60_000,
    reward: { perk: 'perk-encore-discount' },
    rewardDescription: 'PERK: Encore-shop upgrades cost 25% less Applause',
  },
  {
    id: 'ach_perk_mass_production',
    name: 'Another Brick in the Wall',
    description: 'Own 1,000 of a single tier',
    icon: '\u{1F3ED}',
    check: (s) => s.tiers.some((t) => t.purchased >= 1000),
    reward: { perk: 'perk-bulk-unlock' },
    rewardDescription: 'PERK: bulk-buy (10/100/Max) unlocked from the start',
  },
  {
    id: 'ach_perk_second_wind',
    name: 'Curtain Call',
    description: 'Reach the 8-Encore wall having bought every Encore upgrade',
    icon: '\u{1F3AD}',
    check: (s) => s.layer1WallReached && ['perfectPitch', 'sightReading', 'overture', 'rehearsal'].every((id) => (s.encoreUpgrades[id] ?? 0) >= 1),
    reward: { perk: 'perk-second-wind' },
    rewardDescription: 'PERK: one free Encore per Magnum Opus cycle',
  },
  {
    id: 'ach_a_side',
    name: 'A-Side Single',
    description: 'Sell 2,500,000 records after going Platinum',
    icon: '\u{1F4FA}',
    check: (s) => s.platinum && s.recordsSold >= 2_500_000,
    reward: { perk: 'perk-platinum-press' },
    rewardDescription: 'PERK: records sell 50% faster',
  },
]

/**
 * Calculate the total global percentage bonus from achievements.
 * Returns a multiplier: 1 + sum(all global %s)
 */
export function getAchievementGlobalMultiplier(unlockedIds: Set<string>): Decimal {
  let totalPercent = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.globalPercent) {
      totalPercent += ach.reward.globalPercent
    }
  }
  return new Decimal(1 + totalPercent)
}

/**
 * Calculate the tier-specific percentage bonus from achievements.
 * Returns a multiplier: 1 + sum(tier-specific %s)
 */
export function getAchievementTierMultiplier(unlockedIds: Set<string>, tierId: number): Decimal {
  let totalPercent = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.tierPercent && ach.reward.tierPercent.tierId === tierId) {
      totalPercent += ach.reward.tierPercent.value
    }
  }
  return new Decimal(1 + totalPercent)
}

/**
 * Calculate tempo bonus from achievements.
 * Returns additive bonus: sum(all tempo bonus %s), e.g. 0.10 = 10%
 */
export function getAchievementTempoBonus(unlockedIds: Set<string>): number {
  let total = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.tempoBonus) {
      total += ach.reward.tempoBonus
    }
  }
  return total
}

/**
 * Calculate global cost reduction from achievements.
 * Returns multiplier: 1 - sum(all cost reduction %s), min 0.5
 */
export function getAchievementCostReduction(unlockedIds: Set<string>): number {
  let totalReduction = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.costReduction) {
      totalReduction += ach.reward.costReduction
    }
  }
  return Math.max(0.5, 1 - totalReduction)
}

/**
 * Calculate tier-specific cost reduction from achievements.
 * Returns multiplier: 1 - sum(tier-specific reduction %s), min 0.5
 */
export function getAchievementTierCostReduction(unlockedIds: Set<string>, tierId: number): number {
  let totalReduction = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.tierCostReduction && ach.reward.tierCostReduction.tierId === tierId) {
      totalReduction += ach.reward.tierCostReduction.value
    }
  }
  return Math.max(0.5, 1 - totalReduction)
}

/**
 * Calculate bonus starting soundwaves from achievements.
 */
export function getAchievementStartingSW(unlockedIds: Set<string>): number {
  let total = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.has(ach.id)) continue
    if (ach.reward.startingSW) {
      total += ach.reward.startingSW
    }
  }
  return total
}

/**
 * Sum head-start exponent boosts from unlocked achievements.
 */
export function getAchievementHeadStartBoost(unlocked: Set<string>): number {
  let total = 0
  for (const ach of ACHIEVEMENTS) {
    if (!unlocked.has(ach.id)) continue
    total += ach.reward.headStartBoost ?? 0
  }
  return total
}
