// scenes/MenuScene.js
// Main menu with animated logo, high score, start/settings buttons,
// and a settings overlay panel.

import StorageManager from '@managers/StorageManager';
import AudioManager   from '@managers/AudioManager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';
import { formatScore } from '@utils/MathUtils';

const CY = DESIGN_HEIGHT / 2;
const CX = DESIGN_WIDTH  / 2;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this._settingsOpen  = false;
    this._settingsPanel = null;
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    this._buildBackground();
    this._buildLogo();
    this._buildHighScore();
    this._buildButtons();
    this._buildSettingsPanel();
    this._buildVersion();

    AudioManager.playMusic('music_menu');
    this._animateIn();
  }

  // ── Background ────────────────────────────────────────────────

  _buildBackground() {
    // Parallax layers (tileSprites scroll at different rates in update)
    this._bg0 = this.add.tileSprite(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer0').setDepth(0);
    this._bg1 = this.add.tileSprite(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer1').setDepth(1).setAlpha(0.6);
    this._bg2 = this.add.tileSprite(CX, CY, DESIGN_WIDTH, DESIGN_HEIGHT, 'bg_layer2').setDepth(2).setAlpha(0.35);
  }

  // ── Logo ──────────────────────────────────────────────────────

  _buildLogo() {
    this._logoText = this.add.text(CX, 140, 'NEON\nSURGE', {
      fontFamily: 'Orbitron',
      fontSize:   '52px',
      fontStyle:  'bold',
      color:      '#00f5ff',
      stroke:     '#0022cc',
      strokeThickness: 6,
      align:      'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    // Subtitle
    this._subtitle = this.add.text(CX, 235, 'SURVIVE THE SURGE', {
      fontFamily: 'Orbitron',
      fontSize:   '12px',
      color:      '#ff00cc',
      letterSpacing: 5,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    // Pulsing glow loop
    this.tweens.add({
      targets:  this._logoText,
      alpha:    { from: 0.85, to: 1 },
      duration: 1600,
      ease:     'Sine.InOut',
      yoyo:     true,
      repeat:   -1,
    });
  }

  // ── High score ────────────────────────────────────────────────

  _buildHighScore() {
    const hs = StorageManager.getHighScore();
    this._hsText = this.add.text(CX, 278, `BEST  ${formatScore(hs)}`, {
      fontFamily: 'Orbitron',
      fontSize:   '13px',
      color:      '#ffee00',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  // ── Buttons ───────────────────────────────────────────────────

  _buildButtons() {
    this._btnGroup = this.add.container(0, 0).setDepth(10);

    const defs = [
      { label: 'START GAME',  y: 380, color: '#00f5ff', action: () => this._startGame()    },
      { label: 'SETTINGS',    y: 450, color: '#ff00cc', action: () => this._openSettings() },
      { label: 'LEADERBOARD', y: 520, color: '#ffee00', action: () => this._showLeaders()  },
    ];

    this._menuButtons = [];

    defs.forEach(({ label, y, color, action }) => {
      const btn = this._makeButton(CX, y, label, color, action);
      this._btnGroup.add(btn.list ?? [btn]);
      this._menuButtons.push(btn);
    });

    this._btnGroup.setAlpha(0);
  }

  _makeButton(x, y, label, color, callback) {
    const container = this.add.container(x, y);

    // Background pill
    const bg = this.add.rectangle(0, 0, 220, 44, 0x0a0a2a)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron',
      fontSize:   '14px',
      color,
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Hover / press feedback
    bg.on('pointerover',  () => {
      bg.setFillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.18);
      text.setScale(1.05);
      AudioManager.playSfx('sfx_ui_click', { volume: 0.3 });
    });
    bg.on('pointerout',   () => { bg.setFillStyle(0x0a0a2a); text.setScale(1); });
    bg.on('pointerdown',  () => { bg.setFillStyle(0x001133); text.setScale(0.96); });
    bg.on('pointerup',    () => {
      bg.setFillStyle(0x0a0a2a);
      text.setScale(1);
      AudioManager.playSfx('sfx_ui_click');
      callback();
    });

    return container;
  }

  // ── Settings panel ────────────────────────────────────────────

  _buildSettingsPanel() {
    this._settingsPanel = this.add.container(CX, CY).setDepth(20).setAlpha(0).setVisible(false);

    const panelW = 320;
    const panelH = 380;

    // Dark backdrop
    const backdrop = this.add.rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.7)
      .setInteractive(); // capture clicks so they don't bleed through
    backdrop.setSize(DESIGN_WIDTH, DESIGN_HEIGHT);

    // Panel card
    const card = this.add.rectangle(0, 0, panelW, panelH, 0x0d0d2a)
      .setStrokeStyle(2, 0x00f5ff);

    const title = this.add.text(0, -panelH / 2 + 28, 'SETTINGS', {
      fontFamily: 'Orbitron',
      fontSize:   '18px',
      color:      '#00f5ff',
    }).setOrigin(0.5);

    const settings = StorageManager.getSettings();

    // Music volume slider row
    const musicLabel  = this._makeSliderRow(-80, 'MUSIC', settings.musicVolume,
      v => AudioManager.setMusicVolume(v));

    // SFX volume slider row
    const sfxLabel    = this._makeSliderRow(-10, 'SFX', settings.sfxVolume,
      v => AudioManager.setSfxVolume(v));

    // Particles toggle
    const particlesTog = this._makeToggleRow(60, 'PARTICLES', settings.particles,
      v => { StorageManager.patchSettings({ particles: v }); });

    // Screen shake toggle
    const shakeTog    = this._makeToggleRow(120, 'SCREEN SHAKE', settings.screenShake,
      v => StorageManager.patchSettings({ screenShake: v }));

    // Close button
    const closeBtn = this._makeButton(0, panelH / 2 - 34, 'CLOSE', '#ff00cc', () => this._closeSettings());

    this._settingsPanel.add([
      backdrop, card, title,
      ...musicLabel, ...sfxLabel,
      ...particlesTog, ...shakeTog,
      closeBtn,
    ]);
  }

  _makeSliderRow(relY, labelStr, initialValue, onChange) {
    const label = this.add.text(-120, relY, labelStr, {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#aaaacc',
    }).setOrigin(0, 0.5);

    const trackW = 160;
    const track  = this.add.rectangle(30, relY, trackW, 4, 0x333366);

    const knobX  = -trackW / 2 + trackW * initialValue;
    const knob   = this.add.circle(30 + knobX, relY, 9, 0x00f5ff)
      .setInteractive({ draggable: true, useHandCursor: true });

    knob.on('drag', (pointer, dragX) => {
      const minX = 30 - trackW / 2;
      const maxX = 30 + trackW / 2;
      const cx   = Phaser.Math.Clamp(dragX, minX, maxX);
      knob.x     = cx;
      const v    = (cx - minX) / trackW;
      onChange(v);
    });

    return [label, track, knob];
  }

  _makeToggleRow(relY, labelStr, initial, onChange) {
    let state = initial;

    const label  = this.add.text(-120, relY, labelStr, {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#aaaacc',
    }).setOrigin(0, 0.5);

    const pill   = this.add.rectangle(90, relY, 52, 26, state ? 0x00f5ff : 0x333366)
      .setInteractive({ useHandCursor: true });

    const circle = this.add.circle(state ? 90 + 13 : 90 - 13, relY, 10, 0xffffff);

    pill.on('pointerup', () => {
      state = !state;
      pill.setFillStyle(state ? 0x00f5ff : 0x333366);
      this.tweens.add({ targets: circle, x: state ? 90 + 13 : 90 - 13, duration: 160, ease: 'Back.Out' });
      onChange(state);
      AudioManager.playSfx('sfx_ui_click');
    });

    return [label, pill, circle];
  }

  _openSettings() {
    this._settingsOpen = true;
    this._settingsPanel.setVisible(true);
    this.tweens.add({ targets: this._settingsPanel, alpha: 1, duration: 200 });
  }

  _closeSettings() {
    this.tweens.add({
      targets: this._settingsPanel,
      alpha:   0,
      duration: 180,
      onComplete: () => {
        this._settingsPanel.setVisible(false);
        this._settingsOpen = false;
      },
    });
  }

  // ── Leaderboard (local only) ──────────────────────────────────

  _showLeaders() {
    const hs = StorageManager.getHighScore();
    // Simple modal reusing the settings panel slot
    this.add.text(CX, CY, `YOUR BEST\n${formatScore(hs)}`, {
      fontFamily: 'Orbitron',
      fontSize:   '22px',
      color:      '#ffee00',
      align:      'center',
    }).setOrigin(0.5).setDepth(30);
  }

  // ── Start game ────────────────────────────────────────────────

  _startGame() {
    AudioManager.stopMusic(400);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });
  }

  // ── Version ───────────────────────────────────────────────────

  _buildVersion() {
    this.add.text(DESIGN_WIDTH - 8, DESIGN_HEIGHT - 8, 'v1.0.0', {
      fontFamily: 'Rajdhani',
      fontSize:   '10px',
      color:      '#333355',
    }).setOrigin(1, 1).setDepth(5);
  }

  // ── Animate in ───────────────────────────────────────────────

  _animateIn() {
    this.cameras.main.fadeIn(600);

    this.tweens.add({ targets: this._logoText,   alpha: 1, y: '-=12', duration: 700, ease: 'Back.Out', delay: 100 });
    this.tweens.add({ targets: this._subtitle,   alpha: 1, duration: 500, delay: 400 });
    this.tweens.add({ targets: this._hsText,     alpha: 1, duration: 500, delay: 550 });
    this.tweens.add({ targets: this._btnGroup,   alpha: 1, duration: 500, delay: 650 });
  }

  // ── Update ────────────────────────────────────────────────────

  update() {
    // Slow parallax scroll
    this._bg0.tilePositionY -= 0.12;
    this._bg1.tilePositionY -= 0.28;
    this._bg2.tilePositionY -= 0.50;
  }
}