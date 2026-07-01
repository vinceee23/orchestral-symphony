import { setNotation } from './format'
import { setMuted, setVolume, setMusicVolume, startAmbientMusic, stopAmbientMusic } from './audio'
import type { GameSettings } from './constants'

/**
 * Push player settings into the module-level audio/format singletons. Call on load and on every change.
 * `hidden` lets mute-on-unfocus override the master mute while the tab is backgrounded.
 */
export function applySettings(s: GameSettings, hidden = false): void {
  setNotation(s.notation)
  setVolume(s.sfxVolume)
  setMuted(s.masterMuted || (s.muteOnUnfocus && hidden))
  setMusicVolume(s.musicVolume)
  if (s.musicEnabled) startAmbientMusic()
  else stopAmbientMusic()
}
