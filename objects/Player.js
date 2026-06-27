// objects/Player.js
// Player ship — physics body, movement, animation, damage/invincibility logic.

import { CONSTANTS, DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';
import { clamp } from '@utils/MathUtils';
import AudioManager    from '@managers/AudioManager';
import InputManager    from '@managers/InputManager';
import ParticleManager from '@managers/ParticleManager';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    super(scene, x, y, 'player_ship');

    // Register with scene + physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(CONSTANTS.DEPTH_PLAYER);
    this.setCollideWorldBounds(true);

    // Shrink hitbox to ~60% of sprite for forgiving feel
    const w = this.width  * 0.55;
    const h = this.height * 0.55;
    this.body.setSize(w, h);
    this.body.setOffset((this.width - w) / 2, (this.height - h) / 2);

    // State
    this.lives          = CONSTANTS.PLAYER_START_LIVES;
    this.isInvincible   = false;
    this._invTimer      = 0;
    this._flashTimer    = 0;
    this._dead          = false;
    this._thrusterOn    = false;

    this._buildAnimations(scene);
    this.play('ship_idle');

    // Thruster particle origin
    ParticleManager.startThruster(x, y + this.height * 0.5);
  }

  // ── Animations ────────────────────────────────────────────────

  _buildAnimations(scene) {
    const anims = scene.anims;

    // Guard: only create once (scenes may restart)
    if (!anims.exists('ship_idle')) {
      anims.create({
        key:        'ship_idle',
        frames:     anims.generateFrameNumbers('player_ship', { start: 0, end: 3 }),
        frameRate:  8,
        repeat:     -1,
      });
    }
    if (!anims.exists('ship_thrust')) {
      anims.create({
        key:        'ship_thrust',
        frames:     anims.generateFrameNumbers('player_ship', { start: 4, end: 7 }),
        frameRate:  12,
        repeat:     -1,
      });
    }
    if (!anims.exists('ship_damaged')) {
      anims.create({
        key:        'ship_damaged',
        frames:     anims.generateFrameNumbers('player_ship', { start: 8, end: 11 }),
        frameRate:  16,
        repeat:     -1,
      });
    }
  }

  // ── Update ────────────────────────────────────────────────────

  /**
   * @param {number} delta  ms
   */
  update(delta) {
    if (this._dead) return;

    this._handleMovement();
    this._updateInvincibility(delta);
    this._updateThruster();
  }

  _handleMovement() {
    const ax = InputManager.axisX;
    const ay = InputManager.axisY;

    const vx = ax * CONSTANTS.PLAYER_SPEED;
    const vy = ay * CONSTANTS.PLAYER_VERT_SPEED;

    this.body.setVelocity(vx, vy);

    // Clamp vertically to lower 60% of screen (ship lives in bottom portion)
    const minY = DESIGN_HEIGHT * 0.4;
    const maxY = DESIGN_HEIGHT - this.height * 0.5 - 10;
    if (this.y < minY) { this.y = minY; this.body.velocity.y = 0; }
    if (this.y > maxY) { this.y = maxY; this.body.velocity.y = 0; }

    // Bank sprite slightly based on horizontal input
    this.setRotation(ax * 0.22);
  }

  _updateInvincibility(delta) {
    if (!this.isInvincible) return;

    this._invTimer  -= delta;
    this._flashTimer -= delta;

    // Flicker every 80ms
    if (this._flashTimer <= 0) {
      this._flashTimer = 80;
      this.setAlpha(this.alpha < 1 ? 1 : 0.25);
    }

    if (this._invTimer <= 0) {
      this.isInvincible = false;
      this.setAlpha(1);
      this.play('ship_idle');
    }
  }

  _updateThruster() {
    const moving = Math.abs(InputManager.axisX) > 0.05 || Math.abs(InputManager.axisY) > 0.05;

    if (moving && !this._thrusterOn) {
      this._thrusterOn = true;
      this.play('ship_thrust');
    } else if (!moving && this._thrusterOn) {
      this._thrusterOn = false;
      if (!this.isInvincible) this.play('ship_idle');
    }

    // Update thruster particle origin to ship exhaust point
    ParticleManager.updateThruster(this.x, this.y + this.height * 0.48);
  }

  // ── Damage ────────────────────────────────────────────────────

  /**
   * Call when a collision is detected with an obstacle.
   * @returns {boolean} true if life lost (not invincible)
   */
  takeDamage() {
    if (this.isInvincible || this._dead) return false;

    this.lives--;
    this.isInvincible = true;
    this._invTimer    = CONSTANTS.PLAYER_INVINCIBLE_MS;
    this._flashTimer  = 0;

    this.play('ship_damaged');
    AudioManager.playSfx('sfx_hit');
    ParticleManager.burstHit(this.x, this.y);

    this.scene.cameras.main.shake(220, 0.012);

    return true;
  }

  isDead() {
    return this._dead || this.lives <= 0;
  }

  kill() {
    if (this._dead) return;
    this._dead = true;
    this.body.setVelocity(0, 0);
    ParticleManager.stopThruster();
    ParticleManager.burstExplode(this.x, this.y);
    AudioManager.playSfx('sfx_explode');
    this.scene.tweens.add({
      targets:  this,
      alpha:    0,
      scale:    2.2,
      duration: 500,
      ease:     'Power2',
      onComplete: () => this.setActive(false).setVisible(false),
    });
  }
}