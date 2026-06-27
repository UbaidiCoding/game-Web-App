// scenes/UIScene.js
// Transparent HUD overlay that runs in parallel with GameScene.
// Displays score, lives, combo multiplier, and level indicator.
// Receives updates via GameScene's event emitter.

import { CONSTANTS, DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';
import { formatScore } from '@utils/MathUtils';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    this._buildScoreDisplay();
    this._buildLivesDisplay();
    this._buildComboDisplay();
    this._buildLevelDisplay();
    this._buildPauseHint();
    this._subscribeToGameEvents();

    this.cameras.main.fadeIn(300);
  }

  // ── Score ────────────────────────────────────────────────────

  _buildScoreDisplay() {
    // Label
    this.add.text(12, 12, 'SCORE', {
      fontFamily: 'Orbitron',
      fontSize:   '9px',
      color:      '#6666aa',
    }).setDepth(CONSTANTS.DEPTH_HUD);

    this._scoreTxt = this.add.text(12, 22, formatScore(0), {
      fontFamily: 'Orbitron',
      fontSize:   '20px',
      fontStyle:  'bold',
      color:      '#00f5ff',
      stroke:     '#001133',
      strokeThickness: 4,
    }).setDepth(CONSTANTS.DEPTH_HUD);

    // High score row
    const hs = StorageManager?.getHighScore?.() ?? 0;
    this.add.text(12, 48, 'BEST', {
      fontFamily: 'Orbitron',
      fontSize:   '8px',
      color:      '#444466',
    }).setDepth(CONSTANTS.DEPTH_HUD);

    this._hsTxt = this.add.text(12, 57, formatScore(hs), {
      fontFamily: 'Orbitron',
      fontSize:   '11px',
      color:      '#ffee00',
    }).setDepth(CONSTANTS.DEPTH_HUD);
  }

  // ── Lives ────────────────────────────────────────────────────

  _buildLivesDisplay() {
    this._hearts = [];
    const startX = DESIGN_WIDTH - 16;
    const y      = 18;

    for (let i = 0; i < CONSTANTS.PLAYER_START_LIVES; i++) {
      const heart = this.add.image(startX - i * 26, y, 'heart')
        .setScale(0.55)
        .setDepth(CONSTANTS.DEPTH_HUD)
        .setTint(0xff2244);
      this._hearts.push(heart);
    }
  }

  _setLives(count) {
    this._hearts.forEach((h, i) => {
      const active = i < count;
      h.setTint(active ? 0xff2244 : 0x333355);
      h.setAlpha(active ? 1 : 0.3);
    });

    // Pulse remaining hearts
    if (count > 0) {
      const activeHeart = this._hearts[count - 1];
      this.tweens.add({
        targets:  activeHeart,
        scaleX:   0.7, scaleY: 0.7,
        duration: 120,
        yoyo:     true,
        ease:     'Back.Out',
      });
    }
  }

  // ── Combo ────────────────────────────────────────────────────

  _buildComboDisplay() {
    this._comboContainer = this.add.container(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 28)
      .setDepth(CONSTANTS.DEPTH_HUD)
      .setAlpha(0);

    this._comboBg = this.add.rectangle(0, 0, 130, 28, 0x0a0a2a, 0.85)
      .setStrokeStyle(1, 0xff00cc);

    this._comboTxt = this.add.text(0, 0, 'x1 COMBO', {
      fontFamily: 'Orbitron',
      fontSize:   '13px',
      fontStyle:  'bold',
      color:      '#ff00cc',
    }).setOrigin(0.5);

    this._comboContainer.add([this._comboBg, this._comboTxt]);
  }

  _setCombo(value) {
    if (value <= 1) {
      this.tweens.add({ targets: this._comboContainer, alpha: 0, duration: 300 });
      return;
    }
    this._comboTxt.setText(`x${value} COMBO`);
    this._comboContainer.setAlpha(1);
    this.tweens.add({
      targets:  this._comboContainer,
      scaleX:   1.12, scaleY: 1.12,
      duration: 80,
      yoyo:     true,
      ease:     'Back.Out',
    });
  }

  // ── Level / difficulty indicator ─────────────────────────────

  _buildLevelDisplay() {
    this.add.text(DESIGN_WIDTH - 12, DESIGN_HEIGHT - 28, 'WAVE', {
      fontFamily: 'Orbitron',
      fontSize:   '8px',
      color:      '#444466',
    }).setOrigin(1, 0.5).setDepth(CONSTANTS.DEPTH_HUD);

    this._levelTxt = this.add.text(DESIGN_WIDTH - 12, DESIGN_HEIGHT - 15, '1', {
      fontFamily: 'Orbitron',
      fontSize:   '15px',
      fontStyle:  'bold',
      color:      '#39ff14',
    }).setOrigin(1, 0.5).setDepth(CONSTANTS.DEPTH_HUD);
  }

  _setLevel(level) {
    this._levelTxt.setText(String(level + 1));
    this.tweens.add({
      targets:  this._levelTxt,
      scaleX:   1.4, scaleY: 1.4,
      alpha:    { from: 1, to: 1 },
      duration: 200,
      yoyo:     true,
      ease:     'Back.Out',
    });

    // Flash green briefly
    this._levelTxt.setStyle({ color: '#ffffff' });
    this.time.delayedCall(220, () => this._levelTxt.setStyle({ color: '#39ff14' }));
  }

  // ── Pause hint ───────────────────────────────────────────────

  _buildPauseHint() {
    this._pauseHint = this.add.text(DESIGN_WIDTH / 2, 14, '[ P ] PAUSE', {
      fontFamily: 'Orbitron',
      fontSize:   '8px',
      color:      '#333355',
    }).setOrigin(0.5).setDepth(CONSTANTS.DEPTH_HUD);

    // Hide on touch devices — they'll use the pause button in PauseScene
    if (!this.sys.game.device.input.touch === false) {
      this._pauseHint.setVisible(false);
    }
  }

  // ── Event subscriptions ───────────────────────────────────────

  _subscribeToGameEvents() {
    const gameScene = this.scene.get('GameScene');
    if (!gameScene) return;

    const ev = gameScene.events;

    ev.on('score_changed', (s)  => {
      this._scoreTxt.setText(formatScore(s));
    });

    ev.on('lives_changed', (l)  => this._setLives(l));
    ev.on('combo_changed', (c)  => this._setCombo(c));
    ev.on('level_changed', (lv) => this._setLevel(lv));
  }

  // ── Shutdown ──────────────────────────────────────────────────

  shutdown() {
    const gameScene = this.scene.get('GameScene');
    gameScene?.events.removeAllListeners('score_changed');
    gameScene?.events.removeAllListeners('lives_changed');
    gameScene?.events.removeAllListeners('combo_changed');
    gameScene?.events.removeAllListeners('level_changed');
  }
}