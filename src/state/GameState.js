import {
  OIL_BASE, OIL_BASE_MAX, WORLD_W, WORLD_H, RIG_COUNT,
  RIG_RECAPTURE_INTERVAL, UPGRADE_INTERVAL, MAX_LEVEL, STAT_MAX,
  PLAYER_BASE_SPEED, FIRE_BASE_COOLDOWN, BULLET_BASE_SPEED, PICKUP_RADIUS,
} from '../constants.js';
import { rand, randInt, pickRandom } from '../utils.js';
import { UPGRADES } from '../config.js';

/**
 * Central mutable game state. All logic and rendering modules read/write this.
 */
export const state = {
  gameState: 'title',  // title | playing | upgrade | paused | gameover
  score: 0,
  time: 0,
  waveTimer: 0,
  wantedLevel: 0,
  paused: false,
  timeSurvived: 0,
  rigRecaptureTimer: RIG_RECAPTURE_INTERVAL,

  /* Player */
  player: {
    x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0,
    angle: -Math.PI / 2, oil: OIL_BASE,
    fireCooldown: 0, homingCooldown: 0, invincible: 0,
    rotorAngle: 0, tailRotorAngle: 0, alive: true,
    engineGlow: 0, shieldActive: false, shieldTimer: 0,
    dashCooldown: 0, dashing: 0, dashAngle: 0,
  },

  /* Collections */
  enemies: [],
  bullets: [],
  enemyBullets: [],
  homingMissiles: [],
  particles: [],
  floatingTexts: [],
  loot: [],
  rigs: [],

  /* Stat system */
  playerLevel: 1,
  playerXP: 0,
  statPoints: 0,
  stats: [0, 0, 0, 0, 0, 0, 0, 0],
  showStatPanel: true,

  /* Upgrade system */
  upgradeStats: {},
  upgradeLevels: {},
  upgradeChoices: [],
  nextUpgradeScore: UPGRADE_INTERVAL,
  totalUpgrades: 0,

  /* Combo & streak */
  combo: 0,
  comboTimer: 0,
  killStreak: 0,
  streakTimer: 0,
  maxCombo: 0,
  maxStreak: 0,

  /* Powerups */
  activePowerups: {},

  /* Kill tracking */
  totalKills: { drone: 0, plane: 0, chopper: 0, boss: 0 },
  totalDamageTaken: 0,
  totalDamageDealt: 0,

  /* Screen effects */
  screenFlash: { color: '', alpha: 0 },
  vignetteIntensity: 0,
  shakeAmount: 0,
  lastCritSoundTime: 0,

  /* Camera */
  camera: { x: 0, y: 0 },

  /* Input state (populated by GameScene) */
  input: {
    keys: {},
    mouseX: 0, mouseY: 0,
    mouseDown: false, rightMouseDown: false,
    touchMove: { x: 0, y: 0, active: false },
    touchAim: { x: 0, y: 0, active: false },
    touchFire: false,
    touchMissile: false,
    joystickCenter: null,
    aimJoystickCenter: null,
  },

  /* Viewport dimensions (updated on resize) */
  W: 800,
  H: 600,
};

/* ===== COMPUTED STATS ===== */
export function getMaxOil(s) { return OIL_BASE_MAX + s.stats[1] * 120; }
export function getHealthRegen(s) { return s.stats[0] * 1.5 + s.upgradeStats.regenRate; }
export function getBodyDamage(s) { return 5 + s.stats[2] * 8; }
export function getBulletSpeed(s) { return BULLET_BASE_SPEED + s.stats[3] * 1.2 + (hasPowerup(s, 'speed') ? 3 : 0); }
export function getBulletPenetration(s) { return s.stats[4] + s.upgradeStats.extraPierce; }
export function getBulletDamage(s) { return 15 + s.stats[5] * 7 + (hasPowerup(s, 'damage') ? 15 : 0); }
export function getReloadTime(s) { return Math.max(0.04, FIRE_BASE_COOLDOWN - s.stats[6] * 0.022); }
export function getMoveSpeed(s) { return PLAYER_BASE_SPEED + s.stats[7] * 0.35 + (hasPowerup(s, 'speed') ? 1.5 : 0); }
export function getPickupRadius(s) { return PICKUP_RADIUS + (hasPowerup(s, 'magnet') ? 200 : 0) + s.stats[1] * 5; }

/* ===== POWERUP HELPERS ===== */
export function hasPowerup(s, effect) { return (s.activePowerups[effect] || 0) > 0; }
export function addPowerup(s, effect, duration) { s.activePowerups[effect] = (s.activePowerups[effect] || 0) + duration; }

/* ===== SCREEN EFFECTS ===== */
export function addScreenFlash(s, color, alpha) { s.screenFlash.color = color; s.screenFlash.alpha = alpha; }
export function addShake(s, amount, shakeOn) { if (shakeOn) s.shakeAmount = Math.min(s.shakeAmount + amount, 15); }

/* ===== PARTICLES ===== */
export function spawnParticle(s, x, y, vx, vy, life, r, color, type) {
  if (s.particles.length > 600) return;
  s.particles.push({ x, y, vx, vy, life, maxLife: life, r, color, type: type || 'circle' });
}

export function spawnExplosion(s, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(1, 5);
    spawnParticle(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.3, 0.9), rand(2, 6), color, 'fire');
  }
  for (let i = 0; i < Math.floor(count / 2); i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(0.5, 2);
    spawnParticle(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 0.5, rand(0.5, 1.5), rand(4, 10), '#333', 'smoke');
  }
}

export function spawnOilSpill(s, x, y) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(0.5, 2.5);
    spawnParticle(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.5, 1.5), rand(3, 8), '#1a0a00', 'oil');
  }
}

export function spawnMuzzleFlash(s, x, y, a) {
  for (let i = 0; i < 4; i++) {
    const sa = a + rand(-0.3, 0.3);
    const sp = rand(3, 7);
    spawnParticle(s, x, y, Math.cos(sa) * sp, Math.sin(sa) * sp, rand(0.05, 0.15), rand(2, 4), '#ffee88', 'fire');
  }
}

export function spawnEngineTrail(s, x, y, a) {
  const sa = a + Math.PI + rand(-0.2, 0.2);
  const sp = rand(0.5, 1.5);
  spawnParticle(s, x, y, Math.cos(sa) * sp, Math.sin(sa) * sp, rand(0.2, 0.5), rand(1, 3), '#557799', 'smoke');
}

export function spawnLevelUpEffect(s, x, y) {
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(2, 6);
    spawnParticle(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.5, 1.2), rand(3, 7),
      pickRandom(['#ffcc00', '#44ff88', '#44ccff', '#ff8844']), 'fire');
  }
}

export function spawnFloatingText(s, x, y, text, color, size) {
  s.floatingTexts.push({ x, y, text, color, life: 1.5, maxLife: 1.5, size: size || 13 });
}

/* ===== XP & LEVEL ===== */
export function xpForLevel(lvl) { return Math.floor(40 + lvl * 25 + lvl * lvl * 5); }

export function addXP(s, amount, soundFn) {
  s.playerXP += amount;
  while (s.playerLevel < MAX_LEVEL && s.playerXP >= xpForLevel(s.playerLevel)) {
    s.playerXP -= xpForLevel(s.playerLevel);
    s.playerLevel++;
    s.statPoints++;
    spawnLevelUpEffect(s, s.player.x, s.player.y);
    spawnFloatingText(s, s.player.x, s.player.y - 35, 'LEVEL ' + s.playerLevel + '!', '#ffcc00', 18);
    addShake(s, 3, true);
    addScreenFlash(s, '#ffcc00', 0.15);
    if (soundFn) soundFn('levelup');
  }
  if (s.playerLevel >= MAX_LEVEL) s.playerXP = 0;
}

export function allocateStat(s, idx) {
  if (s.statPoints <= 0 || idx < 0 || idx >= 8 || s.stats[idx] >= STAT_MAX) return;
  s.stats[idx]++;
  s.statPoints--;
}

/* ===== UPGRADE SYSTEM ===== */
export function resetUpgrades(s) {
  s.upgradeStats = {
    spreadCount: 1,
    oilMult: 1, hasShield: false, shieldInterval: 15, shieldTimer: 0,
    empRadius: 0, hasEmp: false, critChance: 0, regenRate: 0,
    missileDmgMult: 1, missileSpeedMult: 1,
    extraPierce: 0, orbitalCount: 0, xpMult: 1,
  };
  s.upgradeLevels = {};
  s.nextUpgradeScore = UPGRADE_INTERVAL;
  s.totalUpgrades = 0;
}

const UPGRADE_APPLY = {
  spread_shot:   (l, us) => { us.spreadCount = 1 + l * 2; },
  oil_magnet:    (l, us) => { us.oilMult = 1 + l * 0.5; },
  shield:        (l, us) => { us.shieldInterval = Math.max(8, 15 - l * 4); us.hasShield = true; },
  emp:           (l, us) => { us.empRadius = 80 + l * 60; us.hasEmp = true; },
  critical:      (l, us) => { us.critChance = l * 0.15; },
  repair:        (l, us) => { us.regenRate = l * 3; },
  missile_boost: (l, us) => { us.missileDmgMult = 1 + l * 0.4; us.missileSpeedMult = 1 + l * 0.3; },
  piercing:      (l, us) => { us.extraPierce = l; },
  orbital:       (l, us) => { us.orbitalCount = l; },
  xp_boost:      (l, us) => { us.xpMult = 1 + l * 0.3; },
};

export function getUpgradeChoices(s) {
  const pool = Object.keys(UPGRADES).filter(k => (s.upgradeLevels[k] || 0) < UPGRADES[k].maxLevel);
  const choices = [];
  const p = [...pool];
  for (let i = 0; i < Math.min(3, p.length); i++) {
    const idx = randInt(0, p.length - 1);
    choices.push(p[idx]);
    p.splice(idx, 1);
  }
  return choices;
}

export function applyUpgrade(s, key) {
  s.upgradeLevels[key] = (s.upgradeLevels[key] || 0) + 1;
  if (UPGRADE_APPLY[key]) UPGRADE_APPLY[key](s.upgradeLevels[key], s.upgradeStats);
  s.totalUpgrades++;
}

/* ===== COMBO & STREAK ===== */
export function registerKill(s, scoreVal) {
  s.combo++;
  s.comboTimer = 3.0; // COMBO_DECAY
  s.killStreak++;
  s.streakTimer = 4.0; // STREAK_DECAY
  const mult = 1 + Math.floor(s.combo / 5) * 0.25;
  const gained = Math.floor(scoreVal * mult);
  s.score += gained;
  if (s.combo > s.maxCombo) s.maxCombo = s.combo;
  if (s.killStreak > s.maxStreak) s.maxStreak = s.killStreak;
  if (s.combo > 1 && s.combo % 5 === 0) {
    spawnFloatingText(s, s.player.x, s.player.y - 50, s.combo + 'x COMBO!', '#ff44ff', 16);
    addShake(s, 2, true);
  }
  if (s.killStreak > 0 && s.killStreak % 10 === 0) {
    spawnFloatingText(s, s.player.x, s.player.y - 60, s.killStreak + ' KILL STREAK!', '#ffcc00', 18);
    s.player.oil = Math.min(getMaxOil(s), s.player.oil + 30);
    addShake(s, 4, true);
  }
  return gained;
}

/* ===== RESET / INIT ===== */
export function resetPlayer(s) {
  Object.assign(s.player, {
    x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0,
    angle: -Math.PI / 2, oil: OIL_BASE,
    fireCooldown: 0, homingCooldown: 0, invincible: 0,
    rotorAngle: 0, tailRotorAngle: 0, alive: true,
    engineGlow: 0, shieldActive: false, shieldTimer: 0,
    dashCooldown: 0, dashing: 0, dashAngle: 0,
  });
}

export function initRigs(s) {
  s.rigs.length = 0;
  const margin = 350;
  for (let i = 0; i < RIG_COUNT; i++) {
    s.rigs.push({
      x: rand(margin, WORLD_W - margin), y: rand(margin, WORLD_H - margin),
      owner: 'neutral', captureProgress: 0, hp: 100, maxHp: 100,
      flamePhase: Math.random() * Math.PI * 2, craneAngle: Math.random() * Math.PI * 2,
      underAttack: false, attackWarning: 0,
      enemyCaptureProgress: 0,
    });
  }
}

export function resetGameState(s) {
  s.score = 0; s.waveTimer = 2; s.wantedLevel = 0; s.time = 0;
  s.enemies.length = 0; s.bullets.length = 0; s.enemyBullets.length = 0;
  s.homingMissiles.length = 0; s.particles.length = 0; s.floatingTexts.length = 0;
  s.loot.length = 0;
  s.shakeAmount = 0;
  s.playerLevel = 1; s.playerXP = 0; s.statPoints = 0;
  s.stats = [0, 0, 0, 0, 0, 0, 0, 0];
  s.showStatPanel = true;
  s.combo = 0; s.comboTimer = 0; s.killStreak = 0; s.streakTimer = 0;
  s.maxCombo = 0; s.maxStreak = 0;
  s.activePowerups = {};
  s.rigRecaptureTimer = RIG_RECAPTURE_INTERVAL;
  s.paused = false;
  s.timeSurvived = 0;
  s.totalKills = { drone: 0, plane: 0, chopper: 0, boss: 0 };
  s.totalDamageTaken = 0;
  s.totalDamageDealt = 0;
  s.screenFlash = { color: '', alpha: 0 };
  s.vignetteIntensity = 0;
  resetPlayer(s);
  resetUpgrades(s);
  initRigs(s);
  s.gameState = 'playing';
}
