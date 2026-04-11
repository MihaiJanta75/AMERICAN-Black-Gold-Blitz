import {
  WORLD_W, WORLD_H, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  DUAL_CANNON_THRESHOLD, HOMING_THRESHOLD, HOMING_COOLDOWN_MS, HOMING_SPEED,
  OIL_COST_PER_BULLET, OIL_COST_PER_MISSILE,
  OIL_CRITICAL_THRESHOLD, OIL_FLUSH_THRESHOLD,
  FORTIFY_TURRET_COOLDOWN, FORTIFY_TURRET_RANGE,
  BLACK_HOLE_COST, BLACK_HOLE_RADIUS, BLACK_HOLE_DAMAGE, BLACK_HOLE_COOLDOWN,
  PIPELINE_COST, PIPELINE_MAX_DIST, PIPELINE_HP, PIPELINE_BUILD_RADIUS,
} from '../constants.js';
import { clamp, lerp, rand, dist, angle } from '../utils.js';
import {
  getMoveSpeed, getMaxOil, getHealthRegen, getBulletSpeed, getBulletDamage,
  getBulletPenetration, getReloadTime, hasPowerup, getCritMult,
  spawnParticle, spawnMuzzleFlash, spawnEngineTrail,
  spawnFloatingText, addScreenFlash,
} from '../state/GameState.js';

export function updatePlayer(s, dt, soundFn) {
  const p = s.player;
  const inp = s.input;

  // Movement input
  let ix = 0, iy = 0;
  if (inp.keys['KeyW'] || inp.keys['ArrowUp'])    iy -= 1;
  if (inp.keys['KeyS'] || inp.keys['ArrowDown'])  iy += 1;
  if (inp.keys['KeyA'] || inp.keys['ArrowLeft'])  ix -= 1;
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
    // Critical oil state: slight speed boost
    const critMod = p.oilState === 'critical' ? 1.15 : 1.0;
    // Rampage: +25% move speed
    const rampageMod = p.rampageActive ? 1.25 : 1.0;
    const speed = Math.max(1, getMoveSpeed(s) * critMod * rampageMod - (p.oil / getMaxOil(s)) * 0.8);
    p.vx = lerp(p.vx, ix * speed, 0.15);
    p.vy = lerp(p.vy, iy * speed, 0.15);
  }

  // Dash trigger (keyboard)
  if ((inp.keys['ShiftLeft'] || inp.keys['ShiftRight']) && p.dashCooldown <= 0 && inputLen > 0.1 && p.dashing <= 0) {
    p.dashing = DASH_DURATION;
    p.dashAngle = Math.atan2(iy, ix);
    p.dashCooldown = Math.max(0.5, DASH_COOLDOWN - (s.upgradeStats.dashCooldownBonus || 0));
    soundFn('dash');
    addScreenFlash(s, '#44ccff', 0.1);
    // Ghost Protocol synergy: enemies lose the player for 1s after dash
    if (s.upgradeStats.hasGhostProtocol) {
      p.ghostTimer = 1.0;
      for (const e of s.enemies) {
        if (dist(p, e) < 400) e.stunTimer = Math.max(e.stunTimer || 0, 0.8);
      }
      spawnFloatingText(s, p.x, p.y - 28, '👻 GHOST!', '#44ccff', 12);
    }
  }
  if (p.ghostTimer > 0) p.ghostTimer -= dt;

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

  // Counter-attack timer
  if (p.counterAttackTimer > 0) p.counterAttackTimer -= dt;
  // Revenge buff timer
  if (p.revengeBuff > 0) p.revengeBuff -= dt;

  // Black hole cooldown
  if (s.blackHoleCooldown > 0) s.blackHoleCooldown -= dt;

  // Near-rig detection (for pipeline prompt)
  s.nearRig = null;
  for (const rig of s.rigs) {
    if (rig.owner === 'player' && dist(p, rig) < PIPELINE_BUILD_RADIUS) {
      s.nearRig = rig;
      break;
    }
  }

  // Time warp (Q key): stun all on-screen enemies for 4s
  if (s.timeWarpCooldown > 0) s.timeWarpCooldown -= dt;
  if (inp.keys['KeyQ'] && s.upgradeStats.hasTimeWarp && s.timeWarpCooldown <= 0) {
    const cam = s.camera;
    let stunCount = 0;
    // Check combo window with Black Hole
    const comboActive = (s.lastAbilityType === 'black_hole') && (s.time - s.lastAbilityTime < 2.0);
    const stunDur = comboActive ? 6.0 : 4.0; // combo: 50% longer stun
    for (const e of s.enemies) {
      const sx = e.x - cam.x, sy = e.y - cam.y;
      if (sx >= -100 && sx <= s.W + 100 && sy >= -100 && sy <= s.H + 100) {
        e.stunTimer = Math.max(e.stunTimer || 0, stunDur);
        stunCount++;
      }
    }
    if (comboActive) {
      // Combo: Black Hole + Time Warp — frozen enemies take AoE damage
      for (const e of s.enemies) {
        if ((e.stunTimer || 0) > 0) e.hp -= 30;
      }
      spawnFloatingText(s, p.x, p.y - 60, '💥 COMBO! FREEZE BLAST!', '#aa44ff', 18);
      addScreenFlash(s, '#440088', 0.28);
    }
    s.timeWarpCooldown = 15;
    s.lastAbilityTime = s.time;
    s.lastAbilityType = 'time_warp';
    addScreenFlash(s, '#aa88ff', 0.18);
    spawnFloatingText(s, p.x, p.y - 45, '⏱ TIME WARP! (' + stunCount + ' stunned)', '#aa88ff', 15);
    inp.keys['KeyQ'] = false;
  }

  // Black hole bomb (B key)
  if (inp.keys['KeyB'] && s.upgradeStats.hasBlackHole && s.blackHoleCooldown <= 0 && p.oil >= BLACK_HOLE_COST) {
    p.oil -= BLACK_HOLE_COST;
    s.blackHoleCooldown = BLACK_HOLE_COOLDOWN;
    // Check combo window with Time Warp
    const comboActive = (s.lastAbilityType === 'time_warp') && (s.time - s.lastAbilityTime < 2.0);
    const bhRadius = comboActive ? BLACK_HOLE_RADIUS * 2 : BLACK_HOLE_RADIUS;
    const bhDmg = comboActive ? BLACK_HOLE_DAMAGE * 3 : BLACK_HOLE_DAMAGE;
    s.lastAbilityTime = s.time;
    s.lastAbilityType = 'black_hole';
    // Pull and damage all enemies in radius
    for (const e of s.enemies) {
      const d = dist(p, e);
      if (d < bhRadius) {
        e.hp -= bhDmg;
        const pullA = Math.atan2(p.y - e.y, p.x - e.x);
        const pullForce = (1 - d / bhRadius) * 6;
        e.vx += Math.cos(pullA) * pullForce;
        e.vy += Math.sin(pullA) * pullForce;
      }
    }
    if (comboActive) {
      spawnFloatingText(s, p.x, p.y - 60, '🌌 COMBO! MEGA BLACK HOLE!', '#8844ff', 18);
      addScreenFlash(s, '#220055', 0.35);
    }
    // Overload synergy: leave napalm field at detonation center
    if (s.upgradeStats.hasOverload) {
      for (let n = 0; n < 4; n++) {
        const na = (n / 4) * Math.PI * 2;
        s.napalmZones.push({ x: p.x + Math.cos(na) * 60, y: p.y + Math.sin(na) * 60, radius: 50, dps: 12, life: 5, maxLife: 5, tickTimer: 0 });
      }
      s.napalmZones.push({ x: p.x, y: p.y, radius: 55, dps: 15, life: 5, maxLife: 5, tickTimer: 0 });
      spawnFloatingText(s, p.x, p.y - 55, '🌑 OVERLOAD!', '#8844ff', 14);
    }
    // Oil Vortex synergy: pull all loot and oil pickups toward player
    if (s.upgradeStats.hasOilVortex) {
      for (const loot of s.loot) {
        const ld = dist(p, loot);
        if (ld < BLACK_HOLE_RADIUS * 1.5) {
          loot.pulled = true; // flag for loot update to rush toward player
        }
      }
    }
    spawnExplosion(s, p.x, p.y, '#8844ff', 30);
    addScreenFlash(s, '#440088', 0.25);
    addShake(s, 8, true);
    spawnFloatingText(s, p.x, p.y - 40, '🕳 BLACK HOLE!', '#8844ff', 18);
    soundFn('explosion', 0.5);
    inp.keys['KeyB'] = false; // consume
  }

  // Pipeline build (P key) — handled in GameScene via key events, but also support held key
  if (inp.keys['KeyP'] && s.nearRig && p.oil >= PIPELINE_COST) {
    const otherOwned = s.rigs.filter(r => r.owner === 'player' && r !== s.nearRig);
    if (otherOwned.length > 0) {
      // Find nearest other owned rig within max pipeline distance
      const nearest = otherOwned.reduce((best, r) => {
        const d = dist(s.nearRig, r);
        return (d < dist(s.nearRig, best) && d <= PIPELINE_MAX_DIST) ? r : best;
      }, otherOwned[0]);
      if (dist(s.nearRig, nearest) <= PIPELINE_MAX_DIST) {
        const alreadyLinked = s.pipelines.some(
          pp => (pp.rigA === s.nearRig && pp.rigB === nearest) ||
                (pp.rigA === nearest && pp.rigB === s.nearRig)
        );
        if (!alreadyLinked) {
          p.oil -= PIPELINE_COST;
          s.pipelines.push({ rigA: s.nearRig, rigB: nearest, hp: PIPELINE_HP, maxHp: PIPELINE_HP });
          spawnFloatingText(s, p.x, p.y - 30, '🔗 PIPELINE BUILT!', '#44ff88', 14);
          addScreenFlash(s, '#004422', 0.1);
          inp.keys['KeyP'] = false;
        }
      }
    }
  }

  // Shield
  if (s.upgradeStats.hasShield) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) {
      p.shieldActive = true;
      p.shieldTimer = s.upgradeStats.shieldInterval;
      // Pulse armor synergy: shield activation emits EMP
      if (s.upgradeStats.hasPulseArmor) {
        for (const e of s.enemies) {
          if (dist(p, e) < 200) {
            e.stunTimer = 2.0;
          }
        }
        addScreenFlash(s, '#aa44ff', 0.15);
        soundFn('explosion', 0.2);
      }
    }
  }
  if (hasPowerup(s, 'shield') && !p.shieldActive) p.shieldActive = true;

  // Health regen
  const regen = getHealthRegen(s);
  if (regen > 0) p.oil = Math.min(getMaxOil(s), p.oil + regen * dt);

  // Update oil state
  const oilPct = p.oil / getMaxOil(s);
  if (oilPct < OIL_CRITICAL_THRESHOLD) {
    p.oilState = 'critical';
  } else if (oilPct >= OIL_FLUSH_THRESHOLD) {
    p.oilState = 'flush';
  } else {
    p.oilState = 'normal';
  }

  // Firing
  p.fireCooldown -= dt;
  p.homingCooldown -= dt;
  // autoFire only applies on touch devices — PC always uses intentional mouse/key input
  const autoFire = s.isTouchDevice && (s.settingsAutoFire || false);
  const wantFire   = inp.keys['Space'] || inp.mouseDown    || inp.touchFire    || autoFire;
  const wantMissile = inp.keys['KeyE']  || inp.rightMouseDown || inp.touchMissile;

  if (wantFire && p.fireCooldown <= 0 && p.oil > OIL_COST_PER_BULLET) {
    fireBullet(s, soundFn);
    // Rampage: +40% fire rate (shorter cooldown)
    const rampageFireMod = p.rampageActive ? 0.6 : 1.0;
    p.fireCooldown = getReloadTime(s) * rampageFireMod;
  }
  if (wantMissile && p.homingCooldown <= 0 && p.oil >= HOMING_THRESHOLD) {
    if (fireHoming(s, soundFn)) p.homingCooldown = HOMING_COOLDOWN_MS / 1000;
  }

  // Orbital auto-turrets + Drone Swarm wildcard (same behavior, combined)
  const totalOrbitals = (s.upgradeStats.orbitalCount || 0) + (s.upgradeStats.swarmDroneCount || 0);
  if (totalOrbitals > 0) {
    for (let o = 0; o < totalOrbitals; o++) {
      const oa = s.time * 2.5 + o * Math.PI;
      const ox = p.x + Math.cos(oa) * 42;
      const oy = p.y + Math.sin(oa) * 42;

      const isSwarmDrone = o >= (s.upgradeStats.orbitalCount || 0); // drones after orbitals
      if (s.upgradeStats.hasMissileBattery && !isSwarmDrone) {
        // Missile battery synergy: orbital fires homing missiles
        if (Math.random() < dt * 0.6) {
          const target = findNearestEnemy(s, { x: ox, y: oy });
          if (target && dist({ x: ox, y: oy }, target) < 350) {
            s.homingMissiles.push({
              x: ox, y: oy,
              angle: Math.atan2(target.y - oy, target.x - ox),
              speed: HOMING_SPEED * s.upgradeStats.missileSpeedMult,
              target,
              life: 3,
              damage: 50 * s.upgradeStats.missileDmgMult,
            });
          }
        }
      } else {
        // Normal orbital bullet
        if (Math.random() < dt * 3) {
          const target = findNearestEnemy(s, { x: ox, y: oy });
          if (target && dist({ x: ox, y: oy }, target) < 320) {
            const ta = angle({ x: ox, y: oy }, target);
            s.bullets.push({ x: ox, y: oy, vx: Math.cos(ta) * 8, vy: Math.sin(ta) * 8, life: 1, damage: 10, crit: false, pierce: 0 });
          }
        }
      }
    }
  }

  // Fortify rig turrets
  if (s.upgradeStats.hasFortify) {
    for (const rig of s.rigs) {
      if (rig.owner !== 'player') continue;
      rig.turretTimer = (rig.turretTimer || 0) - dt;
      if (rig.turretTimer > 0) continue;
      // Fire at nearest enemy within range
      const target = findNearestEnemy(s, rig);
      if (target && dist(rig, target) < FORTIFY_TURRET_RANGE) {
        for (let t = 0; t < s.upgradeStats.fortifyTurretCount; t++) {
          const ta = angle(rig, target) + (t === 0 ? 0 : rand(-0.15, 0.15));
          s.bullets.push({ x: rig.x, y: rig.y, vx: Math.cos(ta) * 9, vy: Math.sin(ta) * 9, life: 1.2, damage: 20, crit: false, pierce: 0 });
        }
        rig.turretTimer = FORTIFY_TURRET_COOLDOWN;
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
  const critMult = getCritMult(s);

  for (const off of offsets) {
    const perpAngle = p.angle + Math.PI / 2;
    const bx = p.x + Math.cos(perpAngle) * off;
    const by = p.y + Math.sin(perpAngle) * off;

    // ── Minigun mutation: 5-bullet tight burst replaces normal shot ──────────
    if (s.upgradeStats.mutations?.minigun_mode) {
      for (let mn = 0; mn < 5; mn++) {
        const ma = p.angle + (mn - 2) * 0.04 + rand(-0.01, 0.01);
        s.bullets.push({ x: bx, y: by, vx: Math.cos(ma) * bSpeed * 1.3, vy: Math.sin(ma) * bSpeed * 1.3, life: 1.6, damage: bDmg * 0.7, crit: false, pierce });
      }
      spawnMuzzleFlash(s, bx, by, p.angle);
      spawnMuzzleFlash(s, bx, by, p.angle);
      continue;
    }

    // ── Hellfire mutation: 8-bullet 360° ring replaces normal shot ───────────
    if (s.upgradeStats.mutations?.hellfire) {
      for (let hf = 0; hf < 8; hf++) {
        const ha = (hf / 8) * Math.PI * 2;
        s.bullets.push({ x: bx, y: by, vx: Math.cos(ha) * bSpeed * 0.8, vy: Math.sin(ha) * bSpeed * 0.8, life: 1.4, damage: bDmg * 0.65, crit: false, pierce });
      }
      spawnMuzzleFlash(s, bx, by, p.angle);
      continue;
    }

    // ── Normal / spread shot ─────────────────────────────────────────────────
    const totalSpread = Math.max(spreadCount, 1);
    if (totalSpread > 1) {
      const half = (totalSpread - 1) / 2;
      for (let sc = 0; sc < totalSpread; sc++) {
        const a = p.angle + (sc - half) * spreadAngle;
        const isCrit = Math.random() < s.upgradeStats.critChance;
        s.bullets.push({ x: bx, y: by, vx: Math.cos(a) * bSpeed, vy: Math.sin(a) * bSpeed, life: 1.8, damage: isCrit ? bDmg * critMult : bDmg, crit: isCrit, pierce });
      }
    } else {
      const isCrit = Math.random() < s.upgradeStats.critChance;
      s.bullets.push({ x: bx, y: by, vx: Math.cos(p.angle) * bSpeed, vy: Math.sin(p.angle) * bSpeed, life: 1.8, damage: isCrit ? bDmg * critMult : bDmg, crit: isCrit, pierce });
    }
    // Burst shot: extra tight-cluster bullets
    const extra = s.upgradeStats.extraBullets || 0;
    for (let eb = 0; eb < extra; eb++) {
      const burstOffset = (eb % 2 === 0 ? 1 : -1) * (Math.ceil((eb + 1) / 2)) * 0.06;
      const a = p.angle + burstOffset;
      const isCrit = Math.random() < s.upgradeStats.critChance;
      s.bullets.push({ x: bx, y: by, vx: Math.cos(a) * bSpeed, vy: Math.sin(a) * bSpeed, life: 1.8, damage: isCrit ? bDmg * critMult : bDmg, crit: isCrit, pierce });
    }
    // Flak burst: close-range shotgun pellets (short life, wide fan)
    if (s.upgradeStats.hasFlakBurst) {
      const pellets = 4 + s.upgradeStats.flakLevels;
      for (let fp = 0; fp < pellets; fp++) {
        const fa = p.angle + (fp - pellets / 2) * 0.18 + rand(-0.05, 0.05);
        s.bullets.push({ x: bx, y: by, vx: Math.cos(fa) * bSpeed * 0.9, vy: Math.sin(fa) * bSpeed * 0.9, life: 0.28, damage: bDmg * 0.45, crit: false, pierce: 0 });
      }
    }
    spawnMuzzleFlash(s, bx, by, p.angle);
  }
  // Oil cost — blood pact triples it; overclock wildcards make every 5th free, 6th costs 6×
  let bulletCost = OIL_COST_PER_BULLET * (s.upgradeStats.bulletOilCostMult || 1);
  if (s.upgradeStats.hasWildOverclock) {
    s.upgradeStats.overclockBulletCount = (s.upgradeStats.overclockBulletCount || 0) + 1;
    const n = s.upgradeStats.overclockBulletCount % 6;
    if (n === 5) bulletCost = 0;                       // 5th shot: free
    else if (n === 0) bulletCost = OIL_COST_PER_BULLET * 6; // 6th shot: 6× cost
  }
  p.oil = Math.max(0, p.oil - bulletCost);
  soundFn('shoot');
}

export function findNearestEnemy(s, from) {
  let best = null, bestD = Infinity;
  for (const e of s.enemies) {
    const d = dist(from, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function fireHoming(s, soundFn) {
  const p = s.player;
  if (p.oil < HOMING_THRESHOLD) return false;
  const target = findNearestEnemy(s, p);
  if (!target) return false;
  const isWarhead = s.upgradeStats.hasWarhead;
  s.homingMissiles.push({
    x: p.x, y: p.y, angle: p.angle,
    speed: (isWarhead ? HOMING_SPEED * 0.55 : HOMING_SPEED) * s.upgradeStats.missileSpeedMult,
    target,
    life: isWarhead ? 6 : 4,
    damage: (isWarhead ? 240 : 80) * s.upgradeStats.missileDmgMult,
    isWarhead,
  });
  p.oil = Math.max(0, p.oil - OIL_COST_PER_MISSILE);
  soundFn('missile');
  return true;
}
