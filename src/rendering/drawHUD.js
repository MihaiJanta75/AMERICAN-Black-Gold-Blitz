import {
  WORLD_W, MAX_LEVEL, WANTED_THRESHOLDS,
  DASH_COOLDOWN, COMBO_DECAY, STREAK_DECAY, RIG_COUNT, JOYSTICK_RADIUS,
  BLACK_HOLE_COOLDOWN, PIPELINE_BUILD_RADIUS,
} from '../constants.js';
import { getMaxOil, xpForLevel, hasPowerup, getPickupRadius } from '../state/GameState.js';
import { FACTIONS, UPGRADES, LOOT_TYPES, AI_UPGRADE_DEFS } from '../config.js';
import { clamp } from '../utils.js';

export function drawHUD(ctx, s, settings) {
  const { W, H, time, player } = s;
  const pad = 16, barW = Math.min(240, W * 0.35), barH = 20;

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const panelH = 106 + (s.totalUpgrades > 0 ? 18 : 0) + (s.oilMarket.active ? 14 : 0);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad - 6, pad - 6, barW + 16, panelH, 8); ctx.fill(); }
  else ctx.fillRect(pad - 6, pad - 6, barW + 16, panelH);

  // Oil state border
  const oilPct = player.oil / getMaxOil(s);
  let stateBorderColor = null;
  if (player.oilState === 'critical') stateBorderColor = 'rgba(255,50,50,' + (0.4 + Math.sin(time * 8) * 0.3) + ')';
  else if (player.oilState === 'flush') stateBorderColor = 'rgba(68,255,136,0.3)';
  if (stateBorderColor) {
    ctx.strokeStyle = stateBorderColor; ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad - 6, pad - 6, barW + 16, panelH, 8); ctx.stroke(); }
    else ctx.strokeRect(pad - 6, pad - 6, barW + 16, panelH);
  }

  // Oil bar
  ctx.fillStyle = '#111';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, pad, barW, barH, 4); ctx.fill(); }
  else ctx.fillRect(pad, pad, barW, barH);
  const oilColor = oilPct > 0.5 ? '#44dd44' : oilPct > 0.25 ? '#dddd44' : '#dd4444';
  ctx.fillStyle = oilColor;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, pad, Math.max(0, barW * oilPct), barH, 4); ctx.fill(); }
  else ctx.fillRect(pad, pad, Math.max(0, barW * oilPct), barH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  ctx.fillText('OIL: ' + Math.floor(player.oil) + ' / ' + getMaxOil(s), pad + 4, pad + 15);

  // Oil state label
  if (player.oilState === 'critical') {
    ctx.fillStyle = 'rgba(255,80,80,' + (0.7 + Math.sin(time * 10) * 0.3) + ')';
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
    ctx.fillText('CRITICAL', pad + barW - 2, pad + 14);
  } else if (player.oilState === 'flush') {
    ctx.fillStyle = '#44ff88'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
    ctx.fillText('FLUSH +10%', pad + barW - 2, pad + 14);
  }

  // Oil income + market indicator
  const income = s.oilIncomeRate || 0;
  let incomeY = pad + barH + 12;
  if (income > 0) {
    const clusteredRigs = s.rigs.filter(r => r.owner === 'player' && (r.clusterCount || 0) > 0);
    const clusterSuffix = clusteredRigs.length > 0 ? ' ⬡×' + clusteredRigs.length : '';
    ctx.textAlign = 'left'; ctx.font = '9px monospace'; ctx.fillStyle = clusteredRigs.length > 0 ? '#66ffaa' : '#44cc88';
    ctx.fillText('+' + income.toFixed(1) + ' oil/s' + clusterSuffix, pad + 2, incomeY);
  }
  if (s.oilMarket.active) {
    incomeY += 13;
    const mktColor = s.oilMarket.mult >= 1.4 ? '#44ff88' : '#ff8844';
    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = mktColor;
    const mktTimer = Math.ceil(s.oilMarket.timer || 0);
    ctx.fillText(s.oilMarket.label + ' x' + s.oilMarket.mult.toFixed(1) + ' (' + mktTimer + 's)', pad + 2, incomeY);
  }

  // XP bar
  const xpBarY = incomeY + 5;
  const xpPct = s.playerLevel >= MAX_LEVEL ? 1 : s.playerXP / xpForLevel(s.playerLevel);
  ctx.fillStyle = '#111';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, xpBarY, barW, 10, 3); ctx.fill(); }
  else ctx.fillRect(pad, xpBarY, barW, 10);
  ctx.fillStyle = '#44ccaa';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, xpBarY, Math.max(0, barW * xpPct), 10, 3); ctx.fill(); }
  else ctx.fillRect(pad, xpBarY, Math.max(0, barW * xpPct), 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
  const xpNext = s.playerLevel >= MAX_LEVEL ? '—' : xpForLevel(s.playerLevel);
  ctx.fillText('LVL ' + s.playerLevel + (s.playerLevel >= MAX_LEVEL ? ' MAX' : ' · ' + s.playerXP + '/' + xpNext + ' XP'), pad + 4, xpBarY + 8);

  // Active weapon + companion status
  const wyBase = xpBarY + 18;
  let wy = wyBase;
  ctx.textAlign = 'left'; ctx.font = '11px monospace';
  const activeWeapon = s.upgradeStats?.activeWeapon || 'default';
  const weaponLvl = s.upgradeStats?.weaponLevels?.[activeWeapon] || 0;
  const WEAPON_ICONS = { default: '🔫', dual: '🔫🔫', triple: '🔫🔫🔫', shotgun: '💥', sniper: '🎯', machinegun: '⚙️', missile: '🚀', rocket: '💣', grenade: '🧨' };
  const wIcon = WEAPON_ICONS[activeWeapon] || '🔫';
  ctx.fillStyle = '#ffcc44';
  ctx.fillText(wIcon + ' ' + activeWeapon.toUpperCase() + (weaponLvl > 1 ? ' ×' + weaponLvl : ''), pad, wy); wy += 14;
  // Companion drain indicator
  const cDrain = s.upgradeStats?.companionOilDrain || 0;
  if (cDrain > 0) {
    ctx.fillStyle = player.oil > 0 ? '#44ddff' : '#ff4444';
    ctx.fillText('🤖 DRONES  -' + cDrain.toFixed(1) + '/s', pad, wy); wy += 14;
  }
  if (s.upgradeStats.hasBlackHole) {
    const bhReady = s.blackHoleCooldown <= 0 && player.oil >= BLACK_HOLE_COOLDOWN;
    ctx.fillStyle = bhReady ? '#8844ff' : '#554466';
    ctx.fillText('🕳 BLACK HOLE [B]' + (bhReady ? ' READY' : ' ' + Math.ceil(s.blackHoleCooldown) + 's'), pad, wy); wy += 14;
  }
  if (s.upgradeStats.hasTimeWarp) {
    const twReady = (s.timeWarpCooldown || 0) <= 0;
    ctx.fillStyle = twReady ? '#aa88ff' : '#554466';
    ctx.fillText('⏱ TIME WARP [Q]' + (twReady ? ' READY' : ' ' + Math.ceil(s.timeWarpCooldown) + 's'), pad, wy); wy += 14;
  }

  // Counter-attack buff
  if (player.counterAttackTimer > 0) {
    ctx.fillStyle = '#ff4488'; ctx.font = 'bold 10px monospace';
    ctx.fillText('⚔ COUNTER ' + player.counterAttackTimer.toFixed(1) + 's', pad, wy); wy += 14;
  }

  // Upgrades row
  if (s.totalUpgrades > 0) {
    ctx.font = '9px monospace'; ctx.fillStyle = '#888';
    let ut = '';
    for (const [k, l] of Object.entries(s.upgradeLevels)) { if (l > 0) ut += (UPGRADES[k] ? UPGRADES[k].icon : '?') + 'x' + l + ' '; }
    ctx.fillText(ut, pad, wy);
  }

  // AI Intel panel (below main left panel, only when upgrades exist)
  if (s.aiUpgrades && s.aiUpgrades.length > 0) {
    const intelX = pad - 6;
    const intelY = pad - 6 + panelH + 6;
    const intelW = barW + 16;
    const rowH = 14;
    const intelH = 16 + s.aiUpgrades.length * rowH + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(intelX, intelY, intelW, intelH, 6); ctx.fill(); }
    else ctx.fillRect(intelX, intelY, intelW, intelH);
    ctx.strokeStyle = 'rgba(255,68,68,0.35)'; ctx.lineWidth = 1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(intelX, intelY, intelW, intelH, 6); ctx.stroke(); }
    else ctx.strokeRect(intelX, intelY, intelW, intelH);

    ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(255,80,80,0.8)'; ctx.textAlign = 'left';
    ctx.fillText('ENEMY INTEL', intelX + 6, intelY + 11);

    for (let i = 0; i < s.aiUpgrades.length; i++) {
      const def = AI_UPGRADE_DEFS.find(d => d.key === s.aiUpgrades[i]);
      if (!def) continue;
      const ry = intelY + 16 + i * rowH;
      ctx.font = '8px monospace';
      ctx.fillStyle = def.color;
      ctx.fillText(def.icon + ' ' + def.name, intelX + 6, ry + rowH - 4);
    }
  }

  // Score (top-right)
  ctx.textAlign = 'right'; ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#ffcc00';
  ctx.fillText('' + s.score, W - pad, pad + 18);
  ctx.font = '10px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText('SCORE', W - pad, pad + 30);
  const highScore = s._highScore || 0;
  if (highScore > 0) {
    ctx.fillStyle = '#666'; ctx.font = '9px monospace';
    ctx.fillText('BEST: ' + highScore, W - pad, pad + 42);
  }
  ctx.fillStyle = '#777'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
  const mins = Math.floor(s.timeSurvived / 60);
  const secs = Math.floor(s.timeSurvived % 60);
  ctx.fillText('TIME: ' + mins + ':' + (secs < 10 ? '0' : '') + secs, W - pad, pad + 54);

  // Score multiplier bar (top-right, below time)
  const sm = s.scoreMult || 1.0;
  if (sm > 1.05 || true) { // always show so player knows it's decaying
    const smW = 90, smH = 7, smX = W - pad - smW, smY = pad + 58;
    const smFrac = (sm - 1.0) / 2.0; // 0→1 over range 1x to 3x
    const smColor = sm >= 2.5 ? '#ff4444' : sm >= 1.8 ? '#ffaa00' : sm >= 1.2 ? '#ffcc00' : '#44aa66';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(smX - 1, smY - 1, smW + 2, smH + 2);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(smX, smY, smW, smH);
    ctx.fillStyle = smColor; ctx.fillRect(smX, smY, Math.max(1, smW * smFrac), smH);
    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace';
    ctx.fillStyle = smColor;
    ctx.fillText('×' + sm.toFixed(2), W - pad, smY + smH + 8);
  }

  // Combo / Streak (center top)
  if (s.combo > 1) {
    ctx.textAlign = 'center'; ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(255,68,255,' + Math.min(1, s.comboTimer / COMBO_DECAY + 0.3) + ')';
    ctx.fillText(s.combo + 'x COMBO', W / 2, pad + 20);
  }
  if (s.killStreak >= 5) {
    ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
    ctx.fillStyle = 'rgba(255,204,0,' + Math.min(1, s.streakTimer / STREAK_DECAY + 0.3) + ')';
    ctx.fillText(s.killStreak + ' STREAK', W / 2, pad + 38);
  }

  // Rampage indicator (center, below streak)
  if (player.rampageActive) {
    const rampPulse = 0.85 + Math.sin(time * 8) * 0.15;
    ctx.textAlign = 'center'; ctx.font = 'bold 15px monospace';
    ctx.fillStyle = `rgba(255,${Math.floor(80 + Math.sin(time * 6) * 40)},0,${rampPulse})`;
    ctx.fillText('🔥 RAMPAGE!', W / 2, pad + 54);
    // Kill 1 enemy to reset — hint
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,120,0,0.6)';
    ctx.fillText('take damage to break', W / 2, pad + 66);
  }

  // Revenge buff active indicator
  if (player.revengeBuff > 0) {
    ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
    ctx.fillStyle = `rgba(255,34,68,${0.7 + Math.sin(time * 5) * 0.3})`;
    ctx.fillText('⚡ REVENGE +50% DMG ' + Math.ceil(player.revengeBuff) + 's', W / 2, pad + (player.rampageActive ? 80 : 54));
  }

  // Bounty target HP indicator (top-center, when target exists)
  if (s.bountyTarget && s.bountyTarget.hp > 0) {
    const bt = s.bountyTarget;
    const bHpPct = bt.hp / bt.maxHp;
    const bW = 140, bH = 10, bX = (W - bW) / 2, bY = pad + 82;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bX - 2, bY - 12, bW + 4, bH + 16);
    ctx.font = '8px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
    ctx.fillText('👑 BOUNTY TARGET', W / 2, bY - 2);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bX, bY, bW, bH);
    ctx.fillStyle = bHpPct > 0.5 ? '#ffcc00' : bHpPct > 0.25 ? '#ff8800' : '#ff2200';
    ctx.fillRect(bX, bY, bW * bHpPct, bH);
  }

  // Wanted level
  if (s.wantedLevel > 0) {
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff4444'; ctx.textAlign = 'right';
    let ws = 'WANTED '; for (let i = 0; i < s.wantedLevel; i++) ws += '★'; for (let i = s.wantedLevel; i < WANTED_THRESHOLDS.length - 1; i++) ws += '☆';
    ctx.fillText(ws, W - pad, pad + 56);
  }

  // Hive alert
  if (s.hiveMind && s.hiveMind.alertLevel > 0.3) {
    ctx.textAlign = 'right'; ctx.font = 'bold 10px monospace';
    const al = s.hiveMind.alertLevel;
    const alertColor = al > 0.7 ? '#ff2222' : al > 0.5 ? '#ff8800' : '#ffcc00';
    ctx.fillStyle = alertColor;
    const alertText = al > 0.7 ? '⚠ HIVE ASSAULT' : al > 0.5 ? '⚠ HIVE ALERTED' : '⚠ HIVE AWARE';
    ctx.fillText(alertText, W - pad, pad + 68);
  }

  // Active event banner (center, below combo)
  if (s.activeEvent) {
    const ev = s.activeEvent;
    const evTimer = Math.ceil(ev.timer);
    const evColors = { geyser: '#44aa66', sector_assault: '#ff4444', supply_drop: '#44ff88', blackout_storm: '#8866ff' };
    const evNames = { geyser: '⛽ GEYSER', sector_assault: '⚔ ASSAULT', supply_drop: '📦 SUPPLY DROP', blackout_storm: '⛈ BLACKOUT' };
    ctx.textAlign = 'center'; ctx.font = 'bold 11px monospace';
    ctx.fillStyle = evColors[ev.type] || '#ffcc00';
    ctx.fillText((evNames[ev.type] || ev.type) + ' ' + evTimer + 's', W / 2, pad + 56);
  }

  // Active powerups
  const activePows = Object.entries(s.activePowerups).filter(([, t]) => t > 0);
  if (activePows.length > 0) {
    ctx.textAlign = 'center'; ctx.font = 'bold 11px monospace';
    activePows.forEach(([effect, timer], idx) => {
      const lt = LOOT_TYPES['pow_' + effect];
      if (!lt) return;
      ctx.fillStyle = lt.color;
      ctx.fillText(effect.toUpperCase() + ' ' + Math.ceil(timer) + 's', W / 2, H - 30 - idx * 16);
    });
  }

  // Shield status
  if (s.upgradeStats.hasShield) {
    ctx.textAlign = 'right'; ctx.font = '12px monospace';
    if (player.shieldActive) { ctx.fillStyle = '#aa44ff'; ctx.fillText('SHIELD READY', W - pad, H - 60); }
    else { ctx.fillStyle = '#555'; ctx.fillText('SHIELD ' + Math.ceil(player.shieldTimer) + 's', W - pad, H - 60); }
  }

  // Minimap
  const mmSize = Math.min(130, W * 0.2), mmX = W - mmSize - pad, mmY = H - mmSize - pad;
  ctx.fillStyle = 'rgba(0,15,30,0.78)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6, 6); ctx.fill(); }
  else ctx.fillRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6);
  ctx.strokeStyle = 'rgba(68,102,136,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6);
  const mmScale = mmSize / WORLD_W;

  // Minimap: territory auras (drawn behind rig dots)
  for (const rig of s.rigs) {
    if (rig.owner !== 'player' && rig.owner !== 'enemy') continue;
    if (rig.hp <= 0 || rig.owner === 'burnout' || rig.owner === 'depleted') continue;
    const mmRigX = mmX + rig.x * mmScale;
    const mmRigY = mmY + rig.y * mmScale;
    const mmTerR = Math.max(4, 230 * mmScale);
    const clusterBoost = rig.owner === 'player' ? Math.min(rig.clusterCount || 0, 3) * 0.06 : 0;
    const auraAlpha = rig.owner === 'player' ? 0.18 + clusterBoost : 0.10;
    const auraColor = rig.owner === 'player' ? `rgba(68,255,136,${auraAlpha.toFixed(2)})` : `rgba(255,68,68,${auraAlpha.toFixed(2)})`;
    const mmGrad = ctx.createRadialGradient(mmRigX, mmRigY, 0, mmRigX, mmRigY, mmTerR);
    mmGrad.addColorStop(0, auraColor);
    mmGrad.addColorStop(1, rig.owner === 'player' ? 'rgba(68,255,136,0)' : 'rgba(255,68,68,0)');
    ctx.fillStyle = mmGrad;
    ctx.beginPath(); ctx.arc(mmRigX, mmRigY, mmTerR, 0, Math.PI * 2); ctx.fill();
  }

  // Minimap: rigs
  for (const rig of s.rigs) {
    ctx.fillStyle = rig.hp <= 0 ? '#333' : rig.owner === 'player' ? '#44ff88' : rig.owner === 'enemy' ? '#ff4444' : '#888';
    ctx.fillRect(mmX + rig.x * mmScale - 2, mmY + rig.y * mmScale - 2, rig.hp <= 0 ? 3 : 5, rig.hp <= 0 ? 3 : 5);
    if (rig.underAttack && Math.sin(time * 6) > 0) {
      ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mmX + rig.x * mmScale, mmY + rig.y * mmScale, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Minimap: active event
  if (s.activeEvent?.data?.x) {
    const evX = mmX + s.activeEvent.data.x * mmScale;
    const evY = mmY + s.activeEvent.data.y * mmScale;
    ctx.fillStyle = s.activeEvent.type === 'geyser' ? '#44aa66' : '#ffcc00';
    ctx.beginPath(); ctx.arc(evX, evY, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Minimap: enemies
  for (const e of s.enemies) {
    ctx.fillStyle = (FACTIONS[e.faction] || FACTIONS.red).accent;
    const sz = e.isBoss ? 4 : (e.type === 'bomber' ? 3.5 : e.subType === 'command' ? 3 : 2);
    ctx.fillRect(mmX + e.x * mmScale - sz / 2, mmY + e.y * mmScale - sz / 2, sz, sz);
  }
  // Minimap: player
  ctx.fillStyle = '#44ff44'; ctx.beginPath(); ctx.arc(mmX + s.player.x * mmScale, mmY + s.player.y * mmScale, 3, 0, Math.PI * 2); ctx.fill();

  // Kill feed
  if (s.killFeed && s.killFeed.length > 0) {
    const kfX = W - pad;
    let kfY = pad + 90;
    ctx.textAlign = 'right';
    for (const entry of s.killFeed) {
      const alpha = Math.min(1, entry.timer);
      ctx.globalAlpha = alpha;
      ctx.font = '10px monospace'; ctx.fillStyle = entry.color;
      ctx.fillText(entry.text, kfX, kfY);
      kfY += 14;
    }
    ctx.globalAlpha = 1;
  }

  // Threat radar
  drawThreatRadar(ctx, s, W, H);
}

function drawThreatRadar(ctx, s, W, H) {
  const player = s.player;
  const cam = s.camera;
  const margin = 22;
  ctx.font = 'bold 10px monospace';
  for (const e of s.enemies) {
    const sx = e.x - cam.x;
    const sy = e.y - cam.y;
    if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) continue;
    const ang = Math.atan2(sy - H / 2, sx - W / 2);
    const edgeX = clamp(W / 2 + Math.cos(ang) * (W / 2 - margin), margin, W - margin);
    const edgeY = clamp(H / 2 + Math.sin(ang) * (H / 2 - margin), margin, H - margin);
    const f = FACTIONS[e.faction] || FACTIONS.red;
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(ang);
    ctx.globalAlpha = e.isBoss ? 0.9 : (e.type === 'bomber' ? 0.75 : 0.4);
    ctx.fillStyle = e.type === 'bomber' ? '#ff8800' : f.accent;
    // Bomber gets a diamond shape on radar
    if (e.type === 'bomber') {
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -6); ctx.lineTo(-8, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  // Supply drop on radar too
  if (s.activeEvent?.type === 'supply_drop' && !s.activeEvent.data.claimed) {
    const ex = s.activeEvent.data.x - cam.x;
    const ey = s.activeEvent.data.y - cam.y;
    if (ex < 0 || ex > W || ey < 0 || ey > H) {
      const ang = Math.atan2(ey - H / 2, ex - W / 2);
      const edgeX = clamp(W / 2 + Math.cos(ang) * (W / 2 - margin), margin, W - margin);
      const edgeY = clamp(H / 2 + Math.sin(ang) * (H / 2 - margin), margin, H - margin);
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.globalAlpha = 0.8 + Math.sin(s.time * 6) * 0.2;
      ctx.fillStyle = '#44ff88'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('📦', 0, 4);
      ctx.globalAlpha = 1; ctx.restore();
    }
  }
}

export function drawTouchControls(ctx, s, settings, isTouchDevice) {
  if (!isTouchDevice) return;
  const { W, H, player, time } = s;
  const inp = s.input;

  ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(0, 0, W * 0.4, H);
  ctx.fillStyle = 'rgba(255,255,255,0.01)'; ctx.fillRect(W * 0.4, 0, W * 0.6, H);

  if (inp.joystickCenter) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(inp.joystickCenter.x, inp.joystickCenter.y, JOYSTICK_RADIUS, 0, Math.PI * 2); ctx.stroke();
    const kx = inp.joystickCenter.x + inp.touchMove.x * JOYSTICK_RADIUS;
    const ky = inp.joystickCenter.y + inp.touchMove.y * JOYSTICK_RADIUS;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.fill();
  }

  if (inp.aimJoystickCenter) {
    ctx.strokeStyle = inp.touchFire ? 'rgba(255,200,0,0.4)' : 'rgba(255,100,0,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(inp.aimJoystickCenter.x, inp.aimJoystickCenter.y, JOYSTICK_RADIUS, 0, Math.PI * 2); ctx.stroke();
    if (inp.touchAim.active) {
      const ax = inp.aimJoystickCenter.x + inp.touchAim.x * JOYSTICK_RADIUS;
      const ay = inp.aimJoystickCenter.y + inp.touchAim.y * JOYSTICK_RADIUS;
      ctx.fillStyle = inp.touchFire ? 'rgba(255,200,0,0.4)' : 'rgba(255,100,0,0.25)';
      ctx.beginPath(); ctx.arc(ax, ay, 18, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Mobile buttons — positioned on right side, vertically stacked
  const btnSize = 50;
  const btnGap = 12;
  const btnStartX = W - btnSize - 14;
  const btnStartY = H - btnSize * 3 - btnGap * 2 - 20;

  function drawCircleBtn(cx, cy, r, fillColor, strokeColor, label, labelColor, fontSize) {
    ctx.fillStyle = fillColor;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = labelColor; ctx.font = 'bold ' + (fontSize || 12) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + (fontSize ? Math.floor(fontSize * 0.35) : 4));
  }

  let btnRow = 0;
  const now = Date.now();
  const DOUBLE_CLICK_WINDOW = 300;

  // DASH button
  const dashReady = player.dashCooldown <= 0;
  const dashCx = btnStartX + btnSize / 2;
  const dashCy = btnStartY + btnRow * (btnSize + btnGap) + btnSize / 2;
  const dashWaiting = now - s.input.lastDashClickTime < DOUBLE_CLICK_WINDOW && s.input.lastDashClickTime > 0;
  const dashFill = dashWaiting ? 'rgba(68,204,255,0.55)' : (dashReady ? 'rgba(68,204,255,0.32)' : 'rgba(68,204,255,0.10)');
  const dashStroke = dashWaiting ? 'rgba(68,204,255,1.0)' : (dashReady ? 'rgba(68,204,255,0.7)' : 'rgba(68,204,255,0.22)');
  drawCircleBtn(dashCx, dashCy, btnSize / 2,
    dashFill, dashStroke,
    dashReady ? 'DASH' : Math.ceil(player.dashCooldown) + 's',
    dashWaiting ? '#88ffff' : (dashReady ? '#44ccff' : '#335566'), 11);
  // Show "double-tap!" hint when waiting for second tap
  if (dashWaiting) {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(68,204,255,0.7)'; ctx.textAlign = 'center';
    ctx.fillText('2×', dashCx, dashCy + btnSize / 2 + 14);
  }
  btnRow++;

  // TIME WARP button (only when owned)
  if (s.upgradeStats.hasTimeWarp) {
    const twReady = (s.timeWarpCooldown || 0) <= 0;
    const twCx = btnStartX + btnSize / 2;
    const twCy = btnStartY + btnRow * (btnSize + btnGap) + btnSize / 2;
    const twWaiting = now - s.input.lastTimeWarpClickTime < DOUBLE_CLICK_WINDOW && s.input.lastTimeWarpClickTime > 0;
    const twFill = twWaiting ? 'rgba(170,136,255,0.55)' : (twReady ? 'rgba(170,136,255,0.32)' : 'rgba(80,60,120,0.18)');
    const twStroke = twWaiting ? 'rgba(170,136,255,1.0)' : (twReady ? 'rgba(170,136,255,0.7)' : 'rgba(80,60,120,0.3)');
    drawCircleBtn(twCx, twCy, btnSize / 2,
      twFill, twStroke,
      twReady ? '⏱' : Math.ceil(s.timeWarpCooldown) + 's',
      twWaiting ? '#ddbbff' : (twReady ? '#aa88ff' : '#554466'), twReady ? 20 : 11);
    if (twWaiting) {
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(170,136,255,0.7)'; ctx.textAlign = 'center';
      ctx.fillText('2×', twCx, twCy + btnSize / 2 + 14);
    }
    btnRow++;
  }

  // BLACK HOLE button (only when owned)
  if (s.upgradeStats.hasBlackHole) {
    const bhReady = s.blackHoleCooldown <= 0 && player.oil >= BLACK_HOLE_COOLDOWN;
    const bhCx = btnStartX + btnSize / 2;
    const bhCy = btnStartY + btnRow * (btnSize + btnGap) + btnSize / 2;
    const bhWaiting = now - s.input.lastBlackHoleClickTime < DOUBLE_CLICK_WINDOW && s.input.lastBlackHoleClickTime > 0;
    const bhFill = bhWaiting ? 'rgba(136,68,255,0.55)' : (bhReady ? 'rgba(136,68,255,0.32)' : 'rgba(60,40,90,0.18)');
    const bhStroke = bhWaiting ? 'rgba(136,68,255,1.0)' : (bhReady ? 'rgba(136,68,255,0.7)' : 'rgba(60,40,90,0.3)');
    drawCircleBtn(bhCx, bhCy, btnSize / 2,
      bhFill, bhStroke,
      bhReady ? '🕳' : Math.ceil(s.blackHoleCooldown) + 's',
      bhWaiting ? '#dd88ff' : (bhReady ? '#8844ff' : '#554466'), bhReady ? 20 : 11);
    if (bhWaiting) {
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(136,68,255,0.7)'; ctx.textAlign = 'center';
      ctx.fillText('2×', bhCx, bhCy + btnSize / 2 + 14);
    }
    btnRow++;
  }

  // Pause button (top-right)
  const pauseBtnSize = 44, pauseBtnX = W - pauseBtnSize - 8, pauseBtnY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize, 8); ctx.fill(); }
  else ctx.fillRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize, 8); ctx.stroke(); }
  else ctx.strokeRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
  ctx.fillText('⏸', pauseBtnX + pauseBtnSize / 2, pauseBtnY + pauseBtnSize / 2 + 7);
}

export function drawScreenEffects(ctx, s) {
  const { W, H, time, player } = s;

  if (s.screenFlash.alpha > 0.01) {
    ctx.globalAlpha = s.screenFlash.alpha;
    ctx.fillStyle = s.screenFlash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Blackout storm: heavy vignette
  if (s.activeEvent?.type === 'blackout_storm') {
    const stormPct = s.activeEvent.timer / s.activeEvent.maxTimer;
    const stormAlpha = 0.25 * (0.7 + Math.sin(time * 5) * 0.3) * Math.min(1, 2 - stormPct * 2);
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.6);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20,0,40,' + stormAlpha + ')');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }

  if (s.vignetteIntensity > 0.01) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(180,0,0,' + s.vignetteIntensity + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Critical oil: pulsing red edge
  if (player.oilState === 'critical') {
    const pulseAlpha = 0.12 + Math.sin(time * 10) * 0.08;
    const critGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.65);
    critGrad.addColorStop(0, 'rgba(0,0,0,0)');
    critGrad.addColorStop(1, 'rgba(255,0,0,' + pulseAlpha + ')');
    ctx.fillStyle = critGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Dash cooldown bar
  if (player.dashCooldown > 0 && player.alive) {
    const dashPct = 1 - player.dashCooldown / DASH_COOLDOWN;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W / 2 - 30, H - 18, 60, 8);
    ctx.fillStyle = dashPct >= 1 ? '#44ccff' : '#225577';
    ctx.fillRect(W / 2 - 30, H - 18, 60 * dashPct, 8);
    ctx.font = '7px monospace'; ctx.fillStyle = '#88ccff'; ctx.textAlign = 'center';
    ctx.fillText('DASH [SHIFT]', W / 2, H - 22);
  } else if (player.alive) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(68,204,255,0.5)'; ctx.textAlign = 'center';
    ctx.fillText('DASH READY [SHIFT]', W / 2, H - 10);
  }
}
