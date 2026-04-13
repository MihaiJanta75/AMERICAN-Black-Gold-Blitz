import {
  WORLD_W, WORLD_H, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  HOMING_COOLDOWN_MS, HOMING_SPEED,
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

  // Aiming — on touch devices only the right stick controls the facing angle
  if (inp.touchAim.active) {
    p.angle = Math.atan2(inp.touchAim.y, inp.touchAim.x);
  } else if (!s.isTouchDevice) {
    // PC: face the mouse cursor at all times
    p.angle = Math.atan2(inp.mouseY + s.camera.y - p.y, inp.mouseX + s.camera.x - p.x);
  }
  // Mobile: left stick (touchMove) never changes the facing angle — only right stick does

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
    const baseStun = 4.0 + (s.upgradeStats.timeWarpStunBonus || 0);
    const stunDur = comboActive ? baseStun * 1.5 : baseStun; // combo: 50% longer stun
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
    s.timeWarpCooldown = Math.max(5, 15 - (s.upgradeStats.timeWarpCooldownBonus || 0));
    s.lastAbilityTime = s.time;
    s.lastAbilityType = 'time_warp';
    addScreenFlash(s, '#aa88ff', 0.18);
    spawnFloatingText(s, p.x, p.y - 45, '⏱ TIME WARP! (' + stunCount + ' stunned)', '#aa88ff', 15);
    inp.keys['KeyQ'] = false;
  }

  // Black hole bomb (B key)
  if (inp.keys['KeyB'] && s.upgradeStats.hasBlackHole && s.blackHoleCooldown <= 0 && p.oil >= BLACK_HOLE_COST) {
    p.oil -= BLACK_HOLE_COST;
    s.blackHoleCooldown = Math.max(5, BLACK_HOLE_COOLDOWN - (s.upgradeStats.blackHoleCooldownBonus || 0));
    // Check combo window with Time Warp
    const comboActive = (s.lastAbilityType === 'time_warp') && (s.time - s.lastAbilityTime < 2.0);
    const bhBaseRadius = BLACK_HOLE_RADIUS + (s.upgradeStats.blackHoleRadiusBonus || 0);
    const bhRadius = comboActive ? bhBaseRadius * 2 : bhBaseRadius;
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
  // autoFire only applies on touch devices AND only when the right aim stick is actively used
  const autoFire = s.isTouchDevice && (s.settingsAutoFire || false) && inp.touchAim.active;
  const wantFire   = inp.keys['Space'] || inp.mouseDown    || inp.touchFire    || autoFire;
  const wantMissile = inp.keys['KeyE']  || inp.rightMouseDown || inp.touchMissile;

  const isMissileWeapon = s.upgradeStats.activeWeapon === 'missile';
  if (wantFire && p.fireCooldown <= 0 && p.oil > OIL_COST_PER_BULLET) {
    if (isMissileWeapon) {
      if (fireHoming(s, soundFn)) {
        const rampageFireMod = p.rampageActive ? 0.6 : 1.0;
        p.fireCooldown = getReloadTime(s) * rampageFireMod * 1.5; // missiles fire slower
      }
    } else {
      fireBullet(s, soundFn);
      const rampageFireMod = p.rampageActive ? 0.6 : 1.0;
      const wCooldownMult = (WEAPON_CONFIGS[s.upgradeStats.activeWeapon || 'default'] || WEAPON_CONFIGS.default).cooldownMult;
      p.fireCooldown = getReloadTime(s) * rampageFireMod * wCooldownMult;
    }
  }
  // E key / right-click still fires homing missile secondary (only if not missile weapon)
  if (wantMissile && !isMissileWeapon && p.homingCooldown <= 0 && p.oil >= 300 && s.upgradeStats.hasWarhead) {
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

  // Companion drones (scout, combat, shield, repair, bomber)
  updateCompanions(s, dt, p, soundFn);

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

/* Weapon stat bonuses per stack + fire cooldown multiplier for each weapon */
const WEAPON_CONFIGS = {
  default:      { dmgPerStack: 0,    firePerStack: 0,    cooldownMult: 1.00 },
  dual:         { dmgPerStack: 0.10, firePerStack: 0.08, cooldownMult: 1.00 },
  triple:       { dmgPerStack: 0.08, firePerStack: 0,    cooldownMult: 1.10 },
  shotgun:      { dmgPerStack: 0.08, firePerStack: 0,    cooldownMult: 1.60 },
  sniper:       { dmgPerStack: 0.12, firePerStack: 0,    cooldownMult: 4.00 },
  machinegun:   { dmgPerStack: 0,    firePerStack: 0.06, cooldownMult: 0.22 }, // very fast
  missile:      { dmgPerStack: 0.10, firePerStack: 0,    cooldownMult: 1.50 },
  rocket:       { dmgPerStack: 0.10, firePerStack: 0,    cooldownMult: 1.40 },
  grenade:      { dmgPerStack: 0.10, firePerStack: 0,    cooldownMult: 2.20 },
  chain_gun:    { dmgPerStack: 0.05, firePerStack: 0.05, cooldownMult: 0.18 }, // ultra-rapid
  plasma:       { dmgPerStack: 0.15, firePerStack: 0,    cooldownMult: 3.50 }, // very slow, heavy
  flak:         { dmgPerStack: 0.08, firePerStack: 0,    cooldownMult: 1.80 }, // spread burst
  laser_rifle:  { dmgPerStack: 0.12, firePerStack: 0,    cooldownMult: 2.80 }, // slow, precise
};

function getWeaponMult(s, stat) {
  const wName = s.upgradeStats.activeWeapon || 'default';
  const cfg = WEAPON_CONFIGS[wName] || WEAPON_CONFIGS.default;
  const lvl = (s.upgradeStats.weaponLevels?.[wName] || 1);
  const extraStacks = Math.max(0, lvl - 1); // first pick = 0 bonus stacks
  if (stat === 'dmg') return 1 + extraStacks * cfg.dmgPerStack;
  if (stat === 'fire') return 1 + extraStacks * cfg.firePerStack;
  return 1;
}


function fireBullet(s, soundFn) {
  const p = s.player;
  const weapon = s.upgradeStats.activeWeapon || 'default';
  const bSpeed = getBulletSpeed(s);
  const bDmg   = getBulletDamage(s) * getWeaponMult(s, 'dmg');
  const pierce = getBulletPenetration(s);
  const critMult = getCritMult(s);
  const critChance = s.upgradeStats.critChance || 0;
  const perpAngle = p.angle + Math.PI / 2;

  // Helper to create one bullet from player position with optional offset
  function pb(off, angleOffset, dmgMult, speedMult, life_, pierce_) {
    const bx = p.x + Math.cos(perpAngle) * (off||0);
    const by = p.y + Math.sin(perpAngle) * (off||0);
    const a = p.angle + (angleOffset||0);
    const sp = bSpeed * (speedMult||1);
    const isCrit = Math.random() < critChance;
    const dmg = bDmg * (dmgMult||1) * (isCrit ? critMult : 1);
    spawnBulletRaw(s, bx, by, a, sp, dmg, isCrit, life_||1.8, pierce_??pierce);
    spawnMuzzleFlash(s, bx, by, a);
  }

  // ── Mutations (override all weapon behaviour) ─────────────────────────────
  if (s.upgradeStats.mutations?.minigun_mode) {
    for (let mn = 0; mn < 5; mn++) {
      const ma = p.angle + (mn - 2) * 0.04 + rand(-0.01, 0.01);
      spawnBulletRaw(s, p.x, p.y, ma, bSpeed * 1.3, bDmg * 0.7, false, 1.6, pierce);
    }
    spawnMuzzleFlash(s, p.x, p.y, p.angle);
    _applyBulletCost(s);
    soundFn('shoot');
    return;
  }
  if (s.upgradeStats.mutations?.hellfire) {
    for (let hf = 0; hf < 8; hf++) {
      const ha = (hf / 8) * Math.PI * 2;
      spawnBulletRaw(s, p.x, p.y, ha, bSpeed * 0.8, bDmg * 0.65, false, 1.4, pierce);
    }
    spawnMuzzleFlash(s, p.x, p.y, p.angle);
    _applyBulletCost(s);
    soundFn('shoot');
    return;
  }

  // ── Weapon dispatch ───────────────────────────────────────────────────────
  const wl = (s.upgradeStats.weaponLevels?.[weapon] || 1); // weapon stack level

  switch (weapon) {
    case 'dual': {
      // Two side-by-side bullets
      pb(-8, 0, 1, 1); pb(8, 0, 1, 1);
      // Extra bullets from burst_shot
      for (let eb = 0; eb < (s.upgradeStats.extraBullets||0); eb++) {
        const a = (eb % 2 === 0 ? 1 : -1) * (Math.ceil((eb+1)/2)) * 0.06;
        pb(0, a, 0.8, 1);
      }
      break;
    }
    case 'triple': {
      const angles = [-0.14, 0, 0.14];
      for (const ao of angles) pb(0, ao, 1, 1);
      for (let eb = 0; eb < (s.upgradeStats.extraBullets||0); eb++) {
        const a = (eb % 2 === 0 ? 1 : -1) * 0.2;
        pb(0, a, 0.7, 1);
      }
      break;
    }
    case 'shotgun': {
      const pellets = 6 + Math.floor((wl - 1) / 3);
      for (let fp = 0; fp < pellets; fp++) {
        const fa = p.angle + (fp - (pellets-1)/2) * 0.20 + rand(-0.04, 0.04);
        const bx2 = p.x + Math.cos(perpAngle) * rand(-4, 4);
        const by2 = p.y + Math.sin(perpAngle) * rand(-4, 4);
        spawnBulletRaw(s, bx2, by2, fa, bSpeed * 0.85, bDmg * 0.50, false, 0.45, 0);
        spawnMuzzleFlash(s, bx2, by2, fa);
      }
      break;
    }
    case 'sniper': {
      // Single, high-damage, always-piercing round
      const isCrit = Math.random() < critChance;
      spawnBulletRaw(s, p.x, p.y, p.angle, bSpeed * 2.2, bDmg * 3 * (isCrit ? critMult : 1), isCrit, 4.0, 999);
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      break;
    }
    case 'machinegun': {
      // 8 rapid low-damage bullets in tight spread
      const fireBonus = 1 + (wl - 1) * 0.06;
      for (let mg = 0; mg < 8; mg++) {
        const ma = p.angle + rand(-0.10, 0.10);
        spawnBulletRaw(s, p.x, p.y, ma, bSpeed * 1.1, bDmg * 0.35, false, 1.5, 0);
        spawnMuzzleFlash(s, p.x, p.y, ma);
      }
      break;
    }
    case 'rocket': {
      // 3 rockets in fan with AoE explosion flag
      for (let rk = 0; rk < 3; rk++) {
        const ra = p.angle + (rk - 1) * 0.20;
        const isCrit = Math.random() < critChance;
        s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(ra)*bSpeed*0.9, vy: Math.sin(ra)*bSpeed*0.9, life: 2.2, damage: bDmg*(isCrit?critMult:1), crit: isCrit, pierce: 0, isRocket: true, rocketRadius: 40 });
        spawnMuzzleFlash(s, p.x, p.y, ra);
      }
      break;
    }
    case 'grenade': {
      // Bouncing grenade
      const bounces = 1 + Math.floor((wl - 1) / 3);
      const isCrit = Math.random() < critChance;
      s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle)*bSpeed*0.65, vy: Math.sin(p.angle)*bSpeed*0.65, life: 3.0, damage: bDmg*1.5*(isCrit?critMult:1), crit: isCrit, pierce: 0, isGrenade: true, grenadeRadius: 60, bouncesLeft: bounces });
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      break;
    }
    case 'chain_gun': {
      // Ultra-rapid tri-burst (3 bullets, grows with stacks)
      const cgBullets = 3 + Math.floor((wl - 1) / 2);
      for (let cg = 0; cg < cgBullets; cg++) {
        const ca = p.angle + rand(-0.06, 0.06);
        const isCrit = Math.random() < critChance;
        spawnBulletRaw(s, p.x, p.y, ca, bSpeed * 1.2, bDmg * 0.30 * (isCrit ? critMult : 1), isCrit, 1.4, 0);
        spawnMuzzleFlash(s, p.x, p.y, ca);
      }
      break;
    }
    case 'plasma': {
      // Single slow heavy plasma ball with AoE on impact
      const isCrit = Math.random() < critChance;
      s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle)*bSpeed*0.50, vy: Math.sin(p.angle)*bSpeed*0.50, life: 4.0, damage: bDmg*3.0*(isCrit?critMult:1), crit: isCrit, pierce: 0, isRocket: true, rocketRadius: 60 });
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      break;
    }
    case 'flak': {
      // Wide spread pellet burst (8 base, grows with stacks)
      const flakPellets = 8 + Math.floor((wl - 1) / 2) * 2;
      const flakSpread = Math.PI * 0.55; // ~100 degree cone
      for (let fl = 0; fl < flakPellets; fl++) {
        const fa = p.angle + (fl - (flakPellets - 1) / 2) * (flakSpread / flakPellets) + rand(-0.04, 0.04);
        const isCrit = Math.random() < critChance;
        spawnBulletRaw(s, p.x, p.y, fa, bSpeed * 0.70, bDmg * 0.45 * (isCrit ? critMult : 1), isCrit, 0.36, 0);
        spawnMuzzleFlash(s, p.x, p.y, fa);
      }
      break;
    }
    case 'laser_rifle': {
      // Ultra-fast piercing laser beam — slow fire rate (handled by cooldownMult)
      const laserPierce = 5 + (wl - 1);
      const isCrit = Math.random() < critChance;
      spawnBulletRaw(s, p.x, p.y, p.angle, bSpeed * 2.6, bDmg * 2.5 * (isCrit ? critMult : 1), isCrit, 3.5, laserPierce);
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      spawnMuzzleFlash(s, p.x, p.y, p.angle);
      break;
    }
    default: {
      // Default single cannon (+ spread_shot + burst_shot modifiers)
      const spreadCount = s.upgradeStats.spreadCount || 1;
      if (spreadCount > 1) {
        const half = (spreadCount - 1) / 2;
        for (let sc = 0; sc < spreadCount; sc++) {
          const a = p.angle + (sc - half) * 0.12;
          pb(0, sc === 0 ? 0 : a - p.angle, 1, 1);
        }
      } else {
        pb(0, 0, 1, 1);
      }
      for (let eb = 0; eb < (s.upgradeStats.extraBullets||0); eb++) {
        const ao = (eb % 2 === 0 ? 1 : -1) * (Math.ceil((eb+1)/2)) * 0.06;
        pb(0, ao, 1, 1);
      }
      break;
    }
  }

  // Flak burst: appended to any weapon
  if (s.upgradeStats.hasFlakBurst) {
    const pellets = 4 + Math.min(8, s.upgradeStats.flakLevels);
    for (let fp = 0; fp < pellets; fp++) {
      const fa = p.angle + (fp - pellets/2) * 0.18 + rand(-0.05, 0.05);
      spawnBulletRaw(s, p.x, p.y, fa, bSpeed * 0.9, bDmg * 0.30, false, 0.25, 0);
    }
  }

  _applyBulletCost(s);
  soundFn('shoot');
}

/* Raw bullet spawner — handles volatile rounds, cursed mag, resonance */
function spawnBulletRaw(s, x, y, a, sp, dmg, isCrit, life, pierce) {
  // Cursed magazine (cycle shortens with stacks)
  if (s.upgradeStats.cursedMagActive) {
    s.upgradeStats.cursedMagCounter = ((s.upgradeStats.cursedMagCounter||0) + 1);
    const cycle = s.upgradeStats.cursedMagCycle || 8;
    const n = s.upgradeStats.cursedMagCounter % cycle;
    if (n === cycle - 1) return; // 2nd-to-last shot = dud
    if (n === 0) { dmg *= 5; isCrit = true; } // last-in-cycle = 5×
  }
  // Resonance burst
  if (s.upgradeStats.resonanceReady) {
    dmg *= 8;
    s.upgradeStats.resonanceReady = false;
    s.upgradeStats.resonanceKills = 0;
  }
  s.bullets.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life, damage: dmg, crit: isCrit, pierce,
    volatile: s.upgradeStats.volatileActive ? { chance: s.upgradeStats.volatileChance||0.10, radius: 25 } : null });
}

/** Calculate weapon cost based on bullet count and damage multiplier.
    Base = 1 oil per bullet. */
function getWeaponBulletCost(s) {
  const weapon = s.upgradeStats.activeWeapon || 'default';
  const wl = (s.upgradeStats.weaponLevels?.[weapon] || 1);
  let bulletCount = 1;
  let damageMult = 1;

  switch (weapon) {
    case 'dual':
      bulletCount = 2;
      damageMult = 1.0;
      break;
    case 'triple':
      bulletCount = 3;
      damageMult = 1.0;
      break;
    case 'shotgun':
      bulletCount = 6 + Math.floor((wl - 1) / 3);
      damageMult = 0.50;
      break;
    case 'sniper':
      bulletCount = 1;
      damageMult = 3.0;
      break;
    case 'machinegun':
      bulletCount = 8;
      damageMult = 0.35;
      break;
    case 'rocket':
      bulletCount = 3;
      damageMult = 1.0;
      break;
    case 'grenade':
      bulletCount = 1;
      damageMult = 1.5;
      break;
    case 'chain_gun':
      bulletCount = 3 + Math.floor((wl - 1) / 2);
      damageMult = 0.30;
      break;
    case 'plasma':
      bulletCount = 1;
      damageMult = 3.0;
      break;
    case 'flak':
      bulletCount = 8 + Math.floor((wl - 1) / 2) * 2;
      damageMult = 0.45;
      break;
    case 'laser_rifle':
      bulletCount = 1;
      damageMult = 2.5;
      break;
    case 'default':
    default:
      bulletCount = 1;
      damageMult = 1.0;
      break;
  }

  // Cost = bullet count × damage multiplier × base cost per bullet
  const baseCost = bulletCount * damageMult * 0.1; // 0.1 oil per bullet base
  return baseCost * (s.upgradeStats.bulletOilCostMult || 1);
}

function _applyBulletCost(s) {
  let bulletCost = getWeaponBulletCost(s);

  if (s.upgradeStats.hasWildOverclock) {
    s.upgradeStats.overclockBulletCount = (s.upgradeStats.overclockBulletCount || 0) + 1;
    const period = s.upgradeStats.overclockFreePeriod || 5;
    const n = s.upgradeStats.overclockBulletCount % (period + 1);
    if (n === period) bulletCost = 0;
    else if (n === 0) bulletCost = getWeaponBulletCost(s) * (period + 1);
  }
  s.player.oil = Math.max(0, s.player.oil - bulletCost);

  // Oil Junkie: tank drains faster per shot (scales with stacks)
  if (s.upgradeStats.oilJunkieActive) {
    s.player.oil = Math.max(0, s.player.oil - (s.upgradeStats.oilJunkieDrain || 0.15));
  }
}


function updateCompanions(s, dt, p, soundFn) {
  const us = s.upgradeStats;
  const offline = p.oil <= 0; // companions go offline when out of oil

  // Combined total for orbit angle spacing
  const total = (us.scoutDrones||0) + (us.combatDrones||0) + (us.shieldDrones||0) + (us.repairDrones||0) + (us.bomberDrones||0)
              + (us.gunshipDrones||0) + (us.fighterDrones||0) + (us.sniperDrones||0) + (us.mortarDrones||0);
  if (total === 0) return;

  let idx = 0;

  // Scout drones — fast orbiters, 15 dmg, 280px range
  for (let i = 0; i < (us.scoutDrones||0); i++) {
    if (offline) { idx++; continue; }
    const oa = s.time * 3.0 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 55;
    const oy = p.y + Math.sin(oa) * 55;
    if (Math.random() < dt * 2.5) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 280) {
        const ta = angle({ x: ox, y: oy }, target);
        s.bullets.push({ x: ox, y: oy, vx: Math.cos(ta)*9, vy: Math.sin(ta)*9, life: 1, damage: 15, crit: false, pierce: 0 });
      }
    }
    idx++;
  }

  // Combat drones — homing shots, 30 dmg, 320px range
  for (let i = 0; i < (us.combatDrones||0); i++) {
    if (offline) { idx++; continue; }
    const oa = s.time * 2.0 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 60;
    const oy = p.y + Math.sin(oa) * 60;
    if (Math.random() < dt * 1.0) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 320) {
        s.homingMissiles.push({ x: ox, y: oy, angle: angle({ x: ox, y: oy }, target),
          speed: HOMING_SPEED * 1.2, target, life: 2, damage: 30 });
      }
    }
    idx++;
  }

  // Shield drones — absorb hits, one per drone with 8s cooldown
  for (let i = 0; i < (us.shieldDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.companionShieldTimers) us.companionShieldTimers = [];
    if (us.companionShieldTimers[i] === undefined) us.companionShieldTimers[i] = 0;
    us.companionShieldTimers[i] = Math.max(0, (us.companionShieldTimers[i]||0) - dt);
    // shield drones mark as available via flag checked in damagePlayer
    idx++;
  }

  // Repair drones — passive regen already handled via regenRate in resetUpgrades
  for (let i = 0; i < (us.repairDrones||0); i++) { idx++; }

  // Bomber drones — drop AoE bombs on targets
  for (let i = 0; i < (us.bomberDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.bomberDroneTimers) us.bomberDroneTimers = [];
    if (us.bomberDroneTimers[i] === undefined) us.bomberDroneTimers[i] = 0;
    us.bomberDroneTimers[i] = (us.bomberDroneTimers[i]||0) - dt;
    if (us.bomberDroneTimers[i] <= 0) {
      const oa = s.time * 1.5 + (idx / total) * Math.PI * 2;
      const ox = p.x + Math.cos(oa) * 70;
      const oy = p.y + Math.sin(oa) * 70;
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 350) {
        // Drop bomb — stored as a special bullet with isRocket flag for AoE
        s.bullets.push({ x: ox, y: oy, vx: Math.cos(angle({ x: ox, y: oy }, target))*3, vy: Math.sin(angle({ x: ox, y: oy }, target))*3, life: 1.5, damage: 40, crit: false, pierce: 0, isRocket: true, rocketRadius: 60 });
      }
      us.bomberDroneTimers[i] = 3.5; // fires every 3.5s
    }
    idx++;
  }

  // Mini Gunships — helicopter allies, triple burst 25 dmg, 300px range (costs 1.0 oil/s)
  for (let i = 0; i < (us.gunshipDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.gunshipTimers) us.gunshipTimers = [];
    if (us.gunshipTimers[i] === undefined) us.gunshipTimers[i] = 0;
    us.gunshipTimers[i] = (us.gunshipTimers[i]||0) - dt;
    const oa = s.time * 1.8 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 78;
    const oy = p.y + Math.sin(oa) * 78;
    if (us.gunshipTimers[i] <= 0) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 300) {
        const ta = angle({ x: ox, y: oy }, target);
        // Triple burst: 3 bullets in a tight fan
        for (let b = -1; b <= 1; b++) {
          const ba = ta + b * 0.12;
          s.bullets.push({ x: ox, y: oy, vx: Math.cos(ba)*10, vy: Math.sin(ba)*10, life: 0.9, damage: 25, crit: false, pierce: 0 });
        }
      }
      us.gunshipTimers[i] = 1.2; // fires every 1.2s
    }
    idx++;
  }

  // Fighter Escorts — plane allies, strafing run 5 bullets 30 dmg, 360px range (costs 1.4 oil/s)
  for (let i = 0; i < (us.fighterDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.fighterTimers) us.fighterTimers = [];
    if (us.fighterTimers[i] === undefined) us.fighterTimers[i] = 0;
    us.fighterTimers[i] = (us.fighterTimers[i]||0) - dt;
    const oa = s.time * 2.5 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 90;
    const oy = p.y + Math.sin(oa) * 90;
    if (us.fighterTimers[i] <= 0) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 360) {
        const ta = angle({ x: ox, y: oy }, target);
        // Strafing run: 5 bullets spread slightly
        for (let b = 0; b < 5; b++) {
          const delay = b * 0.04;
          const ba = ta + (b - 2) * 0.08;
          s.bullets.push({ x: ox, y: oy, vx: Math.cos(ba)*12, vy: Math.sin(ba)*12, life: 1.0 - delay, damage: 30, crit: false, pierce: 1 });
        }
      }
      us.fighterTimers[i] = 2.2; // strafing run every 2.2s
    }
    idx++;
  }

  // Sniper Drones — precision shot 80 dmg, 380px range (costs 0.6 oil/s)
  for (let i = 0; i < (us.sniperDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.sniperTimers) us.sniperTimers = [];
    if (us.sniperTimers[i] === undefined) us.sniperTimers[i] = 0;
    us.sniperTimers[i] = (us.sniperTimers[i]||0) - dt;
    const oa = s.time * 1.2 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 65;
    const oy = p.y + Math.sin(oa) * 65;
    if (us.sniperTimers[i] <= 0) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 380) {
        const ta = angle({ x: ox, y: oy }, target);
        s.bullets.push({ x: ox, y: oy, vx: Math.cos(ta)*16, vy: Math.sin(ta)*16, life: 0.8, damage: 80, crit: false, pierce: 2 });
      }
      us.sniperTimers[i] = 2.8; // slow precision shot every 2.8s
    }
    idx++;
  }

  // Mortar Drones — AoE bomb 50 dmg 60px blast, 300px range (costs 0.9 oil/s)
  for (let i = 0; i < (us.mortarDrones||0); i++) {
    if (offline) { idx++; continue; }
    if (!us.mortarTimers) us.mortarTimers = [];
    if (us.mortarTimers[i] === undefined) us.mortarTimers[i] = 0;
    us.mortarTimers[i] = (us.mortarTimers[i]||0) - dt;
    const oa = s.time * 1.6 + (idx / total) * Math.PI * 2;
    const ox = p.x + Math.cos(oa) * 75;
    const oy = p.y + Math.sin(oa) * 75;
    if (us.mortarTimers[i] <= 0) {
      const target = findNearestEnemy(s, { x: ox, y: oy });
      if (target && dist({ x: ox, y: oy }, target) < 300) {
        const ta = angle({ x: ox, y: oy }, target);
        const spd = 4;
        s.bullets.push({ x: ox, y: oy, vx: Math.cos(ta)*spd, vy: Math.sin(ta)*spd, life: 2.2, damage: 50, crit: false, pierce: 0, isRocket: true, rocketRadius: 60 });
      }
      us.mortarTimers[i] = 4.0; // fires every 4s
    }
    idx++;
  }
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
  if (p.oil < OIL_COST_PER_MISSILE) return false;
  const target = findNearestEnemy(s, p);
  if (!target) return false;
  const isWarhead = s.upgradeStats.hasWarhead;
  const isMissileWeapon = s.upgradeStats.activeWeapon === 'missile';
  const wl = isMissileWeapon ? (s.upgradeStats.weaponLevels?.missile || 1) : 1;
  const weaponDmgBonus = isMissileWeapon ? 1 + (wl - 1) * 0.10 : 1;
  const baseDmg = isWarhead ? 240 : 80;
  s.homingMissiles.push({
    x: p.x, y: p.y, angle: p.angle,
    speed: (isWarhead ? HOMING_SPEED * 0.55 : HOMING_SPEED) * (s.upgradeStats.missileSpeedMult || 1),
    target,
    life: isWarhead ? 6 : 4,
    damage: baseDmg * (s.upgradeStats.missileDmgMult || 1) * weaponDmgBonus,
    isWarhead,
  });
  p.oil = Math.max(0, p.oil - OIL_COST_PER_MISSILE);
  soundFn('missile');
  return true;
}
