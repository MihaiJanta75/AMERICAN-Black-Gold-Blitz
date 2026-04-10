import {
  WORLD_W, WORLD_H, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  DUAL_CANNON_THRESHOLD, HOMING_THRESHOLD, HOMING_COOLDOWN_MS, HOMING_SPEED,
} from '../constants.js';
import { clamp, lerp, rand, dist, angle } from '../utils.js';
import {
  getMoveSpeed, getMaxOil, getHealthRegen, getBulletSpeed, getBulletDamage,
  getBulletPenetration, getReloadTime, hasPowerup,
  spawnParticle, spawnMuzzleFlash, spawnEngineTrail,
} from '../state/GameState.js';

export function updatePlayer(s, dt, soundFn) {
  const p = s.player;
  const inp = s.input;
  const W = s.W;
  const H = s.H;

  // Movement input
  let ix = 0, iy = 0;
  if (inp.keys['KeyW'] || inp.keys['ArrowUp']) iy -= 1;
  if (inp.keys['KeyS'] || inp.keys['ArrowDown']) iy += 1;
  if (inp.keys['KeyA'] || inp.keys['ArrowLeft']) ix -= 1;
  if (inp.keys['KeyD'] || inp.keys['ArrowRight']) ix += 1;
  if (inp.touchMove.active) { ix = inp.touchMove.x; iy = inp.touchMove.y; }
  const inputLen = Math.hypot(ix, iy);
  if (inputLen > 0.01) { ix /= inputLen; iy /= inputLen; }

  // Dash
  p.dashCooldown -= dt;
  if (p.dashing > 0) {
    p.dashing -= dt;
    p.vx = Math.cos(p.dashAngle) * DASH_SPEED;
    p.vy = Math.sin(p.dashAngle) * DASH_SPEED;
    p.invincible = Math.max(p.invincible, 0.05);
    for (let i = 0; i < 2; i++) {
      spawnParticle(s, p.x + rand(-5, 5), p.y + rand(-5, 5), rand(-1, 1), rand(-1, 1), rand(0.1, 0.3), rand(2, 5), '#44ccff', 'fire');
    }
  } else {
    const speed = Math.max(1, getMoveSpeed(s) - (p.oil / getMaxOil(s)) * 1.2);
    p.vx = lerp(p.vx, ix * speed, 0.15);
    p.vy = lerp(p.vy, iy * speed, 0.15);
  }
  if ((inp.keys['ShiftLeft'] || inp.keys['ShiftRight']) && p.dashCooldown <= 0 && inputLen > 0.1 && p.dashing <= 0) {
    p.dashing = DASH_DURATION;
    p.dashAngle = Math.atan2(iy, ix);
    p.dashCooldown = DASH_COOLDOWN;
    soundFn('dash');
    s.screenFlash = { color: '#44ccff', alpha: 0.1 };
  }

  p.x = clamp(p.x + p.vx, 20, WORLD_W - 20);
  p.y = clamp(p.y + p.vy, 20, WORLD_H - 20);
  p.engineGlow = lerp(p.engineGlow, inputLen > 0.1 ? 1 : 0.2, 0.1);
  if (inputLen > 0.1 && Math.random() < 0.5)
    spawnEngineTrail(s, p.x - Math.cos(p.angle) * 14, p.y - Math.sin(p.angle) * 14, p.angle);

  // Aiming
  if (inp.touchAim.active) {
    p.angle = Math.atan2(inp.touchAim.y, inp.touchAim.x);
  } else if (inp.touchMove.active && !inp.touchAim.active && inputLen > 0.01) {
    p.angle = Math.atan2(iy, ix);
  } else if (!inp.touchMove.active) {
    p.angle = Math.atan2(inp.mouseY + s.camera.y - p.y, inp.mouseX + s.camera.x - p.x);
  }

  p.rotorAngle += dt * 25;
  p.tailRotorAngle += dt * 35;
  if (p.invincible > 0) p.invincible -= dt;

  // Shield
  if (s.upgradeStats.hasShield) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) { p.shieldActive = true; p.shieldTimer = s.upgradeStats.shieldInterval; }
  }
  if (hasPowerup(s, 'shield') && !p.shieldActive) { p.shieldActive = true; }

  // Health regen
  const regen = getHealthRegen(s);
  if (regen > 0) p.oil = Math.min(getMaxOil(s), p.oil + regen * dt);

  // Firing
  p.fireCooldown -= dt;
  p.homingCooldown -= dt;
  const autoFire = s.settingsAutoFire || false;
  const wantFire = inp.keys['Space'] || inp.mouseDown || inp.touchFire || autoFire;
  const wantMissile = inp.keys['KeyE'] || inp.rightMouseDown || inp.touchMissile;
  if (wantFire && p.fireCooldown <= 0) { fireBullet(s, soundFn); p.fireCooldown = getReloadTime(s); }
  if (wantMissile && p.homingCooldown <= 0 && p.oil >= HOMING_THRESHOLD) {
    if (fireHoming(s, soundFn)) p.homingCooldown = HOMING_COOLDOWN_MS / 1000;
  }

  // Orbital auto-turrets
  if (s.upgradeStats.orbitalCount > 0) {
    for (let o = 0; o < s.upgradeStats.orbitalCount; o++) {
      const oa = s.time * 2.5 + o * Math.PI;
      const ox = p.x + Math.cos(oa) * 40;
      const oy = p.y + Math.sin(oa) * 40;
      if (Math.random() < dt * 3) {
        const target = findNearestEnemy(s, { x: ox, y: oy });
        if (target && dist({ x: ox, y: oy }, target) < 300) {
          const ta = angle({ x: ox, y: oy }, target);
          s.bullets.push({ x: ox, y: oy, vx: Math.cos(ta) * 8, vy: Math.sin(ta) * 8, life: 1, damage: 10, crit: false, pierce: 0 });
        }
      }
    }
  }
}

function fireBullet(s, soundFn) {
  const p = s.player;
  const hasDual = p.oil >= DUAL_CANNON_THRESHOLD;
  const spreadCount = s.upgradeStats.spreadCount;
  const offsets = hasDual ? [-8, 8] : [0];
  const spreadAngle = 0.12;
  const bSpeed = getBulletSpeed(s);
  const bDmg = getBulletDamage(s);
  const pierce = getBulletPenetration(s);
  for (const off of offsets) {
    const perpAngle = p.angle + Math.PI / 2;
    const bx = p.x + Math.cos(perpAngle) * off;
    const by = p.y + Math.sin(perpAngle) * off;
    if (spreadCount > 1) {
      const half = (spreadCount - 1) / 2;
      for (let sc = 0; sc < spreadCount; sc++) {
        const a = p.angle + (sc - half) * spreadAngle;
        const isCrit = Math.random() < s.upgradeStats.critChance;
        s.bullets.push({ x: bx, y: by, vx: Math.cos(a) * bSpeed, vy: Math.sin(a) * bSpeed, life: 1.8, damage: isCrit ? bDmg * 2 : bDmg, crit: isCrit, pierce });
      }
    } else {
      const isCrit = Math.random() < s.upgradeStats.critChance;
      s.bullets.push({ x: bx, y: by, vx: Math.cos(p.angle) * bSpeed, vy: Math.sin(p.angle) * bSpeed, life: 1.8, damage: isCrit ? bDmg * 2 : bDmg, crit: isCrit, pierce });
    }
    spawnMuzzleFlash(s, bx, by, p.angle);
  }
  soundFn('shoot');
}

export function findNearestEnemy(s, from) {
  let best = null, bestD = Infinity;
  for (const e of s.enemies) { const d = dist(from, e); if (d < bestD) { bestD = d; best = e; } }
  return best;
}

function fireHoming(s, soundFn) {
  const p = s.player;
  if (p.oil < HOMING_THRESHOLD) return false;
  const target = findNearestEnemy(s, p);
  if (!target) return false;
  s.homingMissiles.push({
    x: p.x, y: p.y, angle: p.angle,
    speed: HOMING_SPEED * s.upgradeStats.missileSpeedMult, target,
    life: 4, damage: 80 * s.upgradeStats.missileDmgMult,
  });
  soundFn('missile');
  return true;
}
