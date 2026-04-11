import {
  OIL_BASE, OIL_BASE_MAX, WORLD_W, WORLD_H, RIG_COUNT,
  RIG_RECAPTURE_INTERVAL, MAX_LEVEL,
  PLAYER_BASE_SPEED, FIRE_BASE_COOLDOWN, BULLET_BASE_SPEED, PICKUP_RADIUS,
  OIL_CRITICAL_THRESHOLD, OIL_FLUSH_THRESHOLD, KILL_FEED_MAX,
  OIL_MARKET_INTERVAL, EVENT_INTERVAL, NIGHT_CYCLE_INTERVAL, MILESTONE_INTERVAL,
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

  /* Night cycle */
  nightCycleTimer: NIGHT_CYCLE_INTERVAL,
  nightMode: false,
  nightAlpha: 0,        // 0–0.85 for smooth dark transition
  nightDuration: 0,

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
  if (s.milestoneUnlocks?.night_fighter && s.nightMode) spd += 2;
  return spd;
}

export function getBulletPenetration(s) { return s.upgradeStats.extraPierce || 0; }

export function getReloadTime(s) {
  let base = Math.max(0.04, FIRE_BASE_COOLDOWN * (s.upgradeStats.reloadMult || 1));
  base /= (s.upgradeStats.fireMult || 1);
  if (s.upgradeStats.overchargeBonus > 0 && s.player.oil / getMaxOil(s) >= 0.8) {
    base *= (1 - s.upgradeStats.overchargeBonus);
  }
  return Math.max(0.04, base);
}

export function getMoveSpeed(s) {
  return (PLAYER_BASE_SPEED + (hasPowerup(s, 'speed') ? 1.5 : 0)) * (s.upgradeStats.speedMult || 1);
}
export function getPickupRadius(s) { return PICKUP_RADIUS + (hasPowerup(s, 'magnet') ? 200 : 0); }

export function getBulletDamage(s) {
  let dmg = (15 + (hasPowerup(s, 'damage') ? 15 : 0)) * (s.upgradeStats.damageMult || 1);
  if (s.upgradeStats.recklessBonus > 0 && s.player.oil / getMaxOil(s) < 0.30) {
    dmg *= (1 + s.upgradeStats.recklessBonus);
  }
  if (s.player.oilState === 'flush') dmg *= 1.10;
  if (s.player.counterAttackTimer > 0) dmg *= (1 + (s.upgradeStats.counterAttackMult || 0));
  if (s.milestoneUnlocks?.veteran && s.combo >= 10) dmg *= 1.20;
  if (s.milestoneUnlocks?.night_fighter && s.nightMode) dmg *= 1.15;
  if (s.player.revengeBuff > 0) dmg *= 1.50;
  // Warcry wildcard: stacking bonus per kill
  if (s.upgradeStats.hasWarcry) dmg *= (s.upgradeStats.warcryDamageMult || 1);
  // Railgun mutation: bullets deal 2× damage
  if (s.upgradeStats.mutations?.railgun) dmg *= 2.0;
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
    hasWarhead: false,
    hasExplosiveRounds: false, explosiveRoundsMult: 0.4,
    vampireHeal: 0,
    hasFlakBurst: false, flakLevels: 0,
    extraInvincFrames: 0,
    hasTimeWarp: false,
    supplyNetworkBonus: 0,
    // Stat card bonuses (replace old stats[] array)
    maxOilMult: 1,          // glass_cannon / berserker reduce this
    statMaxOilBonus: 0,     // stat_health card
    bulletSpeedMult: 1,     // stat_bullet_spd card
    reloadMult: 1,          // stat_reload card
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
    // Wildcard flags
    wildBerserker: false,
    wildGlassCannon: false,
    wildBloodPact: false,
    bulletOilCostMult: 1,   // multiplier on bullet oil cost (blood pact = 3×)
    hasPhoenix: false,
    phoenixUsed: false,
    swarmDroneCount: 0,     // wild_drone_swarm adds 3
    hasVoidRounds: false,
    hasChaosEngine: false,
    hasTimeBandit: false,
    hasLuckyBreak: false,   luckyBreakTimer: 0,
    hasOilMagnate: false,
    hasWarcry: false,       warcryStacks: 0, warcryTimer: 0,
    hasWildOverclock: false, overclockBulletCount: 0,
    // Weapon mutations
    mutations: {},
  };
  s.upgradeLevels = {};
  s.totalUpgrades = 0;
}

const UPGRADE_APPLY = {
  spread_shot:      (l, us) => { us.spreadCount = 1 + l * 2; },
  oil_magnet:       (l, us) => { us.oilMult = 1 + l * 0.5; },
  shield:           (l, us) => { us.shieldInterval = Math.max(7, 15 - l * 4); us.hasShield = true; },
  emp:              (l, us) => { us.empRadius = 80 + l * 60; us.hasEmp = true; },
  critical:         (l, us) => { us.critChance = l * 0.15; },
  repair:           (l, us) => { us.regenRate = l * 3; },
  missile_boost:    (l, us) => { us.missileDmgMult = 1 + l * 0.4; us.missileSpeedMult = 1 + l * 0.3; },
  piercing:         (l, us) => { us.extraPierce = l; },
  orbital:          (l, us) => { us.orbitalCount = l; },
  xp_boost:         (l, us) => { us.xpMult = 1 + l * 0.3; },
  chain_lightning:  (l, us) => { us.chainCount = l; },
  napalm:           (l, us) => { us.hasNapalm = true; us.napalmDpsMult = 1 + (l - 1) * 0.5; },
  armor_plating:    (l, us) => { us.armorReduction = l * 0.15; },
  counter_attack:   (l, us) => { us.counterAttackMult = l === 1 ? 0.30 : 0.50; },
  fortify:          (l, us) => { us.hasFortify = true; us.fortifyTurretCount = l; },
  overcharge:       (l, us) => { us.overchargeBonus = l === 1 ? 0.15 : 0.25; },
  reckless:         (l, us) => { us.recklessBonus = l === 1 ? 0.30 : 0.50; },
  oil_nova:         (l, us) => { us.hasOilNova = true; us.oilNovaRadius = l; },
  black_hole:       (_l, us) => { us.hasBlackHole = true; },
  // New abilities
  rapid_fire:       (l, us) => { us.fireMult = 1 + l * 0.20; },
  high_caliber:     (l, us) => { us.damageMult = 1 + l * 0.25; },
  burst_shot:       (l, us) => { us.extraBullets = l; },
  speed_boost:      (l, us) => { us.speedMult = 1 + l * 0.18; },
  reflex_dash:      (l, us) => { us.dashCooldownBonus = l * 0.6; },
  warhead:          (_l, us) => { us.hasWarhead = true; },
  explosive_rounds: (l, us) => { us.hasExplosiveRounds = true; us.explosiveRoundsMult = 0.3 + l * 0.1; },
  vampire_rounds:   (l, us) => { us.vampireHeal = l * 0.4; },
  flak_burst:       (l, us) => { us.hasFlakBurst = true; us.flakLevels = l; },
  iron_will:        (l, us) => { us.extraInvincFrames = l * 0.35; },
  time_warp:        (_l, us) => { us.hasTimeWarp = true; },
  supply_network:   (l, us) => { us.supplyNetworkBonus = l; },
  // Stat cards (replace old stats[] array)
  stat_speed:       (l, us) => { us.speedMult = (us.speedMult || 1) * Math.pow(1.12, l); },
  stat_armor:       (l, us) => { us.armorReduction = Math.min(0.75, (us.armorReduction || 0) + l * 0.12); },
  stat_health:      (l, us) => { us.statMaxOilBonus = (us.statMaxOilBonus || 0) + 150; },
  stat_regen:       (l, us) => { us.regenRate = (us.regenRate || 0) + 2; },
  stat_reload:      (l, us) => { us.reloadMult = Math.max(0.3, (us.reloadMult || 1) * 0.88); },
  stat_bullet_spd:  (l, us) => { us.bulletSpeedMult = (us.bulletSpeedMult || 1) * Math.pow(1.20, l); },
  stat_bullet_dmg:  (l, us) => { us.damageMult = (us.damageMult || 1) * Math.pow(1.20, l); },
  stat_pierce:      (l, us) => { us.extraPierce = (us.extraPierce || 0) + 1; },
  // Wildcard cards
  wild_berserker:   (_l, us) => { us.wildBerserker = true; us.maxOilMult = Math.max(0.1, (us.maxOilMult || 1) * 0.75); us.fireMult = (us.fireMult || 1) * 1.5; us.damageMult = (us.damageMult || 1) * 1.4; },
  wild_glass_cannon:(_l, us) => { us.wildGlassCannon = true; us.maxOilMult = Math.max(0.1, (us.maxOilMult || 1) * 0.60); us.extraPierce = 999; us.damageMult = (us.damageMult || 1) * 1.6; },
  wild_blood_pact:  (_l, us) => { us.wildBloodPact = true; us.bulletOilCostMult = (us.bulletOilCostMult || 1) * 3; us.damageMult = (us.damageMult || 1) * 2.0; },
  wild_phoenix:     (_l, us) => { us.hasPhoenix = true; us.phoenixUsed = false; },
  wild_drone_swarm: (_l, us) => { us.swarmDroneCount = (us.swarmDroneCount || 0) + 3; },
  wild_void_rounds: (_l, us) => { us.hasVoidRounds = true; },
  wild_chaos_engine:(_l, us) => { us.hasChaosEngine = true; },
  wild_time_bandit: (_l, us) => { us.hasTimeBandit = true; },
  wild_lucky_break: (_l, us) => { us.hasLuckyBreak = true; us.luckyBreakTimer = 0; },
  wild_oil_magnate: (_l, us) => { us.hasOilMagnate = true; },
  wild_warcry:      (_l, us) => { us.hasWarcry = true; us.warcryStacks = 0; us.warcryTimer = 0; },
  wild_overclock:   (_l, us) => { us.hasWildOverclock = true; us.overclockBulletCount = 0; },
  // Synergies (original 4)
  pulse_armor:      (_l, us) => { us.hasPulseArmor = true; },
  missile_battery:  (_l, us) => { us.hasMissileBattery = true; },
  inferno_barrage:  (_l, us) => { us.hasInfernoBarrage = true; },
  adaptive_plating: (_l, us) => { us.hasAdaptivePlating = true; },
  // Synergies (expanded)
  chain_reaction:   (_l, us) => { us.hasChainReaction = true; },
  blood_money:      (_l, us) => { us.hasBloodMoney = true; },
  ghost_protocol:   (_l, us) => { us.hasGhostProtocol = true; },
  overkill:         (_l, us) => { us.hasOverkill = true; },
  overload:         (_l, us) => { us.hasOverload = true; },
  iron_storm:       (_l, us) => { us.hasIronStorm = true; },
  time_sniper:      (_l, us) => { us.hasTimeSniper = true; },
  oil_vortex:       (_l, us) => { us.hasOilVortex = true; },
  shock_nova:       (_l, us) => { us.hasShockNova = true; },
  war_machine:      (_l, us) => { us.hasWarMachine = true; },
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
  // Build weighted pool by rarity
  // Rarity weights: common=60, rare=25, legendary=10 (wildcards)
  const RARITY_WEIGHT = { common: 60, rare: 25, legendary: 10 };

  const pool = Object.keys(UPGRADES).filter(k => {
    const up = UPGRADES[k];
    if (up.synergy) return false;
    return (s.upgradeLevels[k] || 0) < up.maxLevel;
  });

  // Weighted random pick from pool
  function weightedPick(available) {
    const weighted = [];
    for (const k of available) {
      const up = UPGRADES[k];
      const w = RARITY_WEIGHT[up.rarity] || 60;
      for (let i = 0; i < w; i++) weighted.push(k);
    }
    if (weighted.length === 0) return null;
    return weighted[randInt(0, weighted.length - 1)];
  }

  const choices = [];
  const used = new Set();
  let attempts = 0;
  while (choices.length < 3 && attempts < 200) {
    attempts++;
    const remaining = pool.filter(k => !used.has(k));
    if (remaining.length === 0) break;
    const pick = weightedPick(remaining);
    if (pick && !used.has(pick)) {
      choices.push(pick);
      used.add(pick);
    }
  }

  const availableSynergies = SYNERGY_KEYS.filter(k => {
    if ((s.upgradeLevels[k] || 0) >= UPGRADES[k].maxLevel) return false;
    return UPGRADES[k].requires.every(req => (s.upgradeLevels[req] || 0) >= UPGRADES[req].maxLevel);
  });

  const availableMutations = Object.keys(MUTATIONS).filter(mk => {
    const mut = MUTATIONS[mk];
    const baseUp = UPGRADES[mut.base];
    if (!baseUp) return false;
    if ((s.upgradeLevels[mut.base] || 0) < baseUp.maxLevel) return false;
    return !s.upgradeStats.mutations?.[mk];
  });

  if (availableSynergies.length > 0) {
    choices.push(availableSynergies[0]);
  }

  if (availableMutations.length > 0) {
    choices.push(availableMutations[randInt(0, availableMutations.length - 1)]);
  }

  return choices;
}

/** Oil cost to research the NEXT level of an upgrade (currentLevel = level before upgrade). */
export function getUpgradeCost(key, currentLevel) {
  if (MUTATIONS[key]) return 150;
  const up = UPGRADES[key];
  if (!up) return 0;
  if (up.synergy) return 100;
  if (up.category === 'wildcard') return 80;  // wildcards cost flat 80 — painful but worth it
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

  // Adrenaline milestone: kills when low oil restore extra oil
  if (s.milestoneUnlocks?.adrenaline && s.player.oil / getMaxOil(s) < 0.20) {
    s.player.oil = Math.min(getMaxOil(s), s.player.oil + 4);
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
  // Progressive rigs
  s.nextRigSpawnTime = RIG_SPAWN_INTERVAL;
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
  // Night cycle
  s.nightCycleTimer = NIGHT_CYCLE_INTERVAL;
  s.nightMode = false;
  s.nightAlpha = 0;
  s.nightDuration = 0;
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
