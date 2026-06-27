// scenes/GameOverScene.js
// Handles both Game Over and Win states, passed via scene data.
// Shows score breakdown, new-record badge, and action buttons.

import AudioManager   from '@managers/AudioManager';
import StorageManager from '@managers/StorageManager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';
import { formatScore } from '@utils/MathUtils';

const CX = DESIGN_WIDTH  / 2;
const CY = DESIGN_HEIGHT / 2;

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  // ── Init ─────────────────────────────────────────────────────

  init(data) {
    this._score     = data.score     ?? 0;
    this._highScore = data.highScore ?? StorageManager.getHighScore();
    this._isWin     = data.win       ?? false;
    this._isNewRecord = this._score >= this._highScore && this._score > 0;
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    this._buildBackground();
    this._buildCard();
    this._buildScoreBreakdown();
    this._buildButtons();
    this._animateIn();

    AudioManager.playMusic('music_menu', 1200);

    // Particle burst celebration on win
    if (this._isWin) {
      this._celebrationBurst();
    }
  }

  // ── Background ───────────────────────────────────────────────

  _buildBackground() {
    // Dimmed blurred game snapshot feel — solid overlay
    this.add.rectangle(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 0x040410, 0.95).setDepth(0);

    // Subtle animated stars
    this._starfield = this.add.tileSprite(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer2')
      .setAlpha(0.15)
      .setDepth(1);
  }

  // ── Card ─────────────────────────────────────────────────────

  _buildCard() {
    this._card = this.add.container(CX, CY + 40).setDepth(2).setAlpha(0);

    const accentColor = this._isWin ? 0xffee00 : 0xff2244;
    const accentHex   = this._isWin ? '#ffee00' : '#ff2244';

    // Card background
    const cardBg = this.add.rectangle(0, 0, 320, 480, 0x0d0d2a)
      .setStrokeStyle(2, accentColor);

    // Header banner
    const banner = this.add.rectangle(0, -200, 320, 72, accentColor, 0.12);

    // Main title
    const titleStr = this._isWin ? 'YOU WIN!' : 'GAME OVER';
    const title    = this.add.text(0, -200, titleStr, {
      fontFamily: 'Orbitron',
      fontSize:   '30px',
      fontStyle:  'bold',
      color:      accentHex,
      stroke:     '#000022',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Subtitle
    const sub = this.add.text(0, -164, this._isWin ? 'SURGE SURVIVED' : 'THE SURGE WINS', {
      fontFamily: 'Orbitron',
      fontSize:   '10px',
      color:      '#666699',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this._card.add([cardBg, banner, title, sub]);
  }

  // ── Score breakdown ───────────────────────────────────────────

  _buildScoreBreakdown() {
    // Score label
    const scoreLabel = this.add.text(0, -110, 'SCORE', {
      fontFamily: 'Orbitron',
      fontSize:   '10px',
      color:      '#6666aa',
    }).setOrigin(0.5);

    // Score value — large
    this._scoreTxt = this.add.text(0, -82, formatScore(this._score), {
      fontFamily: 'Orbitron',
      fontSize:   '26px',
      fontStyle:  'bold',
      color:      '#00f5ff',
      stroke:     '#001133',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Divider
    const divider = this.add.rectangle(0, -52, 240, 1, 0x1a1a44);

    // Best score row
    const bestLabel = this.add.text(-60, -28, 'BEST', {
      fontFamily: 'Orbitron',
      fontSize:   '10px',
      color:      '#444466',
    }).setOrigin(0, 0.5);

    const bestVal = this.add.text(60, -28, formatScore(this._highScore), {
      fontFamily: 'Orbitron',
      fontSize:   '13px',
      color:      '#ffee00',
    }).setOrigin(1, 0.5);

    this._card.add([scoreLabel, this._scoreTxt, divider, bestLabel, bestVal]);

    // New record badge
    if (this._isNewRecord) {
      const badge = this.add.container(70, -82);
      const badgeBg = this.add.rectangle(0, 0, 72, 22, 0xffee00)
        .setStrokeStyle(1, 0xff8800);
      const badgeTxt = this.add.text(0, 0, 'NEW BEST!', {
        fontFamily: 'Orbitron',
        fontSize:   '8px',
        fontStyle:  'bold',
        color:      '#000000',
      }).setOrigin(0.5);
      badge.add([badgeBg, badgeTxt]);
      this._card.add(badge);

      // Badge pulse
      this.tweens.add({
        targets:  badge,
        scaleX:   1.1, scaleY: 1.1,
        duration: 600,
        ease:     'Sine.InOut',
        yoyo:     true,
        repeat:   -1,
      });
    }

    // Scroll counter animation
    this._animateScoreCount();
  }

  _animateScoreCount() {
    const target = this._score;
    let current  = 0;
    const steps  = 60;
    const inc    = target / steps;

    const timer = this.time.addEvent({
      delay:     18,
      repeat:    steps - 1,
      callback:  () => {
        current = Math.min(current + inc, target);
        this._scoreTxt?.setText(formatScore(Math.floor(current)));
      },
    });
  }

  // ── Buttons ───────────────────────────────────────────────────

  _buildButtons() {
    const defs = [
      { label: 'PLAY AGAIN', y: 70,  color: '#00f5ff', action: () => this._playAgain() },
      { label: 'MAIN MENU',  y: 140, color: '#ff00cc', action: () => this._mainMenu()  },
    ];

    defs.forEach(({ label, y, color, action }) => {
      const btn = this._makeButton(0, y, label, color, action);
      this._card.add(btn);
    });
  }

  _makeButton(x, y, label, colorHex, callback) {
    const container = this.add.container(x, y);
    const color     = Phaser.Display.Color.HexStringToColor(colorHex).color;

    const bg = this.add.rectangle(0, 0, 220, 46, 0x0a0a2a)
      .setStrokeStyle(2, color)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron',
      fontSize:   '14px',
      color:      colorHex,
    }).setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover',  () => { bg.setFillStyle(color, 0.15); text.setScale(1.05); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x0a0a2a); text.setScale(1); });
    bg.on('pointerdown',  () => { bg.setFillStyle(0x001133); text.setScale(0.95); });
    bg.on('pointerup',    () => {
      AudioManager.playSfx('sfx_ui_click');
      bg.setFillStyle(0x0a0a2a);
      callback();
    });

    return container;
  }

  // ── Actions ───────────────────────────────────────────────────

  _playAgain() {
    AudioManager.stopMusic(200);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });
  }

  _mainMenu() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }

  // ── Win celebration ───────────────────────────────────────────

  _celebrationBurst() {
    const colors = [0x00f5ff, 0xff00cc, 0xffee00, 0x39ff14];
    colors.forEach((tint, i) => {
      this.time.delayedCall(i * 120, () => {
        const emitter = this.add.particles(
          Phaser.Math.Between(80, DESIGN_WIDTH - 80),
          Phaser.Math.Between(100, 300),
          'particle_star',
          {
            lifespan:  { min: 600, max: 1200 },
            speed:     { min: 80, max: 240 },
            angle:     { min: 0, max: 360 },
            scale:     { start: 0.8, end: 0 },
            alpha:     { start: 1, end: 0 },
            tint,
            quantity:  20,
            blendMode: Phaser.BlendModes.ADD,
          },
        ).setDepth(10);

        emitter.explode(20);
        this.time.delayedCall(1500, () => emitter.destroy());
      });
    });
  }

  // ── Animate in ───────────────────────────────────────────────

  _animateIn() {
    this.cameras.main.fadeIn(500);
    this.tweens.add({
      targets:  this._card,
      alpha:    1,
      y:        CY,
      duration: 500,
      ease:     'Back.Out',
      delay:    200,
    });
  }

  // ── Update ───────────────────────────────────────────────────

  update() {
    if (this._starfield) {
      this._starfield.tilePositionY -= 0.4;
    }
  }
}