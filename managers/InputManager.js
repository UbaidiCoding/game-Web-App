// managers/InputManager.js
// Unified input abstraction — keyboard WASD/arrows + gamepad + touch swipe/drag.
// Scenes query this instead of polling Phaser cursors directly,
// keeping game logic independent of input device.

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '@config/GameConfig';

class InputManager {
  constructor() {
    // Virtual axis values — range [-1, 1]
    this.axisX = 0;
    this.axisY = 0;

    // Action buttons (set true for one frame on press)
    this.actionPressed  = false; // fire / confirm
    this.pausePressed   = false;
    this.backPressed    = false;

    // Internal state
    this._keys          = null;  // Phaser CursorKeys + WASD
    this._pointer       = null;  // Active Phaser Pointer
    this._touchStartX   = 0;
    this._touchStartY   = 0;
    this._touchActive   = false;
    this._dragThreshold = 12;    // px before drag registers as axis

    // Raw touch position (used for on-screen HUD buttons)
    this.pointerX = 0;
    this.pointerY = 0;
    this.pointerDown = false;
  }

  // ── Init ─────────────────────────────────────────────────────

  /**
   * Call once from GameScene.create().
   * @param {Phaser.Scene} scene
   */
  init(scene) {
    const { keyboard, gamepad } = scene.input;

    // Standard cursor keys + WASD + action keys
    this._keys = {
      ...scene.input.keyboard.createCursorKeys(),
      W:      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A:      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S:      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D:      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE:  keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ENTER:  keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ESC:    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    // Touch / mouse
    scene.input.on('pointerdown', (p) => {
      this._pointer      = p;
      this._touchActive  = true;
      this._touchStartX  = p.x;
      this._touchStartY  = p.y;
      this.pointerDown   = true;
      this.pointerX      = p.x;
      this.pointerY      = p.y;
    });

    scene.input.on('pointermove', (p) => {
      this.pointerX = p.x;
      this.pointerY = p.y;
      if (this._touchActive) {
        const dx = p.x - this._touchStartX;
        const dy = p.y - this._touchStartY;
        if (Math.abs(dx) > this._dragThreshold || Math.abs(dy) > this._dragThreshold) {
          // Normalise drag into axis space — clamp to ±1 with a 120px full-deflection range
          this.axisX = Math.max(-1, Math.min(1, dx / 120));
          this.axisY = Math.max(-1, Math.min(1, dy / 120));
        }
      }
    });

    scene.input.on('pointerup', () => {
      this._touchActive = false;
      this.pointerDown  = false;
      // Decay touch axis on release so ship doesn't keep drifting
      this.axisX = 0;
      this.axisY = 0;
    });

    // One-shot ESC / pause key via Phaser event (not polled) so it fires once
    this._keys.ESC.on('down', () => { this.pausePressed = true; });

    // Gamepad support (optional — works if browser exposes it)
    if (gamepad) {
      scene.input.gamepad.on('connected', (pad) => {
        this._gamepad = pad;
      });
    }
  }

  // ── Update — call every frame in GameScene.update() ──────────

  update() {
    const k = this._keys;
    if (!k) return;

    // Reset one-shot flags
    this.actionPressed = false;
    // pausePressed is reset by the scene after it reads it

    // ── Keyboard axis ────────────────────────────────────────
    let kx = 0;
    let ky = 0;

    if (k.left.isDown  || k.A.isDown) kx -= 1;
    if (k.right.isDown || k.D.isDown) kx += 1;
    if (k.up.isDown    || k.W.isDown) ky -= 1;
    if (k.down.isDown  || k.S.isDown) ky += 1;

    // Keyboard overrides touch when held
    if (kx !== 0 || ky !== 0) {
      this.axisX = kx;
      this.axisY = ky;
    }

    // ── Gamepad axis ─────────────────────────────────────────
    if (this._gamepad) {
      const gx = this._gamepad.leftStick.x;
      const gy = this._gamepad.leftStick.y;
      // Deadzone 0.15
      if (Math.abs(gx) > 0.15 || Math.abs(gy) > 0.15) {
        this.axisX = gx;
        this.axisY = gy;
      }
    }

    // ── Action buttons ───────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER)) {
      this.actionPressed = true;
    }
  }

  /**
   * Consume the pausePressed flag — call from the scene that handles pause.
   */
  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  /**
   * Destroy keyboard listeners — call on scene shutdown.
   */
  destroy(scene) {
    if (this._keys) {
      Object.values(this._keys).forEach(k => {
        if (k?.removeAllListeners) k.removeAllListeners();
      });
    }
    scene?.input?.removeAllListeners();
    this._keys    = null;
    this._pointer = null;
  }
}

export default new InputManager();