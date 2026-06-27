// objects/Collectible.js
// Score gems — pooled collectibles with bob animation + magnet effect.

import { CONSTANTS } from '@config/GameConfig';
import { randFloat, randInt } from '@utils/MathUtils';
import AudioManager    from '@managers/AudioManager';
import ParticleManager from '@managers/ParticleManager';

const GEM_COLORS = [0x00f5ff, 0xff00cc, 0xffee00, 0x39ff14];
const GEM_TINTS  = ['cyan', 'magenta', 'yellow', 'green'];

export default class Collectible extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'gem', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(CONSTANTS.DEPTH_COLLECTIBLE);
    this.setActive(false).setVisible(false);

    this._bobTween   = null;
    this._colorIndex = 0;
    this._value      = CONSTANTS.GEM_POINTS;
    this._magnetised = false;
  }

  // ── Pooling ───────────────────────────────────────────────────

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} speed  downward speed px/s
   */
  spawn(x, y, speed) {
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.setAlpha(1);
    this.setScale(1);
    this._magnetised = false;

    // Randomise gem type
    this._colorIndex = randInt(0, GEM_COLORS.length - 1);
    this.setTint(GEM_COLORS[this._colorIndex]);
    this.setFrame(this._colorIndex);

    // Value scales with difficulty level
    this._value = CONSTANTS.GEM_POINTS + (DifficultyManager?.level ?? 0) * 5;

    this.body.setVelocity(randFloat(-15, 15), speed);
    this.body.setSize(this.width * 0.8, this.height * 0.8);

    // Continuous bob
    this._bobTween = this.scene.tweens.add({
      targets:  this,
      y:        y + 8,
      duration: 700 + randInt(0, 300),
      ease:     'Sine.InOut',
      yoyo:     true,
      repeat:   -1,
    });

    // Pulsing glow via scale oscillation
    this.scene.tweens.add({
      targets:  this,
      scaleX:   1.18,
      scaleY:   1.18,
      duration: 500,
      ease:     'Sine.InOut',
      yoyo:     true,
      repeat:   -1,
    });
  }

  despawn() {
    this._bobTween?.stop();
    this._bobTween = null;
    this.setActive(false).setVisible(false);
    this.body.setVelocity(0, 0);
  }

  // ── Update ────────────────────────────────────────────────────

  /**
   * @param {number} delta       ms
   * @param {number} sceneHeight
   * @param {Phaser.GameObjects.Sprite} player  for magnet effect
   */
  update(delta, sceneHeight, player) {
    if (!this.active) return;

    if (this.y > sceneHeight + this.height) {
      this.despawn();
      return;
    }

    // Magnet: pull toward player within 100px radius
    if (player && !this._magnetised) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 100) {
        this._magnetised = true;
        this._bobTween?.stop();
      }
    }

    if (this._magnetised && player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 380;
      this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
    }
  }

  // ── Collision callback ────────────────────────────────────────

  onCollect() {
    ParticleManager.burstGem(this.x, this.y);
    AudioManager.playSfx('sfx_gem');
    this.despawn();
    return this._value;
  }

  get colorName() {
    return GEM_TINTS[this._colorIndex];
  }
}