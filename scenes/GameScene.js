// scenes/GameScene.js
// Core game loop: player, obstacles, collectibles, scoring, difficulty.

import Player            from '@objects/Player';
import Obstacle          from '@objects/Obstacle';
import Collectible       from '@objects/Collectible';
import InputManager      from '@managers/InputManager';
import DifficultyManager from '@managers/DifficultyManager';
import ParticleManager   from '@managers/ParticleManager';
import AudioManager      from '@managers/AudioManager';
import StorageManager    from '@managers/StorageManager';
import { CONSTANTS, DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';
import { chance, randFloat } from '@utils/MathUtils';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Shared state — UIScene reads from this reference
    this.score       = 0;
    this.lives       = CONSTANTS.PLAYER_START_LIVES;
    this.combo       = 1;
    this._comboTimer = 0;
    this._running    = false;
    this._spawnTimer = 0;
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    this._buildBackground();
    this._initPools();
    this._initPlayer();
    this._initCollisions();
    this._initInput();
    this._initParticles();
    this._initDifficulty();

    AudioManager.playMusic('music_game');

    // Fade in then start loop
    this.cameras.main.fadeIn(500);
    this.cameras.main.once('camerafadeincomplete', () => {
      this._running = true;
      this._spawnTimer = CONSTANTS.OBSTACLE_SPAWN_DELAY;
    });
  }

  // ── Background ────────────────────────────────────────────────

  _buildBackground() {
    this._bg0 = this.add.tileSprite(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer0').setDepth(0);
    this._bg1 = this.add.tileSprite(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer1').setDepth(1).setAlpha(0.5);
    this._bg2 = this.add.tileSprite(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer2').setDepth(2).setAlpha(0.3);
  }

  // ── Object pools ──────────────────────────────────────────────

  _initPools() {
    this._obstacles = this.physics.add.group({
      classType:   Obstacle,
      maxSize:     40,
      runChildUpdate: false, // We call update manually for delta access
    });

    this._collectibles = this.physics.add.group({
      classType:   Collectible,
      maxSize:     20,
      runChildUpdate: false,
    });
  }

  // ── Player ────────────────────────────────────────────────────

  _initPlayer() {
    this._player = new Player(this, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.78);
    this.lives   = this._player.lives;
  }

  // ── Collisions ───────────────────────────────────────────────

  _initCollisions() {
    // Player ↔ obstacle
    this.physics.add.overlap(
      this._player,
      this._obstacles,
      this._onPlayerHitObstacle,
      null,
      this,
    );

    // Player ↔ collectible
    this.physics.add.overlap(
      this._player,
      this._collectibles,
      this._onPlayerCollectGem,
      null,
      this,
    );
  }

  _onPlayerHitObstacle(player, obstacle) {
    if (!obstacle.active) return;
    const damaged = player.takeDamage();
    if (damaged) {
      obstacle.onHitPlayer();
      this.lives = player.lives;
      this.scene.get('UIScene')?.events.emit('lives_changed', this.lives);

      if (player.isDead()) {
        this._triggerGameOver();
      }
    }
  }

  _onPlayerCollectGem(player, gem) {
    if (!gem.active) return;
    const points = gem.onCollect();

    // Combo window
    if (this._comboTimer > 0) {
      this.combo = Math.min(this.combo + 1, CONSTANTS.COMBO_MULTIPLIER_MAX);
    } else {
      this.combo = 1;
    }
    this._comboTimer = CONSTANTS.COMBO_WINDOW_MS;

    const earned = Math.round(points * this.combo * DifficultyManager.scoreMultiplier);
    this.score  += earned;

    this.scene.get('UIScene')?.events.emit('score_changed', this.score);
    this.scene.get('UIScene')?.events.emit('combo_changed', this.combo);

    this._showFloatText(gem.x, gem.y - 20, `+${earned}`, gem.colorName);

    // Win condition
    if (this.score >= CONSTANTS.WIN_SCORE) {
      this._triggerWin();
    }
  }

  // ── Input ────────────────────────────────────────────────────

  _initInput() {
    InputManager.init(this);

    // Pause via ESC or P
    this.input.keyboard.on('keydown-P', () => this._togglePause());
    this.input.keyboard.on('keydown-ESC', () => this._togglePause());
  }

  // ── Particles ────────────────────────────────────────────────

  _initParticles() {
    ParticleManager.init(this);
  }

  // ── Difficulty ───────────────────────────────────────────────

  _initDifficulty() {
    DifficultyManager.reset();
    DifficultyManager.onLevelUp((level) => {
      AudioManager.playSfx('sfx_levelup');
      this.scene.get('UIScene')?.events.emit('level_changed', level);
    });
  }

  // ── Spawning ─────────────────────────────────────────────────

  _spawnWave(delta) {
    this._spawnTimer -= delta;
    if (this._spawnTimer > 0) return;

    this._spawnTimer = DifficultyManager.spawnDelay;

    const count = DifficultyManager.obstaclesPerWave;
    const speed = DifficultyManager.obstacleSpeed;

    // Distribute obstacles evenly across width with jitter
    const slotW = DESIGN_WIDTH / count;
    for (let i = 0; i < count; i++) {
      const x = slotW * i + slotW * randFloat(0.15, 0.85);
      const y = -40;
      const obs = this._obstacles.get(x, y);
      if (obs) obs.spawn(x, y, speed);
    }

    // Maybe spawn a gem alongside
    if (chance(CONSTANTS.GEM_SPAWN_CHANCE)) {
      const gx  = randFloat(30, DESIGN_WIDTH - 30);
      const gem = this._collectibles.get(gx, -40);
      if (gem) gem.spawn(gx, -40, CONSTANTS.GEM_SPEED);
    }
  }

  // ── Score-over-time ───────────────────────────────────────────

  _tickPassiveScore(delta) {
    const pts = CONSTANTS.SCORE_PER_SECOND * (delta / 1000) * DifficultyManager.scoreMultiplier;
    this.score += pts;
    this.scene.get('UIScene')?.events.emit('score_changed', Math.floor(this.score));
  }

  // ── Float text ────────────────────────────────────────────────

  _showFloatText(x, y, msg, colorName = 'cyan') {
    const colors = { cyan: '#00f5ff', magenta: '#ff00cc', yellow: '#ffee00', green: '#39ff14' };
    const txt = this.add.text(x, y, msg, {
      fontFamily: 'Orbitron',
      fontSize:   '16px',
      fontStyle:  'bold',
      color:      colors[colorName] ?? '#ffffff',
      stroke:     '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH_HUD);

    this.tweens.add({
      targets:  txt,
      y:        y - 50,
      alpha:    0,
      duration: 900,
      ease:     'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ── Pause ─────────────────────────────────────────────────────

  _togglePause() {
    if (!this._running) return;
    this._running = false;
    this.physics.pause();
    this.scene.pause('GameScene');
    this.scene.pause('UIScene');
    this.scene.launch('PauseScene');
    AudioManager.pauseMusic();
  }

  resume() {
    this._running = true;
    this.physics.resume();
    AudioManager.resumeMusic();
  }

  // ── Game over / Win ───────────────────────────────────────────

  _triggerGameOver() {
    if (!this._running) return;
    this._running = false;
    this.physics.pause();

    StorageManager.saveHighScore(Math.floor(this.score));
    AudioManager.stopMusic(300);
    AudioManager.playSfx('sfx_gameover');

    this.cameras.main.shake(400, 0.02);
    this.time.delayedCall(900, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score:     Math.floor(this.score),
        highScore: StorageManager.getHighScore(),
        win:       false,
      });
    });
  }

  _triggerWin() {
    if (!this._running) return;
    this._running = false;
    this.physics.pause();

    StorageManager.saveHighScore(Math.floor(this.score));
    AudioManager.stopMusic(400);
    AudioManager.playSfx('sfx_win');

    this.time.delayedCall(600, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score:     Math.floor(this.score),
        highScore: StorageManager.getHighScore(),
        win:       true,
      });
    });
  }

  // ── Update ────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._running) return;

    // Parallax
    this._bg0.tilePositionY -= 0.3;
    this._bg1.tilePositionY -= 0.7;
    this._bg2.tilePositionY -= 1.4;

    InputManager.update();
    DifficultyManager.update(delta);

    this._player.update(delta);

    // Pool updates
    this._obstacles.getChildren().forEach(o => o.update(delta, DESIGN_HEIGHT));
    this._collectibles.getChildren().forEach(c => c.update(delta, DESIGN_HEIGHT, this._player));

    this._spawnWave(delta);
    this._tickPassiveScore(delta);

    // Combo decay
    if (this._comboTimer > 0) {
      this._comboTimer -= delta;
      if (this._comboTimer <= 0) {
        this.combo = 1;
        this.scene.get('UIScene')?.events.emit('combo_changed', 1);
      }
    }

    // Handle pause press from InputManager
    if (InputManager.consumePause()) {
      this._togglePause();
    }
  }

  // ── Shutdown ──────────────────────────────────────────────────

  shutdown() {
    InputManager.destroy(this);
    ParticleManager.destroy();
    DifficultyManager.reset();
  }
}