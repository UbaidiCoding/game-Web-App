// scenes/PauseScene.js
// Launched as an overlay on top of the paused GameScene + UIScene.
// Resume / Restart / Quit options.

import AudioManager from '@managers/AudioManager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';

const CX = DESIGN_WIDTH  / 2;
const CY = DESIGN_HEIGHT / 2;

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    this._buildBackdrop();
    this._buildCard();
    this._buildButtons();
    this._animateIn();

    // ESC / P also resumes
    this.input.keyboard.on('keydown-ESC', () => this._resume());
    this.input.keyboard.on('keydown-P',   () => this._resume());
  }

  // ── Backdrop ─────────────────────────────────────────────────

  _buildBackdrop() {
    this._backdrop = this.add.rectangle(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0)
      .setDepth(0)
      .setInteractive(); // swallow pointer events

    this.tweens.add({ targets: this._backdrop, fillAlpha: 0.65, duration: 250 });
  }

  // ── Card ─────────────────────────────────────────────────────

  _buildCard() {
    this._card = this.add.container(CX, CY).setDepth(1).setAlpha(0);

    const bg = this.add.rectangle(0, 0, 280, 320, 0x0d0d2a)
      .setStrokeStyle(2, 0x00f5ff);

    const title = this.add.text(0, -120, 'PAUSED', {
      fontFamily: 'Orbitron',
      fontSize:   '28px',
      fontStyle:  'bold',
      color:      '#00f5ff',
      stroke:     '#003388',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Decorative horizontal rule
    const rule = this.add.rectangle(0, -88, 200, 1, 0x00f5ff, 0.3);

    this._card.add([bg, title, rule]);
  }

  // ── Buttons ───────────────────────────────────────────────────

  _buildButtons() {
    const defs = [
      { label: 'RESUME',  y: -30, color: '#00f5ff', action: () => this._resume()  },
      { label: 'RESTART', y:  40, color: '#ffee00', action: () => this._restart() },
      { label: 'QUIT',    y: 110, color: '#ff4466', action: () => this._quit()    },
    ];

    defs.forEach(({ label, y, color, action }) => {
      const btn = this._makeButton(0, y, label, color, action);
      this._card.add(btn);
    });
  }

  _makeButton(x, y, label, colorHex, callback) {
    const container = this.add.container(x, y);
    const color     = Phaser.Display.Color.HexStringToColor(colorHex).color;

    const bg = this.add.rectangle(0, 0, 200, 42, 0x0a0a2a)
      .setStrokeStyle(1.5, color)
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

  _resume() {
    this.tweens.add({
      targets:  [this._card, this._backdrop],
      alpha:    0,
      duration: 180,
      onComplete: () => {
        this.scene.stop('PauseScene');
        this.scene.resume('GameScene');
        this.scene.resume('UIScene');
        const gameScene = this.scene.get('GameScene');
        gameScene?.resume?.();
      },
    });
  }

  _restart() {
    AudioManager.stopMusic(200);
    this.tweens.add({
      targets:  [this._card, this._backdrop],
      alpha:    0,
      duration: 200,
      onComplete: () => {
        this.scene.stop('PauseScene');
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameScene');
        this.scene.start('UIScene');
      },
    });
  }

  _quit() {
    AudioManager.stopMusic(300);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('PauseScene');
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });
  }

  // ── Animate in ───────────────────────────────────────────────

  _animateIn() {
    this.tweens.add({
      targets:  this._card,
      alpha:    1,
      y:        CY,
      duration: 280,
      ease:     'Back.Out',
      delay:    60,
    });
  }
}