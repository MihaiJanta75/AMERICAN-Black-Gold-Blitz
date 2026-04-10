/* ===== SETTINGS (persisted via localStorage) ===== */
const STORAGE_KEY = 'bgb_settings';
const HIGHSCORE_KEY = 'bgb_highscore';

const defaultSettings = { soundOn: true, shakeOn: true, autoFire: false };

let settings = { ...defaultSettings };
try {
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (s) settings = { ...defaultSettings, ...s };
} catch (e) { /* no stored settings */ }

export function getSettings() { return settings; }

export function updateSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* storage unavailable */ }
}

export function toggleSetting(key) {
  updateSetting(key, !settings[key]);
  return settings[key];
}

/* ===== HIGH SCORES ===== */
let highScore = 0;
try { highScore = parseInt(localStorage.getItem(HIGHSCORE_KEY)) || 0; } catch (e) { /* no stored score */ }

export function getHighScore() { return highScore; }

export function saveHighScore(s) {
  if (s > highScore) {
    highScore = s;
    try { localStorage.setItem(HIGHSCORE_KEY, s); } catch (e) { /* storage unavailable */ }
  }
}
