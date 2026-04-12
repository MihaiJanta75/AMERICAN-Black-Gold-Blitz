import {
  WORLD_W, WORLD_H, WANTED_THRESHOLDS,
  DRONE_DAMAGE, PLANE_DAMAGE, CHOPPER_DAMAGE, BOSS_THRESHOLD,
  PLANE_BASE_SPEED,
  RIG_RECAPTURE_INTERVAL, CAPTURE_RADIUS, CAPTURE_TIME,
  HIVE_ALERT_RADIUS, HIVE_ALERT_DECAY, COMMANDER_BUFF_RADIUS,
  KAMIKAZE_EXPLOSION_RADIUS, KAMIKAZE_DAMAGE, KAMIKAZE_RUSH_RANGE,
  SCOUT_ALERT_DURATION, BOMBER_HP, BOMBER_SPEED,
  RIVALRY_RANGE, RIVALRY_DAMAGE_RATE, RIVALRY_CHECK_INTERVAL,
} from '../constants.js';
import { clamp, rand, randInt, dist, angle, lerp, pickRandom } from '../utils.js';
import { FACTIONS, FACTION_KEYS, TIER_MULTS, FACTION_BY_TIER } from '../config.js';
import {
  spawnExplosion, spawnEngineTrail, spawnFloatingText, addShake,
  addScreenFlash, triggerHiveAlert, applyAiUpgrades,
} from '../state/GameState.js';

/* ===== FACTION TIER HELPERS ===== */

/** Pick a faction appropriate for the current time phase.
 *  Higher phases allow higher-tier (tougher) factions to appear. */
function getFactionForPhase(timePhase) {
  if (timePhase === 0) return 'red';
  if (timePhase === 1) { const r = Math.random(); return r < 0.72 ? 'red' : 'yellow'; }
  if (timePhase === 2) { const r = Math.random(); return r < 0.38 ? 'red' : r < 0.74 ? 'yellow' : 'blue'; }
  if (timePhase === 3) { const r = Math.random(); return r < 0.18 ? 'red' : r < 0.46 ? 'yellow' : r < 0.78 ? 'blue' : 'purple'; }
  // Phase 4: Violet leads the field
  const r = Math.random(); return r < 0.10 ? 'red' : r < 0.28 ? 'yellow' : r < 0.58 ? 'blue' : 'purple';
}

/** Lower-tier escort faction for a given leader faction */
function escortFaction(leader) {
  const tier = FACTIONS[leader]?.tier || 1;
  if (tier <= 1) return 'red';
  return FACTION_BY_TIER[tier - 1] || 'red';
}

export function getRandomFaction() { return getFactionForPhase(2); } // legacy compat

/* ===== ENEMY FACTORIES ===== */

function makeEnemyBase(overrides) {
  return {
    subType: 'normal',
    aiState: 'chase',
    aiTimer: 0,
    retreatAngle: 0,
    stunTimer: 0,
    panicTimer: 0,
    commanderBuffed: false,
    shieldBubble: false,
    targetRig: null,
    hasBerserker: false,
    explosivePayload: false,
    orbitDir: Math.random() < 0.5 ? 1 : -1,
    ...overrides,
  };
}

export function spawnDrone(s, x, y, faction, subType) {
  faction = faction || 'red';
  subType = subType || 'normal';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];

  // Base stats scaled by tier
  let hp  = 30  * tm.hp;
  let spd = 2.6 * tm.speed + s.wantedLevel * 0.3;
  let dmg = DRONE_DAMAGE;
  let radius = 14;
  let score  = 50 * tm.score;

  if (subType === 'scout')     { hp *= 0.55; spd += 1.5; score *= 0.65; }
  if (subType === 'kamikaze')  { hp *= 0.85; dmg = KAMIKAZE_DAMAGE; }
  if (subType === 'shield')    { hp *= 1.4; spd -= 0.5; score *= 1.5; radius = 16; }
  if (subType === 'oil_thief') { hp *= 1.1; score *= 1.2; }

  const e = makeEnemyBase({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: dmg, radius, scoreValue: score,
    rotorAngle: Math.random() * Math.PI * 2,
    faction, isBoss: false, subType,
    shieldBubbleTimer: 0,
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnPlane(s, edge, faction) {
  faction = faction || 'red';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  let x, y, ang;
  switch (edge) {
    case 0: x = rand(0, WORLD_W); y = -40;             ang = Math.PI / 2  + rand(-0.3, 0.3); break;
    case 1: x = WORLD_W + 40;    y = rand(0, WORLD_H); ang = Math.PI      + rand(-0.3, 0.3); break;
    case 2: x = rand(0, WORLD_W); y = WORLD_H + 40;    ang = -Math.PI / 2 + rand(-0.3, 0.3); break;
    default: x = -40;            y = rand(0, WORLD_H); ang = rand(-0.3, 0.3); break;
  }
  const spd = (PLANE_BASE_SPEED * tm.speed) + s.wantedLevel * 0.4;
  const e = makeEnemyBase({
    type: 'plane', x, y, vx: 0, vy: 0,
    hp: 50 * tm.hp, maxHp: 50 * tm.hp, angle: ang,
    speed: spd, baseSpeed: spd,
    damage: PLANE_DAMAGE, radius: 18, scoreValue: 100 * tm.score,
    fireCooldown: 0, propAngle: 0,
    faction, isBoss: false, subType: 'normal',
    aiState: 'flyby',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnHeavyGunship(s, sx, sy, faction) {
  faction = faction || 'red';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  const spd = 1.0 * tm.speed;
  const hp = 180 * tm.hp;
  const e = makeEnemyBase({
    type: 'chopper', x: sx, y: sy, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 45, radius: 26, scoreValue: 300 * tm.score,
    fireCooldown: 0, rotorAngle: 0, tailRotorAngle: 0,
    faction, isBoss: false, subType: 'heavy_gunship',
    aiState: 'orbit',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnStealthInfiltrator(s, edge, faction) {
  faction = faction || 'red';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  let x, y;
  switch (edge) {
    case 0: x = rand(0, WORLD_W); y = -40;             break;
    case 1: x = WORLD_W + 40;    y = rand(0, WORLD_H); break;
    case 2: x = rand(0, WORLD_W); y = WORLD_H + 40;    break;
    default: x = -40;            y = rand(0, WORLD_H); break;
  }
  const spd = 2.0 * tm.speed;
  const hp = 40 * tm.hp;
  const e = makeEnemyBase({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 15, radius: 12, scoreValue: 200 * tm.score,
    fireCooldown: 9999,
    faction, isBoss: false, subType: 'stealth_infiltrator',
    stealthMode: true, // semi-transparent until within 100px of target
    aiState: 'chase',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnChopper(s, x, y, faction, subType) {
  faction = faction || 'red';
  subType = subType || 'normal';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];

  let hp    = 82 * tm.hp;
  let score = 150 * tm.score;
  let dmg   = CHOPPER_DAMAGE;
  if (subType === 'command') { hp *= 1.7; score *= 2; dmg += 10; }

  const spd = (2.0 * tm.speed) + s.wantedLevel * 0.2;
  const e = makeEnemyBase({
    type: 'chopper', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: dmg, radius: subType === 'command' ? 22 : 18,
    scoreValue: score,
    fireCooldown: 0, rotorAngle: 0, tailRotorAngle: 0,
    faction, isBoss: false, subType,
    aiState: 'orbit',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnBomber(s, targetRig) {
  const faction = 'blue'; // Bombers are always Cobalt tier
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  switch (edge) {
    case 0: x = rand(0, WORLD_W); y = -80; break;
    case 1: x = WORLD_W + 80; y = rand(0, WORLD_H); break;
    case 2: x = rand(0, WORLD_W); y = WORLD_H + 80; break;
    default: x = -80; y = rand(0, WORLD_H); break;
  }
  const ang = Math.atan2(targetRig.y - y, targetRig.x - x);
  const tm  = TIER_MULTS[3];
  const e   = makeEnemyBase({
    type: 'bomber', x, y, vx: 0, vy: 0,
    hp: BOMBER_HP * tm.hp, maxHp: BOMBER_HP * tm.hp,
    angle: ang,
    speed: BOMBER_SPEED, baseSpeed: BOMBER_SPEED,
    damage: 0, radius: 22, scoreValue: 250 * tm.score,
    faction, isBoss: false, subType: 'normal',
    targetRig, bombDropped: false, damageDealt: false, propAngle: 0,
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnBoss(s, x, y) {
  const faction = 'purple'; // Boss is always Violet tier (hardest)
  const tm = TIER_MULTS[4];
  const e = makeEnemyBase({
    type: 'chopper', x, y, vx: 0, vy: 0,
    hp: (400 + s.wantedLevel * 100) * tm.hp,
    maxHp: (400 + s.wantedLevel * 100) * tm.hp,
    angle: 0, speed: 1.8 * tm.speed, baseSpeed: 1.8 * tm.speed,
    damage: 40, radius: 28, scoreValue: 500 * tm.score,
    fireCooldown: 0, rotorAngle: 0, tailRotorAngle: 0,
    faction, isBoss: true, subType: 'normal',
    aiState: 'orbit',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

/* ===== ARMED ENEMY SUBTYPES =====
 * Enemies with specialized weapon loadouts. Appear in phase 2+ waves. ===== */

export function spawnChainGunner(s, x, y, faction) {
  faction = faction || 'red';
  const f = FACTIONS[faction] || FACTIONS.red;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  const spd = 2.2 * tm.speed + s.wantedLevel * 0.2;
  const hp  = 50 * tm.hp;
  const e = makeEnemyBase({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 10, radius: 15, scoreValue: 80 * tm.score,
    rotorAngle: Math.random() * Math.PI * 2,
    faction, isBoss: false, subType: 'chain_gunner',
    weaponType: 'chain_gun',
    fireCooldown: 0, shieldBubbleTimer: 0,
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnPlasmaTrooper(s, x, y, faction) {
  faction = faction || 'blue';
  const f = FACTIONS[faction] || FACTIONS.blue;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  const spd = 1.5 * tm.speed;
  const hp  = 100 * tm.hp;
  const e = makeEnemyBase({
    type: 'chopper', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 55, radius: 20, scoreValue: 200 * tm.score,
    rotorAngle: 0, tailRotorAngle: 0,
    faction, isBoss: false, subType: 'plasma_trooper',
    weaponType: 'plasma_cannon',
    fireCooldown: 0, aiState: 'orbit',
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnFlakTrooper(s, x, y, faction) {
  faction = faction || 'yellow';
  const f = FACTIONS[faction] || FACTIONS.yellow;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  const spd = 2.0 * tm.speed + s.wantedLevel * 0.15;
  const hp  = 45 * tm.hp;
  const e = makeEnemyBase({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 8, radius: 14, scoreValue: 70 * tm.score,
    rotorAngle: Math.random() * Math.PI * 2,
    faction, isBoss: false, subType: 'flak_trooper',
    weaponType: 'flak_cannon',
    fireCooldown: 0, shieldBubbleTimer: 0,
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

export function spawnLaserSniper(s, x, y, faction) {
  faction = faction || 'purple';
  const f = FACTIONS[faction] || FACTIONS.purple;
  const tm = TIER_MULTS[f.tier] || TIER_MULTS[1];
  const spd = 1.8 * tm.speed;
  const hp  = 35 * tm.hp;
  const e = makeEnemyBase({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp, maxHp: hp, angle: 0,
    speed: spd, baseSpeed: spd,
    damage: 40, radius: 12, scoreValue: 120 * tm.score,
    rotorAngle: Math.random() * Math.PI * 2,
    faction, isBoss: false, subType: 'laser_sniper',
    weaponType: 'laser_rifle',
    fireCooldown: 0, shieldBubbleTimer: 0,
  });
  applyAiUpgrades(s, e);
  s.enemies.push(e);
}

/* ===== WAVE ROLES =====
 * Named roles replace the old roll-based composition.
 * Each role has a clear purpose and a defined escort pattern. ===== */

function rolePatrol(s, sx, sy, faction) {
  const count = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < count; i++)
    spawnDrone(s, sx + rand(-40, 40), sy + rand(-40, 40), faction, 'normal');
}

function roleStrikeForce(s, sx, sy, faction, threatLevel) {
  const lead = faction;
  const escort = escortFaction(faction);
  const count = 2 + Math.min(3, threatLevel);
  for (let i = 0; i < count; i++) {
    const sub = i === 0 && Math.random() < 0.3 ? 'scout' : 'normal';
    spawnDrone(s, sx + rand(-60, 60), sy + rand(-60, 60), i < 2 ? lead : escort, sub);
  }
  // Phase 2+: 15% chance to include a Stealth Infiltrator targeting a rig
  const t = s.time || 0;
  if (t >= 90 && Math.random() < 0.15) {
    spawnStealthInfiltrator(s, randInt(0, 3), faction);
    const infiltrator = s.enemies[s.enemies.length - 1];
    const rigs = s.rigs.filter(r => r.owner === 'player');
    if (rigs.length > 0) infiltrator.targetRig = rigs[Math.floor(Math.random() * rigs.length)];
  }
}

function roleSiegeWave(s, targetRig, faction, threatLevel) {
  if (!targetRig) return;
  const escort = escortFaction(faction);
  const spawnDist = Math.hypot(s.W || 900, s.H || 600) / 2 + 220;
  // Spawn 3-5 enemies from different quadrants, all targeting same rig
  const count = 3 + Math.min(2, threatLevel - 2);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const px = s.player.x + Math.cos(a) * spawnDist;
    const py = s.player.y + Math.sin(a) * spawnDist;
    const sx = clamp(px, 50, WORLD_W - 50);
    const sy = clamp(py, 50, WORLD_H - 50);
    const f = i < 2 ? faction : escort;
    if (i === 0) {
      spawnChopper(s, sx, sy, f, 'normal');
    } else {
      spawnDrone(s, sx + rand(-40, 40), sy + rand(-40, 40), f, 'normal');
    }
  }
  // Assign all freshly spawned to same rig
  const recent = s.enemies.slice(-count);
  for (const e of recent) e.targetRig = targetRig;
}

function roleInterceptorFlight(s, faction, threatLevel) {
  const escortF = escortFaction(faction);
  spawnPlane(s, randInt(0, 3), faction);
  spawnPlane(s, (randInt(0, 3) + 2) % 4, escortF); // from opposite edge
  if (threatLevel >= 3) spawnPlane(s, randInt(0, 3), faction);
}

function roleCommandSquad(s, sx, sy, faction) {
  const escortF = escortFaction(faction);
  spawnChopper(s, sx, sy, faction, 'command');
  const drones = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < drones; i++)
    spawnDrone(s, sx + rand(-70, 70), sy + rand(-70, 70), i % 2 === 0 ? faction : escortF, 'normal');
}

function roleResourceRaid(s, targetRig, faction) {
  if (!targetRig) return;
  const spawnDist = Math.hypot(s.W || 900, s.H || 600) / 2 + 220;
  const a = Math.random() * Math.PI * 2;
  const sx = clamp(s.player.x + Math.cos(a) * spawnDist, 50, WORLD_W - 50);
  const sy = clamp(s.player.y + Math.sin(a) * spawnDist, 50, WORLD_H - 50);
  spawnChopper(s, sx, sy, faction, 'normal');
  for (let i = 0; i < 2; i++)
    spawnDrone(s, sx + rand(-50, 50), sy + rand(-50, 50), faction, 'oil_thief');
  const recent = s.enemies.slice(-3);
  for (const e of recent) e.targetRig = targetRig;
}

function roleAssassination(s, sx, sy, faction) {
  const escortF = escortFaction(faction);
  spawnPlane(s, randInt(0, 3), faction);
  for (let i = 0; i < 2; i++)
    spawnDrone(s, sx + rand(-50, 50), sy + rand(-50, 50), escortF, 'kamikaze');
}

function roleFullAssault(s, sx, sy, faction, threatLevel) {
  const e1 = escortFaction(faction);
  const e2 = escortFaction(e1);
  spawnChopper(s, sx, sy, faction, Math.random() < 0.4 ? 'command' : 'normal');
  spawnPlane(s, randInt(0, 3), faction);
  // Phase 3+ (t ≥ 180s): replace second plane with Heavy Gunship anchor unit
  const t = s.time || 0;
  if (t >= 180) {
    spawnHeavyGunship(s, sx + rand(-60, 60), sy + rand(-60, 60), faction);
  } else {
    spawnPlane(s, randInt(0, 3), e1);
  }
  for (let i = 0; i < 2 + Math.min(3, threatLevel - 3); i++)
    spawnDrone(s, sx + rand(-80, 80), sy + rand(-80, 80), i % 2 === 0 ? e1 : e2, 'normal');
}

function roleArmedSquad(s, sx, sy, faction, threatLevel) {
  // Picks 1-3 armed enemy types based on threat level
  const picks = Math.min(3, 1 + Math.floor(threatLevel / 2));
  const spawnFns = [
    () => spawnChainGunner(s, sx + rand(-50, 50), sy + rand(-50, 50), faction),
    () => spawnFlakTrooper(s, sx + rand(-50, 50), sy + rand(-50, 50), faction),
    () => spawnPlasmaTrooper(s, sx + rand(-40, 40), sy + rand(-40, 40), faction),
    () => spawnLaserSniper(s, sx + rand(-60, 60), sy + rand(-60, 60), faction),
  ];
  // Shuffle and pick
  const shuffled = spawnFns.sort(() => Math.random() - 0.5);
  for (let i = 0; i < picks && i < shuffled.length; i++) {
    shuffled[i]();
  }
  // Add a normal drone escort
  spawnDrone(s, sx + rand(-40, 40), sy + rand(-40, 40), escortFaction(faction), 'normal');
}

/* ===== WAVE SPAWNING ===== */
export function spawnWave(s, dt) {
  // Surge timer always ticks
  if (s.surgeTimer > 0) s.surgeTimer -= dt;

  // Respite after commander/boss kill
  if (s.respiteTimer > 0) { s.respiteTimer -= dt; return; }

  s.waveTimer -= dt;
  if (s.waveTimer > 0) return;

  const t = s.timeSurvived;

  // ── Phase (time-based floor) ──────────────────────────────────────────────
  const timePhase = t < 30 ? 0 : t < 90 ? 1 : t < 180 ? 2 : t < 360 ? 3 : 4;

  // Enemy cap prevents screen saturation
  const ENEMY_CAPS = [9, 14, 20, 28, 40];
  if (s.enemies.length >= ENEMY_CAPS[timePhase]) { s.waveTimer = 1.5; return; }

  // Oil-based wanted level (heat for rich players)
  s.wantedLevel = 0;
  for (let i = WANTED_THRESHOLDS.length - 1; i >= 0; i--) {
    if (s.player.oil >= WANTED_THRESHOLDS[i]) { s.wantedLevel = i; break; }
  }
  const threatLevel = Math.min(4, timePhase + (s.wantedLevel > timePhase ? 1 : 0));

  // ── Surge (2-min mark, every 60-90s) ─────────────────────────────────────
  if (s.surgeTimer <= 0 && t > 120) {
    s.surgeActive = 3;
    s.surgeTimer = rand(60, 90);
    spawnFloatingText(s, s.player.x, s.player.y - 62, '⚡ SURGE!', '#ff6644', 17);
    addScreenFlash(s, '#1a0500', 0.14);
  }
  const isSurge = (s.surgeActive || 0) > 0;
  if (isSurge) s.surgeActive--;

  // ── Wave spacing ──────────────────────────────────────────────────────────
  const BASE_SPACING = [4, 2.8, 2.0, 1.5, 1.1];
  const sectorAssault = s.activeEvent?.type === 'sector_assault';
  const oilMod = s.wantedLevel > timePhase ? 0.82 : 1.0;
  s.waveTimer = isSurge     ? 0.55
    : sectorAssault         ? Math.max(0.4, BASE_SPACING[timePhase] * 0.45)
    : BASE_SPACING[timePhase] * oilMod;

  // ── Faction for this wave ─────────────────────────────────────────────────
  const faction = getFactionForPhase(timePhase);

  // ── Spawn anchor (off-screen, player-relative) ────────────────────────────
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist  = Math.hypot(s.W || 900, s.H || 600) / 2 + 220;
  const sx = clamp(s.player.x + Math.cos(spawnAngle) * spawnDist, 50, WORLD_W - 50);
  const sy = clamp(s.player.y + Math.sin(spawnAngle) * spawnDist, 50, WORLD_H - 50);

  // ── Pick a role appropriate for this phase ────────────────────────────────
  const playerRigs = s.rigs.filter(r => r.owner === 'player' && r.hp > 0);
  const richestRig = playerRigs.length > 0
    ? playerRigs.reduce((b, r) => (r.oilReserve || 0) > (b.oilReserve || 0) ? r : b, playerRigs[0])
    : null;

  // Role weights per phase. Keys map to weight values.
  const roleWeights = {
    patrol:         timePhase < 2 ? 80 : 10,
    strike:         timePhase >= 1 ? 35 : 5,
    interceptors:   timePhase >= 2 ? 25 : 0,
    siege:          timePhase >= 2 && richestRig ? 20 : 0,
    command_squad:  timePhase >= 3 ? 20 : 0,
    resource_raid:  timePhase >= 3 && richestRig ? 15 : 0,
    assassination:  timePhase >= 3 ? 12 : 0,
    full_assault:   timePhase >= 4 ? 18 : 0,
    armed_squad:    timePhase >= 2 ? 22 : 0,  // chain guns, plasma, flak, laser
  };

  // Surge overrides: only combat roles
  if (isSurge && timePhase >= 2) {
    roleWeights.patrol = 0;
    roleWeights.full_assault = Math.max(20, roleWeights.full_assault);
  }

  const totalW = Object.values(roleWeights).reduce((a, b) => a + b, 0);
  let rr = Math.random() * totalW;
  let role = 'patrol';
  for (const [k, w] of Object.entries(roleWeights)) {
    rr -= w; if (rr <= 0) { role = k; break; }
  }

  // ── Execute the role ───────────────────────────────────────────────────────
  switch (role) {
    case 'patrol':        rolePatrol(s, sx, sy, faction); break;
    case 'strike':        roleStrikeForce(s, sx, sy, faction, threatLevel); break;
    case 'interceptors':  roleInterceptorFlight(s, faction, threatLevel); break;
    case 'siege':         roleSiegeWave(s, richestRig, faction, threatLevel); break;
    case 'command_squad': roleCommandSquad(s, sx, sy, faction); break;
    case 'resource_raid': roleResourceRaid(s, richestRig, faction); break;
    case 'assassination': roleAssassination(s, sx, sy, faction); break;
    case 'full_assault':  roleFullAssault(s, sx, sy, faction, threatLevel); break;
    case 'armed_squad':   roleArmedSquad(s, sx, sy, faction, threatLevel); break;
    default:              rolePatrol(s, sx, sy, faction);
  }

  // Sector assault adds a second faction wave on top
  if (sectorAssault) {
    const f2 = getFactionForPhase(timePhase);
    roleStrikeForce(s, sx + rand(-80, 80), sy + rand(-80, 80), f2, threatLevel);
  }

  // EN1 — Flanking: large waves split to attack from a different angle
  if (timePhase >= 2 && s.enemies.length >= 5) {
    const recentlySpawned = s.enemies.slice(-4); // last spawned enemies
    const flankCount = Math.floor(recentlySpawned.length * 0.3);
    const mainAngle = spawnAngle;
    const flankOffset = (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.6); // 50-100° offset
    for (let fi = 0; fi < flankCount; fi++) {
      const fe = recentlySpawned[fi];
      if (fe) {
        fe.isFlank = true;
        fe.flankAngle = mainAngle + flankOffset;
        // Spawn flank enemies from the offset angle
        const fd = Math.hypot(s.W || 900, s.H || 600) / 2 + 220;
        fe.x = clamp(s.player.x + Math.cos(fe.flankAngle) * fd, 50, WORLD_W - 50);
        fe.y = clamp(s.player.y + Math.sin(fe.flankAngle) * fd, 50, WORLD_H - 50);
      }
    }
  }

  // ── Bomber (t ≥ 240s, player has rigs) ───────────────────────────────────
  if (t >= 240 && richestRig && Math.random() < 0.07) {
    spawnBomber(s, richestRig);
    spawnFloatingText(s, s.player.x, s.player.y - 55, '⚠ BOMBER INBOUND!', '#ff8800', 16);
    addScreenFlash(s, '#441100', 0.12);
  }

  // ── Boss (t ≥ 300s, high wanted level) ───────────────────────────────────
  if (t >= 300 && s.wantedLevel >= BOSS_THRESHOLD && Math.random() < 0.06) {
    spawnBoss(s, sx + 80, sy + 80);
    spawnFloatingText(s, s.player.x, s.player.y - 40, '⚠ BOSS INCOMING!', '#ff4444', 20);
    addShake(s, 6, true); addScreenFlash(s, '#440000', 0.2);
    triggerHiveAlert(s, sx, sy, 0.5);
  }

  // ── Named Elites (milestone enemies at specific time thresholds) ─────────
  if (!s.eliteSpawns) s.eliteSpawns = {};
  spawnNamedElite(s, t, sx, sy);
}

const NAMED_ELITES = [
  { key: 'leech',    minTime: 180, name: 'THE LEECH',    color: '#44ff88', icon: '🩸',
    desc: 'Drains your rigs dry',   reward: { oil: 200, bountyCard: true } },
  { key: 'ghost',    minTime: 360, name: 'THE GHOST',    color: '#44ccff', icon: '👻',
    desc: 'Invisible until firing', reward: { oil: 280, statPoint: true } },
  { key: 'fortress', minTime: 480, name: 'THE FORTRESS', color: '#aaaaff', icon: '🏰',
    desc: 'Armored command walker', reward: { oil: 350, freeStat: true } },
  { key: 'tyrant',   minTime: 600, name: 'THE TYRANT',   color: '#ff4444', icon: '👑',
    desc: 'Buffs all enemies on-screen', reward: { oil: 500, upgradeSkip: true } },
];

function spawnNamedElite(s, t, sx, sy) {
  for (const def of NAMED_ELITES) {
    if (s.eliteSpawns[def.key]) continue;
    if (t < def.minTime) continue;
    if (Math.random() > 0.004) continue; // ~0.4% chance per wave check after threshold
    s.eliteSpawns[def.key] = true;

    const e = spawnChopper(s, sx, sy, 'purple');
    e.isElite = true;
    e.eliteKey = def.key;
    e.eliteDef = def;
    e.hp = 500 + t * 0.5;
    e.maxHp = e.hp;
    e.speed = 1.8;
    e.baseSpeed = 1.8;
    e.scoreValue = 600 + Math.floor(t * 0.8);
    e.damage = 25;

    // Elite-specific behaviors
    if (def.key === 'leech') {
      e.subType = 'normal';
      e.isLeech = true;
    } else if (def.key === 'ghost') {
      e.isGhostElite = true;
      e.ghostVisible = false;
    } else if (def.key === 'fortress') {
      e.hp *= 3; e.maxHp = e.hp;
      e.subType = 'command';
    } else if (def.key === 'tyrant') {
      e.subType = 'command';
      e.isTyrant = true;
      e.hp *= 2; e.maxHp = e.hp;
    }

    spawnFloatingText(s, sx, sy - 50, def.icon + ' ' + def.name + ' APPROACHES!', def.color, 20);
    addShake(s, 8, true);
    addScreenFlash(s, '#220022', 0.25);
    triggerHiveAlert(s, sx, sy, 0.8);

    // Escort squad for named elites
    for (let ec = 0; ec < 3; ec++) {
      spawnDrone(s, sx + rand(-80, 80), sy + rand(-80, 80), 'purple', 'normal', false);
    }
    break; // only spawn one elite per wave check
  }
}

/* ===== HIVE MIND HELPERS ===== */

/** Spread alert to all same-faction enemies within radius of (ox, oy) */
function propagateAlert(s, ox, oy, faction) {
  for (const e of s.enemies) {
    if (e.faction !== faction) continue;
    if (dist({ x: ox, y: oy }, e) < HIVE_ALERT_RADIUS) {
      e.alerted = true;
    }
  }
}

/** Apply commander buffs to nearby allies */
function applyCommanderBuffs(s) {
  s.hiveMind.commanderAlive = false;
  // Reset buffs
  for (const e of s.enemies) {
    e.commanderBuffed = false;
    e.speed = e.baseSpeed; // will be overridden if buffed
  }
  for (const cmd of s.enemies) {
    if ((cmd.subType !== 'command' && !cmd.isBoss) || cmd.hp <= 0) continue;
    s.hiveMind.commanderAlive = true;
    for (const e of s.enemies) {
      if (e === cmd) continue;
      if (dist(e, cmd) < COMMANDER_BUFF_RADIUS && e.faction === cmd.faction) {
        e.commanderBuffed = true;
        e.speed = e.baseSpeed * 1.2;
      }
    }
  }
}

/** Shield drone effect: give nearby same-faction enemies a shield bubble */
function applyShieldDroneEffect(s) {
  // Reset
  for (const e of s.enemies) e.shieldBubble = false;
  for (const sd of s.enemies) {
    if (sd.subType !== 'shield' || sd.hp <= 0) continue;
    for (const e of s.enemies) {
      if (e === sd) continue;
      if (dist(e, sd) < 90 && e.faction === sd.faction) {
        e.shieldBubble = true;
      }
    }
  }
}

/* ===== MAIN ENEMY UPDATE ===== */
export function updateEnemies(s, dt, soundFn) {
  const player = s.player;
  const hm = s.hiveMind;

  // Decay hive alert
  hm.alertLevel = Math.max(0, hm.alertLevel - HIVE_ALERT_DECAY * dt);
  hm.alertTimer = Math.max(0, hm.alertTimer - dt);
  if (hm.alertTimer > 0) hm.alertLevel = Math.max(hm.alertLevel, 0.6);

  // Apply commander buffs and shield drone effects each frame
  applyCommanderBuffs(s);
  applyShieldDroneEffect(s);
  updateFactionRivalry(s, dt);

  // Blackout storm event: +30% enemy speed
  if (s.activeEvent?.type === 'blackout_storm') {
    for (const e of s.enemies) { e.speed = Math.max(e.speed, e.baseSpeed * 1.3); }
  }

  // Berserker chip: low-HP enemies enter rage (50% speed surge + visual)
  if (s.aiUpgrades?.includes('berserker_chip')) {
    for (const e of s.enemies) {
      if (e.hasBerserker && e.hp < e.maxHp * 0.30) {
        e.speed = Math.max(e.speed, e.baseSpeed * 1.55);
      }
    }
  }

  // Hive overclock: commander buff radius & strength increase
  if (s.aiUpgrades?.includes('hive_overclock')) {
    for (const cmd of s.enemies) {
      if ((cmd.subType !== 'command' && !cmd.isBoss) || cmd.hp <= 0) continue;
      for (const e of s.enemies) {
        if (e === cmd || !e.commanderBuffed) continue;
        // Already buffed by applyCommanderBuffs — apply extra multiplier
        e.speed = Math.min(e.speed * 1.25, e.baseSpeed * 2.2);
      }
    }
  }

  // Named elite special behaviors
  for (const e of s.enemies) {
    if (!e.isElite) continue;
    // The Leech: drains player rigs heavily
    if (e.isLeech) {
      for (const rig of s.rigs) {
        if (rig.owner === 'player' && dist(e, rig) < 80) {
          rig.hp -= 15 * dt;
          player.oil = Math.max(0, player.oil - 2 * dt);
          if (Math.random() < dt * 3) {
            spawnFloatingText(s, rig.x, rig.y - 25, '-OIL DRAINED!', '#44ff88', 11);
          }
        }
      }
    }
    // The Ghost: invisible when not firing (handled in rendering via e.isGhostElite + e.ghostVisible)
    if (e.isGhostElite) {
      e.ghostVisible = (e.stunTimer > 0) ||
        (s.enemies.some(b => b.fromElite === e && dist(b, player) < 200));
    }
    // The Tyrant: continuously buffs ALL on-screen enemies (beyond normal commander radius)
    if (e.isTyrant) {
      const cam = s.camera;
      for (const ally of s.enemies) {
        if (ally === e) continue;
        const sx2 = ally.x - cam.x, sy2 = ally.y - cam.y;
        if (sx2 >= -200 && sx2 <= s.W + 200 && sy2 >= -200 && sy2 <= s.H + 200) {
          ally.speed = ally.baseSpeed * 1.5;
        }
      }
    }
  }

  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];

    // Panic after commander death: wander randomly
    if (e.panicTimer > 0) {
      e.panicTimer -= dt;
      e.vx = lerp(e.vx, Math.cos(e.retreatAngle) * e.baseSpeed * 0.6, 0.05);
      e.vy = lerp(e.vy, Math.sin(e.retreatAngle) * e.baseSpeed * 0.6, 0.05);
      e.x = clamp(e.x + e.vx, 10, WORLD_W - 10);
      e.y = clamp(e.y + e.vy, 10, WORLD_H - 10);
      if (e.type === 'drone') e.rotorAngle += dt * 20;
      if (e.type === 'chopper') { e.rotorAngle += dt * 22; e.tailRotorAngle += dt * 35; }
      continue;
    }

    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      // Unfreeze: restore speed when stun expires
      if (e.stunTimer <= 0 && e.frosted) {
        e.frosted = false;
        e.speed = e.baseSpeed || e.speed;
      }
      if (e.type === 'drone') e.rotorAngle += dt * 10;
      continue;
    }
    // Frost: ensure speed is slowed while frosted
    if (e.frosted && (e.stunTimer || 0) <= 0) {
      e.frosted = false;
      e.speed = e.baseSpeed || e.speed;
    }

    // Poison tick damage
    if ((e.poisonTimer || 0) > 0) {
      e.poisonTimer -= dt;
      const poisonDps = e.poisonDps || 3;
      e.hp -= poisonDps * dt;
      if (e.poisonTimer <= 0) { e.poisonTimer = 0; e.poisonDps = 0; }
    }

    const f = FACTIONS[e.faction] || FACTIONS.red;
    // Choose movement target: rig if assigned, else player or last known hive pos
    const hasRigTarget = e.targetRig && e.targetRig.owner !== 'neutral' && dist(e, e.targetRig) > 30;
    let chaseTarget;
    if (hasRigTarget) {
      chaseTarget = e.targetRig;
    } else if (hm.alertLevel > 0.4 && e.alerted) {
      // Move to last known player position when alerted
      chaseTarget = { x: hm.knownPlayerX, y: hm.knownPlayerY };
    } else {
      chaseTarget = player;
    }

    // Oil-thief drones specifically hunt player rigs
    if (e.subType === 'oil_thief' && !e.targetRig) {
      const playerRigs = s.rigs.filter(r => r.owner === 'player');
      if (playerRigs.length > 0) {
        e.targetRig = playerRigs.reduce((best, r) => dist(e, r) < dist(e, best) ? r : best, playerRigs[0]);
        chaseTarget = e.targetRig;
      }
    }

    // Stealth infiltrators exclusively target rigs; ignore the player
    if (e.subType === 'stealth_infiltrator') {
      if (!e.targetRig || e.targetRig.owner !== 'player') {
        const playerRigs = s.rigs.filter(r => r.owner === 'player');
        if (playerRigs.length > 0) {
          e.targetRig = playerRigs.reduce((best, r) => dist(e, r) < dist(e, best) ? r : best, playerRigs[0]);
        } else {
          e.targetRig = null;
        }
      }
      if (e.targetRig) chaseTarget = e.targetRig;
    }

    /* ===== DRONE LOGIC ===== */
    if (e.type === 'drone') {
      e.rotorAngle += dt * 30;
      const dToTarget = dist(e, chaseTarget);

      // Kamikaze: rush when close enough
      if (e.subType === 'kamikaze') {
        const dToPlayer = dist(e, player);
        if (dToPlayer < KAMIKAZE_RUSH_RANGE || e.alerted) {
          const a = angle(e, player);
          const rushSpeed = e.baseSpeed * 2.5;
          e.vx = lerp(e.vx, Math.cos(a) * rushSpeed, 0.15);
          e.vy = lerp(e.vy, Math.sin(a) * rushSpeed, 0.15);
        } else {
          const a = angle(e, chaseTarget);
          e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.08);
          e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.08);
        }
      }
      // Scout: fast, moves toward player, triggers wide hive alert on sight
      else if (e.subType === 'scout') {
        const dToPlayer = dist(e, player);
        if (dToPlayer < 600 && !e.alerted) {
          // Scout sees player — full hive alert
          triggerHiveAlert(s, e.x, e.y, 0.95);
          propagateAlert(s, e.x, e.y, e.faction);
          e.alerted = true;
          spawnFloatingText(s, e.x, e.y - 20, 'SCOUT!', '#ffcc00', 12);
        }
        const a = angle(e, player);
        e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.12);
        e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.12);
      }
      // Shield drone: stay behind main group, near allies
      else if (e.subType === 'shield') {
        const a = angle(e, player);
        const preferredDist = 160;
        if (dToTarget > preferredDist + 40) {
          e.vx = lerp(e.vx, Math.cos(a) * e.speed * 0.8, 0.05);
          e.vy = lerp(e.vy, Math.sin(a) * e.speed * 0.8, 0.05);
        } else if (dToTarget < preferredDist - 30) {
          e.vx = lerp(e.vx, -Math.cos(a) * e.speed * 0.6, 0.05);
          e.vy = lerp(e.vy, -Math.sin(a) * e.speed * 0.6, 0.05);
        } else {
          // Orbit
          const side = e.orbitDir * Math.PI / 2;
          e.vx = lerp(e.vx, Math.cos(a + side) * e.speed * 0.6, 0.04);
          e.vy = lerp(e.vy, Math.sin(a + side) * e.speed * 0.6, 0.04);
        }
      }
      // Normal / oil_thief drone — faction AI
      else {
        if (f.style === 'tactical') {
          // Blue: strafe left/right
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.aiState = e.aiState === 'strafe_left' ? 'strafe_right' : 'strafe_left';
            e.aiTimer = rand(1, 3);
          }
          const a = angle(e, chaseTarget);
          const strafeDir = e.aiState === 'strafe_left' ? Math.PI / 2 : -Math.PI / 2;
          if (dToTarget > 80) {
            e.vx = lerp(e.vx, Math.cos(a) * e.speed * 0.7 + Math.cos(a + strafeDir) * e.speed * 0.5, 0.06);
            e.vy = lerp(e.vy, Math.sin(a) * e.speed * 0.7 + Math.sin(a + strafeDir) * e.speed * 0.5, 0.06);
          } else {
            e.vx = lerp(e.vx, Math.cos(a + strafeDir) * e.speed, 0.06);
            e.vy = lerp(e.vy, Math.sin(a + strafeDir) * e.speed, 0.06);
          }
        } else if (f.style === 'fast') {
          // Yellow: rush and retreat
          e.aiTimer -= dt;
          if (dToTarget < 60 && e.aiState === 'chase') {
            e.aiState = 'retreat'; e.aiTimer = 1.5;
            e.retreatAngle = angle(chaseTarget, e) + rand(-0.5, 0.5);
          }
          if (e.aiTimer <= 0 && e.aiState === 'retreat') { e.aiState = 'chase'; e.aiTimer = 2; }
          if (e.aiState === 'retreat') {
            e.vx = lerp(e.vx, Math.cos(e.retreatAngle) * e.speed * 1.3, 0.1);
            e.vy = lerp(e.vy, Math.sin(e.retreatAngle) * e.speed * 1.3, 0.1);
          } else {
            const a = angle(e, chaseTarget);
            e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.1);
            e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.1);
          }
        } else if (f.style === 'tanky') {
          const a = angle(e, chaseTarget);
          e.vx = lerp(e.vx, Math.cos(a) * e.speed * 0.7, 0.04);
          e.vy = lerp(e.vy, Math.sin(a) * e.speed * 0.7, 0.04);
        } else {
          // Red/aggressive: straight charge. When high alert, pincer
          const a = angle(e, chaseTarget);
          let spd = e.speed;
          // Hive swarm behavior when fully alerted: add slight sideways drift
          if (hm.alertLevel > 0.7) {
            const drift = (e.orbitDir || 1) * Math.PI * 0.15;
            e.vx = lerp(e.vx, Math.cos(a + drift) * spd, 0.08);
            e.vy = lerp(e.vy, Math.sin(a + drift) * spd, 0.08);
          } else {
            e.vx = lerp(e.vx, Math.cos(a) * spd, 0.08);
            e.vy = lerp(e.vy, Math.sin(a) * spd, 0.08);
          }
        }
      }

      e.x += e.vx; e.y += e.vy;
      e.x = clamp(e.x, 10, WORLD_W - 10);
      e.y = clamp(e.y, 10, WORLD_H - 10);
      e.angle = Math.atan2(e.vy, e.vx);

      // Armed drone shooting (chain_gun, flak_cannon, laser_rifle)
      if (e.weaponType && e.fireCooldown !== undefined) {
        e.fireCooldown -= dt;
        const dToPlayer = dist(e, player);
        const fac = FACTIONS[e.faction] || FACTIONS.red;
        if (e.fireCooldown <= 0 && dToPlayer < 500) {
          const pa = angle(e, player);
          if (e.weaponType === 'chain_gun') {
            // Rapid 3-round burst, low damage
            for (let cg = 0; cg < 3; cg++) {
              const ca = pa + rand(-0.08, 0.08);
              s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ca)*9, vy: Math.sin(ca)*9, life: 1.4, damage: e.damage, color: fac.accent });
            }
            e.fireCooldown = 0.18 + rand(-0.02, 0.02);
          } else if (e.weaponType === 'flak_cannon' && dToPlayer < 300) {
            // Wide spread pellets at close range
            const pellets = 6;
            for (let fl = 0; fl < pellets; fl++) {
              const fa = pa + (fl - (pellets-1)/2) * 0.22 + rand(-0.04, 0.04);
              s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(fa)*5.5, vy: Math.sin(fa)*5.5, life: 0.6, damage: e.damage, color: fac.accent });
            }
            e.fireCooldown = 1.4 + rand(-0.1, 0.1);
          } else if (e.weaponType === 'laser_rifle') {
            // Fast accurate long-range shot
            s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa)*14, vy: Math.sin(pa)*14, life: 2.8, damage: e.damage, color: '#00ffcc' });
            e.fireCooldown = 2.2 + rand(-0.2, 0.2);
          }
        }
      }

      // Kamikaze collision handled in combatLogic
    }

    /* ===== PLANE LOGIC ===== */
    if (e.type === 'plane') {
      e.propAngle = (e.propAngle || 0) + dt * 40;
      // All tactical planes steer toward target
      const desired = angle(e, chaseTarget);
      let diff = desired - e.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turnRate = f.style === 'tactical' ? 0.025 : (f.style === 'fast' ? 0.015 : 0.018);
      e.angle += clamp(diff, -turnRate, turnRate);
      // When alerted and high alert, more aggressive steering
      if (hm.alertLevel > 0.6 && e.alerted) {
        e.angle += clamp(diff, -0.04, 0.04);
      }
      e.x += Math.cos(e.angle) * e.speed;
      e.y += Math.sin(e.angle) * e.speed;
      if (Math.random() < 0.3) spawnEngineTrail(s, e.x - Math.cos(e.angle) * 12, e.y - Math.sin(e.angle) * 12, e.angle);
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist(e, player) < 550) {
        const a = angle(e, player);
        const bspd = f.style === 'fast' ? 8 : 6;
        s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * bspd, vy: Math.sin(a) * bspd, life: 2, damage: e.damage, color: f.accent });
        e.fireCooldown = f.style === 'fast' ? 0.5 : (hm.alertLevel > 0.7 ? 0.55 : 0.8);
      }
      // Remove planes that fly off map
      if (e.x < -150 || e.x > WORLD_W + 150 || e.y < -150 || e.y > WORLD_H + 150) {
        s.enemies.splice(i, 1); continue;
      }
    }

    /* ===== BOMBER LOGIC ===== */
    if (e.type === 'bomber') {
      e.propAngle = (e.propAngle || 0) + dt * 30;
      if (!e.bombDropped && e.targetRig) {
        const a = angle(e, e.targetRig);
        e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.04);
        e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.04);
        e.angle = a;
        e.x += e.vx;
        e.y += e.vy;
        if (dist(e, e.targetRig) < 80) {
          // Mark for detonation — combatLogic handles player damage
          e.bombDropped = true;
          spawnExplosion(s, e.x, e.y, '#ff8800', 45);
          addShake(s, 12, true);
          addScreenFlash(s, '#ff4400', 0.4);
          e.targetRig.hp = Math.max(0, e.targetRig.hp - 80);
          if (e.targetRig.hp <= 0) { e.targetRig.owner = 'neutral'; }
          spawnFloatingText(s, e.targetRig.x, e.targetRig.y - 30, '💣 BOMBED!', '#ff4400', 18);
          // Damage same-faction enemies in blast
          for (const other of s.enemies) {
            if (other === e) continue;
            if (dist(other, e) < BOMBER_BOMB_RADIUS * 0.6) other.hp -= 25;
          }
        }
      } else {
        // Fly through/away after bomb
        e.x += Math.cos(e.angle) * e.speed * 1.5;
        e.y += Math.sin(e.angle) * e.speed * 1.5;
        // Remove when far off-map
        if (e.x < -300 || e.x > WORLD_W + 300 || e.y < -300 || e.y > WORLD_H + 300) {
          e.hp = 0;
        }
      }
      continue; // skip standard AI below
    }

    /* ===== CHOPPER LOGIC ===== */
    if (e.type === 'chopper') {
      const d = dist(e, chaseTarget);
      const a = angle(e, chaseTarget);
      e.rotorAngle += dt * 22;
      e.tailRotorAngle += dt * 35;

      // Command chopper: orbits at wider range, issues movement directives
      if (e.subType === 'command') {
        const cmdOrbit = a + e.orbitDir * Math.PI / 2;
        if (d > 350) {
          e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.04);
          e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.04);
        } else if (d < 200) {
          e.vx = lerp(e.vx, -Math.cos(a) * e.speed, 0.04);
          e.vy = lerp(e.vy, -Math.sin(a) * e.speed, 0.04);
        } else {
          e.vx = lerp(e.vx, Math.cos(cmdOrbit) * e.speed, 0.04);
          e.vy = lerp(e.vy, Math.sin(cmdOrbit) * e.speed, 0.04);
        }
      } else if (f.style === 'tactical') {
        const orbitAngle = a + e.orbitDir * Math.PI / 2;
        if (d > 250) { e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.04); e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.04); }
        else if (d < 150) { e.vx = lerp(e.vx, -Math.cos(a) * e.speed, 0.04); e.vy = lerp(e.vy, -Math.sin(a) * e.speed, 0.04); }
        else { e.vx = lerp(e.vx, Math.cos(orbitAngle) * e.speed, 0.04); e.vy = lerp(e.vy, Math.sin(orbitAngle) * e.speed, 0.04); }
      } else {
        if (d > 200) { e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.05); e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.05); }
        else if (d < 120) { e.vx = lerp(e.vx, -Math.cos(a) * e.speed, 0.05); e.vy = lerp(e.vy, -Math.sin(a) * e.speed, 0.05); }
        else { e.vx = lerp(e.vx, Math.cos(a + Math.PI / 2) * e.speed * 0.5, 0.05); e.vy = lerp(e.vy, Math.sin(a + Math.PI / 2) * e.speed * 0.5, 0.05); }
      }

      e.x = clamp(e.x + e.vx, 20, WORLD_W - 20);
      e.y = clamp(e.y + e.vy, 20, WORLD_H - 20);
      e.angle = a;

      e.fireCooldown -= dt;
      const fireRange = e.isBoss ? 500 : 400;
      const fireRate = e.isBoss ? 0.5 : Math.max(0.6, 1.2 - s.wantedLevel * 0.1 - (hm.alertLevel > 0.6 ? 0.25 : 0));
      if (e.fireCooldown <= 0 && dist(e, player) < fireRange) {
        const pa = angle(e, player);
        if (e.weaponType === 'plasma_cannon') {
          // Slow heavy plasma ball
          s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa)*3, vy: Math.sin(pa)*3, life: 4.5, damage: e.damage, color: '#cc44ff', isPlasma: true });
          e.fireCooldown = 3.0 + rand(-0.3, 0.3);
        } else {
          s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa) * 5, vy: Math.sin(pa) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
          if (e.isBoss || e.subType === 'command') {
            s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa + 0.18) * 5, vy: Math.sin(pa + 0.18) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
            s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa - 0.18) * 5, vy: Math.sin(pa - 0.18) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
          }
          e.fireCooldown = fireRate;
        }
      }
    }
  }
}

/* ===== FACTION RIVALRY ===== */
function updateFactionRivalry(s, dt) {
  s.rivalryTimer -= dt;
  if (s.rivalryTimer > 0) return;
  s.rivalryTimer = RIVALRY_CHECK_INTERVAL;

  const dmg = RIVALRY_DAMAGE_RATE * RIVALRY_CHECK_INTERVAL;
  for (let i = 0; i < s.enemies.length; i++) {
    const a = s.enemies[i];
    for (let j = i + 1; j < s.enemies.length; j++) {
      const b = s.enemies[j];
      if (a.faction === b.faction) continue;
      if (dist(a, b) > RIVALRY_RANGE) continue;
      // Only fight near contested or enemy rigs (not neutral open water)
      const nearContested = s.rigs.some(r => r.owner !== 'player' && dist(a, r) < 180);
      if (!nearContested) continue;
      a.hp -= dmg;
      b.hp -= dmg;
      if (Math.random() < 0.06) {
        spawnFloatingText(s, (a.x + b.x) / 2, (a.y + b.y) / 2 - 12, 'FACTION WAR!', '#ff8844', 9);
      }
    }
  }
}

/* ===== RIG RECAPTURE ===== */
export function updateRigRecapture(s, dt) {
  s.rigRecaptureTimer -= dt;
  if (s.rigRecaptureTimer > 0) return;
  s.rigRecaptureTimer = Math.max(12, RIG_RECAPTURE_INTERVAL - s.wantedLevel * 3);

  const playerRigs = s.rigs.filter(r => r.owner === 'player' && r.hp > 0);
  if (playerRigs.length === 0) return;

  const target = pickRandom(playerRigs);
  target.underAttack = true;
  target.attackWarning = 3.0;
  spawnFloatingText(s, s.player.x, s.player.y - 50, '⚠ RIG UNDER ATTACK!', '#ff4444', 16);
  addShake(s, 3, true);
  addScreenFlash(s, '#440000', 0.1);
  triggerHiveAlert(s, target.x, target.y, 0.4);

  const faction = getRandomFaction();
  const count = 3 + s.wantedLevel;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(200, 380);
    const ex = clamp(target.x + Math.cos(a) * d, 50, WORLD_W - 50);
    const ey = clamp(target.y + Math.sin(a) * d, 50, WORLD_H - 50);
    if (i < count - 1) {
      spawnDrone(s, ex, ey, faction);
      const ne = s.enemies[s.enemies.length - 1];
      ne.targetRig = target;
      ne.alerted = true;
    } else {
      const subT = (s.wantedLevel >= 2 && Math.random() < 0.4) ? 'command' : 'normal';
      spawnChopper(s, ex, ey, faction, subT);
      const ne = s.enemies[s.enemies.length - 1];
      ne.targetRig = target;
      ne.alerted = true;
    }
  }
}

/**
 * Called by combatLogic when an enemy takes bullet/missile damage.
 * Propagates hive alert to nearby same-faction enemies.
 */
export function onEnemyHit(s, enemy) {
  enemy.alerted = true;
  s.hiveMind.knownPlayerX = s.player.x;
  s.hiveMind.knownPlayerY = s.player.y;
  s.hiveMind.alertLevel = Math.min(1, s.hiveMind.alertLevel + 0.18);
  propagateAlert(s, enemy.x, enemy.y, enemy.faction);
}

/**
 * Called by combatLogic when a commander/boss dies.
 * Causes nearby enemies to panic temporarily.
 */
export function onCommanderKilled(s, enemy) {
  for (const e of s.enemies) {
    if (e.faction === enemy.faction && dist(e, enemy) < COMMANDER_BUFF_RADIUS * 1.5) {
      e.panicTimer = 3.0;
      e.retreatAngle = Math.random() * Math.PI * 2;
    }
  }
  spawnFloatingText(s, enemy.x, enemy.y - 30, 'COMMANDER DOWN!', '#ffcc00', 18);
  addShake(s, 5, true);
}
