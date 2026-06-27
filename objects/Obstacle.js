// objects/Obstacle.js
// Pooled obstacle — reused via Phaser Group.
// Supports straight and sine-drift movement patterns.

import { CONSTANTS, DESIGN_WIDTH } from '@config/GameConfig';
import { randFloat, chance } from '@utils/MathUtils';
import DifficultyManager from '@managers/DifficultyManager';
import AudioManager      from '@managers/AudioManager';
import ParticleManager   from '@managers/ParticleManager';

export default class Obstacle extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    // Pick a random obstacle frame at construction time
    super(scene, x, y, 'obstacles', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(CONSTANTS.DEPTH_OBSTACLE);
    this.setActive(false).setVisible(false);

    // Drift state
    this._drifts    = false;
    this._driftAmp  = 0;
    this._driftFreq = 0;
    this._driftOriginX = 0;
    this._age       = 0;   // ms since spawn
  }

  // ── Pooling ───────────────────────────────────────────────────

  /**
   * Activate from pool at position (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} speed  px/s
   */
  spawn(x, y, speed) {
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.setAlpha(1);
    this.setScale(randFloat(0.75, 1.3));

    // Randomise frame (8 obstacle variants in atlas)
    this.setFrame(Phaser.Math.Between(0, 7));

    // Slow rotation
    this.setAngularVelocity(randFloat(-60, 60));

    // Downward velocity with slight horizontal drift
    const lateralDrift = randFloat(-25, 25);
    this.body.setVelocity(lateralDrift, speed);

    // Hitbox is 70% of frame
    const hw = this.width  * 0.7;
    const hh = this.height * 0.7;
    this.body.setSize(hw, hh);
    this.body.setOffset((this.width - hw) / 2, (this.height - hh) / 2);

    // Sine-drift behaviour unlocks at higher difficulty
    this._drifts = chance(DifficultyManager.driftChance);
    if (this._drifts) {
      this._driftAmp     = randFloat(40, 110);
      this._driftFreq    = randFloat(0.0012, 0.003);
      this._driftOriginX = x;
    }
    this._age = 0;

    // Entrance scale-in tween for polish
    this.setScale(0.1);
    this.scene.tweens.add({
      targets:  this,
      scaleX:   randFloat(0.75, 1.3),
      scaleY:   randFloat(0.75, 1.3),
      duration: 180,
      ease:     'Back.Out',
    });
  }

  /**
   * Return to pool.
   */
  despawn() {
    this.setActive(false).setVisible(false);
    this.body.setVelocity(0, 0);
    this.setAngularVelocity(0);
  }

  // ── Update ────────────────────────────────────────────────────

  /**
   * @param {number} delta  ms
   * @param {number} sceneHeight  design height
   */
  update(delta, sceneHeight) {
    if (!this.active) return;

    this._age += delta;

    // Sine-wave lateral drift
    if (this._drifts) {
      this.x = this._driftOriginX + Math.sin(this._age * this._driftFreq * Math.PI * 2) * this._driftAmp;
    }

    // Recycle when off-screen bottom
    if (this.y > sceneHeight + this.height) {
      this.despawn();
    }
  }

  // ── Collision callback ────────────────────────────────────────

  onHitPlayer() {
    ParticleManager.burstExplode(this.x, this.y);
    AudioManager.playSfx('sfx_obstacle_break');
    this.despawn();
  }
}