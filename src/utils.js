/* ===== UTILITY FUNCTIONS ===== */
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
export function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
