import {
  OIL_BASE, OIL_BASE_MAX, WORLD_W, WORLD_H, RIG_COUNT,
  RIG_RECAPTURE_INTERVAL, MAX_LEVEL,
  PLAYER_BASE_SPEED, FIRE_BASE_COOLDOWN, BULLET_BASE_SPEED, PICKUP_RADIUS,
  OIL_CRITICAL_THRESHOLD, OIL_FLUSH_THRESHOLD, KILL_FEED_MAX,
  OIL_MARKET_INTERVAL, EVENT_INTERVAL, MILESTONE_INTERVAL,
  CHAIN_RADIUS, BLACK_HOLE_RADIUS,
  RIVALRY_CHECK_INTERVAL,
  RIG_RESERVE_MIN, RIG_RESERVE_MAX, RIG_MAX_COUNT,
  RIG_CLUSTER_CHANCE, RIG_CLUSTER_RADIUS_MIN, RIG_CLUSTER_RADIUS_MAX,
  RIG_ISOLATED_MIN, RIG_DEPLETED_FADE, RIG_BURNOUT_FADE,
  RIG_BURNOUT_OIL_MIN, RIG_BURNOUT_OIL_MAX, AI_UPGRADE_INTERVAL,
  RIG_SPAWN_INTERVAL, UPGRADE_OIL_COST_BASE,
} from '../constants.js';
import { rand, randInt, pickRandom } from '../utils.js';
import { UPGRADES, SYNERGY_KEYS, MILESTONE_DEFS, AI_UPGRADE_DEFS, TIER_MULTS, FACTIONS, MUTATIONS } from '../config.js';

/**
 * Central mutable game state. All logic and rendering modules read/write this.
 */
export const state = {
  gameState: 'title',  // title | playing | upgrade | milestone | paused | gameover
  score: 0,
  time: 0,
  waveTimer: 2,
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
    counterAttackTimer: 0,
    oilState: 'normal',
    rampageActive: false,
    rampageTimer: 0,
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
  napalmZones: [],
  wrecks: [],     // { x, y, angle, oil, life, maxLife, type }
  pipelines: [],  // { rigA, rigB, hp, maxHp }

  /* Level system */
  playerLevel: 1,
  playerXP: 0,
  pendingLevelUp: false,

  /* Upgrade system */
  upgradeStats: {},
  upgradeLevels: {},
  upgradeChoices: [],
  pendingUpgradeCard: null,   // key of card awaiting second-tap confirmation
  totalUpgrades: 0,
  bountyCards: [],       // upgrade keys waiting to be awarded
  isBountyUpgrade: false,

  /* Milestone system */
  nextMilestoneScore: MILESTONE_INTERVAL,
  milestoneChoices: [],  // 3 milestone keys shown on pick screen
  milestoneUnlocks: {},  // { key: true } permanently applied this run
  secondWindUsed: false, // second_wind milestone one-time use

  /* Ability cooldowns */
  blackHoleCooldown: 0,
  timeWarpCooldown: 0,
  lastAbilityTime: -99,
  lastAbilityType: null,

  /* Score multiplier (decays without kills) */
  scoreMult: 1.0,

  /* Bounty contract */
  bountyTarget: null,
  bountyTimer: 50,

  /* Revenge mechanic */
  revengeTarget: null,

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

  /* Kill feed */
  killFeed: [],

  /* Oil market — fluctuating income multiplier */
  oilMarket: {
    mult: 1.0,
    timer: 0,           // counts down during active market event
    nextEvent: OIL_MARKET_INTERVAL,
    label: '',
    active: false,
  },

  /* Dynamic events */
  activeEvent: null,    // { type, timer, maxTimer, data }
  nextEventTime: EVENT_INTERVAL,

  /* Faction rivalry */
  rivalryTimer: RIVALRY_CHECK_INTERVAL,

  /* Near-rig prompt (set by playerLogic each frame) */
  nearRig: null,

  /* Hive mind */
  hiveMind: {
    alertLevel: 0,
    knownPlayerX: WORLD_W / 2,
    knownPlayerY: WORLD_H / 2,
    alertTimer: 0,
    commanderAlive: false,
    scoutAlerted: false,
  },

  /* Screen effects */
  screenFlash: { color: '', alpha: 0 },
  vignetteIntensity: 0,
  shakeAmount: 0,
  lastCritSoundTime: 0,

  /* Camera */
  camera: { x: 0, y: 0 },

  /* Input state */
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
    // Double-click tracking for ability buttons
    lastDashClickTime: 0,
    lastTimeWarpClickTime: 0,
    lastBlackHoleClickTime: 0,
  },

  /* Viewport */
  W: 800,
  H: 600,

  /* Set by GameScene.create() */
  isTouchDevice: false,
};

/* ===== COMPUTED STATS ===== */
export function getMaxOil(s) {
  const base = OIL_BASE_MAX + (s.upgradeStats.statMaxOilBonus || 0);
  return Math.floor(base * (s.upgradeStats.maxOilMult || 1));
}
export function getHealthRegen(s) {
  const rate = s.upgradeStats.regenRate || 0;
  return s.upgradeStats.mutations?.regenerator ? rate * 3 : rate;
}
export function getBodyDamage(_s) { return 5; }

export function getBulletSpeed(s) {
  let spd = BULLET_BASE_SPEED * (s.upgradeStats.bulletSpeedMult || 1) + (hasPowerup(s, 'speed') ? 3 : 0);
  if (s.milestoneUnlocks?.sharpshooter && s.combo >= 5) spd += (s.upgradeStats.sharpshooterSpeedBonus || 2);
  return spd;
}

export function getBulletPenetration(s) { return s.upgradeStats.extraPierce || 0; }

export function getReloadTime(s) {
  let base = Math.max(0.04, FIRE_BASE_COOLDOWN * (s.upgradeStats.reloadMult || 1));
  base /= (s.upgradeStats.fireMult || 1);
  if (s.upgradeStats.overchargeBonus > 0 && s.player.oil / getMaxOil(s) >= 0.8) {
    base *= (1 - s.upgradeStats.overchargeBonus);
  }
  // Rampage Amp: bonus fire rate during RAMPAGE
  if (s.upgradeStats.rampageAmpFire > 0 && s.player.rampageActive) {
    base *= (1 - s.upgradeStats.rampageAmpFire);
  }
  return Math.max(0.04, base);
}

export function getMoveSpeed(s) {
  const base = (PLAYER_BASE_SPEED + (hasPowerup(s, 'speed') ? 1.5 : 0)) * (s.upgradeStats.speedMult || 1);
  if (s.upgradeStats.deathWishActive && s.player.oil / getMaxOil(s) < 0.20) return base * (1 + (s.upgradeStats.deathWishBonus || 0.60));
  return base;
}
export function getPickupRadius(s) { return PICKUP_RADIUS + (hasPowerup(s, 'magnet') ? 200 : 0); }

export function getBulletDamage(s) {
  let dmg = (15 + (hasPowerup(s, 'damage') ? 15 : 0)) * (s.upgradeStats.damageMult || 1);
  if (s.upgradeStats.recklessBonus > 0 && s.player.oil / getMaxOil(s) < 0.30) {
    dmg *= (1 + s.upgradeStats.recklessBonus);
  }
  if (s.player.oilState === 'flush') dmg *= 1.10;
  if (s.player.counterAttackTimer > 0) dmg *= (1 + (s.upgradeStats.counterAttackMult || 0));
  if (s.milestoneUnlocks?.veteran && s.combo >= 10) dmg *= (1 + (s.upgradeStats.veteranBonus || 0.20));
  if (s.milestoneUnlocks?.sharpshooter && s.combo >= 5) dmg *= (1 + (s.upgradeStats.sharpshooterDmgBonus || 0.15));
  if (s.player.revengeBuff > 0) dmg *= 1.50;
  // Warcry wildcard: stacking bonus per kill
  if (s.upgradeStats.hasWarcry) dmg *= (s.upgradeStats.warcryDamageMult || 1);
  // Rampage Amp card: bonus dmg during RAMPAGE
  if (s.upgradeStats.rampageAmpDmg > 0 && s.player.rampageActive) {
    dmg *= (1 + s.upgradeStats.rampageAmpDmg);
  }
  // Railgun mutation: bullets deal 2× damage
  if (s.upgradeStats.mutations?.railgun) dmg *= 2.0;
  // Blood Tithe chaos card bonus
  if (s.upgradeStats.bloodTitheDmgBonus > 0) dmg *= (1 + s.upgradeStats.bloodTitheDmgBonus);
  // Glass Blade chaos card bonus
  if (s.upgradeStats.glassBladeDmgBonus > 0) dmg *= (1 + s.upgradeStats.glassBladeDmgBonus);
  // Oil Junkie: +1% per 10 oil up to stacking cap
  if (s.upgradeStats.oilJunkieActive) {
    const cap = s.upgradeStats.oilJunkieMaxBonus || 0.80;
    const bonus = Math.min(cap, s.player.oil * 0.001);
    dmg *= (1 + bonus);
  }
  // Death Wish: under 20% oil → stacking bonus
  if (s.upgradeStats.deathWishActive && s.player.oil / getMaxOil(s) < 0.20) dmg *= (1 + (s.upgradeStats.deathWishBonus || 0.60));
  // Resonance: ready burst
  if (s.upgradeStats.resonanceReady) dmg *= 8;
  return dmg;
}

/** Crit damage multiplier — Obliterate mutation raises it from 2× to 5×. */
export function getCritMult(s) {
  return s.upgradeStats.mutations?.obliterate ? 5.0 : 2.0;
}

/* ===== POWERUP HELPERS ===== */
export function hasPowerup(s, effect) { return (s.activePowerups[effect] || 0) > 0; }
export function addPowerup(s, effect, duration) { s.activePowerups[effect] = (s.activePowerups[effect] || 0) + duration; }

/* ===== SCREEN EFFECTS ===== */
export function addScreenFlash(s, color, alpha) { s.screenFlash.color = color; s.screenFlash.alpha = alpha; }
export function addShake(s, amount, shakeOn) { if (shakeOn) s.shakeAmount = Math.min(s.shakeAmount + amount, 15); }

/* ===== PARTICLES ===== */
export function spawnParticle(s, x, y, vx, vy, life, r, color, type) {
  if (s.particles.length > 700) return;
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
export function xpForLevel(lvl) { return Math.floor(80 + lvl * 55 + lvl * lvl * 10); }

export function addXP(s, amount, soundFn) {
  s.playerXP += amount;
  while (s.playerLevel < MAX_LEVEL && s.playerXP >= xpForLevel(s.playerLevel)) {
    s.playerXP -= xpForLevel(s.playerLevel);
    s.playerLevel++;
    s.pendingLevelUp = true;
    spawnLevelUpEffect(s, s.player.x, s.player.y);
    spawnFloatingText(s, s.player.x, s.player.y - 35, 'LEVEL ' + s.playerLevel + '! PICK A CARD', '#ffcc00', 18);
    addShake(s, 3, true);
    addScreenFlash(s, '#ffcc00', 0.15);
    if (soundFn) soundFn('levelup');
  }
  if (s.playerLevel >= MAX_LEVEL) s.playerXP = 0;
}

/* ===== KILL FEED ===== */
export function addKillFeedEntry(s, text, color) {
  s.killFeed.unshift({ text, color, timer: 3.5 });
  if (s.killFeed.length > KILL_FEED_MAX) s.killFeed.pop();
}

/* ===== HIVE MIND ===== */
export function triggerHiveAlert(s, x, y, boost) {
  s.hiveMind.knownPlayerX = s.player.x;
  s.hiveMind.knownPlayerY = s.player.y;
  s.hiveMind.alertLevel = Math.min(1, s.hiveMind.alertLevel + (boost || 0.25));
  if (boost >= 0.9) s.hiveMind.alertTimer = Math.max(s.hiveMind.alertTimer, 8);
}

/* ===== MILESTONE SYSTEM ===== */
export function getMilestoneChoices(s) {
  const available = MILESTONE_DEFS.filter(m => !s.milestoneUnlocks[m.key]);
  if (available.length === 0) return [];
  const pool = [...available];
  const choices = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const idx = randInt(0, pool.length - 1);
    choices.push(pool[idx].key);
    pool.splice(idx, 1);
  }
  return choices;
}

export function applyMilestone(s, key) {
  s.milestoneUnlocks[key] = true;
  s.nextMilestoneScore += MILESTONE_INTERVAL + Math.floor(s.nextMilestoneScore * 0.5);
}

/* ===== UPGRADE SYSTEM ===== */
export function resetUpgrades(s) {
  s.upgradeStats = {
    spreadCount: 1,
    oilMult: 1,
    hasShield: false, shieldInterval: 15, shieldTimer: 0,
    empRadius: 0, hasEmp: false,
    critChance: 0,
    regenRate: 0,
    missileDmgMult: 1, missileSpeedMult: 1,
    extraPierce: 0,
    orbitalCount: 0,
    xpMult: 1,
    chainCount: 0,
    hasNapalm: false, napalmDpsMult: 1,
    armorReduction: 0,
    counterAttackMult: 0,
    hasFortify: false, fortifyTurretCount: 1,
    overchargeBonus: 0,
    recklessBonus: 0,
    hasOilNova: false, oilNovaRadius: 1,
    hasBlackHole: false,
    fireMult: 1,
    damageMult: 1,
    extraBullets: 0,
    speedMult: 1,
    dashCooldownBonus: 0,
    hasWarhead: false, warheadLevel: 0,
    hasExplosiveRounds: false, explosiveRoundsMult: 0.4,
    vampireHeal: 0,
    hasFlakBurst: false, flakLevels: 0,
    extraInvincFrames: 0,
    hasTimeWarp: false,
    supplyNetworkBonus: 0,
    // Stat card bonuses
    maxOilMult: 1,
    statMaxOilBonus: 0,
    bulletSpeedMult: 1,
    reloadMult: 1,
    // Intermediate level fields for shared-stat cards
    speedBoostLvl: 0, statSpeedLvl: 0,
    armorPlatLvl: 0,  statArmorLvl: 0,
    calibLvl: 0,      statDmgLvl: 0,
    repairLvl: 0,     statRegenLvl: 0,
    pierceLvl: 0,     statPierceLvl: 0,
    // Synergies (original 4)
    hasPulseArmor: false,
    hasMissileBattery: false,
    hasInfernoBarrage: false,
    hasAdaptivePlating: false,
    // Synergies (expanded)
    hasChainReaction: false,
    hasBloodMoney: false,
    hasGhostProtocol: false,
    hasOverkill: false,
    hasOverload: false,
    hasIronStorm: false,
    hasTimeSniper: false,
    hasOilVortex: false,
    hasShockNova: false,
    hasWarMachine: false,
    // New base cards
    frostRoundsDuration: 1.5,
    armorShredPerHit: 0.08, armorShredMax: 0.40,
    toxicRoundsDps: 3, toxicRoundsDuration: 2.0,
    echoStrikePeriod: 3, echoStrikeCount: 0,
    rampageAmpDmg: 0, rampageAmpFire: 0,
    // New synergy flags
    hasCryoNova: false, cryoNovaFreeze: 2.0,
    hasShatterStrike: false, shatterStrikeMult: 1.80,
    hasPoisonField: false, poisonFieldDps: 6,
    hasEchoChain: false, echoChainCount: 1,
    hasToxicShred: false, toxicShredArmor: 0.15,
    hasFrostEcho: false, frostEchoDuration: 2.0,
    hasRampageNova: false, rampageNovaRadius: 60,
    // New companion types
    gunshipDrones: 0, gunshipTimers: [],
    fighterDrones: 0, fighterTimers: [],
    sniperDrones: 0, sniperTimers: [],
    mortarDrones: 0, mortarTimers: [],
    // Wildcard flags
    wildBerserker: false,
    wildGlassCannon: false,
    wildBloodPact: false,
    bulletOilCostMult: 1,
    hasPhoenix: false,
    phoenixUsed: false,
    swarmDroneCount: 0,
    hasVoidRounds: false,       voidArmorIgnore: 0.60,
    hasChaosEngine: false,      chaosEngineChance: 0.20,
    hasTimeBandit: false,       timeBanditChance: 0.25,
    hasLuckyBreak: false,       luckyBreakTimer: 0, luckyBreakInterval: 20,
    hasOilMagnate: false,       oilMagnateBonus: 2.0,
    hasWarcry: false,           warcryStacks: 0, warcryTimer: 0,
    hasWildOverclock: false,    overclockBulletCount: 0, overclockFreePeriod: 5,
    // Synergy extras
    pulseArmorRadius: 200, missileBatteryDmgMult: 1, infernoChainRadius: 140,
    adaptivePlatRestorePct: 0.6, chainReactionCount: 1, bloodMoneyDrainMult: 1,
    ghostDuration: 1.0, overkillSplitCount: 2, overloadNapalmCount: 4,
    ironStormExtraPellets: 0, timeSniperMult: 3, oilVortexRadius: 450, shockNovaRadius: 150,
    // black_hole / time_warp stacking
    blackHoleRadiusBonus: 0, blackHoleCooldownBonus: 0,
    timeWarpStunBonus: 0, timeWarpCooldownBonus: 0,
    // Chaos card stacking extras
    cursedMagCycle: 8, oilJunkieMaxBonus: 0.80, oilJunkieDrain: 0.15,
    deathWishBonus: 0.60, resonanceKillsRequired: 5, scavengerMult: 3,
    // Passive perk (formerly milestone) extras
    ms_second_wind: false, secondWindOil: 25,
    ms_adrenaline: false,  adrenalineOil: 4,
    ms_war_economy: false, warEconomyBonus: 0.30,
    ms_veteran: false,     veteranBonus: 0.20,
    ms_salvager: false,    salvagerMult: 1.50,
    ms_pipeline_expert: false, pipelineIncomeMult: 3,
    ms_sharpshooter: false, sharpshooterSpeedBonus: 2, sharpshooterDmgBonus: 0.15,
    ms_opportunist: false, opportunistMult: 1.40,
    // Weapon system
    activeWeapon: 'default',
    weaponLevels: {},          // { weaponName: stackCount }
    // Companion system
    scoutDrones: 0, combatDrones: 0, shieldDrones: 0, repairDrones: 0, bomberDrones: 0,
    companionOilDrain: 0,
    companionShieldTimers: [], // [ shieldCooldownTimer, ... ] per shield drone
    bomberDroneTimers: [],     // cooldown timer per bomber drone
    // Chaos cards
    bloodTitheDrain: 0,        bloodTitheDmgBonus: 0,
    glassBladeDmgBonus: 0,     glassBlade: false,
    volatileActive: false,
    cursedMagActive: false,    cursedMagCounter: 0, cursedMagCycle: 8,
    oilJunkieActive: false,    oilJunkieMaxBonus: 0.80, oilJunkieDrain: 0.15,
    deathWishActive: false,    deathWishBonus: 0.60,
    resonanceActive: false,    resonanceKills: 0, resonanceReady: false, resonanceKillsRequired: 5,
    scavengerMode: false,      scavengerMult: 3,
    // Weapon mutations
    mutations: {},
  };
  s.upgradeLevels = {};
  s.totalUpgrades = 0;
}

/* Helper: recompute combined speedMult from both speed cards */
function _speedMult(us) { return 1 + (us.speedBoostLvl||0) * 0.06 + (us.statSpeedLvl||0) * 0.04; }
/* Helper: recompute combined armorReduction */
function _armorReduc(us) { return Math.min(0.80, (us.armorPlatLvl||0) * 0.06 + (us.statArmorLvl||0) * 0.04); }
/* Helper: recompute combined damageMult (base only, wildcards multiply on top) */
function _damageMult(us) { return 1 + (us.calibLvl||0) * 0.10 + (us.statDmgLvl||0) * 0.08; }
/* Helper: recompute combined regenRate */
function _regenRate(us) { return (us.repairLvl||0) * 2 + (us.statRegenLvl||0) * 1.5 + (us.repairDrones||0) * 1.5; }
/* Helper: recompute combined extraPierce */
function _extraPierce(us) { return (us.pierceLvl||0) + (us.statPierceLvl||0); }
/* Helper: recompute companion drain */
function _companionDrain(us) {
  return (us.scoutDrones||0) * 0.3 + (us.combatDrones||0) * 0.6 +
         (us.shieldDrones||0) * 0.8 + (us.repairDrones||0) * 0.5 +
         (us.bomberDrones||0) * 1.0 + (us.gunshipDrones||0) * 1.0 +
         (us.fighterDrones||0) * 1.4 + (us.sniperDrones||0) * 0.6 +
         (us.mortarDrones||0) * 0.9;
}

const UPGRADE_APPLY = {
  // ── FIREPOWER (stackable, small bonuses) ───────────────────────────────────
  spread_shot:      (l, us) => { us.spreadCount = 1 + l; },
  oil_magnet:       (l, us) => { us.oilMult = 1 + l * 0.10; },
  shield:           (l, us) => { us.shieldInterval = Math.max(5, 15 - l * 0.8); us.hasShield = true; },
  emp:              (l, us) => { us.empRadius = 60 + l * 20; us.hasEmp = true; },
  critical:         (l, us) => { us.critChance = Math.min(0.9, l * 0.05); },
  repair:           (l, us) => { us.repairLvl = l; us.regenRate = _regenRate(us); },
  missile_boost:    (l, us) => { us.missileDmgMult = 1 + l * 0.10; us.missileSpeedMult = 1 + l * 0.08; },
  piercing:         (l, us) => { us.pierceLvl = l; us.extraPierce = _extraPierce(us); },
  orbital:          (l, us) => { us.orbitalCount = l; },
  xp_boost:         (l, us) => { us.xpMult = 1 + l * 0.08; },
  chain_lightning:  (l, us) => { us.chainCount = l; },
  napalm:           (l, us) => { us.hasNapalm = true; us.napalmDpsMult = 1 + l * 0.15; },
  armor_plating:    (l, us) => { us.armorPlatLvl = l; us.armorReduction = _armorReduc(us); },
  counter_attack:   (l, us) => { us.counterAttackMult = l * 0.08; },
  fortify:          (l, us) => { us.hasFortify = true; us.fortifyTurretCount = Math.min(4, 1 + Math.floor(l / 3)); },
  overcharge:       (l, us) => { us.overchargeBonus = l * 0.08; },
  reckless:         (l, us) => { us.recklessBonus = l * 0.08; },
  oil_nova:         (l, us) => { us.hasOilNova = true; us.oilNovaRadius = 1 + l * 0.3; },
  black_hole:       (l, us) => { us.hasBlackHole = true; us.blackHoleRadiusBonus = (l - 1) * 20; us.blackHoleCooldownBonus = (l - 1) * 2; },
  rapid_fire:       (l, us) => { us.fireMult = 1 + l * 0.05; },
  high_caliber:     (l, us) => { us.calibLvl = l; us.damageMult = _damageMult(us); },
  burst_shot:       (l, us) => { us.extraBullets = l; },
  speed_boost:      (l, us) => { us.speedBoostLvl = l; us.speedMult = _speedMult(us); },
  reflex_dash:      (l, us) => { us.dashCooldownBonus = l * 0.4; },
  warhead:          (l, us) => { us.hasWarhead = true; us.warheadLevel = l; },
  explosive_rounds: (l, us) => { us.hasExplosiveRounds = true; us.explosiveRoundsMult = 0.20 + l * 0.05; },
  vampire_rounds:   (l, us) => { us.vampireHeal = l * 0.3; },
  flak_burst:       (l, us) => { us.hasFlakBurst = true; us.flakLevels = l; },
  iron_will:        (l, us) => { us.extraInvincFrames = l * 0.25; },
  time_warp:        (l, us) => { us.hasTimeWarp = true; us.timeWarpStunBonus = (l - 1); us.timeWarpCooldownBonus = (l - 1) * 2; },
  supply_network:   (l, us) => { us.supplyNetworkBonus = l * 0.8; },
  // ── STAT CARDS ──────────────────────────────────────────────────────────────
  stat_speed:       (l, us) => { us.statSpeedLvl = l; us.speedMult = _speedMult(us); },
  stat_armor:       (l, us) => { us.statArmorLvl = l; us.armorReduction = _armorReduc(us); },
  stat_health:      (l, us) => { us.statMaxOilBonus = l * 100; },
  stat_regen:       (l, us) => { us.statRegenLvl = l; us.regenRate = _regenRate(us); },
  stat_reload:      (l, us) => { us.reloadMult = Math.max(0.20, 1 - l * 0.04); },
  stat_bullet_spd:  (l, us) => { us.bulletSpeedMult = 1 + l * 0.08; },
  stat_bullet_dmg:  (l, us) => { us.statDmgLvl = l; us.damageMult = _damageMult(us); },
  stat_pierce:      (l, us) => { us.statPierceLvl = l; us.extraPierce = _extraPierce(us); },
  // ── WEAPON CARDS ────────────────────────────────────────────────────────────
  weapon_dual:       (l, us) => { us.activeWeapon = 'dual';      if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.dual      = l; },
  weapon_triple:     (l, us) => { us.activeWeapon = 'triple';    if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.triple    = l; },
  weapon_shotgun:    (l, us) => { us.activeWeapon = 'shotgun';   if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.shotgun   = l; },
  weapon_sniper:     (l, us) => { us.activeWeapon = 'sniper';    if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.sniper    = l; },
  weapon_machinegun: (l, us) => { us.activeWeapon = 'machinegun';if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.machinegun= l; },
  weapon_missile:    (l, us) => { us.activeWeapon = 'missile';   if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.missile   = l; },
  weapon_rocket:     (l, us) => { us.activeWeapon = 'rocket';    if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.rocket    = l; },
  weapon_grenade:    (l, us) => { us.activeWeapon = 'grenade';   if(!us.weaponLevels)us.weaponLevels={}; us.weaponLevels.grenade   = l; },
  // ── COMPANION CARDS ─────────────────────────────────────────────────────────
  companion_scout:   (l, us) => { us.scoutDrones  = l; us.companionOilDrain = _companionDrain(us); },
  companion_combat:  (l, us) => { us.combatDrones = l; us.companionOilDrain = _companionDrain(us); },
  companion_shield:  (l, us) => { us.shieldDrones = l; us.companionShieldTimers = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  companion_repair:  (l, us) => { us.repairDrones = l; us.regenRate = _regenRate(us); us.companionOilDrain = _companionDrain(us); },
  companion_bomber:  (l, us) => { us.bomberDrones = l; us.bomberDroneTimers = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  // ── CHAOS / DRAWBACK CARDS ──────────────────────────────────────────────────
  card_blood_tithe:  (l, us) => { us.bloodTitheDrain = l * 0.4; us.bloodTitheDmgBonus = l * 0.15; },
  card_glass_blade:  (l, us) => { us.glassBlade = true; us.glassBladeDmgBonus = l * 0.20; },
  card_volatile:     (l, us) => { us.volatileActive = true; us.volatileChance = Math.min(0.35, l * 0.08); },
  card_cursed_mag:   (l, us) => { us.cursedMagActive = true; us.cursedMagCounter = 0; us.cursedMagCycle = Math.max(4, 8 - (l - 1)); },
  card_oil_junkie:   (l, us) => { us.oilJunkieActive = true; us.oilJunkieMaxBonus = 0.80 + (l - 1) * 0.10; us.oilJunkieDrain = 0.15 + (l - 1) * 0.05; },
  card_death_wish:   (l, us) => { us.deathWishActive = true; us.deathWishBonus = 0.60 + (l - 1) * 0.20; },
  card_resonance:    (l, us) => { us.resonanceActive = true; us.resonanceKills = 0; us.resonanceReady = false; us.resonanceKillsRequired = Math.max(2, 5 - (l - 1)); },
  card_scavenger:    (l, us) => { us.scavengerMode = true; us.scavengerMult = 3 + (l - 1); },
  // ── WILDCARD CARDS ──────────────────────────────────────────────────────────
  wild_berserker:    (l, us) => { us.wildBerserker = true; if (l === 1) { us.maxOilMult = Math.max(0.1, (us.maxOilMult||1)*0.75); us.fireMult = (us.fireMult||1)*1.5; us.damageMult = (us.damageMult||1)*1.4; } else { us.fireMult = (us.fireMult||1)*1.08; us.damageMult = (us.damageMult||1)*1.10; } },
  wild_glass_cannon: (l, us) => { us.wildGlassCannon = true; if (l === 1) { us.maxOilMult = Math.max(0.1, (us.maxOilMult||1)*0.60); us.extraPierce = 999; us.damageMult = (us.damageMult||1)*1.6; } else { us.damageMult = (us.damageMult||1)*1.20; } },
  wild_blood_pact:   (l, us) => { us.wildBloodPact = true; if (l === 1) { us.bulletOilCostMult = (us.bulletOilCostMult||1)*3; us.damageMult = (us.damageMult||1)*2.0; } else { us.damageMult = (us.damageMult||1)*1.50; } },
  wild_phoenix:      (_l, us) => { us.hasPhoenix = true; us.phoenixUsed = false; },
  wild_drone_swarm:  (_l, us) => { us.swarmDroneCount = (us.swarmDroneCount||0)+3; },
  wild_void_rounds:  (l, us) => { us.hasVoidRounds = true; us.voidArmorIgnore = Math.min(0.90, 0.60 + (l - 1) * 0.15); },
  wild_chaos_engine: (l, us) => { us.hasChaosEngine = true; us.chaosEngineChance = Math.min(0.5, 0.20 + (l - 1) * 0.10); },
  wild_time_bandit:  (l, us) => { us.hasTimeBandit = true; us.timeBanditChance = Math.min(0.55, 0.25 + (l - 1) * 0.10); },
  wild_lucky_break:  (l, us) => { us.hasLuckyBreak = true; us.luckyBreakTimer = 0; us.luckyBreakInterval = Math.max(10, 20 - (l - 1) * 5); },
  wild_oil_magnate:  (l, us) => { us.hasOilMagnate = true; us.oilMagnateBonus = 2.0 + (l - 1) * 0.5; },
  wild_warcry:       (_l, us) => { us.hasWarcry = true; us.warcryStacks = 0; us.warcryTimer = 0; },
  wild_overclock:    (l, us) => { us.hasWildOverclock = true; us.overclockBulletCount = 0; us.overclockFreePeriod = Math.max(3, 5 - (l - 1)); },
  // ── SYNERGIES ───────────────────────────────────────────────────────────────
  pulse_armor:       (l, us) => { us.hasPulseArmor = true; us.pulseArmorRadius = 200 + (l - 1) * 50; },
  missile_battery:   (l, us) => { us.hasMissileBattery = true; us.missileBatteryDmgMult = 1 + (l - 1) * 0.20; },
  inferno_barrage:   (l, us) => { us.hasInfernoBarrage = true; us.infernoChainRadius = CHAIN_RADIUS + (l - 1) * 20; },
  adaptive_plating:  (l, us) => { us.hasAdaptivePlating = true; us.adaptivePlatRestorePct = 0.6 + (l - 1) * 0.10; },
  chain_reaction:    (l, us) => { us.hasChainReaction = true; us.chainReactionCount = l; },
  blood_money:       (l, us) => { us.hasBloodMoney = true; us.bloodMoneyDrainMult = 1 + (l - 1) * 0.20; },
  ghost_protocol:    (l, us) => { us.hasGhostProtocol = true; us.ghostDuration = 1.0 + (l - 1) * 0.5; },
  overkill:          (l, us) => { us.hasOverkill = true; us.overkillSplitCount = 2 + (l - 1); },
  overload:          (l, us) => { us.hasOverload = true; us.overloadNapalmCount = 4 + (l - 1); },
  iron_storm:        (l, us) => { us.hasIronStorm = true; us.ironStormExtraPellets = (l - 1) * 2; },
  time_sniper:       (l, us) => { us.hasTimeSniper = true; us.timeSniperMult = 3 + (l - 1) * 0.5; },
  oil_vortex:        (l, us) => { us.hasOilVortex = true; us.oilVortexRadius = BLACK_HOLE_RADIUS * 1.5 + (l - 1) * 50; },
  shock_nova:        (l, us) => { us.hasShockNova = true; us.shockNovaRadius = 150 + (l - 1) * 50; },
  war_machine:       (_l, us) => { us.hasWarMachine = true; },
  // ── NEW BASE CARDS ─────────────────────────────────────────────────────────
  frost_rounds:      (l, us) => { us.frostRoundsDuration = 1.5 + (l - 1) * 0.5; },
  armor_shred:       (l, us) => { us.armorShredPerHit = 0.08 + (l - 1) * 0.02; us.armorShredMax = Math.min(0.80, 0.40 + (l - 1) * 0.08); },
  toxic_rounds:      (l, us) => { us.toxicRoundsDuration = 2.0 + (l - 1) * 1.0; },
  echo_strike:       (l, us) => { us.echoStrikePeriod = Math.max(2, 3 - (l - 1)); us.echoStrikeCount = 0; },
  rampage_amp:       (l, us) => { us.rampageAmpDmg = 0.25 + (l - 1) * 0.15; us.rampageAmpFire = 0.20; },
  // ── NEW SYNERGIES ──────────────────────────────────────────────────────────
  cryo_nova:      (l, us) => { us.hasCryoNova = true; us.cryoNovaFreeze = 2.0 + (l - 1) * 0.5; },
  shatter_strike: (l, us) => { us.hasShatterStrike = true; us.shatterStrikeMult = 1.80 + (l - 1) * 0.30; },
  poison_field:   (l, us) => { us.hasPoisonField = true; us.poisonFieldDps = 6 * (1 + (l - 1) * 0.5); },
  echo_chain:     (l, us) => { us.hasEchoChain = true; us.echoChainCount = l; },
  toxic_shred:    (l, us) => { us.hasToxicShred = true; us.toxicShredArmor = 0.15 + (l - 1) * 0.05; },
  frost_echo:     (l, us) => { us.hasFrostEcho = true; us.frostEchoDuration = 2.0 + (l - 1) * 1.0; },
  rampage_nova:   (l, us) => { us.hasRampageNova = true; us.rampageNovaRadius = 60 + (l - 1) * 20; },
  // ── NEW COMPANION CARDS ────────────────────────────────────────────────────
  companion_gunship: (l, us) => { us.gunshipDrones = l; us.gunshipTimers = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  companion_fighter: (l, us) => { us.fighterDrones = l; us.fighterTimers = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  companion_sniper:  (l, us) => { us.sniperDrones  = l; us.sniperTimers  = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  companion_mortar:  (l, us) => { us.mortarDrones  = l; us.mortarTimers  = Array.from({length:l},()=>0); us.companionOilDrain = _companionDrain(us); },
  // ── WEAPON CARDS (new) ──────────────────────────────────────────────────────
  weapon_chain_gun:   (l, us) => { us.activeWeapon = 'chain_gun';   if(!us.weaponLevels) us.weaponLevels={}; us.weaponLevels.chain_gun   = l; },
  weapon_plasma:      (l, us) => { us.activeWeapon = 'plasma';      if(!us.weaponLevels) us.weaponLevels={}; us.weaponLevels.plasma      = l; },
  weapon_flak:        (l, us) => { us.activeWeapon = 'flak';        if(!us.weaponLevels) us.weaponLevels={}; us.weaponLevels.flak        = l; },
  weapon_laser_rifle: (l, us) => { us.activeWeapon = 'laser_rifle'; if(!us.weaponLevels) us.weaponLevels={}; us.weaponLevels.laser_rifle = l; },
  // ── PASSIVE PERK CARDS (formerly milestone system) ──────────────────────────
  ms_second_wind:     (l, us) => { us.ms_second_wind = true; us.secondWindOil = 25 + (l - 1) * 15; },
  ms_adrenaline:      (l, us) => { us.ms_adrenaline = true; us.adrenalineOil = 4 + (l - 1) * 2; },
  ms_war_economy:     (l, us) => { us.ms_war_economy = true; us.warEconomyBonus = 0.30 + (l - 1) * 0.10; },
  ms_veteran:         (l, us) => { us.ms_veteran = true; us.veteranBonus = 0.20 + (l - 1) * 0.10; },
  ms_salvager:        (l, us) => { us.ms_salvager = true; us.salvagerMult = 1.50 + (l - 1) * 0.25; },
  ms_pipeline_expert: (l, us) => { us.ms_pipeline_expert = true; us.pipelineIncomeMult = 3 + (l - 1) * 0.5; },
  ms_sharpshooter:    (l, us) => { us.ms_sharpshooter = true; us.sharpshooterSpeedBonus = 2 + (l - 1); us.sharpshooterDmgBonus = 0.15 + (l - 1) * 0.05; },
  ms_opportunist:     (l, us) => { us.ms_opportunist = true; us.opportunistMult = 1.40 + (l - 1) * 0.20; },
};

const MUTATION_APPLY = {
  minigun_mode:     (us) => { us.mutations.minigun_mode = true; },
  railgun:          (us) => { us.mutations.railgun = true; us.extraPierce = 999; },
  hellfire:         (us) => { us.mutations.hellfire = true; },
  obliterate:       (us) => { us.mutations.obliterate = true; us.critChance = 1.0; },
  fortress_plating: (us) => { us.mutations.fortress_plating = true; us.armorReduction = 0.5; },
  regenerator:      (us) => { us.mutations.regenerator = true; },
};

export function getUpgradeChoices(s) {
  // Rarity weights: common=60, rare=25, legendary=10
  const RARITY_WEIGHT = { common: 60, rare: 25, legendary: 10 };

  // Non-weapon cards that haven't hit their maxLevel
  // Synergies are offered separately; one-time cards excluded after first pick
  const statPool = Object.keys(UPGRADES).filter(k => {
    const up = UPGRADES[k];
    if (up.synergy) return false;          // offered via synergy slot
    if (up.category === 'weapon') return false;
    // Cards that have hit their maxLevel don't appear again
    if ((s.upgradeLevels[k] || 0) >= (up.maxLevel || 1)) return false;
    return true;
  });

  // Weapon pool
  const weaponPool = Object.keys(UPGRADES).filter(k => UPGRADES[k].category === 'weapon');

  // Weighted random pick
  function weightedPick(available, exclude) {
    const filtered = available.filter(k => !exclude.has(k));
    const weighted = [];
    for (const k of filtered) {
      const up = UPGRADES[k];
      const w = RARITY_WEIGHT[up.rarity] || 60;
      for (let i = 0; i < w; i++) weighted.push(k);
    }
    if (weighted.length === 0) return null;
    return weighted[randInt(0, weighted.length - 1)];
  }

  // Pick 3 stat/effect cards
  const used = new Set();
  const statChoices = [];
  for (let i = 0; i < 3 && statChoices.length < 3; i++) {
    const pick = weightedPick(statPool, used);
    if (pick) { statChoices.push(pick); used.add(pick); }
  }

  // Check for synergy or mutation to replace one stat slot
  const availableSynergies = SYNERGY_KEYS.filter(k => {
    const up = UPGRADES[k];
    if ((s.upgradeLevels[k] || 0) >= (up.maxLevel || 1)) return false;
    return up.requires.every(req => (s.upgradeLevels[req] || 0) >= 1);
  });
  const availableMutations = Object.keys(MUTATIONS).filter(mk => {
    if (s.upgradeStats.mutations?.[mk]) return false;
    const mut = MUTATIONS[mk];
    return (s.upgradeLevels[mut.base] || 0) >= 3;
  });
  if (availableSynergies.length > 0) statChoices.push(availableSynergies[0]);
  if (availableMutations.length > 0) statChoices.push(availableMutations[randInt(0, availableMutations.length - 1)]);

  // Always pick 1 weapon card (can be any weapon, including one already owned → upgrade)
  const weaponPick = weightedPick(weaponPool, new Set());

  return [...statChoices, weaponPick].filter(Boolean);
}

/** Oil cost to research the NEXT level of an upgrade (currentLevel = level before upgrade). */
export function getUpgradeCost(key, currentLevel) {
  if (MUTATIONS[key]) return 150;
  const up = UPGRADES[key];
  if (!up) return 0;
  if (up.synergy) return 100;
  if (up.category === 'wildcard') return 80;  // wildcards cost flat 80 — painful but worth it
  if (up.category === 'companion') return 60 + currentLevel * 20; // companions: 60/80/100... oil each stack
  if (up.rarity === 'legendary') return 80;
  if (up.rarity === 'rare' || up.rare) return 120;
  return UPGRADE_OIL_COST_BASE + currentLevel * 40;  // 50 / 90 / 130 for levels 1-3
}

export function applyUpgrade(s, key) {
  // Mutation upgrade: apply once and track in upgradeStats.mutations
  if (MUTATIONS[key]) {
    const cost = 150;
    s.player.oil = Math.max(0, s.player.oil - cost);
    if (!s.upgradeStats.mutations) s.upgradeStats.mutations = {};
    if (MUTATION_APPLY[key]) MUTATION_APPLY[key](s.upgradeStats);
    // Track in upgradeLevels so the game-over screen can list it
    s.upgradeLevels[key] = 1;
    s.totalUpgrades++;
    spawnFloatingText(s, s.player.x, s.player.y - 50, '🧬 MUTATION: ' + MUTATIONS[key].name + '!', MUTATIONS[key].color, 17);
    return;
  }

  const currentLevel = s.upgradeLevels[key] || 0;
  const cost = getUpgradeCost(key, currentLevel);
  // Deduct oil — player can still upgrade even when broke but pays what they have
  s.player.oil = Math.max(0, s.player.oil - cost);
  s.upgradeLevels[key] = currentLevel + 1;
  if (UPGRADE_APPLY[key]) UPGRADE_APPLY[key](s.upgradeLevels[key], s.upgradeStats);
  // Passive perk cards: also set milestoneUnlocks so legacy check sites keep working
  if (key.startsWith('ms_')) {
    const mk = key.replace('ms_', '');
    s.milestoneUnlocks[mk] = true;
  }
  s.totalUpgrades++;
}

/* ===== COMBO & STREAK ===== */
export function registerKill(s, scoreVal, enemyInfo) {
  s.combo++;
  s.comboTimer = 3.0;
  s.killStreak++;
  s.streakTimer = 4.0;

  // Score multiplier boost per kill
  if (!s.scoreMult) s.scoreMult = 1.0;
  s.scoreMult = Math.min(3.0, s.scoreMult + 0.15);

  const comboMult = 1 + Math.floor(s.combo / 5) * 0.25;
  // Rampage doubles oil reward (score unchanged to keep leaderboards fair)
  const rampageMult = s.player.rampageActive ? 2.0 : 1.0;
  const gained = Math.floor(scoreVal * comboMult * s.scoreMult);
  s.score += gained;

  if (s.combo > s.maxCombo) s.maxCombo = s.combo;
  if (s.killStreak > s.maxStreak) s.maxStreak = s.killStreak;
  if (s.combo > 1 && s.combo % 5 === 0) {
    spawnFloatingText(s, s.player.x, s.player.y - 50, s.combo + 'x COMBO!', '#ff44ff', 16);
    addShake(s, 2, true);
  }
  if (s.killStreak > 0 && s.killStreak % 10 === 0) {
    spawnFloatingText(s, s.player.x, s.player.y - 60, s.killStreak + ' KILL STREAK!', '#ffcc00', 18);
    s.player.oil = Math.min(getMaxOil(s), s.player.oil + 20);
    addShake(s, 4, true);
  }

  // Rampage: trigger at 12-kill streak, grant buffs
  if (s.killStreak === 12 && !s.player.rampageActive) {
    s.player.rampageActive = true;
    s.player.rampageTimer = 0;
    spawnFloatingText(s, s.player.x, s.player.y - 55, '🔥 RAMPAGE!', '#ff6600', 22);
    addShake(s, 6, true);
    addScreenFlash(s, '#ff4400', 0.25);
  }

  // Oil bonus is doubled during rampage
  if (s.player.rampageActive) {
    s.player.oil = Math.min(getMaxOil(s), s.player.oil + OIL_KILL_DROP_BONUS);
  }

  // Adrenaline perk: kills when low oil restore extra oil (stackable)
  if (s.milestoneUnlocks?.adrenaline && s.player.oil / getMaxOil(s) < 0.20) {
    s.player.oil = Math.min(getMaxOil(s), s.player.oil + (s.upgradeStats.adrenalineOil || 4));
  }

  // ── Wildcard effects on kill ───────────────────────────────────────────────
  // Lucky Break: once per 20s, a kill gives 5× oil reward
  if (s.upgradeStats.hasLuckyBreak) {
    s.upgradeStats.luckyBreakTimer = (s.upgradeStats.luckyBreakTimer || 0) - 0; // timer ticked in update
    if ((s.upgradeStats.luckyBreakTimer || 0) <= 0) {
      s.player.oil = Math.min(getMaxOil(s), s.player.oil + 40);
      spawnFloatingText(s, s.player.x, s.player.y - 45, '🍀 LUCKY BREAK! +40 oil', '#44ff88', 14);
      s.upgradeStats.luckyBreakTimer = 20;
    }
  }
  // Warcry: stacking damage on kills within 4s
  if (s.upgradeStats.hasWarcry) {
    s.upgradeStats.warcryStacks = Math.min(10, (s.upgradeStats.warcryStacks || 0) + 1);
    s.upgradeStats.warcryTimer = 4.0;
    s.upgradeStats.damageMult = Math.max(1, (s.upgradeStats.damageMult || 1));
  }
  // Time Bandit: 25% chance to reduce cooldowns by 3s
  if (s.upgradeStats.hasTimeBandit && Math.random() < 0.25) {
    s.blackHoleCooldown = Math.max(0, (s.blackHoleCooldown || 0) - 3);
    s.timeWarpCooldown = Math.max(0, (s.timeWarpCooldown || 0) - 3);
    spawnFloatingText(s, s.player.x, s.player.y - 35, '⏳ TIME BANDIT! Cooldowns -3s', '#aa88ff', 12);
  }
  // Chaos Engine: 20% chance to trigger a random ability for free
  if (s.upgradeStats.hasChaosEngine && Math.random() < 0.20) {
    const hasAbilities = [s.upgradeStats.hasTimeWarp, s.upgradeStats.hasBlackHole].filter(Boolean);
    if (hasAbilities.length > 0 && Math.random() < 0.5 && s.upgradeStats.hasTimeWarp && s.timeWarpCooldown <= 0) {
      s.timeWarpCooldown = 8; // shorter cooldown for free trigger
      for (const e of s.enemies) { e.stunTimer = Math.max(e.stunTimer || 0, 3.0); }
      spawnFloatingText(s, s.player.x, s.player.y - 45, '🎲 CHAOS: TIME WARP!', '#ff44ff', 14);
    } else if (s.upgradeStats.hasBlackHole) {
      s.blackHoleCooldown = 6;
      spawnFloatingText(s, s.player.x, s.player.y - 45, '🎲 CHAOS!', '#ff44ff', 14);
    }
  }

  // Kill feed
  if (enemyInfo) {
    const typeStr = enemyInfo.isBoss ? 'BOSS' : (enemyInfo.subType && enemyInfo.subType !== 'normal' ? enemyInfo.subType.toUpperCase() : enemyInfo.type.toUpperCase());
    addKillFeedEntry(s, '+' + gained + ' ' + typeStr, enemyInfo.factionColor || '#ffcc00');
  }
  return gained;
}

// Small bonus oil per kill during rampage (separate from main kill oil drop in combatLogic)
const OIL_KILL_DROP_BONUS = 2;

/* ===== RESET / INIT ===== */
export function resetPlayer(s) {
  Object.assign(s.player, {
    x: WORLD_W / 2, y: WORLD_H / 2, vx: 0, vy: 0,
    angle: -Math.PI / 2, oil: OIL_BASE,
    fireCooldown: 0, homingCooldown: 0, invincible: 0,
    rotorAngle: 0, tailRotorAngle: 0, alive: true,
    engineGlow: 0, shieldActive: false, shieldTimer: 0,
    dashCooldown: 0, dashing: 0, dashAngle: 0,
    counterAttackTimer: 0,
    oilState: 'normal',
    rampageActive: false,
    rampageTimer: 0,
  });
}

function makeRig(x, y) {
  return {
    x, y,
    owner: 'neutral', captureProgress: 0, hp: 220, maxHp: 220,
    flamePhase: Math.random() * Math.PI * 2, craneAngle: Math.random() * Math.PI * 2,
    underAttack: false, attackWarning: 0,
    enemyCaptureProgress: 0,
    turretTimer: 0,
    pipelineIncome: 0,
    oilReserve: rand(RIG_RESERVE_MIN, RIG_RESERVE_MAX),  // finite oil supply
    depleteTimer: 0,    // counts down after depletion
    burnoutTimer: 0,    // counts down after AI destroys it
    burnoutOil: 0,      // salvageable oil in the wreck
    spawnFlash: 1.0,    // 0→1 fade-in animation when rig appears
  };
}

export function initRigs(s) {
  s.rigs.length = 0;
  // Start with exactly ONE rig, placed near the player start (centre of world)
  const px = WORLD_W / 2, py = WORLD_H / 2;
  const a = Math.random() * Math.PI * 2;
  const d = rand(200, 280);
  s.rigs.push(makeRig(
    Math.max(200, Math.min(WORLD_W - 200, px + Math.cos(a) * d)),
    Math.max(200, Math.min(WORLD_H - 200, py + Math.sin(a) * d)),
  ));
}

/** Spawn a new rig using the cluster/isolated probability algorithm.
 *  Call this from combatLogic's rig-spawn timer. */
export function spawnRig(s) {
  if (s.rigs.filter(r => r.owner !== 'burnout').length >= RIG_MAX_COUNT) return;
  const margin = 200;
  const existing = s.rigs.filter(r => r.owner !== 'burnout');
  let x, y, attempts = 0;

  const useCluster = existing.length > 0 && Math.random() < RIG_CLUSTER_CHANCE;
  if (useCluster) {
    // Spawn near a random existing rig — risky cluster
    const parent = existing[Math.floor(Math.random() * existing.length)];
    do {
      const a = Math.random() * Math.PI * 2;
      const d = rand(RIG_CLUSTER_RADIUS_MIN, RIG_CLUSTER_RADIUS_MAX);
      x = parent.x + Math.cos(a) * d;
      y = parent.y + Math.sin(a) * d;
      attempts++;
    } while (
      (x < margin || x > WORLD_W - margin || y < margin || y > WORLD_H - margin) &&
      attempts < 30
    );
  } else {
    // Isolated spawn — far from everything
    do {
      x = rand(margin, WORLD_W - margin);
      y = rand(margin, WORLD_H - margin);
      const minDist = existing.length > 0
        ? Math.min(...existing.map(r => Math.hypot(r.x - x, r.y - y)))
        : Infinity;
      if (minDist >= RIG_ISOLATED_MIN) break;
      attempts++;
    } while (attempts < 40);
  }

  // Don't spawn on top of the player
  const pd = Math.hypot(s.player.x - x, s.player.y - y);
  if (pd < 260) return; // skip this tick, try again next interval

  s.rigs.push(makeRig(x, y));
}

/** Apply active AI upgrades to a freshly created enemy object (mutates in place). */
export function applyAiUpgrades(s, enemy) {
  const ups = s.aiUpgrades || [];
  const tier = (FACTIONS[enemy.faction]?.tier) || 1;
  // Tier 4 gets a second application of stacked upgrades (most insane abilities)
  const stacks = tier >= 4 ? 2 : 1;
  for (let st = 0; st < stacks; st++) {
    if (ups.includes('reinforced_hulls')) {
      enemy.hp   *= 1.30; enemy.maxHp *= 1.30;
    }
    if (ups.includes('boosted_engines')) {
      enemy.speed *= 1.22; enemy.baseSpeed *= 1.22;
    }
  }
  if (ups.includes('berserker_chip'))   enemy.hasBerserker = true;
  if (ups.includes('explosive_payloads')) enemy.explosivePayload = true;
  if (ups.includes('shield_protocol') && Math.random() < 0.25 && enemy.type === 'drone' && enemy.subType === 'normal') {
    enemy.subType = 'shield';
  }
  return enemy;
}

export function resetGameState(s) {
  s.score = 0; s.waveTimer = 3; s.wantedLevel = 0; s.time = 0;
  s.respiteTimer = 0;
  s.surgeTimer = 80;
  s.surgeActive = 0;
  // Progressive rigs — spawn first one quickly (12 seconds)
  s.nextRigSpawnTime = 12;
  s.totalRigsSpawned = 1;
  // AI upgrades
  s.aiUpgrades = [];
  s.aiUpgradeTimer = AI_UPGRADE_INTERVAL;
  s.enemies.length = 0; s.bullets.length = 0; s.enemyBullets.length = 0;
  s.homingMissiles.length = 0; s.particles.length = 0; s.floatingTexts.length = 0;
  s.loot.length = 0; s.napalmZones.length = 0; s.wrecks.length = 0;
  s.pipelines.length = 0;
  s.shakeAmount = 0;
  s.playerLevel = 1; s.playerXP = 0; s.pendingLevelUp = false;
  s.combo = 0; s.comboTimer = 0; s.killStreak = 0; s.streakTimer = 0;
  s.maxCombo = 0; s.maxStreak = 0;
  s.activePowerups = {};
  s.rigRecaptureTimer = RIG_RECAPTURE_INTERVAL;
  s.paused = false;
  s.timeSurvived = 0;
  s.totalKills = { drone: 0, plane: 0, chopper: 0, boss: 0 };
  s.totalDamageTaken = 0;
  s.totalDamageDealt = 0;
  s.killFeed = [];
  s.bountyCards = [];
  s.isBountyUpgrade = false;
  s.upgradeChoices = [];
  s.pendingUpgradeCard = null;
  s.blackHoleCooldown = 0;
  s.timeWarpCooldown = 0;
  s.lastAbilityTime = -99;
  s.lastAbilityType = null;
  s.scoreMult = 1.0;
  s.bountyTarget = null;
  s.bountyTimer = 50;
  s.revengeTarget = null;
  s.goldRigTimer = null;
  // Milestones
  s.nextMilestoneScore = MILESTONE_INTERVAL;
  s.milestoneChoices = [];
  s.milestoneUnlocks = {};
  s.secondWindUsed = false;
  // Oil market
  s.oilMarket = { mult: 1.0, timer: 0, nextEvent: OIL_MARKET_INTERVAL, label: '', active: false };
  // Events
  s.activeEvent = null;
  s.nextEventTime = EVENT_INTERVAL;
  // Rivalry
  s.rivalryTimer = RIVALRY_CHECK_INTERVAL;
  s.nearRig = null;
  // Hive mind
  s.hiveMind = {
    alertLevel: 0,
    knownPlayerX: WORLD_W / 2,
    knownPlayerY: WORLD_H / 2,
    alertTimer: 0,
    commanderAlive: false,
    scoutAlerted: false,
  };
  s.screenFlash = { color: '', alpha: 0 };
  s.vignetteIntensity = 0;
  resetPlayer(s);
  resetUpgrades(s);
  initRigs(s);
  s.gameState = 'playing';
}
