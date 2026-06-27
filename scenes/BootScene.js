// scenes/BootScene.js
// Loads all assets with progress feedback, then transitions to MenuScene.
// Also hides the HTML initial-loader once Phaser canvas is ready.

import AudioManager   from '@managers/AudioManager';
import StorageManager from '@managers/StorageManager';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  // ── Preload ───────────────────────────────────────────────────

  preload() {
    this._createLoadingBar();
    this._registerLoadEvents();
    this._loadAssets();
  }

  _createLoadingBar() {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // Background overlay so nothing renders behind it
    this.add.rectangle(cx, cy, width, height, 0x0a0a1a).setDepth(100);

    // Title
    this.add.text(cx, cy - 80, 'NEON SURGE', {
      fontFamily: 'Orbitron',
      fontSize:   '32px',
      fontStyle:  'bold',
      color:      '#00f5ff',
      stroke:     '#0044ff',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);

    // Bar background
    const barW = width * 0.68;
    this.add.rectangle(cx, cy + 10, barW + 4, 14, 0x111133)
      .setDepth(101);

    // Progress bar fill
    this._bar = this.add.rectangle(cx - barW / 2, cy + 10, 0, 10, 0x00f5ff)
      .setOrigin(0, 0.5)
      .setDepth(102);

    // Label
    this._loadLabel = this.add.text(cx, cy + 38, 'Loading…', {
      fontFamily: 'Orbitron',
      fontSize:   '11px',
      color:      '#6666aa',
    }).setOrigin(0.5).setDepth(102);

    this._barWidth = barW;
  }

  _registerLoadEvents() {
    this.load.on('progress', (value) => {
      if (!this._bar) return;
      this._bar.width = this._barWidth * value;

      // Sync HTML loader bar too (visible before canvas)
      const htmlBar = document.getElementById('loader-bar');
      if (htmlBar) htmlBar.style.width = `${Math.round(value * 100)}%`;
    });

    this.load.on('fileprogress', (file) => {
      if (this._loadLabel) {
        this._loadLabel.setText(`Loading: ${file.key}`);
      }
      const htmlLabel = document.getElementById('loader-label');
      if (htmlLabel) htmlLabel.textContent = `Loading: ${file.key}`;
    });

    this.load.on('complete', () => {
      this._hideHtmlLoader();
    });
  }

  _hideHtmlLoader() {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after transition
      setTimeout(() => loader.remove(), 700);
    }
  }

  _loadAssets() {
    // ── Spritesheets ─────────────────────────────────────────
    // Player ship: 12 frames (0-3 idle, 4-7 thrust, 8-11 damaged)
    this.load.spritesheet('player_ship', 'assets/sprites/player_ship.png', {
      frameWidth:  64,
      frameHeight: 64,
    });

    // Obstacles: 8 variants in a single row
    this.load.spritesheet('obstacles', 'assets/sprites/obstacles.png', {
      frameWidth:  64,
      frameHeight: 64,
    });

    // Gems: 4 color variants
    this.load.spritesheet('gem', 'assets/sprites/gem.png', {
      frameWidth:  32,
      frameHeight: 32,
    });

    // ── Individual textures ───────────────────────────────────
    this.load.image('bg_layer0', 'assets/backgrounds/bg_layer0.png'); // deep space
    this.load.image('bg_layer1', 'assets/backgrounds/bg_layer1.png'); // nebula mid
    this.load.image('bg_layer2', 'assets/backgrounds/bg_layer2.png'); // star field
    this.load.image('logo',      'assets/sprites/logo.png');

    // Particle textures (tiny PNGs, generated in code if missing)
    this.load.image('particle_circle', 'assets/sprites/particle_circle.png');
    this.load.image('particle_star',   'assets/sprites/particle_star.png');

    // UI elements
    this.load.image('btn_bg',    'assets/sprites/btn_bg.png');
    this.load.image('heart',     'assets/sprites/heart.png');
    this.load.image('panel_bg',  'assets/sprites/panel_bg.png');

    // ── Audio ─────────────────────────────────────────────────
    this.load.audio('music_menu',  ['assets/audio/music_menu.ogg',  'assets/audio/music_menu.mp3']);
    this.load.audio('music_game',  ['assets/audio/music_game.ogg',  'assets/audio/music_game.mp3']);
    this.load.audio('sfx_hit',     ['assets/audio/sfx_hit.ogg',     'assets/audio/sfx_hit.mp3']);
    this.load.audio('sfx_gem',     ['assets/audio/sfx_gem.ogg',     'assets/audio/sfx_gem.mp3']);
    this.load.audio('sfx_explode', ['assets/audio/sfx_explode.ogg', 'assets/audio/sfx_explode.mp3']);
    this.load.audio('sfx_obstacle_break', [
      'assets/audio/sfx_obstacle_break.ogg',
      'assets/audio/sfx_obstacle_break.mp3',
    ]);
    this.load.audio('sfx_ui_click',  ['assets/audio/sfx_ui_click.ogg',  'assets/audio/sfx_ui_click.mp3']);
    this.load.audio('sfx_levelup',   ['assets/audio/sfx_levelup.ogg',   'assets/audio/sfx_levelup.mp3']);
    this.load.audio('sfx_gameover',  ['assets/audio/sfx_gameover.ogg',  'assets/audio/sfx_gameover.mp3']);
    this.load.audio('sfx_win',       ['assets/audio/sfx_win.ogg',       'assets/audio/sfx_win.mp3']);
  }

  // ── Create ────────────────────────────────────────────────────

  create() {
    // Init AudioManager now that the scene + sound system exist
    AudioManager.init(this);

    // Tiny delay so the progress bar visually completes before transition
    this.time.delayedCall(300, () => {
      this.scene.start('MenuScene');
    });
  }
}