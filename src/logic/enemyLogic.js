import {
  WORLD_W, WORLD_H, WANTED_THRESHOLDS, ENEMY_SPAWN_DISTANCE,
  DRONE_DAMAGE, PLANE_DAMAGE, CHOPPER_DAMAGE, BOSS_THRESHOLD,
  RIG_RECAPTURE_INTERVAL, CAPTURE_RADIUS, CAPTURE_TIME,
} from '../constants.js';
import { clamp, rand, randInt, dist, angle, lerp, pickRandom } from '../utils.js';
import { FACTIONS, FACTION_KEYS } from '../config.js';
import {
  spawnExplosion, spawnEngineTrail, spawnFloatingText, addShake,
} from '../state/GameState.js';

export function getRandomFaction() {
  const weights = { red: 35, blue: 25, yellow: 25, purple: 15 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) { r -= w; if (r <= 0) return k; }
  return 'red';
}

export function spawnDrone(s, x, y, faction) {
  faction = faction || getRandomFaction();
  const isTanky = faction === 'purple';
  const isFast = faction === 'yellow';
  s.enemies.push({
    type: 'drone', x, y, vx: 0, vy: 0,
    hp: isTanky ? 60 : 30, maxHp: isTanky ? 60 : 30,
    angle: 0,
    speed: (isFast ? 3.8 : 2.5) + s.wantedLevel * 0.3,
    damage: DRONE_DAMAGE + (isTanky ? 10 : 0),
    radius: isTanky ? 18 : 14, scoreValue: isTanky ? 80 : 50,
    rotorAngle: Math.random() * Math.PI * 2, stunTimer: 0,
    faction, isBoss: false,
    aiState: 'chase', aiTimer: 0,
    retreatAngle: 0,
  });
}

export function spawnPlane(s, edge, faction) {
  faction = faction || getRandomFaction();
  const isFast = faction === 'yellow';
  let x, y, ang;
  switch (edge) {
    case 0: x = rand(0, WORLD_W); y = -40; ang = Math.PI / 2 + rand(-0.3, 0.3); break;
    case 1: x = WORLD_W + 40; y = rand(0, WORLD_H); ang = Math.PI + rand(-0.3, 0.3); break;
    case 2: x = rand(0, WORLD_W); y = WORLD_H + 40; ang = -Math.PI / 2 + rand(-0.3, 0.3); break;
    default: x = -40; y = rand(0, WORLD_H); ang = rand(-0.3, 0.3); break;
  }
  s.enemies.push({
    type: 'plane', x, y, vx: 0, vy: 0,
    hp: 50, maxHp: 50, angle: ang,
    speed: (isFast ? 7 : 5) + s.wantedLevel * 0.4,
    damage: PLANE_DAMAGE,
    radius: 18, scoreValue: 100,
    fireCooldown: 0, propAngle: 0, stunTimer: 0,
    faction, isBoss: false,
    aiState: 'flyby', aiTimer: 0,
  });
}

export function spawnChopper(s, x, y, faction) {
  faction = faction || getRandomFaction();
  const isTanky = faction === 'purple';
  s.enemies.push({
    type: 'chopper', x, y, vx: 0, vy: 0,
    hp: isTanky ? 140 : 80, maxHp: isTanky ? 140 : 80,
    angle: 0,
    speed: 2 + s.wantedLevel * 0.2,
    damage: CHOPPER_DAMAGE + (isTanky ? 10 : 0),
    radius: 18, scoreValue: 150,
    fireCooldown: 0, rotorAngle: 0, tailRotorAngle: 0, stunTimer: 0,
    faction, isBoss: false,
    aiState: 'orbit', aiTimer: 0,
    orbitDir: Math.random() < 0.5 ? 1 : -1,
  });
}

export function spawnBoss(s, x, y) {
  const faction = pickRandom(FACTION_KEYS);
  s.enemies.push({
    type: 'chopper', x, y, vx: 0, vy: 0,
    hp: 400 + s.wantedLevel * 100, maxHp: 400 + s.wantedLevel * 100,
    angle: 0, speed: 1.8,
    damage: 40, radius: 28, scoreValue: 500,
    fireCooldown: 0, rotorAngle: 0, tailRotorAngle: 0, stunTimer: 0,
    faction, isBoss: true,
    aiState: 'orbit', aiTimer: 0,
    orbitDir: Math.random() < 0.5 ? 1 : -1,
  });
}

export function spawnWave(s, dt) {
  s.waveTimer -= dt;
  if (s.waveTimer > 0) return;
  s.wantedLevel = 0;
  for (let i = WANTED_THRESHOLDS.length - 1; i >= 0; i--) {
    if (s.player.oil >= WANTED_THRESHOLDS[i]) { s.wantedLevel = i; break; }
  }
  s.waveTimer = Math.max(0.8, 3.2 - s.wantedLevel * 0.5);
  const spawnAngle = Math.random() * Math.PI * 2;
  const sx = clamp(s.player.x + Math.cos(spawnAngle) * ENEMY_SPAWN_DISTANCE, 50, WORLD_W - 50);
  const sy = clamp(s.player.y + Math.sin(spawnAngle) * ENEMY_SPAWN_DISTANCE, 50, WORLD_H - 50);
  const roll = Math.random();
  const faction = getRandomFaction();
  if (roll < 0.4) {
    const count = 2 + s.wantedLevel + (faction === 'yellow' ? 2 : 0);
    for (let i = 0; i < count; i++) spawnDrone(s, sx + rand(-40, 40), sy + rand(-40, 40), faction);
  } else if (roll < 0.7) {
    spawnPlane(s, randInt(0, 3), faction);
    if (s.wantedLevel >= 2) spawnPlane(s, randInt(0, 3), faction);
  } else {
    spawnChopper(s, sx, sy, faction);
  }
  if (s.wantedLevel >= BOSS_THRESHOLD && Math.random() < 0.08) {
    spawnBoss(s, sx + 80, sy + 80);
    spawnFloatingText(s, s.player.x, s.player.y - 40, '⚠ BOSS INCOMING!', '#ff4444', 20);
    addShake(s, 6, true);
  }
  if (s.wantedLevel >= 3) spawnChopper(s, sx + 60, sy + 60, faction);
  if (s.wantedLevel >= 4) { spawnPlane(s, randInt(0, 3), faction); spawnPlane(s, randInt(0, 3), faction); }
}

export function updateEnemies(s, dt, soundFn) {
  const player = s.player;

  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.stunTimer > 0) { e.stunTimer -= dt; if (e.type === 'drone') e.rotorAngle += dt * 10; continue; }

    const f = FACTIONS[e.faction] || FACTIONS.red;
    const hasTarget = e.targetRig && e.targetRig.owner === 'player' && e.targetRig.hp > 0;
    const chaseTarget = hasTarget ? e.targetRig : player;

    if (e.type === 'drone') {
      e.rotorAngle += dt * 30;
      const dToTarget = dist(e, chaseTarget);
      if (f.style === 'tactical') {
        e.aiTimer -= dt;
        if (e.aiTimer <= 0) { e.aiState = e.aiState === 'strafe_left' ? 'strafe_right' : 'strafe_left'; e.aiTimer = rand(1, 3); }
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
        e.aiTimer -= dt;
        if (dToTarget < 60 && e.aiState === 'chase') { e.aiState = 'retreat'; e.aiTimer = 1.5; e.retreatAngle = angle(chaseTarget, e) + rand(-0.5, 0.5); }
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
        const a = angle(e, chaseTarget);
        e.vx = lerp(e.vx, Math.cos(a) * e.speed, 0.08);
        e.vy = lerp(e.vy, Math.sin(a) * e.speed, 0.08);
      }
      e.x += e.vx; e.y += e.vy;
      e.x = clamp(e.x, 10, WORLD_W - 10);
      e.y = clamp(e.y, 10, WORLD_H - 10);
      e.angle = Math.atan2(e.vy, e.vx);
    }

    if (e.type === 'plane') {
      e.propAngle = (e.propAngle || 0) + dt * 40;
      if (f.style === 'tactical') {
        const desired = angle(e, chaseTarget);
        let diff = desired - e.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        e.angle += clamp(diff, -0.02, 0.02);
      }
      e.x += Math.cos(e.angle) * e.speed;
      e.y += Math.sin(e.angle) * e.speed;
      if (Math.random() < 0.3) spawnEngineTrail(s, e.x - Math.cos(e.angle) * 12, e.y - Math.sin(e.angle) * 12, e.angle);
      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist(e, player) < 500) {
        const a = angle(e, player);
        const bspd = f.style === 'fast' ? 8 : 6;
        s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * bspd, vy: Math.sin(a) * bspd, life: 2, damage: e.damage, color: f.accent });
        e.fireCooldown = f.style === 'fast' ? 0.5 : 0.8;
      }
      if (e.x < -100 || e.x > WORLD_W + 100 || e.y < -100 || e.y > WORLD_H + 100) { s.enemies.splice(i, 1); continue; }
    }

    if (e.type === 'chopper') {
      const d = dist(e, chaseTarget); const a = angle(e, chaseTarget);
      e.rotorAngle += dt * 22; e.tailRotorAngle += dt * 35;
      if (f.style === 'tactical') {
        const orbitAngle = a + (e.orbitDir || 1) * Math.PI / 2;
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
      const fireRate = e.isBoss ? 0.5 : (1.2 - s.wantedLevel * 0.1);
      if (e.fireCooldown <= 0 && dist(e, player) < fireRange) {
        const pa = angle(e, player);
        s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa) * 5, vy: Math.sin(pa) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
        if (e.isBoss) {
          s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa + 0.15) * 5, vy: Math.sin(pa + 0.15) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
          s.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(pa - 0.15) * 5, vy: Math.sin(pa - 0.15) * 5, life: 2.5, damage: e.damage, color: FACTIONS[e.faction].accent });
        }
        e.fireCooldown = fireRate;
      }
    }
  }
}

export function updateRigRecapture(s, dt) {
  s.rigRecaptureTimer -= dt;
  if (s.rigRecaptureTimer > 0) return;
  s.rigRecaptureTimer = RIG_RECAPTURE_INTERVAL - s.wantedLevel * 3;
  const playerRigs = s.rigs.filter(r => r.owner === 'player' && r.hp > 0);
  if (playerRigs.length === 0) return;
  const target = pickRandom(playerRigs);
  target.underAttack = true;
  target.attackWarning = 3.0;
  spawnFloatingText(s, s.player.x, s.player.y - 50, '⚠ RIG UNDER ATTACK!', '#ff4444', 16);
  const faction = getRandomFaction();
  const count = 3 + s.wantedLevel;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(200, 350);
    const ex = clamp(target.x + Math.cos(a) * d, 50, WORLD_W - 50);
    const ey = clamp(target.y + Math.sin(a) * d, 50, WORLD_H - 50);
    if (i < count - 1) {
      spawnDrone(s, ex, ey, faction);
      s.enemies[s.enemies.length - 1].targetRig = target;
    } else {
      spawnChopper(s, ex, ey, faction);
      s.enemies[s.enemies.length - 1].targetRig = target;
    }
  }
}
