import {
  WORLD_W, MAX_LEVEL, STAT_MAX, WANTED_THRESHOLDS,
  UPGRADE_INTERVAL, HOMING_THRESHOLD, DUAL_CANNON_THRESHOLD,
  DASH_COOLDOWN, COMBO_DECAY, STREAK_DECAY, RIG_COUNT, JOYSTICK_RADIUS,
} from '../constants.js';
import { getMaxOil, xpForLevel, hasPowerup, getPickupRadius } from '../state/GameState.js';
import { STAT_NAMES, STAT_COLORS, FACTIONS, UPGRADES, LOOT_TYPES } from '../config.js';
import { clamp } from '../utils.js';

export function drawHUD(ctx, s, settings) {
  const { W, H, time, player } = s;
  const pad = 16, barW = Math.min(240, W * 0.35), barH = 20;

  // Panel background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const panelH = 90 + (s.totalUpgrades > 0 ? 18 : 0);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad - 6, pad - 6, barW + 16, panelH, 8); ctx.fill(); }
  else ctx.fillRect(pad - 6, pad - 6, barW + 16, panelH);

  // Oil bar
  const oilPct = player.oil / getMaxOil(s);
  ctx.fillStyle = '#111';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, pad, barW, barH, 4); ctx.fill(); }
  else ctx.fillRect(pad, pad, barW, barH);
  const oilColor = oilPct > 0.5 ? '#44dd44' : oilPct > 0.25 ? '#dddd44' : '#dd4444';
  ctx.fillStyle = oilColor;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, pad, Math.max(0, barW * oilPct), barH, 4); ctx.fill(); }
  else ctx.fillRect(pad, pad, Math.max(0, barW * oilPct), barH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  ctx.fillText('OIL: ' + Math.floor(player.oil) + ' / ' + getMaxOil(s), pad + 4, pad + 15);

  // XP bar
  const xpBarY = pad + barH + 4;
  const xpPct = s.playerLevel >= MAX_LEVEL ? 1 : s.playerXP / xpForLevel(s.playerLevel);
  ctx.fillStyle = '#111';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, xpBarY, barW, 10, 3); ctx.fill(); }
  else ctx.fillRect(pad, xpBarY, barW, 10);
  ctx.fillStyle = '#44ccaa';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pad, xpBarY, Math.max(0, barW * xpPct), 10, 3); ctx.fill(); }
  else ctx.fillRect(pad, xpBarY, Math.max(0, barW * xpPct), 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace';
  ctx.fillText('LVL ' + s.playerLevel + (s.statPoints > 0 ? ' [' + s.statPoints + ' pts]' : '') + (s.playerLevel >= MAX_LEVEL ? ' MAX' : ''), pad + 4, xpBarY + 8);

  // Score
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

  // Combo / Streak
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

  // Wanted
  if (s.wantedLevel > 0) {
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff4444'; ctx.textAlign = 'right';
    let ws = 'WANTED '; for (let i = 0; i < s.wantedLevel; i++) ws += '★'; for (let i = s.wantedLevel; i < WANTED_THRESHOLDS.length - 1; i++) ws += '☆';
    ctx.fillText(ws, W - pad, pad + 56);
  }

  // Weapons
  ctx.textAlign = 'left'; ctx.font = '11px monospace';
  let wy = pad + barH + 22;
  ctx.fillStyle = player.oil >= DUAL_CANNON_THRESHOLD ? '#44ff88' : '#555';
  ctx.fillText('DUAL CANNONS' + (player.oil >= DUAL_CANNON_THRESHOLD ? ' ✓' : ''), pad, wy); wy += 14;
  ctx.fillStyle = player.oil >= HOMING_THRESHOLD ? '#ff8844' : '#555';
  ctx.fillText('MISSILES' + (player.oil >= HOMING_THRESHOLD ? ' [E/RMB] ✓' : ' (' + HOMING_THRESHOLD + ')'), pad, wy); wy += 14;
  ctx.fillStyle = settings.autoFire ? '#44ff88' : '#555';
  ctx.fillText('AUTO-FIRE [F]' + (settings.autoFire ? ' ON' : ' OFF'), pad, wy);

  // Upgrades
  if (s.totalUpgrades > 0) {
    wy += 16; ctx.font = '10px monospace'; ctx.fillStyle = '#888';
    let ut = 'UPGRADES: ';
    for (const [k, l] of Object.entries(s.upgradeLevels)) { if (l > 0) ut += UPGRADES[k].icon + 'x' + l + ' '; }
    ctx.fillText(ut, pad, wy);
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
  ctx.fillStyle = 'rgba(0,15,30,0.75)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6, 6); ctx.fill(); }
  else ctx.fillRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6);
  ctx.strokeStyle = 'rgba(68,102,136,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6);
  const mmScale = mmSize / WORLD_W;
  for (const rig of s.rigs) {
    ctx.fillStyle = rig.hp <= 0 ? '#333' : rig.owner === 'player' ? '#44ff88' : rig.owner === 'enemy' ? '#ff4444' : '#888';
    ctx.fillRect(mmX + rig.x * mmScale - 2, mmY + rig.y * mmScale - 2, rig.hp <= 0 ? 3 : 5, rig.hp <= 0 ? 3 : 5);
    if (rig.underAttack && Math.sin(time * 6) > 0) {
      ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mmX + rig.x * mmScale, mmY + rig.y * mmScale, 6, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const e of s.enemies) {
    ctx.fillStyle = (FACTIONS[e.faction] || FACTIONS.red).accent;
    const sz = e.isBoss ? 4 : 2;
    ctx.fillRect(mmX + e.x * mmScale - sz / 2, mmY + e.y * mmScale - sz / 2, sz, sz);
  }
  ctx.fillStyle = '#44ff44'; ctx.beginPath(); ctx.arc(mmX + player.x * mmScale, mmY + player.y * mmScale, 3, 0, Math.PI * 2); ctx.fill();

  // Upgrade progress
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(mmX, mmY - 14, mmSize, 8);
  const prevThresh = s.nextUpgradeScore - UPGRADE_INTERVAL - (s.totalUpgrades > 0 ? (s.totalUpgrades - 1) * 100 : 0);
  const upPct = clamp((s.score - Math.max(0, prevThresh)) / Math.max(1, s.nextUpgradeScore - Math.max(0, prevThresh)), 0, 1);
  ctx.fillStyle = '#aa44ff'; ctx.fillRect(mmX, mmY - 14, mmSize * upPct, 8);
  ctx.font = '7px monospace'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center';
  ctx.fillText('NEXT UPGRADE', mmX + mmSize / 2, mmY - 7);
}

export function drawStatPanel(ctx, s) {
  if (!s.showStatPanel || s.statPoints <= 0) return;
  const pad = 16;
  const panelX = 10, panelY = pad + 100;
  const panelW = 180, rowH = 26;
  const panelH = 8 * rowH + 30;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 8); ctx.fill(); }
  else ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(255,204,0,0.4)'; ctx.lineWidth = 1;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 8); ctx.stroke(); }
  else ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'left';
  ctx.fillText('STAT POINTS: ' + s.statPoints + ' (keys 1-8)', panelX + 8, panelY + 16);

  for (let i = 0; i < 8; i++) {
    const y = panelY + 24 + i * rowH;
    ctx.fillStyle = STAT_COLORS[i]; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('[' + (i + 1) + '] ' + STAT_NAMES[i], panelX + 6, y + 10);
    const barX = panelX + 6, barY = y + 14, barW2 = panelW - 16, barH2 = 6;
    ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, barW2, barH2);
    for (let sc = 0; sc < STAT_MAX; sc++) {
      const sx2 = barX + (sc / STAT_MAX) * barW2;
      const sw = barW2 / STAT_MAX - 1;
      ctx.fillStyle = sc < s.stats[i] ? STAT_COLORS[i] : '#333';
      ctx.fillRect(sx2, barY, sw, barH2);
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
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(inp.joystickCenter.x, inp.joystickCenter.y, JOYSTICK_RADIUS * 0.5, 0, Math.PI * 2); ctx.stroke();
    const kx = inp.joystickCenter.x + inp.touchMove.x * JOYSTICK_RADIUS;
    const ky = inp.joystickCenter.y + inp.touchMove.y * JOYSTICK_RADIUS;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('MOVE', inp.joystickCenter.x, inp.joystickCenter.y + JOYSTICK_RADIUS + 16);
  }

  if (inp.aimJoystickCenter) {
    ctx.strokeStyle = inp.touchFire ? 'rgba(255,200,0,0.4)' : 'rgba(255,100,0,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(inp.aimJoystickCenter.x, inp.aimJoystickCenter.y, JOYSTICK_RADIUS, 0, Math.PI * 2); ctx.stroke();
    if (player.oil >= HOMING_THRESHOLD) {
      ctx.strokeStyle = 'rgba(255,130,0,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(inp.aimJoystickCenter.x, inp.aimJoystickCenter.y, JOYSTICK_RADIUS * 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,130,0,0.1)'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('MSL', inp.aimJoystickCenter.x, inp.aimJoystickCenter.y - JOYSTICK_RADIUS * 1.3 - 4);
    }
    if (inp.touchAim.active) {
      const ax = inp.aimJoystickCenter.x + inp.touchAim.x * JOYSTICK_RADIUS;
      const ay = inp.aimJoystickCenter.y + inp.touchAim.y * JOYSTICK_RADIUS;
      ctx.fillStyle = inp.touchFire ? 'rgba(255,200,0,0.4)' : 'rgba(255,100,0,0.25)';
      ctx.beginPath(); ctx.arc(ax, ay, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax - 8, ay); ctx.lineTo(ax + 8, ay); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(ax, ay + 8); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('AIM + FIRE', inp.aimJoystickCenter.x, inp.aimJoystickCenter.y + JOYSTICK_RADIUS + 16);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Touch right side to aim & fire', W * 0.7, H * 0.9);
  }

  // Mobile buttons
  const btnSize = 36;
  const btnY = H - btnSize - 50;
  const dashBtnX = 20;
  const dashReady = player.dashCooldown <= 0;
  ctx.fillStyle = dashReady ? 'rgba(68,204,255,0.3)' : 'rgba(68,204,255,0.1)';
  ctx.beginPath(); ctx.arc(dashBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dashReady ? 'rgba(68,204,255,0.6)' : 'rgba(68,204,255,0.2)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(dashBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = dashReady ? '#44ccff' : '#335566'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('DASH', dashBtnX + btnSize / 2, btnY + btnSize / 2 + 4);

  const afBtnX = 70;
  ctx.fillStyle = settings.autoFire ? 'rgba(68,255,136,0.3)' : 'rgba(100,100,100,0.2)';
  ctx.beginPath(); ctx.arc(afBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = settings.autoFire ? 'rgba(68,255,136,0.6)' : 'rgba(100,100,100,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(afBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = settings.autoFire ? '#44ff88' : '#666'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('AUTO', afBtnX + btnSize / 2, btnY + btnSize / 2 + 4);

  const pauseBtnX = W - 50, pauseBtnY = 10, pauseBtnSize = 30;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillText('⏸', pauseBtnX + pauseBtnSize / 2, pauseBtnY + pauseBtnSize / 2 + 5);

  if (s.statPoints > 0) {
    ctx.fillStyle = 'rgba(255,204,0,0.3)'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('↑ ' + s.statPoints + ' STAT PTS (tap panel)', 14, H - 20);
  }
}

export function drawScreenEffects(ctx, s) {
  const { W, H, time, player } = s;
  if (s.screenFlash.alpha > 0.01) {
    ctx.globalAlpha = s.screenFlash.alpha;
    ctx.fillStyle = s.screenFlash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (s.vignetteIntensity > 0.01) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(180,0,0,' + s.vignetteIntensity + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  if (player.dashCooldown > 0 && player.alive) {
    const dashPct = 1 - player.dashCooldown / DASH_COOLDOWN;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W / 2 - 30, H - 18, 60, 8);
    ctx.fillStyle = dashPct >= 1 ? '#44ccff' : '#225577';
    ctx.fillRect(W / 2 - 30, H - 18, 60 * dashPct, 8);
    ctx.font = '7px monospace'; ctx.fillStyle = '#88ccff'; ctx.textAlign = 'center';
    ctx.fillText('DASH [SHIFT]', W / 2, H - 22);
  } else if (player.alive) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(68,204,255,0.5)'; ctx.textAlign = 'center';
    ctx.fillText('DASH READY [SHIFT]', W / 2, H - 10);
  }
}
