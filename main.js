// main.js
// Entry point — wires Phaser config with all scenes and boots the game.

import Phaser from 'phaser';
import { buildPhaserConfig } from '@config/GameConfig';

// Scenes — import order matches the Phaser scene registry boot sequence
import BootScene     from '@scenes/BootScene';
import MenuScene     from '@scenes/MenuScene';
import GameScene     from '@scenes/GameScene';
import UIScene       from '@scenes/UIScene';
import PauseScene    from '@scenes/PauseScene';
import GameOverScene from '@scenes/GameOverScene';

// Boot Phaser once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const config = buildPhaserConfig([
    BootScene,
    MenuScene,
    GameScene,
    UIScene,
    PauseScene,
    GameOverScene,
  ]);

  // Expose game instance globally for debugging in dev only
  const game = new Phaser.Game(config);

  if (import.meta.env.DEV) {
    window.__NEON_SURGE__ = game;
  }

  // Prevent context menu on right-click (common annoyance in browser games)
  document.getElementById('game-container')
    .addEventListener('contextmenu', e => e.preventDefault());
});