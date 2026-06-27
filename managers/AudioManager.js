// managers/AudioManager.js
// Bridges Phaser's sound system with our settings layer.
// Provides play/stop/fade helpers and volume management.

import StorageManager from './StorageManager';

class AudioManager {
  constructor() {
    /** @type {Phaser.Sound.WebAudioSoundManager|Phaser.Sound.HTML5AudioSoundManager} */
    this._soundManager = null;

    /** @type {Phaser.Sound.BaseSound|null} */
    this._currentMusic  = null;
    this._musicKey      = null;

    // Mutable volumes — synced from settings on init
    this._musicVolume = 0.35;
    this._sfxVolume   = 0.7;

    // Whether audio context was unlocked (required on iOS/Android)
    this._unlocked = false;
  }

  // ── Init ─────────────────────────────────────────────────────

  /**
   * Must be called once from BootScene after Phaser is ready.
   * @param {Phaser.Scene} scene
   */
  init(scene) {
    this._soundManager = scene.sound;
    const settings     = StorageManager.getSettings();
    this._musicVolume  = settings.musicVolume;
    this._sfxVolume    = settings.sfxVolume;

    // iOS / Android require a user gesture to resume AudioContext
    scene.input.once('pointerdown', () => this._unlockContext(scene));
  }

  _unlockContext(scene) {
    if (this._unlocked) return;
    if (scene.sound.context?.state === 'suspended') {
      scene.sound.context.resume();
    }
    this._unlocked = true;
  }

  // ── Music ────────────────────────────────────────────────────

  /**
   * Play looping background music, cross-fading if music is already playing.
   * @param {string} key  Phaser audio key
   * @param {number} [fadeDuration=800]  ms
   */
  playMusic(key, fadeDuration = 800) {
    if (this._musicKey === key && this._currentMusic?.isPlaying) return;

    const sm = this._soundManager;

    const startNew = () => {
      this._musicKey    = key;
      this._currentMusic = sm.add(key, {
        volume: this._musicVolume,
        loop:   true,
      });
      this._currentMusic.play();

      // Fade in
      if (fadeDuration > 0) {
        this._currentMusic.setVolume(0);
        sm.scene.tweens?.add({
          targets:    this._currentMusic,
          volume:     this._musicVolume,
          duration:   fadeDuration,
          ease:       'Linear',
        });
      }
    };

    if (this._currentMusic?.isPlaying) {
      // Fade out existing track first, then swap
      this._soundManager.scene.tweens?.add({
        targets:    this._currentMusic,
        volume:     0,
        duration:   fadeDuration,
        ease:       'Linear',
        onComplete: () => {
          this._currentMusic?.destroy();
          startNew();
        },
      });
    } else {
      startNew();
    }
  }

  stopMusic(fadeDuration = 600) {
    if (!this._currentMusic?.isPlaying) return;
    if (fadeDuration > 0) {
      this._soundManager.scene.tweens?.add({
        targets:    this._currentMusic,
        volume:     0,
        duration:   fadeDuration,
        ease:       'Linear',
        onComplete: () => { this._currentMusic?.destroy(); this._currentMusic = null; },
      });
    } else {
      this._currentMusic.destroy();
      this._currentMusic = null;
    }
    this._musicKey = null;
  }

  pauseMusic()  { this._currentMusic?.pause(); }
  resumeMusic() { this._currentMusic?.resume(); }

  // ── SFX ──────────────────────────────────────────────────────

  /**
   * Play a one-shot sound effect.
   * @param {string}  key
   * @param {object}  [opts]
   * @param {number}  [opts.volume]   Override sfx volume (0–1)
   * @param {number}  [opts.rate]     Playback rate (default 1)
   * @param {boolean} [opts.pooled]   If true, don't create duplicates while still playing
   */
  playSfx(key, { volume, rate = 1, pooled = false } = {}) {
    const sm = this._soundManager;
    if (!sm) return;

    if (pooled && sm.get(key)?.isPlaying) return;

    const snd = sm.add(key, {
      volume: volume !== undefined ? volume * this._sfxVolume : this._sfxVolume,
      rate,
    });
    snd.once('complete', () => snd.destroy());
    snd.play();
  }

  // ── Volume control ───────────────────────────────────────────

  setMusicVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this._currentMusic) this._currentMusic.setVolume(this._musicVolume);
    StorageManager.patchSettings({ musicVolume: this._musicVolume });
  }

  setSfxVolume(v) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    StorageManager.patchSettings({ sfxVolume: this._sfxVolume });
  }

  getMusicVolume() { return this._musicVolume; }
  getSfxVolume()   { return this._sfxVolume; }

  toggleMute() {
    const muted = !this._soundManager.mute;
    this._soundManager.setMute(muted);
    return muted;
  }
}

export default new AudioManager();