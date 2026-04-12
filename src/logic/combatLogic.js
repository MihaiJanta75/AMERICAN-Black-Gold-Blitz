import {
  WORLD_W, WORLD_H, HOMING_TURN, CAPTURE_RADIUS, CAPTURE_TIME,
  OIL_PER_SECOND, MAGNET_RADIUS,
  CHAIN_RADIUS, NAPALM_DPS, NAPALM_RADIUS, NAPALM_DURATION,
  OIL_NOVA_RADIUS, OIL_NOVA_DAMAGE, KAMIKAZE_EXPLOSION_RADIUS, KAMIKAZE_DAMAGE,
  OIL_KILL_DROP, WRECK_LIFE, WRECK_COLLECT_RADIUS,
  BOMBER_BOMB_RADIUS, BOMBER_BOMB_DAMAGE,
  PIPELINE_INCOME_MULT, PIPELINE_HP,
  BLACK_HOLE_COST, BLACK_HOLE_RADIUS, BLACK_HOLE_DAMAGE, BLACK_HOLE_COOLDOWN,
  OIL_MARKET_INTERVAL, OIL_MARKET_DURATION,
  EVENT_INTERVAL, GEYSER_DURATION, GEYSER_OIL_RATE, GEYSER_RADIUS,
  SUPPLY_DROP_DURATION, SUPPLY_DROP_COLLECT_RADIUS,
  BLACKOUT_STORM_DURATION, SECTOR_ASSAULT_DURATION,
  MILESTONE_INTERVAL,
  RIG_DEPLETED_FADE, RIG_BURNOUT_FADE, RIG_BURNOUT_OIL_MIN, RIG_BURNOUT_OIL_MAX,
  RIG_SPAWN_INTERVAL, AI_UPGRADE_INTERVAL, OIL_OVERFLOW_DRAIN,
  TERRITORY_CLUSTER_RANGE, TERRITORY_BONUS_PER_NEIGHBOR,
  GOLD_RIG_INTERVAL, GOLD_RIG_INCOME_MULT, CURSED_RIG_CHANCE, CURSED_RIG_INCOME_MULT,
} from '../constants.js';
import { dist, angle, clamp, rand } from '../utils.js';
import { FACTIONS, LOOT_TYPES } from '../config.js';
import {
  getMaxOil, getBodyDamage, getPickupRadius, hasPowerup, addPowerup,
  spawnExplosion, spawnOilSpill, spawnFloatingText,
  addShake, addScreenFlash, registerKill, addXP, getHealthRegen,
  spawnRig,
} from '../state/GameState.js';
import { AI_UPGRADE_DEFS } from '../config.js';
import { findNearestEnemy } from './playerLogic.js';
import { onEnemyHit, onCommanderKilled, spawnBomber } from './enemyLogic.js';
import { UPGRADES } from '../config.js';
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

    // Pulse armor: shield break emits EMP (handled in playerLogic on activation)
    // EMP blast on damage
    if (s.upgradeStats.hasEmp) {
      for (const e of s.enemies) {
        if (dist(p, e) < s.upgradeStats.empRadius) {
          e.stunTimer = 1.5;
          spawnExplosion(s, e.x, e.y, '#44ffff', 6);
        }
      }
    }
    return;
  }

  // Armor reduction from stat_armor card and armor_plating upgrade
  let armorMult = 1;
  if (s.upgradeStats.armorReduction > 0) {
    armorMult *= (1 - s.upgradeStats.armorReduction);
  }
  armorMult = Math.max(0.15, armorMult);

  const actualDmg = amount * armorMult;
  // Critical oil state: enemies deal extra damage
  const critPenalty = p.oilState === 'critical' ? 1.20 : 1.0;
  p.oil -= actualDmg * critPenalty;
  s.totalDamageTaken += actualDmg;

  // Rampage breaks on first hit
  if (p.rampageActive) {
    p.rampageActive = false;
    spawnFloatingText(s, p.x, p.y - 30, 'RAMPAGE BROKEN!', '#ff6600', 14);
  }

  // Resonance resets on taking damage
  if (s.upgradeStats.resonanceActive && (s.upgradeStats.resonanceKills || 0) > 0) {
    s.upgradeStats.resonanceKills = 0;
    s.upgradeStats.resonanceReady = false;
  }

  // Glass Blade: body contact deals 3× damage (flagged by enemy type = 'body')
  // Handled at call site in combatLogic collision detection

  // Shield drone: absorb the next hit
  if ((s.upgradeStats.shieldDrones || 0) > 0 && s.upgradeStats.companionShieldTimers) {
    for (let si = 0; si < s.upgradeStats.shieldDrones; si++) {
      if ((s.upgradeStats.companionShieldTimers[si] || 0) <= 0) {
        s.upgradeStats.companionShieldTimers[si] = 8.0; // reset cooldown
        spawnFloatingText(s, p.x, p.y - 30, '🤖 SHIELD DRONE!', '#aa44ff', 13);
        // cancel the damage already applied
        p.oil = Math.min(getMaxOil(s), p.oil + actualDmg * critPenalty);
        return;
      }
    }
  }

  // Adaptive plating synergy: blocked damage (reduction amount) heals player
  if (s.upgradeStats.hasAdaptivePlating) {
    const blocked = amount - actualDmg;
    p.oil = Math.min(getMaxOil(s), p.oil + blocked * 0.6);
  }

  // Fortress Plating mutation: every hit that connects restores 5 oil
  if (s.upgradeStats.mutations?.fortress_plating) {
    p.oil = Math.min(getMaxOil(s), p.oil + 5);
  }

  p.invincible = 0.5 + (s.upgradeStats.extraInvincFrames || 0);
  spawnOilSpill(s, p.x, p.y);
  addShake(s, 4, true);
  soundFn('hit');
  addScreenFlash(s, '#ff0000', 0.15);
  s.vignetteIntensity = Math.min(0.5, s.vignetteIntensity + 0.2);

  // Counter-attack: buff player damage after taking a hit
  if (s.upgradeStats.counterAttackMult > 0) {
    p.counterAttackTimer = 3.0;
    spawnFloatingText(s, p.x, p.y - 20, 'COUNTER!', '#ff4488', 12);
  }

  // EMP blast on damage
  if (s.upgradeStats.hasEmp) {
    for (const e of s.enemies) {
      if (dist(p, e) < s.upgradeStats.empRadius) {
        e.stunTimer = 1.5;
        spawnExplosion(s, e.x, e.y, '#44ffff', 6);
      }
    }
  }

  // Body damage: small constant contact damage (always active)
  for (const e of s.enemies) {
    if (dist(p, e) < 35) {
      e.hp -= getBodyDamage(s) * 0.5;
      spawnExplosion(s, e.x, e.y, '#cc66ff', 4);
    }
  }
}

/* ===== CHAIN LIGHTNING ===== */
function applyChainLightning(s, hitX, hitY, initialDamage, excludeIdx) {
  const chainCount = s.upgradeStats.chainCount;
  if (chainCount <= 0) return;

  const alreadyHit = new Set([excludeIdx]);
  let srcX = hitX, srcY = hitY;
  let chainDmg = initialDamage * 0.55;

  for (let c = 0; c < chainCount; c++) {
    let bestD = Infinity, bestIdx = -1;
    for (let j = 0; j < s.enemies.length; j++) {
      if (alreadyHit.has(j)) continue;
      const d = dist({ x: srcX, y: srcY }, s.enemies[j]);
      if (d < CHAIN_RADIUS && d < bestD) { bestD = d; bestIdx = j; }
    }
    if (bestIdx === -1) break;
    const ce = s.enemies[bestIdx];
    ce.hp -= chainDmg;
    alreadyHit.add(bestIdx);
    // Lightning particle trail
    spawnExplosion(s, ce.x, ce.y, '#88ffff', 5);
    spawnFloatingText(s, ce.x, ce.y - 12, Math.floor(chainDmg) + '', '#88ffff', 11);
    srcX = ce.x; srcY = ce.y;
    chainDmg *= 0.6;
    onEnemyHit(s, ce);
  }
}

/* ===== NAPALM ZONE SPAWN ===== */
function spawnNapalmZone(s, x, y) {
  if (!s.napalmZones) s.napalmZones = [];
  const dps = NAPALM_DPS * (s.upgradeStats.napalmDpsMult || 1);
  s.napalmZones.push({ x, y, radius: NAPALM_RADIUS, dps, life: NAPALM_DURATION, maxLife: NAPALM_DURATION, tickTimer: 0 });
}

/* ===== COMBAT UPDATE ===== */
export function updateCombat(s, dt, soundFn) {
  const player = s.player;

  // Napalm zones: tick damage to enemies
  if (s.napalmZones && s.napalmZones.length > 0) {
    for (let ni = s.napalmZones.length - 1; ni >= 0; ni--) {
      const nz = s.napalmZones[ni];
      nz.life -= dt;
      if (nz.life <= 0) { s.napalmZones.splice(ni, 1); continue; }
      nz.tickTimer -= dt;
      if (nz.tickTimer <= 0) {
        nz.tickTimer = 0.4;
        for (const e of s.enemies) {
          if (dist(nz, e) < nz.radius + e.radius) {
            e.hp -= nz.dps * 0.4; // 0.4s tick
            onEnemyHit(s, e);
            // Poison Field synergy: napalm zones also apply poison
            if (s.upgradeStats.hasPoisonField) {
              e.poisonTimer = Math.max(e.poisonTimer || 0, 2.0);
              e.poisonDps = Math.max(e.poisonDps || 0, s.upgradeStats.poisonFieldDps || 6);
            }
          }
        }
        // Inferno barrage: spread to nearby enemies
        if (s.upgradeStats.hasInfernoBarrage && Math.random() < 0.4) {
          const nearby = s.enemies.filter(e => dist(nz, e) < nz.radius * 3 && dist(nz, e) > nz.radius);
          if (nearby.length > 0) {
            const target = pickRandom(nearby);
            spawnNapalmZone(s, target.x, target.y);
          }
        }
      }
    }
  }

  // Bomber bomb explosion — deal player damage if in blast radius
  for (const e of s.enemies) {
    if (e.type === 'bomber' && e.bombDropped && !e.damageDealt) {
      e.damageDealt = true;
      if (dist(e, player) < BOMBER_BOMB_RADIUS && player.invincible <= 0) {
        damagePlayer(s, BOMBER_BOMB_DAMAGE, soundFn);
      }
    }
  }

  // Drone collision with player (including kamikaze)
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.type !== 'drone') continue;

    const d = dist(e, player);
    if (e.subType === 'kamikaze' && d < KAMIKAZE_EXPLOSION_RADIUS * 0.6 && player.invincible <= 0) {
      // Kamikaze explosion
      damagePlayer(s, KAMIKAZE_DAMAGE, soundFn);
      spawnExplosion(s, e.x, e.y, FACTIONS[e.faction].accent, 25);
      addShake(s, 7, true);
      addScreenFlash(s, '#ff4400', 0.25);
      // Kamikaze also damages nearby enemies (AOE)
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        if (j === i) continue;
        if (dist(e, s.enemies[j]) < KAMIKAZE_EXPLOSION_RADIUS) {
          s.enemies[j].hp -= 20;
        }
      }
      e.hp = 0; // Kill the kamikaze
      continue;
    }

    if (d < 28 && player.invincible <= 0 && e.subType !== 'kamikaze') {
      // Skip if shielded by shield drone (shield bubble absorbs collision)
      if (!e.shieldBubble) {
        const glassMult = s.upgradeStats.glassBlade ? 3.0 : 1.0;
        damagePlayer(s, e.damage * glassMult, soundFn);
      }
      e.hp -= getBodyDamage(s);
      if (e.hp > 0) spawnExplosion(s, e.x, e.y, (FACTIONS[e.faction] || FACTIONS.red).accent, 8);
      addShake(s, 4, true);
    }
  }

  // Plane / chopper body collision with player (bug fix: they no longer pass through silently)
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.type !== 'plane' && e.type !== 'chopper') continue;
    if (e.hp <= 0) continue;
    const d = dist(e, player);
    if (d < 40 && player.invincible <= 0) {
      const glassMult = s.upgradeStats.glassBlade ? 3.0 : 1.0;
      damagePlayer(s, e.damage * 0.6 * glassMult, soundFn);
      // Push enemy away so it doesn't keep clipping
      const pushA = Math.atan2(e.y - player.y, e.x - player.x);
      e.x += Math.cos(pushA) * 20;
      e.y += Math.sin(pushA) * 20;
      if (e.vx !== undefined) {
        e.vx = Math.cos(pushA) * e.speed * 1.8;
        e.vy = Math.sin(pushA) * e.speed * 1.8;
      }
      e.hp -= getBodyDamage(s) * 0.4;
      addShake(s, 3, true);
    }
  }

  // Enemy attacks on player rigs
  for (const e of s.enemies) {
    for (const rig of s.rigs) {
      if (rig.owner === 'player' && rig.hp > 0 && dist(e, rig) < 60) {
        // Explosive payload AI upgrade: bonus splash damage to rigs
        const splashBonus = e.explosivePayload ? 6 : 0;
        rig.hp -= (10 + splashBonus) * dt;
        rig.underAttack = true;
        rig.attackWarning = 2.0;
        if (rig.hp <= 0) {
          // AI permanently destroys the rig — becomes a burnout wreck with salvage
          rig.owner = 'burnout';
          rig.hp = 0;
          rig.burnoutTimer = RIG_BURNOUT_FADE;
          rig.burnoutOil   = Math.floor(rand(RIG_BURNOUT_OIL_MIN, RIG_BURNOUT_OIL_MAX));
          spawnExplosion(s, rig.x, rig.y, '#ff8800', 30);
          spawnExplosion(s, rig.x, rig.y, '#ff2200', 15);
          spawnFloatingText(s, rig.x, rig.y - 30, '🔥 RIG DESTROYED!', '#ff4444', 16);
          addShake(s, 8, true);
          addScreenFlash(s, '#550000', 0.22);
          // Revenge: mark the closest attacker
          if (!s.revengeTarget) {
            let closestDist = Infinity, closestEnemy = null;
            for (const atk of s.enemies) {
              const d2 = dist(atk, rig);
              if (d2 < closestDist) { closestDist = d2; closestEnemy = atk; }
            }
            if (closestEnemy) {
              closestEnemy.isMarked = true;
              s.revengeTarget = closestEnemy;
              spawnFloatingText(s, closestEnemy.x, closestEnemy.y - 25, '☠ MARKED', '#ff2244', 14);
            }
          }
        }
      }
      // Oil thief drains player rigs faster
      if (e.subType === 'oil_thief' && rig.owner === 'player' && dist(e, rig) < CAPTURE_RADIUS) {
        rig.hp -= 15 * dt;
        player.oil = Math.max(0, player.oil - 1.5 * dt);
        rig.underAttack = true;
        rig.attackWarning = 2.0;
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
    if (e.hp > 0) continue;

    const f = FACTIONS[e.faction] || FACTIONS.red;
    spawnExplosion(s, e.x, e.y, f.accent, e.isBoss ? 30 : 18);

    // Oil nova: kills spray burning oil
    if (s.upgradeStats.hasOilNova) {
      const novaR = OIL_NOVA_RADIUS * s.upgradeStats.oilNovaRadius;
      for (const other of s.enemies) {
        if (other === e) continue;
        if (dist(other, e) < novaR) {
          other.hp -= OIL_NOVA_DAMAGE;
          // Shock Nova synergy: EMP all enemies hit by oil nova
          if (s.upgradeStats.hasShockNova) {
            other.stunTimer = Math.max(other.stunTimer || 0, 2.0);
            spawnExplosion(s, other.x, other.y, '#44ffff', 4);
          }
        }
      }
      spawnNapalmZone(s, e.x, e.y);
      spawnExplosion(s, e.x, e.y, '#dd8800', 8);
      if (s.upgradeStats.hasShockNova) {
        spawnExplosion(s, e.x, e.y, '#44ffff', 6);
      }
    }

    const factionAccent = f.accent;

    // --- Bounty contract kill ---
    let isBountyKill = false;
    if (e.isBounty) {
      isBountyKill = true;
      e.isBounty = false;
      if (s.bountyTarget === e) s.bountyTarget = null;
      s.bountyTimer = 45 + Math.random() * 20;
      // Reward: big oil payout + skip next upgrade cost
      const bountyOil = 60 + Math.floor(e.scoreValue * 0.8);
      player.oil = Math.min(getMaxOil(s), player.oil + bountyOil);
      s.bountySkipNext = true;
      spawnFloatingText(s, e.x, e.y - 40, '💰 BOUNTY! +' + bountyOil + ' OIL', '#ffcc00', 17);
      addScreenFlash(s, '#886600', 0.18);
    }

    // --- Revenge kill ---
    let isRevengeKill = false;
    if (e === s.revengeTarget || e.isMarked) {
      isRevengeKill = true;
      s.revengeTarget = null;
      e.isMarked = false;
      player.oil = Math.min(getMaxOil(s), player.oil + 30);
      player.revengeBuff = 5.0; // 5s damage buff
      spawnFloatingText(s, e.x, e.y - 35, '⚡ REVENGE! +30 OIL', '#ff4488', 16);
      addScreenFlash(s, '#440022', 0.15);
    }

    const scoreMultiplier = isBountyKill ? 3.0 : isRevengeKill ? 3.0 : 1.0;
    const gained = registerKill(s, Math.floor(e.scoreValue * scoreMultiplier), {
      isBoss: e.isBoss, subType: e.subType, type: e.type, factionColor: factionAccent,
    });
    const xpGain = Math.floor((e.scoreValue * 0.5 + (e.isBoss ? 100 : 0)) * s.upgradeStats.xpMult);
    addXP(s, xpGain, soundFn);
    // Scavenger: +300% kill oil; otherwise normal kill drop
    const killOilMult = s.upgradeStats.scavengerMode ? (s.upgradeStats.scavengerMult || 4.0) : 1.0;
    player.oil = Math.min(getMaxOil(s), player.oil + OIL_KILL_DROP * s.upgradeStats.oilMult * killOilMult);
    // Resonance: count kills without taking damage
    if (s.upgradeStats.resonanceActive && !s.upgradeStats.resonanceReady) {
      s.upgradeStats.resonanceKills = (s.upgradeStats.resonanceKills || 0) + 1;
      if (s.upgradeStats.resonanceKills >= (s.upgradeStats.resonanceKillsRequired || 5)) {
        s.upgradeStats.resonanceReady = true;
        spawnFloatingText(s, player.x, player.y - 50, '⚡ RESONANCE READY!', '#44ffcc', 16);
      }
    }
    spawnFloatingText(s, e.x, e.y - 20, '+' + gained, isBountyKill || isRevengeKill ? '#ffaa00' : '#ffcc00');
    spawnLoot(s, e.x, e.y, e);
    addShake(s, e.isBoss ? 8 : 3, true);
    soundFn('explosion', e.isBoss ? 0.5 : 0.3);
    s.totalDamageDealt += e.maxHp;

    // Rampage Nova synergy: kills during RAMPAGE explode in AoE
    if (s.upgradeStats.hasRampageNova && player.rampageActive) {
      const novaR = s.upgradeStats.rampageNovaRadius || 60;
      for (const ne of s.enemies) {
        if (ne === e) continue;
        if (dist(e, ne) < novaR) {
          ne.hp -= 35;
          spawnExplosion(s, ne.x, ne.y, '#ff4400', 4);
        }
      }
      spawnExplosion(s, e.x, e.y, '#ff6600', 10);
    }

    if (e.isBoss) s.totalKills.boss++;
    else s.totalKills[e.type] = (s.totalKills[e.type] || 0) + 1;

    // Spawn wreck for salvage (60% chance, not for kamikazes)
    if (e.subType !== 'kamikaze' && Math.random() < 0.6 && s.wrecks.length < 20) {
      s.wrecks.push({
        x: e.x, y: e.y,
        angle: Math.random() * Math.PI * 2,
        oil: Math.floor(rand(5, 14)),
        life: WRECK_LIFE, maxLife: WRECK_LIFE,
        type: e.type,
      });
    }

    // Named elite death: special rewards
    if (e.isElite && e.eliteDef) {
      const def = e.eliteDef;
      player.oil = Math.min(getMaxOil(s), player.oil + def.reward.oil);
      spawnFloatingText(s, e.x, e.y - 50, def.icon + ' ' + def.name + ' SLAIN! +' + def.reward.oil + ' OIL', def.color, 18);
      addScreenFlash(s, '#220044', 0.3);
      addShake(s, 12, true);
      if (def.reward.bountyCard || def.reward.upgradeSkip) {
        const pool = Object.keys(UPGRADES).filter(k => {
          const up = UPGRADES[k];
          return !up.synergy && (s.upgradeLevels[k] || 0) < up.maxLevel;
        });
        if (pool.length > 0) {
          s.bountyCards.push(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
      if (def.reward.statPoint || def.reward.freeStat) {
        // Old stat point reward converted to bonus XP
        addXP(s, 60);
        spawnFloatingText(s, e.x, e.y - 70, '+60 BONUS XP!', '#ffcc00', 14);
      }
      // Tyrant death: mass panic in all on-screen enemies
      if (e.isTyrant) {
        for (const ally of s.enemies) {
          const sx2 = ally.x - s.camera.x, sy2 = ally.y - s.camera.y;
          if (sx2 >= -100 && sx2 <= s.W + 100 && sy2 >= -100 && sy2 <= s.H + 100) {
            ally.panicTimer = Math.max(ally.panicTimer || 0, 5.0);
          }
        }
      }
    }

    // Commander Last Stand (EN6): at <15% HP triggers a berserk phase
    // (checked during updateCombat bullet hits — here we handle death after last stand)
    if ((e.subType === 'command' || e.isBoss) && e.lastStand) {
      // Last stand ended in death — no extra effect, already triggered
    } else if ((e.subType === 'command' || e.isBoss) && !e.lastStand && e.hp <= 0) {
      // Already handled below
    }

    // Commander/boss death: panic nearby enemies + respite window + bounty card
    if (e.subType === 'command' || e.isBoss) {
      onCommanderKilled(s, e);
      // Brief spawn pause so the kill lands — gives time to collect loot and breathe
      s.respiteTimer = e.isBoss ? 4.5 : 2.5;
      if (Math.random() < 0.40) {
        const pool = Object.keys(UPGRADES).filter(k => {
          const up = UPGRADES[k];
          return !up.synergy && (s.upgradeLevels[k] || 0) < up.maxLevel;
        });
        if (pool.length > 0) {
          s.bountyCards.push(pool[Math.floor(Math.random() * pool.length)]);
          spawnFloatingText(s, e.x, e.y - 45, '🎖 BOUNTY CARD!', '#ffcc00', 15);
        }
      }
    }

    s.enemies.splice(i, 1);
  }

  // Player bullets
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x += b.vx; b.y += b.vy; b.life -= dt;

    // Grenade bounce on world edges
    if (b.isGrenade) {
      if (b.x < 0 || b.x > WORLD_W) {
        b.vx = -b.vx * 0.75;
        b.x = b.x < 0 ? 1 : WORLD_W - 1;
        b.bouncesLeft = (b.bouncesLeft || 0) - 1;
      }
      if (b.y < 0 || b.y > WORLD_H) {
        b.vy = -b.vy * 0.75;
        b.y = b.y < 0 ? 1 : WORLD_H - 1;
        b.bouncesLeft = (b.bouncesLeft || 0) - 1;
      }
      if ((b.bouncesLeft || 0) < 0) { s.bullets.splice(i, 1); continue; }
    }

    if (b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) {
      s.bullets.splice(i, 1); continue;
    }

    // Volatile: 10% chance per frame to explode, dealing AoE
    if (b.volatile && Math.random() < 0.003) {
      const vR = 25;
      for (const ve of s.enemies) {
        if (dist(b, ve) < vR) ve.hp -= b.damage * 0.4;
      }
      spawnExplosion(s, b.x, b.y, '#ff6600', 4);
      // Volatile can hit player if close
      if (dist(b, player) < vR * 0.6 && player.invincible <= 0) damagePlayer(s, b.damage * 0.25, soundFn);
    }
    let hitSomething = false;
    for (let j = s.enemies.length - 1; j >= 0; j--) {
      const e = s.enemies[j];
      // Shield bubble: bullet absorbed, no damage
      if (e.shieldBubble && dist(b, e) < e.radius + 18) {
        spawnExplosion(s, b.x, b.y, '#aa44ff', 4);
        if (b.pierce <= 0) { s.bullets.splice(i, 1); hitSomething = true; break; }
        else { b.pierce--; b.damage *= 0.7; }
      }
      if (dist(b, e) < e.radius + 6) {
        // Time Sniper synergy: 3× damage to stunned (frozen) enemies
        // War Machine: apply armor shred (reduce enemy effective HP via bonus damage)
        let hitDmg = b.damage * (1 + (e.armorShred || 0));
        if (s.upgradeStats.hasTimeSniper && (e.stunTimer || 0) > 0) {
          hitDmg *= 3.0;
          spawnFloatingText(s, b.x, b.y - 8, 'SNIPE!', '#aa88ff', 11);
        }
        // Void Rounds: ignore 60% armor shred on enemies, slow on hit
        if (s.upgradeStats.hasVoidRounds) {
          hitDmg *= 1.6; // effectively ignores 60% of any damage reduction
          e.stunTimer = Math.max(e.stunTimer || 0, 0.3); // brief slow
        }
        e.hp -= hitDmg;
        s.totalDamageDealt += hitDmg;
        onEnemyHit(s, e);

        // Rocket / Grenade AoE on impact
        if (b.isRocket || b.isGrenade) {
          const aoeR = b.isGrenade ? (b.grenadeRadius || 60) : (b.rocketRadius || 40);
          const aoeColor = b.isGrenade ? '#ff4400' : '#ff8800';
          for (const ae of s.enemies) {
            if (ae === e) continue;
            if (dist(b, ae) < aoeR) {
              ae.hp -= hitDmg * 0.6;
              s.totalDamageDealt += hitDmg * 0.6;
            }
          }
          spawnExplosion(s, b.x, b.y, aoeColor, 8);
          addShake(s, b.isGrenade ? 4 : 3);
          // AoE can splash the player too
          if (dist(b, player) < aoeR * 0.5 && player.invincible <= 0) damagePlayer(s, hitDmg * 0.3, soundFn);
          s.bullets.splice(i, 1); hitSomething = true;
          break;
        }

        // War Machine synergy: burst bullets shred armor
        if (s.upgradeStats.hasWarMachine && b.isBurst) {
          e.armorShred = Math.min(0.5, (e.armorShred || 0) + 0.05);
        }

        if (b.crit) {
          spawnExplosion(s, b.x, b.y, '#ff0000', 6);
          spawnFloatingText(s, b.x, b.y - 10, 'CRIT!', '#ff4444');
          if (s.time - s.lastCritSoundTime > 0.15) { soundFn('explosion', 0.15); s.lastCritSoundTime = s.time; }
          // Overkill synergy: crits split into 2 extra piercing bullets
          if (s.upgradeStats.hasOverkill) {
            for (let sp = 0; sp < 2; sp++) {
              const splitA = b.angle !== undefined ? b.angle + (sp === 0 ? 0.35 : -0.35) :
                Math.atan2(b.vy, b.vx) + (sp === 0 ? 0.35 : -0.35);
              const bspd = Math.hypot(b.vx, b.vy);
              s.bullets.push({ x: b.x, y: b.y, vx: Math.cos(splitA) * bspd, vy: Math.sin(splitA) * bspd,
                life: 0.6, damage: b.damage * 0.5, crit: false, pierce: 1 });
            }
          }
        } else {
          spawnExplosion(s, b.x, b.y, '#ffcc00', 4);
        }

        // Chain lightning
        applyChainLightning(s, b.x, b.y, hitDmg, j);

        // Frost Rounds: slow enemy
        if (s.upgradeLevels['frost_rounds'] > 0) {
          e.stunTimer = Math.max(e.stunTimer || 0, s.upgradeStats.frostRoundsDuration || 1.5);
          e.frosted = true;
          e.speed = (e.baseSpeed || e.speed) * 0.7;
          spawnParticle(s, e.x, e.y, 0, -0.5, 0.3, 4, '#88ddff', 'circle');
          // Shatter Strike synergy: frozen enemies take bonus damage
          if (s.upgradeStats.hasShatterStrike) {
            e.hp -= hitDmg * ((s.upgradeStats.shatterStrikeMult || 1.80) - 1);
            s.totalDamageDealt += hitDmg * ((s.upgradeStats.shatterStrikeMult || 1.80) - 1);
          }
        }

        // Armor Shred: reduce enemy armor per hit
        if (s.upgradeLevels['armor_shred'] > 0) {
          const maxShred = s.upgradeStats.armorShredMax || 0.40;
          e.armorShred = Math.min(maxShred, (e.armorShred || 0) + (s.upgradeStats.armorShredPerHit || 0.08));
          // Toxic Shred synergy: poisoned enemies get extra armor penalty
          if (s.upgradeStats.hasToxicShred && (e.poisonTimer || 0) > 0) {
            e.armorShred = Math.min(maxShred + 0.20, e.armorShred + (s.upgradeStats.toxicShredArmor || 0.15));
          }
        }

        // Toxic Rounds: apply poison on hit
        if (s.upgradeLevels['toxic_rounds'] > 0) {
          e.poisonTimer = Math.max(e.poisonTimer || 0, s.upgradeStats.toxicRoundsDuration || 2.0);
          e.poisonDps = (s.upgradeStats.toxicRoundsDps || 3) * (s.upgradeStats.hasPoisonField ? 1 : 1);
        }

        // Echo Strike: every Nth bullet fires a duplicate
        if (s.upgradeLevels['echo_strike'] > 0) {
          s.upgradeStats.echoStrikeCount = ((s.upgradeStats.echoStrikeCount || 0) + 1);
          const period = s.upgradeStats.echoStrikePeriod || 3;
          if (s.upgradeStats.echoStrikeCount >= period) {
            s.upgradeStats.echoStrikeCount = 0;
            // Fire a duplicate bullet in same direction
            const echoB = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, life: 0.6, damage: b.damage * 0.8, pierce: b.pierce || 0, crit: false };
            s.bullets.push(echoB);
            spawnParticle(s, b.x, b.y, 0, 0, 0.2, 6, '#ff88ff', 'circle');
            // Echo Chain synergy: echo shot also arcs chain lightning
            if (s.upgradeStats.hasEchoChain) {
              const saved = s.upgradeStats.chainCount;
              s.upgradeStats.chainCount = s.upgradeStats.echoChainCount || 1;
              applyChainLightning(s, b.x, b.y, b.damage * 0.5, j);
              s.upgradeStats.chainCount = saved;
            }
            // Frost Echo synergy: echo shot leaves frost zone
            if (s.upgradeStats.hasFrostEcho) {
              for (const fe of s.enemies) {
                if (dist(b, fe) < 60) {
                  fe.stunTimer = Math.max(fe.stunTimer || 0, s.upgradeStats.frostEchoDuration || 2.0);
                  fe.frosted = true;
                }
              }
            }
          }
        }

        // Napalm: leave fire zone on impact
        if (s.upgradeStats.hasNapalm) {
          spawnNapalmZone(s, b.x, b.y);
        }

        // Explosive rounds: AoE on impact
        if (s.upgradeStats.hasExplosiveRounds) {
          const blastR = 30;
          for (const be of s.enemies) {
            if (be === s.enemies[j]) continue;
            if (dist(b, be) < blastR) be.hp -= hitDmg * s.upgradeStats.explosiveRoundsMult;
          }
          spawnExplosion(s, b.x, b.y, '#ff8800', 5);
          // Chain Reaction synergy: explosions also arc lightning
          if (s.upgradeStats.hasChainReaction) {
            applyChainLightning(s, b.x, b.y, hitDmg * 0.3, j);
          }
        }
        // Vampire rounds: restore oil per hit + Blood Money synergy
        if (s.upgradeStats.vampireHeal > 0) {
          player.oil = Math.min(getMaxOil(s), player.oil + s.upgradeStats.vampireHeal);
          // Blood Money: also drain oil from nearby enemy rigs
          if (s.upgradeStats.hasBloodMoney) {
            for (const rig of s.rigs) {
              if (rig.owner === 'enemy' && dist(e, rig) < 150) {
                rig.hp -= 3; // drain rig hp as stolen oil
                player.oil = Math.min(getMaxOil(s), player.oil + 0.5);
              }
            }
          }
        }

        // EN6 — Commander Last Stand: triggers at <15% HP
        if ((e.subType === 'command' || e.isBoss) && !e.lastStand && e.hp > 0 && e.hp < e.maxHp * 0.15) {
          e.lastStand = true;
          e.lastStandTimer = 5.0;
          e.speed = e.baseSpeed * 2.0;
          e.stunTimer = 0; // immune to stun during last stand
          spawnFloatingText(s, e.x, e.y - 30, '☠ LAST STAND!', '#ff2200', 16);
          addScreenFlash(s, '#330000', 0.18);
          // Emergency reinforcements
          for (let ls = 0; ls < 3; ls++) {
            const la = Math.random() * Math.PI * 2;
            const lx = e.x + Math.cos(la) * 60;
            const ly = e.y + Math.sin(la) * 60;
            // import-free: directly push a drone
            s.enemies.push({
              type: 'drone', faction: e.faction, subType: 'normal',
              x: lx, y: ly, vx: 0, vy: 0,
              angle: 0, hp: 35, maxHp: 35, speed: 2.2, baseSpeed: 2.2,
              radius: 9, damage: 10, scoreValue: 40, fireCooldown: 1,
              stunTimer: 0, panicTimer: 0, alerted: true, retreatAngle: Math.random() * Math.PI * 2,
            });
          }
        }
        // Tick last stand timer (immune to Time Warp stun during it)
        if (e.lastStand) {
          e.lastStandTimer = (e.lastStandTimer || 0) - dt;
          e.stunTimer = 0; // force-clear stun immunity
          if (e.lastStandTimer <= 0) e.lastStand = false;
        }

        if (b.pierce > 0) { b.pierce--; b.damage *= 0.7; }
        else { s.bullets.splice(i, 1); hitSomething = true; break; }
      }
    }
    if (hitSomething) continue;
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
    } else {
      m.target = findNearestEnemy(s, m);
    }

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
        s.totalDamageDealt += m.damage;
        onEnemyHit(s, s.enemies[j]);

        if (m.isWarhead) {
          // Warhead: massive AoE explosion
          const blastR = 90;
          for (let k = s.enemies.length - 1; k >= 0; k--) {
            if (k === j) continue;
            const blastD = dist(m, s.enemies[k]);
            if (blastD < blastR) {
              const falloff = 1 - blastD / blastR;
              s.enemies[k].hp -= m.damage * 0.7 * falloff;
              onEnemyHit(s, s.enemies[k]);
            }
          }
          spawnExplosion(s, m.x, m.y, '#ff4400', 40);
          spawnExplosion(s, m.x, m.y, '#ffaa00', 20);
          addShake(s, 10, true);
          addScreenFlash(s, '#ff2200', 0.2);
          soundFn('explosion', 0.7);
          spawnFloatingText(s, m.x, m.y - 30, '💣 WARHEAD!', '#ff4400', 16);
          if (s.upgradeStats.hasNapalm) spawnNapalmZone(s, m.x, m.y);
        } else {
          spawnExplosion(s, m.x, m.y, '#ff8800', 15);
          addShake(s, 5, true);
          soundFn('explosion', 0.4);
          if (s.upgradeStats.hasNapalm) spawnNapalmZone(s, m.x, m.y);
        }
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
    if (dist(b, player) < 18 && player.invincible <= 0) {
      damagePlayer(s, b.damage, soundFn);
      s.enemyBullets.splice(i, 1);
    }
  }

  // Kill feed timer decay
  for (let i = s.killFeed.length - 1; i >= 0; i--) {
    s.killFeed[i].timer -= dt;
    if (s.killFeed[i].timer <= 0) s.killFeed.splice(i, 1);
  }
}

/* ===== DYNAMIC EVENTS ENGINE ===== */
export function updateEvents(s, dt, soundFn) {
  // Oil market
  const mkt = s.oilMarket;
  if (mkt.active) {
    mkt.timer -= dt;
    if (mkt.timer <= 0) {
      mkt.active = false; mkt.mult = 1.0; mkt.label = '';
      mkt.nextEvent = OIL_MARKET_INTERVAL + rand(-10, 10);
    }
  } else {
    mkt.nextEvent -= dt;
    if (mkt.nextEvent <= 0) {
      mkt.active = true;
      const roll = Math.random();
      if (roll < 0.45) { mkt.mult = 0.6 + Math.random() * 0.3; mkt.label = '📉 OIL GLUT'; }
      else if (roll < 0.80) { mkt.mult = 1.4 + Math.random() * 0.4; mkt.label = '📈 MARKET SPIKE'; }
      else { mkt.mult = 1.8 + Math.random() * 0.3; mkt.label = '🔥 PRICE SURGE'; }
      mkt.timer = OIL_MARKET_DURATION;
      spawnFloatingText(s, s.player.x, s.player.y - 70, mkt.label, mkt.mult >= 1.4 ? '#44ff88' : '#ff8844', 14);
    }
  }

  // Dynamic game events
  if (s.activeEvent) {
    s.activeEvent.timer -= dt;
    const ev = s.activeEvent;

    if (ev.type === 'geyser') {
      ev.data.oilTimer -= dt;
      if (ev.data.oilTimer <= 0) {
        ev.data.oilTimer = GEYSER_OIL_RATE;
        const oilAmt = Math.floor(rand(8, 18) * (s.milestoneUnlocks?.opportunist ? (s.upgradeStats.opportunistMult || 1.4) : 1));
        s.loot.push({
          color: '#222', glow: '#555', radius: 6, value: oilAmt, type: 'oil',
          x: ev.data.x + rand(-GEYSER_RADIUS * 0.5, GEYSER_RADIUS * 0.5),
          y: ev.data.y + rand(-GEYSER_RADIUS * 0.5, GEYSER_RADIUS * 0.5),
          life: 8, bobPhase: Math.random() * Math.PI * 2,
        });
      }
    }

    if (ev.type === 'supply_drop' && !ev.data.claimed) {
      if (dist(s.player, ev.data) < SUPPLY_DROP_COLLECT_RADIUS) {
        ev.data.claimed = true;
        const oilBonus = Math.floor(25 * (s.milestoneUnlocks?.opportunist ? (s.upgradeStats.opportunistMult || 1.4) : 1));
        s.player.oil = Math.min(getMaxOil(s), s.player.oil + oilBonus);
        // Add a bounty card
        const pool = Object.keys(UPGRADES).filter(k => {
          const up = UPGRADES[k];
          return !up.synergy && (s.upgradeLevels[k] || 0) < up.maxLevel;
        });
        if (pool.length > 0) s.bountyCards.push(pool[Math.floor(Math.random() * pool.length)]);
        spawnFloatingText(s, s.player.x, s.player.y - 40, '📦 SUPPLY CLAIMED! +' + oilBonus + ' oil', '#44ff88', 14);
        addScreenFlash(s, '#004400', 0.12);
        soundFn('powerup', 0.3);
      }
    }

    if (ev.timer <= 0) {
      s.activeEvent = null;
    }
  } else {
    s.nextEventTime -= dt;
    if (s.nextEventTime <= 0 && s.timeSurvived > 30) {
      s.nextEventTime = EVENT_INTERVAL + rand(-15, 20);
      const roll = Math.random();
      if (roll < 0.30) {
        // Geyser
        const gx = rand(300, WORLD_W - 300), gy = rand(300, WORLD_H - 300);
        s.activeEvent = { type: 'geyser', timer: GEYSER_DURATION, maxTimer: GEYSER_DURATION, data: { x: gx, y: gy, oilTimer: GEYSER_OIL_RATE } };
        spawnFloatingText(s, s.player.x, s.player.y - 70, '🛢 OIL GEYSER ERUPTS!', '#888', 16);
      } else if (roll < 0.55) {
        // Supply drop
        const dx = rand(200, WORLD_W - 200), dy = rand(200, WORLD_H - 200);
        s.activeEvent = { type: 'supply_drop', timer: SUPPLY_DROP_DURATION, maxTimer: SUPPLY_DROP_DURATION, data: { x: dx, y: dy, claimed: false, bobPhase: 0 } };
        spawnFloatingText(s, s.player.x, s.player.y - 70, '📦 SUPPLY DROP!', '#44ff88', 16);
      } else if (roll < 0.75) {
        // Sector assault
        s.activeEvent = { type: 'sector_assault', timer: SECTOR_ASSAULT_DURATION, maxTimer: SECTOR_ASSAULT_DURATION, data: {} };
        spawnFloatingText(s, s.player.x, s.player.y - 70, '⚔ SECTOR ASSAULT!', '#ff4444', 18);
        addScreenFlash(s, '#440000', 0.2);
        addShake(s, 5, true);
      } else {
        // Blackout storm
        s.activeEvent = { type: 'blackout_storm', timer: BLACKOUT_STORM_DURATION, maxTimer: BLACKOUT_STORM_DURATION, data: {} };
        spawnFloatingText(s, s.player.x, s.player.y - 70, '⛈ BLACKOUT STORM!', '#8866ff', 18);
        addScreenFlash(s, '#110033', 0.2);
      }
    }
  }
}

/* ===== WRECKS / SALVAGE ===== */
export function updateWrecks(s, dt, soundFn) {
  for (let i = s.wrecks.length - 1; i >= 0; i--) {
    const w = s.wrecks[i];
    w.life -= dt;
    if (w.life <= 0) { s.wrecks.splice(i, 1); continue; }
    if (dist(w, s.player) < WRECK_COLLECT_RADIUS) {
      const mult = s.milestoneUnlocks?.salvager ? (s.upgradeStats.salvagerMult || 1.5) : 1.0;
      const oilGain = Math.floor(w.oil * mult);
      s.player.oil = Math.min(getMaxOil(s), s.player.oil + oilGain);
      spawnFloatingText(s, w.x, w.y - 12, '+' + oilGain + ' SALVAGE', '#88aacc', 11);
      soundFn('pickup', 0.1);
      s.wrecks.splice(i, 1);
    }
  }
}

/* ===== PIPELINES ===== */
export function updatePipelines(s, dt, soundFn) {
  // Reset pipeline income on all rigs
  for (const rig of s.rigs) rig.pipelineIncome = 0;

  for (let i = s.pipelines.length - 1; i >= 0; i--) {
    const pipe = s.pipelines[i];
    // Remove if either rig is no longer owned by player
    if (pipe.rigA.owner !== 'player' || pipe.rigB.owner !== 'player') {
      spawnFloatingText(s, (pipe.rigA.x + pipe.rigB.x) / 2, (pipe.rigA.y + pipe.rigB.y) / 2 - 20, 'PIPELINE LOST!', '#ff4444', 13);
      s.pipelines.splice(i, 1);
      continue;
    }
    // Enemy damage to pipeline (enemies near midpoint)
    const mx = (pipe.rigA.x + pipe.rigB.x) / 2;
    const my = (pipe.rigA.y + pipe.rigB.y) / 2;
    for (const e of s.enemies) {
      if (dist(e, { x: mx, y: my }) < 50) {
        pipe.hp -= 8 * dt;
      }
    }
    if (pipe.hp <= 0) {
      spawnFloatingText(s, mx, my - 20, '💥 PIPELINE DESTROYED!', '#ff4444', 14);
      spawnExplosion(s, mx, my, '#ff6600', 12);
      s.pipelines.splice(i, 1);
      continue;
    }
    // Apply income bonus
    const mult = s.milestoneUnlocks?.pipeline_expert ? (s.upgradeStats.pipelineIncomeMult || 3) : PIPELINE_INCOME_MULT;
    pipe.rigA.pipelineIncome = mult;
    pipe.rigB.pipelineIncome = mult;
  }
}

/* ===== OIL RIGS ===== */
export function updateRigs(s, dt) {
  const player = s.player;
  let oilIncome = 0;

  // ── Wildcard timers ────────────────────────────────────────────────────
  if (s.upgradeStats.hasLuckyBreak && s.upgradeStats.luckyBreakTimer > 0) {
    s.upgradeStats.luckyBreakTimer -= dt;
  }
  if (s.upgradeStats.hasWarcry) {
    if (s.upgradeStats.warcryTimer > 0) {
      s.upgradeStats.warcryTimer -= dt;
    } else {
      s.upgradeStats.warcryStacks = 0;
    }
    // Warcry damage bonus is damageMult base × (1 + stacks * 0.10), recomputed each frame
    const warcryBonus = 1 + Math.min(10, s.upgradeStats.warcryStacks || 0) * 0.10;
    s.upgradeStats.warcryDamageMult = warcryBonus;
  }

  // ── Progressive rig spawn timer ────────────────────────────────────────
  s.nextRigSpawnTime -= dt;
  if (s.nextRigSpawnTime <= 0) {
    const prevCount = s.rigs.length;
    spawnRig(s);
    s.totalRigsSpawned = (s.totalRigsSpawned || 0) + 1;
    // Early game spawns faster (30-45s between rigs for first 60s), then normal progression
    let baseInterval;
    if (s.timeSurvived < 60) {
      baseInterval = 35; // Fast spawn in early game (~35s between rigs)
    } else {
      // Normal progression: tightens slightly over time (max spawn rate 35s at late game)
      baseInterval = Math.max(35, RIG_SPAWN_INTERVAL - s.timeSurvived * 0.04);
    }
    s.nextRigSpawnTime = baseInterval + rand(-8, 12);
    // Announce and tag new rig
    const lastRig = s.rigs[s.rigs.length - 1];
    if (lastRig && s.rigs.length > prevCount) {
      // Cursed rig chance (only after first 60s)
      if (s.timeSurvived > 60 && Math.random() < CURSED_RIG_CHANCE) {
        lastRig.rigType = 'cursed';
        spawnFloatingText(s, lastRig.x, lastRig.y - 40, '⚠ CURSED FIELD! (3× oil)', '#ff6600', 15);
        addScreenFlash(s, '#220000', 0.1);
      } else {
        spawnFloatingText(s, lastRig.x, lastRig.y - 40, '⛽ NEW OIL FIELD!', '#44ff88', 15);
        addScreenFlash(s, '#003300', 0.08);
      }
    }
  }

  // ── Gold Rig spawn timer (appears periodically as high-value contested rig) ──
  if (!s.goldRigTimer) s.goldRigTimer = GOLD_RIG_INTERVAL;
  s.goldRigTimer -= dt;
  if (s.goldRigTimer <= 0 && s.timeSurvived > 90) {
    s.goldRigTimer = GOLD_RIG_INTERVAL + rand(-15, 20);
    // Only spawn if below max rig count
    if (s.rigs.filter(r => r.owner !== 'burnout').length < 10) {
      const margin = 300;
      const gx = rand(margin, 4000 - margin);
      const gy = rand(margin, 4000 - margin);
      const goldRig = { x: gx, y: gy, owner: 'neutral', captureProgress: 0,
        hp: 280, maxHp: 280, flamePhase: Math.random() * Math.PI * 2,
        craneAngle: 0, underAttack: false, attackWarning: 0,
        enemyCaptureProgress: 0, turretTimer: 0, pipelineIncome: 1,
        oilReserve: 2000, depleteTimer: 0, burnoutTimer: 0, burnoutOil: 0,
        spawnFlash: 0.0, rigType: 'gold',
      };
      s.rigs.push(goldRig);
      spawnFloatingText(s, gx, gy - 50, '💰 GOLD RIG DISCOVERED!', '#ffcc00', 18);
      addScreenFlash(s, '#664400', 0.18);
      // Spawn escort squad targeting this rig
      s._goldRigEscortTarget = goldRig;
    }
  }

  // ── AI upgrade timer ────────────────────────────────────────────────────
  s.aiUpgradeTimer -= dt;
  if (s.aiUpgradeTimer <= 0 && s.timeSurvived > 30) {
    const available = AI_UPGRADE_DEFS.filter(d => !(s.aiUpgrades || []).includes(d.key));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      s.aiUpgrades = [...(s.aiUpgrades || []), pick.key];
      spawnFloatingText(s, player.x, player.y - 70, '⚠ ENEMY UPGRADE: ' + pick.name, pick.color, 14);
      addScreenFlash(s, '#220011', 0.12);
    }
    s.aiUpgradeTimer = AI_UPGRADE_INTERVAL;
  }

  // ── Territory cluster counting (player rigs only) ────────────────────────
  const activePlayerRigs = s.rigs.filter(r => r.owner === 'player' && r.hp > 0);
  for (const rig of activePlayerRigs) {
    const prev = rig.clusterCount || 0;
    rig.clusterCount = 0;
    for (const other of activePlayerRigs) {
      if (other === rig) continue;
      if (Math.hypot(rig.x - other.x, rig.y - other.y) <= TERRITORY_CLUSTER_RANGE) {
        rig.clusterCount++;
      }
    }
    // First-time cluster event: announce to player
    if (prev === 0 && rig.clusterCount > 0) {
      spawnFloatingText(s, rig.x, rig.y - 44, '⬡ CLUSTER BONUS ACTIVE!', '#44ff88', 13);
    }
  }

  // ── Per-rig logic ────────────────────────────────────────────────────────
  for (let ri = s.rigs.length - 1; ri >= 0; ri--) {
    const rig = s.rigs[ri];

    // Spawn flash animation (fade-in)
    if (rig.spawnFlash !== undefined && rig.spawnFlash < 1.0)
      rig.spawnFlash = Math.min(1.0, rig.spawnFlash + dt * 0.6);

    // ── Burnout wreck ────────────────────────────────────────────────────
    if (rig.owner === 'burnout') {
      rig.burnoutTimer -= dt;
      // Player can fly over and collect salvage oil
      if (rig.burnoutOil > 0 && dist(player, rig) < 55) {
        player.oil = Math.min(getMaxOil(s), player.oil + rig.burnoutOil);
        spawnFloatingText(s, rig.x, rig.y - 25, '+' + rig.burnoutOil + ' SALVAGE', '#88aacc', 13);
        rig.burnoutOil = 0;
      }
      if (rig.burnoutTimer <= 0) { s.rigs.splice(ri, 1); }
      continue;
    }

    // ── Depleted field ───────────────────────────────────────────────────
    if (rig.owner === 'depleted') {
      rig.depleteTimer -= dt;
      if (rig.depleteTimer <= 0) { s.rigs.splice(ri, 1); }
      continue;
    }

    // ── Standard hp→neutral reset (only for non-burnout rigs) ───────────
    if (rig.hp <= 0 && rig.owner !== 'enemy') {
      rig.owner = 'neutral';
      rig.enemyCaptureProgress = 0;
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
        s.score += 200; addXP(s, 50, null);
        spawnFloatingText(s, rig.x, rig.y - 30, '+200 CAPTURED!', '#44ff88', 16);
        addScreenFlash(s, '#004400', 0.1);
      }
    } else if (rig.owner !== 'player') {
      rig.captureProgress = Math.max(0, rig.captureProgress - dt * 0.5);
    }

    if (rig.owner === 'player') {
      const playerRigCount = s.rigs.filter(r => r.owner === 'player').length;
      const warEcoMult = (s.milestoneUnlocks?.war_economy && playerRigCount >= 3) ? (1 + (s.upgradeStats.warEconomyBonus || 0.30)) : 1.0;
      const marketMult = s.oilMarket?.mult || 1.0;
      const pipeMult   = rig.pipelineIncome || 1.0;
      const networkBonus = s.upgradeStats.supplyNetworkBonus || 0;
      const clusterMult = 1 + Math.min(rig.clusterCount || 0, 3) * TERRITORY_BONUS_PER_NEIGHBOR;
      // Gold/cursed rig multipliers
      const specialMult = rig.rigType === 'gold' ? GOLD_RIG_INCOME_MULT :
                          rig.rigType === 'cursed' ? CURSED_RIG_INCOME_MULT : 1.0;
      const magnate = s.upgradeStats.hasOilMagnate ? (s.upgradeStats.oilMagnateBonus || 2.0) : 1.0;
      const scavengerMult = s.upgradeStats.scavengerMode ? 0.60 : 1.0;
      const incomeRate = (OIL_PER_SECOND * s.upgradeStats.oilMult * warEcoMult * marketMult * pipeMult + networkBonus) * clusterMult * specialMult * magnate * scavengerMult;
      if (!s.upgradeStats.deathWishBlocking) {
        player.oil = Math.min(getMaxOil(s), player.oil + incomeRate * dt);
      }
      oilIncome += incomeRate;
      rig.hp = Math.min(rig.maxHp, rig.hp + 3 * dt);

      // Drain the finite oil reserve
      rig.oilReserve = Math.max(0, (rig.oilReserve || 0) - incomeRate * dt);
      if (rig.oilReserve <= 0) {
        // Rig runs dry — becomes depleted
        rig.owner = 'depleted';
        rig.depleteTimer = RIG_DEPLETED_FADE;
        spawnFloatingText(s, rig.x, rig.y - 35, '⚠ FIELD DEPLETED', '#ffaa44', 14);
        addScreenFlash(s, '#331100', 0.1);
      }
    }
  }
  s.oilIncomeRate = oilIncome;

  // Oil overflow: tanks over-pressure — drain excess when at cap
  const maxOil = getMaxOil(s);
  if (player.oil >= maxOil) {
    player.oil = Math.max(maxOil - OIL_OVERFLOW_DRAIN * dt, maxOil * 0.98);
  }

  // Companion oil drain
  if ((s.upgradeStats.companionOilDrain || 0) > 0 && player.oil > 0) {
    player.oil = Math.max(0, player.oil - s.upgradeStats.companionOilDrain * dt);
  }

  // Chaos card drains
  if ((s.upgradeStats.bloodTitheDrain || 0) > 0) {
    player.oil = Math.max(0, player.oil - s.upgradeStats.bloodTitheDrain * dt);
  }

  // Oil Junkie: tank drains 15% faster (applied per-second on top of normal drain)
  if (s.upgradeStats.oilJunkieActive) {
    player.oil = Math.max(0, player.oil - maxOil * 0.15 * dt / 60);
  }

  // Death Wish: block rig income when active and below 20% oil
  if (s.upgradeStats.deathWishActive) {
    const deathWishOn = player.oil / maxOil < 0.20;
    s.upgradeStats.deathWishBlocking = deathWishOn;
    if (deathWishOn) {
      // Invincible while active
      player.invincible = Math.max(player.invincible, 0.1);
    }
  }
}

/* ===== LOOT ===== */
function spawnLoot(s, x, y, enemy) {
  const xpType = enemy.scoreValue >= 150 ? 'xp_large' : enemy.scoreValue >= 100 ? 'xp_medium' : 'xp_small';
  const a1 = Math.random() * Math.PI * 2;
  s.loot.push({ ...LOOT_TYPES[xpType], x: x + Math.cos(a1) * 8, y: y + Math.sin(a1) * 8, life: 15, bobPhase: Math.random() * Math.PI * 2 });

  if (Math.random() < 0.20) {
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
