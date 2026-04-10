import { WORLD_W, WORLD_H, HOMING_TURN, CAPTURE_RADIUS, CAPTURE_TIME, OIL_PER_SECOND, MAGNET_RADIUS } from '../constants.js';
import { dist, angle, clamp, rand } from '../utils.js';
import { FACTIONS, LOOT_TYPES } from '../config.js';
import {
  getMaxOil, getBodyDamage, getPickupRadius, hasPowerup, addPowerup,
  spawnExplosion, spawnOilSpill, spawnFloatingText,
  addShake, addScreenFlash, registerKill, addXP,
} from '../state/GameState.js';
import { findNearestEnemy } from './playerLogic.js';
import { pickRandom } from '../utils.js';

/* ===== DAMAGE PLAYER ===== */
export function damagePlayer(s, amount, soundFn) {
  const p = s.player;
  if (p.invincible > 0) return;
  if (p.shieldActive) {
    p.shieldActive = false;
    spawnExplosion(s, p.x, p.y, '#aa44ff', 10);
    spawnFloatingText(s, p.x, p.y - 25, 'SHIELD!', '#aa44ff');
    p.invincible = 0.3;
    soundFn('hit');
    addScreenFlash(s, '#aa44ff', 0.1);
    return;
  }
  const armorMult = Math.max(0.4, 1 - s.stats[1] * 0.05);
  const actualDmg = amount * armorMult;
  p.oil -= actualDmg;
  s.totalDamageTaken += actualDmg;
  p.invincible = 0.5;
  spawnOilSpill(s, p.x, p.y);
  addShake(s, 4, true);
  soundFn('hit');
  addScreenFlash(s, '#ff0000', 0.15);
  s.vignetteIntensity = Math.min(0.5, s.vignetteIntensity + 0.2);
  if (s.upgradeStats.hasEmp) {
    for (const e of s.enemies) {
      if (dist(p, e) < s.upgradeStats.empRadius) { e.stunTimer = 1.5; spawnExplosion(s, e.x, e.y, '#44ffff', 6); }
    }
  }
  if (s.stats[2] > 0) {
    for (const e of s.enemies) {
      if (dist(p, e) < 35) { e.hp -= getBodyDamage(s) * 0.5; spawnExplosion(s, e.x, e.y, '#cc66ff', 4); }
    }
  }
}

/* ===== COLLISION / COMBAT UPDATE ===== */
export function updateCombat(s, dt, soundFn) {
  const player = s.player;

  // Drone collision with player
  for (const e of s.enemies) {
    if (e.type === 'drone' && dist(e, player) < 28 && player.invincible <= 0) {
      damagePlayer(s, e.damage, soundFn);
      e.hp -= getBodyDamage(s);
      if (e.hp > 0) spawnExplosion(s, e.x, e.y, (FACTIONS[e.faction] || FACTIONS.red).accent, 8);
      else spawnExplosion(s, e.x, e.y, (FACTIONS[e.faction] || FACTIONS.red).accent, 12);
      addShake(s, 4, true);
    }
  }

  // Enemy attacks on player rigs
  for (const e of s.enemies) {
    for (const rig of s.rigs) {
      if (rig.owner === 'player' && rig.hp > 0 && dist(e, rig) < 60) {
        rig.hp -= 10 * dt;
        rig.underAttack = true;
        rig.attackWarning = 2.0;
        if (rig.hp <= 0) {
          rig.owner = 'neutral'; rig.hp = 0;
          spawnExplosion(s, rig.x, rig.y, '#ff8800', 25);
          spawnFloatingText(s, rig.x, rig.y - 30, 'RIG LOST!', '#ff4444', 16);
          addShake(s, 6, true);
        }
      }
      if (rig.owner === 'neutral' && rig.hp <= 0 && e.targetRig === rig && dist(e, rig) < CAPTURE_RADIUS) {
        rig.enemyCaptureProgress += dt;
        if (rig.enemyCaptureProgress >= CAPTURE_TIME * 2) {
          rig.owner = 'enemy'; rig.hp = rig.maxHp; rig.enemyCaptureProgress = 0;
          spawnFloatingText(s, rig.x, rig.y - 30, 'RIG CAPTURED BY ENEMY!', '#ff4444', 14);
        }
      }
    }
  }

  // Kill enemies at 0 hp
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.hp <= 0) {
      spawnExplosion(s, e.x, e.y, FACTIONS[e.faction].accent, e.isBoss ? 30 : 18);
      const gained = registerKill(s, e.scoreValue);
      const xpGain = Math.floor((e.scoreValue * 0.5 + (e.isBoss ? 100 : 0)) * s.upgradeStats.xpMult);
      addXP(s, xpGain, soundFn);
      player.oil = Math.min(getMaxOil(s), player.oil + 8 * s.upgradeStats.oilMult);
      spawnFloatingText(s, e.x, e.y - 20, '+' + gained, '#ffcc00');
      spawnLoot(s, e.x, e.y, e);
      addShake(s, e.isBoss ? 8 : 3, true);
      soundFn('explosion', e.isBoss ? 0.5 : 0.3);
      s.totalDamageDealt += e.maxHp;
      if (e.isBoss) s.totalKills.boss++;
      else s.totalKills[e.type] = (s.totalKills[e.type] || 0) + 1;
      s.enemies.splice(i, 1);
    }
  }

  // Player bullets
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x += b.vx; b.y += b.vy; b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) { s.bullets.splice(i, 1); continue; }
    for (let j = s.enemies.length - 1; j >= 0; j--) {
      if (dist(b, s.enemies[j]) < s.enemies[j].radius + 6) {
        s.enemies[j].hp -= b.damage;
        if (b.crit) {
          spawnExplosion(s, b.x, b.y, '#ff0000', 6);
          spawnFloatingText(s, b.x, b.y - 10, 'CRIT!', '#ff4444');
          if (s.time - s.lastCritSoundTime > 0.15) { soundFn('explosion', 0.15); s.lastCritSoundTime = s.time; }
        } else spawnExplosion(s, b.x, b.y, '#ffcc00', 4);
        if (b.pierce > 0) { b.pierce--; b.damage *= 0.7; }
        else { s.bullets.splice(i, 1); break; }
      }
    }
  }

  // Homing missiles
  for (let i = s.homingMissiles.length - 1; i >= 0; i--) {
    const m = s.homingMissiles[i];
    m.life -= dt;
    if (m.life <= 0) { spawnExplosion(s, m.x, m.y, '#ff6600', 8); s.homingMissiles.splice(i, 1); continue; }
    if (m.target && m.target.hp > 0) {
      const desired = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      let diff = desired - m.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      m.angle += clamp(diff, -HOMING_TURN, HOMING_TURN);
    } else m.target = findNearestEnemy(s, m);
    m.x += Math.cos(m.angle) * m.speed;
    m.y += Math.sin(m.angle) * m.speed;
    for (let t = 0; t < 2; t++) {
      const tx = m.x - Math.cos(m.angle) * (6 + t * 4);
      const ty = m.y - Math.sin(m.angle) * (6 + t * 4);
      s.particles.push({ x: tx + rand(-2, 2), y: ty + rand(-2, 2), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), life: rand(0.1, 0.3), maxLife: 0.3, r: rand(2, 4), color: t === 0 ? '#ff6600' : '#ff3300', type: 'fire' });
    }
    for (let j = s.enemies.length - 1; j >= 0; j--) {
      if (dist(m, s.enemies[j]) < s.enemies[j].radius + 10) {
        s.enemies[j].hp -= m.damage;
        spawnExplosion(s, m.x, m.y, '#ff8800', 15);
        addShake(s, 5, true);
        soundFn('explosion', 0.4);
        s.homingMissiles.splice(i, 1);
        break;
      }
    }
  }

  // Enemy bullets
  for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
    const b = s.enemyBullets[i];
    b.x += b.vx; b.y += b.vy; b.life -= dt;
    if (b.life <= 0) { s.enemyBullets.splice(i, 1); continue; }
    if (dist(b, player) < 18 && player.invincible <= 0) { damagePlayer(s, b.damage, soundFn); s.enemyBullets.splice(i, 1); }
  }
}

/* ===== OIL RIGS ===== */
export function updateRigs(s, dt) {
  const player = s.player;
  for (const rig of s.rigs) {
    if (rig.hp <= 0) {
      rig.owner = 'neutral';
      rig.enemyCaptureProgress = 0;
      continue;
    }
    rig.flamePhase += dt * 4;
    rig.craneAngle += dt * 0.8;
    if (rig.attackWarning > 0) rig.attackWarning -= dt;
    else rig.underAttack = false;

    if (dist(player, rig) < CAPTURE_RADIUS && rig.owner !== 'player') {
      rig.captureProgress += dt;
      rig.enemyCaptureProgress = 0;
      if (rig.captureProgress >= CAPTURE_TIME) {
        rig.owner = 'player'; rig.captureProgress = 0; rig.hp = rig.maxHp;
        s.score += 200;
        addXP(s, 50, null);
        spawnFloatingText(s, rig.x, rig.y - 30, '+200 CAPTURED', '#44ff88');
      }
    } else if (rig.owner !== 'player') {
      rig.captureProgress = Math.max(0, rig.captureProgress - dt * 0.5);
    }
    if (rig.owner === 'player' && player.oil < getMaxOil(s)) {
      player.oil = Math.min(getMaxOil(s), player.oil + OIL_PER_SECOND * s.upgradeStats.oilMult * dt);
    }
  }
}

/* ===== LOOT ===== */
function spawnLoot(s, x, y, enemy) {
  const xpType = enemy.scoreValue >= 150 ? 'xp_large' : enemy.scoreValue >= 100 ? 'xp_medium' : 'xp_small';
  const a1 = Math.random() * Math.PI * 2;
  s.loot.push({ ...LOOT_TYPES[xpType], x: x + Math.cos(a1) * 8, y: y + Math.sin(a1) * 8, life: 15, bobPhase: Math.random() * Math.PI * 2 });
  if (Math.random() < 0.35) {
    const ot = Math.random() < 0.3 ? 'oil_large' : 'oil_small';
    const a2 = Math.random() * Math.PI * 2;
    s.loot.push({ ...LOOT_TYPES[ot], x: x + Math.cos(a2) * 12, y: y + Math.sin(a2) * 12, life: 15, bobPhase: Math.random() * Math.PI * 2 });
  }
  if (Math.random() < 0.06) {
    const types = ['pow_speed', 'pow_damage', 'pow_shield', 'pow_magnet'];
    const pt = pickRandom(types);
    s.loot.push({ ...LOOT_TYPES[pt], x, y, life: 20, bobPhase: Math.random() * Math.PI * 2 });
  }
  if (enemy.isBoss) {
    for (let i = 0; i < 5; i++) {
      const a3 = Math.random() * Math.PI * 2;
      const r3 = rand(10, 30);
      s.loot.push({ ...LOOT_TYPES['xp_large'], x: x + Math.cos(a3) * r3, y: y + Math.sin(a3) * r3, life: 20, bobPhase: Math.random() * Math.PI * 2 });
    }
    s.loot.push({ ...LOOT_TYPES[pickRandom(['pow_speed', 'pow_damage', 'pow_shield', 'pow_magnet'])], x, y, life: 25, bobPhase: Math.random() * Math.PI * 2 });
  }
}

export function updateLoot(s, dt, soundFn) {
  const player = s.player;
  const pickR = getPickupRadius(s);
  const magnetR = 180 + (hasPowerup(s, 'magnet') ? 200 : 0);
  for (let i = s.loot.length - 1; i >= 0; i--) {
    const l = s.loot[i];
    l.life -= dt;
    l.bobPhase += dt * 3;
    if (l.life <= 0) { s.loot.splice(i, 1); continue; }
    const d = dist(l, player);
    if (d < magnetR && d > pickR) {
      const a = angle(l, player);
      const pullSpeed = 3 + (magnetR - d) / magnetR * 8;
      l.x += Math.cos(a) * pullSpeed;
      l.y += Math.sin(a) * pullSpeed;
    }
    if (d < pickR) {
      if (l.type === 'xp') {
        addXP(s, Math.floor(l.value * s.upgradeStats.xpMult), soundFn);
        spawnFloatingText(s, l.x, l.y - 10, '+' + l.value + ' XP', '#44ffcc', 10);
        soundFn('pickup', 0.15);
      } else if (l.type === 'oil') {
        player.oil = Math.min(getMaxOil(s), player.oil + l.value * s.upgradeStats.oilMult);
        spawnFloatingText(s, l.x, l.y - 10, '+' + l.value + ' OIL', '#888', 10);
        soundFn('pickup', 0.15);
      } else if (l.type === 'powerup') {
        addPowerup(s, l.effect, l.duration);
        spawnFloatingText(s, l.x, l.y - 15, l.label, l.color, 16);
        addShake(s, 3, true);
        spawnExplosion(s, l.x, l.y, l.color, 10);
        soundFn('powerup', 0.3);
        addScreenFlash(s, l.color, 0.12);
      }
      s.loot.splice(i, 1);
    }
  }
}
