// managers/DifficultyManager.js
// Time-based difficulty curve.
// Provides interpolated values for obstacle speed, spawn rate,
// and enemy count based on elapsed game time.

import { CONSTANTS } from '@config/GameConfig';
import { clamp, lerp, smoothstep } from '@utils/MathUtils';

class DifficultyManager {
  constructor() {
    this._level      = 0;   // 0 – DIFFICULTY_MAX
    this._elapsed    = 0;   // ms since game start
    this._lastTick   = 0;   // ms at last difficulty increase
    this._callbacks  = [];  // listeners notified on level-up
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  reset() {
    this._level    = 0;
    this._elapsed  = 0;
    this._lastTick = 0;
  }

  /**
   * Call every frame from GameScene.update().
   * @param {number} deltaMs  Phaser's delta in milliseconds
   */
  update(deltaMs) {
    this._elapsed += deltaMs;

    const timeSinceTick = this._elapsed - this._lastTick;
    if (timeSinceTick >= CONSTANTS.DIFFICULTY_RAMP_INTERVAL) {
      this._lastTick = this._elapsed;
      this._levelUp();
    }
  }

  _levelUp() {
    if (this._level >= CONSTANTS.DIFFICULTY_MAX) return;
    this._level++;
    this._callbacks.forEach(cb => cb(this._level));
  }

  onLevelUp(callback) {
    this._callbacks.push(callback);
  }

  offLevelUp(callback) {
    this._callbacks = this._callbacks.filter(cb => cb !== callback);
  }

  // ── Derived values ────────────────────────────────────────────

  /** Normalised progress 0 → 1 across full difficulty range */
  get progress() {
    return clamp(this._level / CONSTANTS.DIFFICULTY_MAX, 0, 1);
  }

  get level() {
    return this._level;
  }

  get elapsedMs() {
    return this._elapsed;
  }

  /**
   * Obstacle downward speed in px/s.
   * Uses smoothstep so early ramp is gentle, mid-game is steep.
   */
  get obstacleSpeed() {
    const t = smoothstep(0, 1, this.progress);
    return lerp(CONSTANTS.OBSTACLE_BASE_SPEED, CONSTANTS.OBSTACLE_MAX_SPEED, t);
  }

  /**
   * Milliseconds between obstacle spawns — decreases with difficulty.
   */
  get spawnDelay() {
    const t = smoothstep(0, 1, this.progress);
    return lerp(CONSTANTS.OBSTACLE_SPAWN_DELAY, CONSTANTS.OBSTACLE_MIN_DELAY, t);
  }

  /**
   * How many obstacles to spawn per wave (1 at start, up to 4 at max).
   */
  get obstaclesPerWave() {
    return Math.min(4, 1 + Math.floor(this._level / 5));
  }

  /**
   * Score multiplier — rewards high-level survival.
   */
  get scoreMultiplier() {
    return 1 + this.progress * 3; // 1× → 4×
  }

  /**
   * Probability that an obstacle has an erratic drift pattern (sine-wave path).
   */
  get driftChance() {
    return clamp(this._level * 0.04, 0, 0.6);
  }

  /**
   * Summary object useful for debugging HUD.
   */
  getDebugInfo() {
    return {
      level:           this._level,
      elapsed:         Math.floor(this._elapsed / 1000) + 's',
      obstacleSpeed:   Math.round(this.obstacleSpeed),
      spawnDelay:      Math.round(this.spawnDelay),
      waveSize:        this.obstaclesPerWave,
      scoreMultiplier: this.scoreMultiplier.toFixed(2),
    };
  }
}

export default new DifficultyManager();