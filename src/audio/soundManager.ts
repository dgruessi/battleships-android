export type SoundEffect = 'click' | 'hit' | 'miss' | 'sunk' | 'place' | 'invalid'
export type MusicTrack = 'intro' | 'placement' | 'battle' | 'win' | 'lose'

const EFFECT_VARIANTS: Record<SoundEffect, string[]> = {
  click: [
    '/sounds/button_click_0.wav',
    '/sounds/button_click_1.wav',
    '/sounds/button_click_2.wav',
    '/sounds/button_click_3.wav',
    '/sounds/button_click_4.wav',
  ],
  hit: [
    '/sounds/hit_1.wav', '/sounds/hit_2.wav', '/sounds/hit_3.wav',
    '/sounds/hit_4.wav', '/sounds/hit_5.wav', '/sounds/hit_6.wav',
    '/sounds/hit_7.wav', '/sounds/hit_8.wav',
  ],
  miss: ['/sounds/miss_1.wav', '/sounds/miss_2.wav', '/sounds/miss_3.wav', '/sounds/miss_4.wav'],
  sunk: ['/sounds/hit_7.wav', '/sounds/hit_8.wav'],
  place: ['/sounds/sonar_beep.wav', '/sounds/sonar_beep_2.wav', '/sounds/sonar_beep_3.wav', '/sounds/sonar_beep_4.wav'],
  invalid: ['/sounds/sonar_beep.wav'],
}

const MUSIC_SRCS: Record<MusicTrack, string> = {
  intro: '/sounds/intro_music.wav',
  placement: '/sounds/battle_music.wav',
  battle: '/sounds/ambient_music.wav',
  win: '/sounds/win_music.wav',
  lose: '/sounds/lost_game.wav',
}

const MUSIC_LOOP: Record<MusicTrack, boolean> = {
  intro: true,
  placement: true,
  battle: true,
  win: false,
  lose: false,
}

class SoundManager {
  private muted: boolean
  private musicEl: HTMLAudioElement | null = null
  private currentTrack: MusicTrack | null = null

  constructor() {
    try {
      this.muted = localStorage.getItem('sfx_muted') === 'true'
    } catch {
      this.muted = false
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.musicEl) return
        if (document.hidden) {
          this.musicEl.pause()
        } else if (!this.muted) {
          this.musicEl.play().catch(() => {})
        }
      })
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(val: boolean): void {
    this.muted = val
    try { localStorage.setItem('sfx_muted', String(val)) } catch { /* ignore */ }
    if (this.musicEl) this.musicEl.muted = val
  }

  playEffect(effect: SoundEffect): void {
    if (this.muted) return
    const variants = EFFECT_VARIANTS[effect]
    const src = variants[Math.floor(Math.random() * variants.length)]!
    this._playSrc(src)
  }

  playEffectVariant(effect: SoundEffect, index: number): void {
    if (this.muted) return
    const variants = EFFECT_VARIANTS[effect]
    const src = variants[index % variants.length]!
    this._playSrc(src)
  }

  private _playSrc(src: string): void {
    const audio = new Audio(src)
    audio.volume = 0.65
    try {
      const p = audio.play()
      p?.catch(() => { /* autoplay blocked */ })
    } catch { /* not implemented in test environment */ }
  }

  playMusic(track: MusicTrack): void {
    if (this.currentTrack === track) return
    this.stopMusic()
    this.currentTrack = track
    this.musicEl = new Audio(MUSIC_SRCS[track])
    this.musicEl.loop = MUSIC_LOOP[track]
    this.musicEl.volume = 0.28
    this.musicEl.muted = this.muted
    this.musicEl.play().catch(() => { /* autoplay blocked */ })
  }

  stopMusic(): void {
    if (this.musicEl) {
      this.musicEl.pause()
      this.musicEl.src = ''
      this.musicEl = null
    }
    this.currentTrack = null
  }
}

export const soundManager = new SoundManager()
