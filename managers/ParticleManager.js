// managers/ParticleManager.js
// Pooled particle emitter facade over Phaser 3's particle system.
// All emitters are pre-configured here so GameScene stays clean.

import { CONSTANTS } from '@config/GameConfig';
import StorageManager from './StorageManager';

class ParticleManager {
  constructor() {
    /** @type {Phaser.Scene} */
    this._scene     = null;
    this._emitters  = {};   // named emitter registry
    this._enabled   = true;
  }

  // ── Init ─────────────────────────────────────────────────────

  /**
   * Call from GameScene.create() after textures are loaded.
   * @param {Phaser.Scene} scene
   */
  init(scene) {
    this._scene   = scene;
    this._enabled = StorageManager.getSettings().particles;
    this._buildEmitters();
  }

  _buildEmitters() {
    const s = this._scene;

    // ── Thruster trail (continuous, attached to player) ───────
    this._emitters.thruster = s.add.particles(0, 0, 'particle_circle', {
      lifespan:   { min: 180, max: 340 },
      speed:      { min: 30,  max: 80  },
      angle:      { min: 80,  max: 100 },   // downward spray
      scale:      { start: 0.5, end: 0 },
      alpha:      { start: 0.8, end: 0 },
      tint:       [0x00f5ff, 0x0088ff, 0xff00cc],
      frequency:  18,                        // ms between particles
      blendMode:  Phaser.BlendModes.ADD,
      emitting:   false,
    }).setDepth(CONSTANTS.DEPTH_PARTICLES);

    // ── Hit flash (one-shot burst on player damage) ───────────
    this._emitters.hit = s.add.particles(0, 0, 'particle_circle', {
      lifespan:   { min: 250, max: 500 },
      speed:      { min: 80,  max: 220 },
      angle:      { min: 0,   max: 360 },
      scale:      { start: 0.8, end: 0 },
      alpha:      { start: 1,   end: 0 },
      tint:       [0xff2244, 0xff8800, 0xffee00],
      quantity:   24,
      blendMode:  Phaser.BlendModes.ADD,
      emitting:   false,
    }).setDepth(CONSTANTS.DEPTH_PARTICLES);

    // ── Gem pickup sparkle ────────────────────────────────────
    this._emitters.gem = s.add.particles(0, 0, 'particle_star', {
      lifespan:   { min: 300, max: 600 },
      speed:      { min: 40,  max: 140 },
      angle:      { min: 0,   max: 360 },
      scale:      { start: 0.6, end: 0 },
      alpha:      { start: 1,   end: 0 },
      tint:       [0xffee00, 0x39ff14, 0x00f5ff],
      quantity:   16,
      blendMode:  Phaser.BlendModes.ADD,
      emitting:   false,
    }).setDepth(CONSTANTS.DEPTH_PARTICLES);

    // ── Obstacle explosion ────────────────────────────────────
    this._emitters.explode = s.add.particles(0, 0, 'particle_circle', {
      lifespan:   { min: 400, max: 900 },
      speed:      { min: 60,  max: 300 },
      angle:      { min: 0,   max: 360 },
      scale:      { start: 1.0, end: 0 },
      alpha:      { start: 1,   end: 0 },
      tint:       [0xff4400, 0xff8800, 0xffcc00, 0xffffff],
      quantity:   32,
      blendMode:  Phaser.BlendModes.ADD,
      emitting:   false,
    }).setDepth(CONSTANTS.DEPTH_PARTICLES);

    // ── Background ambient drift (always on, low density) ─────
    this._emitters.ambient = s.add.particles(0, 0, 'particle_circle', {
      lifespan:   { min: 1800, max: 3200 },
      speedX:     { min: -15,  max: 15   },
      speedY:     { min: 30,   max: 90   },
      scale:      { start: 0.15, end: 0  },
      alpha:      { start: 0.35, end: 0  },
      tint:       [0x00f5ff, 0xff00cc],
      frequency:  120,
      quantity:   1,
      emitZone: {
        type:   'random',
        source: new Phaser.Geom.Rectangle(0, -20, CONSTANTS.DESIGN_WIDTH ?? 480, 10),
      },
      blendMode:  Phaser.BlendModes.ADD,
      emitting:   true,
    }).setDepth(CONSTANTS.DEPTH_BG + 1);
  }

  // ── Public API ────────────────────────────────────────────────

  startThruster(x, y) {
    if (!this._enabled) return;
    const e = this._emitters.thruster;
    e.setPosition(x, y);
    e.start();
  }

  updateThruster(x, y) {
    if (!this._enabled) return;
    this._emitters.thruster?.setPosition(x, y);
  }

  stopThruster() {
    this._emitters.thruster?.stop();
  }

  burstHit(x, y) {
    if (!this._enabled) return;
    const e = this._emitters.hit;
    e.setPosition(x, y);
    e.explode(24);
  }

  burstGem(x, y) {
    if (!this._enabled) return;
    const e = this._emitters.gem;
    e.setPosition(x, y);
    e.explode(16);
  }

  burstExplode(x, y) {
    if (!this._enabled) return;
    const e = this._emitters.explode;
    e.setPosition(x, y);
    e.explode(32);
  }

  setEnabled(val) {
    this._enabled = val;
    if (!val) {
      this._emitters.thruster?.stop();
      this._emitters.ambient?.stop();
    } else {
      this._emitters.ambient?.start();
    }
  }

  destroy() {
    Object.values(this._emitters).forEach(e => e?.destroy());
    this._emitters = {};
  }
}

export default new ParticleManager();