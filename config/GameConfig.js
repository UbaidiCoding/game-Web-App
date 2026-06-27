// config/GameConfig.js
// Central constants and Phaser configuration factory.
// Import CONSTANTS anywhere; call buildPhaserConfig() in main.js.

import Phaser from 'phaser';

// ── Design resolution ─────────────────────────────────────────
// All scene coordinates are authored at this size.
// Phaser's scale manager handles the rest.
export const DESIGN_WIDTH  = 480;
export const DESIGN_HEIGHT = 854; // ~16:9 portrait (mobile-first)

// ── Gameplay tuning ───────────────────────────────────────────
export const CONSTANTS = {
  // Player
  PLAYER_SPEED:          320,   // px/s horizontal
  PLAYER_VERT_SPEED:     200,   // px/s vertical
  PLAYER_START_LIVES:    3,
  PLAYER_INVINCIBLE_MS:  1800,  // iframe duration after hit

  // Obstacles
  OBSTACLE_BASE_SPEED:   260,   // px/s downward
  OBSTACLE_MAX_SPEED:    680,
  OBSTACLE_SPAWN_DELAY:  900,   // ms between spawns at difficulty 0
  OBSTACLE_MIN_DELAY:    220,

  // Collectibles
  GEM_SPAWN_CHANCE:      0.25,  // probability per obstacle wave
  GEM_POINTS:            50,
  GEM_SPEED:             180,

  // Scoring
  SCORE_PER_SECOND:      10,
  COMBO_WINDOW_MS:       2500,  // window to chain gem pickups
  COMBO_MULTIPLIER_MAX:  8,

  // Difficulty
  DIFFICULTY_RAMP_INTERVAL: 8000, // ms between difficulty ticks
  DIFFICULTY_MAX:            20,

  // Wave survival milestone (triggers win screen)
  WIN_SCORE:             50000,

  // Audio
  MUSIC_VOLUME:          0.35,
  SFX_VOLUME:            0.7,

  // Z-depths (Phaser depth values)
  DEPTH_BG:         0,
  DEPTH_COLLECTIBLE:10,
  DEPTH_OBSTACLE:   20,
  DEPTH_PLAYER:     30,
  DEPTH_PARTICLES:  40,
  DEPTH_HUD:        50,
  DEPTH_OVERLAY:    60,

  // LocalStorage keys
  LS_HIGHSCORE:  'ns_highscore',
  LS_SETTINGS:   'ns_settings',
  LS_PROGRESS:   'ns_progress',
};

// ── Default user settings ─────────────────────────────────────
export const DEFAULT_SETTINGS = {
  musicVolume: 0.35,
  sfxVolume:   0.7,
  screenShake: true,
  particles:   true,
  quality:     'high', // 'high' | 'low'
};

// ── Phaser config factory ─────────────────────────────────────
// Pass scene classes after they are all imported in main.js.
export function buildPhaserConfig(scenes) {
  return {
    type: Phaser.AUTO, // WebGL → Canvas fallback

    width:  DESIGN_WIDTH,
    height: DESIGN_HEIGHT,

    parent: 'game-container',

    backgroundColor: '#0a0a1a',

    scale: {
      mode:             Phaser.Scale.FIT,
      autoCenter:       Phaser.Scale.CENTER_BOTH,
      width:            DESIGN_WIDTH,
      height:           DESIGN_HEIGHT,
      // Allow resizing on orientation change
      resizeInterval:   200,
    },

    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        // Enable debug outlines only in dev
        debug: import.meta.env.DEV && false,
      },
    },

    render: {
      antialias:        false, // Pixel-art sprites look better without
      pixelArt:         false, // We use smooth neon assets
      powerPreference:  'high-performance',
      batchSize:        2048,  // Larger batch = fewer draw calls
    },

    audio: {
      disableWebAudio: false,
    },

    input: {
      // Enable both mouse and touch simultaneously
      activePointers: 3,
    },

    fps: {
      target: 60,
      forceSetTimeOut: false, // Use rAF where available
    },

    scene: scenes,
  };
}