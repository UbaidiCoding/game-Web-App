// utils/MathUtils.js
// Pure math helpers — no Phaser dependency, fully tree-shakeable.

/**
 * Linear interpolation between a and b by factor t ∈ [0, 1].
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a value from one range to another.
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Random float in [min, max).
 */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer in [min, max] inclusive.
 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 */
export function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns true with probability p ∈ [0, 1].
 */
export function chance(p) {
  return Math.random() < p;
}

/**
 * Smooth-step interpolation (ease-in-out).
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Converts degrees to radians.
 */
export function degToRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Distance between two points.
 */
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalise an angle in radians to [0, 2π].
 */
export function normalizeAngle(rad) {
  return ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

/**
 * Eased lerp — useful for smooth camera/UI follow.
 * @param {number} dt  Delta time in seconds
 * @param {number} speed  Higher = snappier (try 5–12)
 */
export function expDecayLerp(current, target, speed, dt) {
  return lerp(current, target, 1 - Math.exp(-speed * dt));
}

/**
 * Format a score integer as a zero-padded string, e.g. 00012340.
 */
export function formatScore(score, digits = 8) {
  return String(Math.floor(score)).padStart(digits, '0');
}

/**
 * Convert milliseconds to "MM:SS" display string.
 */
export function msToMMSS(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}