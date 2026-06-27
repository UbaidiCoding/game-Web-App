// managers/StorageManager.js
// Thin LocalStorage wrapper with JSON serialisation, error isolation,
// and versioned schema migration support.

import { CONSTANTS, DEFAULT_SETTINGS } from '@config/GameConfig';

const SCHEMA_VERSION = 1;
const LS_VERSION_KEY = 'ns_schema_version';

class StorageManager {
  constructor() {
    this._available = this._checkAvailability();
    if (this._available) {
      this._migrate();
    }
  }

  // ── Availability ─────────────────────────────────────────────

  _checkAvailability() {
    try {
      const probe = '__ns_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      console.warn('[StorageManager] LocalStorage unavailable — progress will not persist.');
      return false;
    }
  }

  // ── Schema migration ─────────────────────────────────────────

  _migrate() {
    const storedVersion = parseInt(localStorage.getItem(LS_VERSION_KEY) || '0', 10);
    if (storedVersion < SCHEMA_VERSION) {
      // v0 → v1: ensure settings key exists with defaults
      if (!localStorage.getItem(CONSTANTS.LS_SETTINGS)) {
        this.saveSettings(DEFAULT_SETTINGS);
      }
      localStorage.setItem(LS_VERSION_KEY, String(SCHEMA_VERSION));
    }
  }

  // ── Core primitives ──────────────────────────────────────────

  _get(key) {
    if (!this._available) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _set(key, value) {
    if (!this._available) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Quota exceeded or security error
      console.warn(`[StorageManager] Failed to write "${key}":`, e.message);
      return false;
    }
  }

  _remove(key) {
    if (!this._available) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }

  // ── High Score ───────────────────────────────────────────────

  getHighScore() {
    return this._get(CONSTANTS.LS_HIGHSCORE) ?? 0;
  }

  saveHighScore(score) {
    const current = this.getHighScore();
    if (score > current) {
      this._set(CONSTANTS.LS_HIGHSCORE, score);
      return true; // new record
    }
    return false;
  }

  // ── Settings ─────────────────────────────────────────────────

  getSettings() {
    const stored = this._get(CONSTANTS.LS_SETTINGS);
    // Merge with defaults so new keys added in future versions exist
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  }

  saveSettings(settings) {
    this._set(CONSTANTS.LS_SETTINGS, settings);
  }

  patchSettings(patch) {
    const current = this.getSettings();
    this.saveSettings({ ...current, ...patch });
  }

  // ── Progress ─────────────────────────────────────────────────

  getProgress() {
    return this._get(CONSTANTS.LS_PROGRESS) ?? { unlockedLevel: 1, totalGems: 0 };
  }

  saveProgress(data) {
    const current = this.getProgress();
    this._set(CONSTANTS.LS_PROGRESS, { ...current, ...data });
  }

  // ── Reset ────────────────────────────────────────────────────

  resetAll() {
    [
      CONSTANTS.LS_HIGHSCORE,
      CONSTANTS.LS_SETTINGS,
      CONSTANTS.LS_PROGRESS,
      LS_VERSION_KEY,
    ].forEach(k => this._remove(k));
  }
}

// Singleton — import the instance, not the class
export default new StorageManager();