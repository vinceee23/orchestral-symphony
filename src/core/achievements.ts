import Decimal from 'break_infinity.js'
import { GRAND_FINALE_SW_THRESHOLD } from './constants'
import { getCrescendoMultiplier } from './crescendo'
import {
  getCrescendoCeiling,
  hasAutoConduct,
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
  const tracks: OpusUpgradeTrack[] = ['AUTOMATORS', 'CRESCENDO', 'TEMPO', 'OP_GAIN']
  return tracks.some((track) => {
    const upgrades = OPUS_UPGRADES.filter((u) => u.track === track)
    return upgrades.length > 0 && upgrades.every((u) => (levels[u.id] ?? 0) >= u.maxLevel)
  })
}

function isAtCrescendoCeiling(state: GameState): boolean {
  const ceiling = getCrescendoCeiling(state.opusUpgrades)
  return getCrescendoMultiplier(state.crescendo, state.opusUpgrades) >= ceiling - 0.02
}

// 73 achievements — steady drip pacing, hybrid song-title + orchestral wit naming
export const ACHIEVEMENTS: AchievementConfig[] = [
  // === Row 1: Early Game ===
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
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
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
    id: 'ach_piano_man',
    name: 'Piano Man',
    description: 'Buy 10 Motifs',
    icon: '\u{1F3B9}',
    check: (s) => s.tiers[1].purchased >= 10,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },

  // === Row 2: Pre-Encore ===
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
    reward: { globalPercent: 0.10 },
    rewardDescription: '+10% all production',
  },
  {
    id: 'ach_bohemian',
    name: 'Bohemian Rhapsody',
    description: 'Own 100 of 3 different tiers',
    icon: '\u{1F3AD}',
    check: (s) => s.tiers.filter((t) => t.purchased >= 100).length >= 3,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
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
    id: 'ach_rickroll',
    name: 'Never Gonna Give You Up',
    description: 'Own 42 Notes',
    icon: '\u{1F57A}',
    hidden: true,
    check: (s) => s.tiers[0].purchased >= 42,
    reward: { startingSW: 42 },
    rewardDescription: '+42 starting Soundwaves',
  },

  // === Row 3: Encore Era ===
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
    id: 'ach_teen_spirit',
    name: 'Despacito',
    description: 'Complete 5 Encores',
    icon: '\u{1F4BF}',
    check: (s) => s.encoreCount >= 5,
    reward: { globalPercent: 0.12 },
    rewardDescription: '+12% all production',
  },
  {
    id: 'ach_beat_it',
    name: 'Beat It',
    description: 'Complete 3 Encores',
    icon: '\u{1F94A}',
    check: (s) => s.encoreCount >= 3,
    reward: { globalPercent: 0.10 },
    rewardDescription: '+10% all production',
  },
  {
    id: 'ach_all_star',
    name: "Hey Now, You're an All Star",
    description: 'Own 10+ of every tier',
    icon: '\u{2B50}',
    check: (s) => s.tiers.every((t) => t.purchased >= 10),
    reward: { costReduction: 0.05 },
    rewardDescription: '-5% all costs',
  },
  {
    id: 'ach_rolling',
    name: 'Rolling in the Deep',
    description: 'Own 150 of a tier (after 3 Encores)',
    icon: '\u{1F30A}',
    check: (s) => s.encoreCount >= 3 && s.tiers.some((t) => t.purchased >= 150),
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_yesterday',
    name: 'Yesterday',
    description: 'Play for 30 minutes total',
    icon: '\u{231B}',
    check: (s) => s.totalTimePlayed >= 30 * 60 * 1000,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_one_more',
    name: 'One More Time',
    description: 'Complete 16 Encores',
    icon: '\u{1F504}',
    check: (s) => s.encoreCount >= 16,
    reward: { globalPercent: 0.18, headStartBoost: 0.04 },
    rewardDescription: '+18% all production · +head-start',
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

  // === Row 4: Symphony & Magnum Opus Gate ===
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
    reward: { costReduction: 0.10 },
    rewardDescription: '-10% all costs',
  },
  {
    id: 'ach_dont_stop_me',
    name: "Don't Stop Me Now",
    description: 'Unlock Auto-Conduct',
    icon: '\u{1F525}',
    check: (s) => hasAutoConduct(s.opusUpgrades),
    reward: { tempoBonus: 0.20 },
    rewardDescription: '+20% tempo speed',
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
    reward: { globalPercent: 0.15 },
    rewardDescription: '+15% all production',
  },

  // === Row 5: Late Game ===
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
    id: 'ach_around_world',
    name: 'Around the World',
    description: 'Complete 5 challenges',
    icon: '\u{1F30D}',
    check: (s) => s.completedChallenges.length >= 5,
    reward: { globalPercent: 0.28 },
    rewardDescription: '+28% all production',
  },
  {
    id: 'ach_final_countdown',
    name: 'The Final Countdown',
    description: 'Reach the Grand Finale wall',
    icon: '\u{23F0}',
    check: (s) => s.peakSoundwaves.gte(GRAND_FINALE_SW_THRESHOLD),
    reward: { globalPercent: 0.18 },
    rewardDescription: '+18% all production',
  },
  {
    id: 'ach_grand_finale',
    name: 'Grand Finale!',
    description: 'Complete your first Grand Finale',
    icon: '\u{1F386}',
    check: (s) => s.finaleCount >= 1,
    reward: { globalPercent: 0.22 },
    rewardDescription: '+22% all production',
  },
  {
    id: 'ach_back_in_black',
    name: 'Back in Black',
    description: 'Complete 2 Grand Finales',
    icon: '\u{1F5A4}',
    check: (s) => s.finaleCount >= 2,
    reward: { globalPercent: 0.36 },
    rewardDescription: '+36% all production',
  },
  {
    id: 'ach_lose_yourself',
    name: 'Lose Yourself',
    description: 'Own 300 of a tier (after the wall)',
    icon: '\u{1F3A4}',
    check: (s) => s.layer1WallReached && s.tiers.some((t) => t.purchased >= 300),
    reward: { globalPercent: 0.15 },
    rewardDescription: '+15% all production',
  },
  {
    id: 'ach_despacito',
    name: 'Rocket Man',
    description: 'Reach 1e125 Soundwaves',
    icon: '\u{1F680}',
    check: (s) => s.soundwaves.gte('1e125'),
    reward: { globalPercent: 0.10 },
    rewardDescription: '+10% all production',
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
  {
    id: 'ach_magnum',
    name: 'Magnum Opus',
    description: 'Complete your first Magnum Opus',
    icon: '\u{1F3C5}',
    check: (s) => s.opusCount >= 1,
    reward: { globalPercent: 0.45 },
    rewardDescription: '+45% all production',
  },

  // === Row 6: Deep Progression ===
  {
    id: 'ach_twinkle',
    name: 'Twinkle Twinkle Little Star',
    description: 'Have all 7 tier autobuyers enabled simultaneously',
    icon: '\u{2728}',
    check: (s) => {
      for (let i = 1; i <= 7; i++) {
        const ab = s.autobuyers[`tier_${i}`]
        if (!ab || !ab.unlocked || !ab.enabled) return false
      }
      return true
    },
    reward: { startingSW: 500 },
    rewardDescription: '+500 starting Soundwaves',
  },
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
    id: 'ach_free_bird',
    name: 'Free Bird',
    description: 'Reach 1e220 Soundwaves',
    icon: '\u{1F985}',
    check: (s) => s.soundwaves.gte('1e220'),
    reward: { globalPercent: 0.25 },
    rewardDescription: '+25% all production',
  },
  {
    id: 'ach_smooth_criminal',
    name: 'Smooth Criminal',
    description: 'Own 250 of every tier',
    icon: '\u{1F574}',
    check: (s) => s.tiers.every((t) => t.purchased >= 250),
    reward: { costReduction: 0.10 },
    rewardDescription: '-10% all costs',
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

  // === Row 7: Mastery ===
  {
    id: 'ach_opus_three',
    name: 'Three-peat',
    description: 'Complete 3 Magnum Opuses',
    icon: '\u{1F948}',
    check: (s) => s.opusCount >= 3,
    reward: { globalPercent: 0.28 },
    rewardDescription: '+28% all production',
  },
  {
    id: 'ach_stardust',
    name: 'Ziggy Stardust',
    description: 'Reach 1e200 Soundwaves',
    icon: '\u{1FA90}',
    check: (s) => s.soundwaves.gte('1e200'),
    reward: { globalPercent: 0.32 },
    rewardDescription: '+32% all production',
  },
  {
    id: 'ach_comfortably_numb',
    name: 'Comfortably Numb',
    description: 'Play for 4 hours total',
    icon: '\u{1F4A4}',
    check: (s) => s.totalTimePlayed >= 4 * 60 * 60 * 1000,
    reward: { startingSW: 1000 },
    rewardDescription: '+1,000 starting Soundwaves',
  },
  {
    id: 'ach_vivaldi',
    name: 'The Four Seasons',
    description: 'Complete all challenges',
    icon: '\u{1F342}',
    check: (s) => s.completedChallenges.length >= 10,
    reward: { globalPercent: 0.45 },
    rewardDescription: '+45% all production',
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

  // === Row 8: Layer 2 — Conducting, Records & Opus Tree ===
  {
    id: 'ach_raise_baton',
    name: 'Raise the Baton',
    description: 'Conduct for the first time',
    icon: '\u{1F3BA}',
    check: (s) => s.crescendo > 0,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_studio_time',
    name: 'Studio Time',
    description: 'Buy your first Opus upgrade',
    icon: '\u{1F399}',
    check: (s) => Object.keys(s.opusUpgrades).length > 0,
    reward: { globalPercent: 0.03 },
    rewardDescription: '+3% all production',
  },
  {
    id: 'ach_turn_it_up',
    name: 'Turn It Up to Eleven',
    description: 'Hit the crescendo ceiling',
    icon: '\u{1F50A}',
    check: (s) => s.opusCount > 0 && (s.peakCrescendoMult >= 3 || isAtCrescendoCeiling(s)),
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_gold_record',
    name: 'Gold Record',
    description: 'Sell 100,000 records',
    icon: '\u{1F4BF}',
    check: (s) => s.recordsSold >= 100_000,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_going_platinum',
    name: 'Going Platinum',
    description: 'Go Platinum — 1,000,000 records sold',
    icon: '\u{1F4FA}',
    check: (s) => s.platinum || s.recordsSold >= 1_000_000,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
    hidden: true, // mystery: stays "???" until you cross 1M records — the reveal IS the payoff
  },
  {
    id: 'ach_diamond_hands',
    name: 'Diamond Hands',
    description: 'Sell 10,000,000 records',
    icon: '\u{1F48E}',
    check: (s) => s.recordsSold >= 10_000_000,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
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
    reward: { globalPercent: 0.03 },
    rewardDescription: '+3% all production',
  },

  // === Row 9: Layer 2 — Mastery ===
  {
    id: 'ach_whole_catalogue',
    name: 'The Whole Catalogue',
    description: 'Max out one full Opus upgrade track',
    icon: '\u{1F4DA}',
    check: (s) => isAnyOpusTrackMaxed(s.opusUpgrades),
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_sold_out_tour',
    name: 'Sold Out Tour',
    description: 'Complete 5 Magnum Opuses',
    icon: '\u{1F3DF}',
    check: (s) => s.opusCount >= 5,
    reward: { globalPercent: 0.04 },
    rewardDescription: '+4% all production',
  },
  {
    id: 'ach_ode_to_joy',
    name: 'Ode to Joy',
    description: 'Own 1,000 of every tier',
    icon: '\u{1F389}',
    check: (s) => s.tiers.every((t) => t.purchased >= 1000),
    reward: { globalPercent: 0.45 },
    rewardDescription: '+45% all production',
  },

  // === Perk achievements ===
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
    reward: { perk: 'perk-keep-encore-upgrades' },
    rewardDescription: 'PERK: keep your Encore upgrades through a Magnum Opus',
    hidden: true, // mystery: the Platinum perk stays "???" until you go Platinum
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
    description: 'Reach 1e100 Soundwaves within 5 minutes of a run',
    icon: '\u{23F1}',
    // Tuned by difficulty, not a layer gate (sim): a cold run reaches ~1e20 in 5 min and even EP-mult x1000
    // only ~1e95 — 1e100-in-5min requires the opPower (OP-tree) multipliers, i.e. it lands post-MO naturally.
    check: (s) => s.soundwaves.gte('1e100') && (Date.now() - s.currentRunStartTime) <= 300000,
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
    description: 'Reach 1e12 Soundwaves without ever raising Tempo',
    icon: '\u{1F507}',
    check: (s) => s.soundwaves.gte(1e12) && s.tempo.level === 0,
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

  // === Row 10: Late Layer 2 ===
  {
    id: 'ach_remaster_wall',
    name: 'Back to the Wall',
    description: 'Re-reach the 8-Encore wall after a Magnum Opus',
    icon: '\u{1F9F1}',
    check: (s) => s.opusCount >= 1 && s.encoreCount >= 8,
    reward: { headStartBoost: 0.04 },
    rewardDescription: '+head-start',
  },
  {
    id: 'ach_tree_climber',
    name: 'Climb Ev\'ry Mountain',
    description: 'Reach 10 total Opus-tree upgrade levels',
    icon: '\u{1F332}',
    check: (s) => Object.values(s.opusUpgrades).reduce((a, b) => a + b, 0) >= 10,
    reward: { globalPercent: 0.05 },
    rewardDescription: '+5% all production',
  },
  {
    id: 'ach_one_more_really',
    name: 'One More Time (Seriously)',
    description: 'Complete 24 Encores',
    icon: '\u{1F501}',
    check: (s) => s.encoreCount >= 24,
    reward: { globalPercent: 0.05, headStartBoost: 0.04 },
    rewardDescription: '+5% all production · +head-start',
  },
  {
    id: 'ach_royalty_check',
    name: 'Royalty Check',
    description: 'Sell 50,000,000 records',
    icon: '\u{1F4B0}',
    check: (s) => s.recordsSold >= 50_000_000,
    reward: { none: true },
    rewardDescription: 'Collectible — no bonus',
  },
  {
    id: 'ach_second_universe',
    name: 'Second Verse, Same as the First',
    description: 'Record a Magnum Opus in a new universe (post-Grand Finale)',
    icon: '\u{1F30C}',
    check: (s) => s.finaleCount >= 1 && s.opusCount >= 1,
    reward: { globalPercent: 0.10 },
    rewardDescription: '+10% all production',
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
