import { FACTIONS, FACTION_KEYS, UPGRADES } from '../config.js';

export function drawTitle(ctx, s) {
  const { W, H } = s;
  const highScore = s._highScore || 0;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#060d1a'); grad.addColorStop(0.5, '#0a1a2a'); grad.addColorStop(1, '#0d2240');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  const t = performance.now() / 1000;
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.015 + Math.sin(t + i) * 0.008;
    ctx.fillStyle = i % 3 === 0 ? '#ff8800' : i % 3 === 1 ? '#ff4400' : '#ffcc00';
    ctx.beginPath(); ctx.arc((Math.sin(t * 0.3 + i * 2.1) * 0.5 + 0.5) * W, (Math.cos(t * 0.15 + i * 0.9) * 0.5 + 0.5) * H, 20 + Math.sin(t + i * 0.7) * 15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.04; ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) { const y = H * 0.5 + i * 30 + Math.sin(t * 1.5 + x * 0.01 + i) * 15; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8800'; ctx.font = 'bold ' + Math.min(52, W * 0.085) + 'px monospace';
  ctx.fillText('BLACK GOLD BLITZ', W / 2, H * 0.18);
  ctx.fillStyle = '#ffcc44'; ctx.font = Math.min(16, W * 0.03) + 'px monospace';
  ctx.fillText('TOP-DOWN ARCADE SHOOTER', W / 2, H * 0.24);

  ctx.font = 'bold ' + Math.min(12, W * 0.022) + 'px monospace';
  const factionPreviewY = H * 0.28;
  FACTION_KEYS.forEach((fk, fi) => {
    const f = FACTIONS[fk];
    const fx = W / 2 + (fi - 1.5) * 80;
    ctx.fillStyle = f.accent;
    ctx.beginPath(); ctx.arc(fx, factionPreviewY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.accent; ctx.fillText(f.name, fx, factionPreviewY + 16);
  });

  ctx.fillStyle = '#aaa'; ctx.font = Math.min(13, W * 0.025) + 'px monospace';
  const features = [
    'WASD/Arrows - Move  |  Mouse - Aim  |  Space/LMB - Fire',
    'E/RMB - Homing Missiles  |  1-8 - Allocate Stat Points',
    'Shift - Dash Dodge  |  F - Auto-Fire  |  P - Pause',
    '',
    '⚡ 33 STAT POINTS across 8 categories (diep.io style)',
    '🎯 4 Enemy factions with unique AI behaviors',
    '💎 Loot drops: XP gems, oil, power-ups',
    '🏭 Capture & defend oil rigs from enemy raids',
    '🌅 Dynamic day/night cycle  |  🔊 Procedural sound',
    '',
    'Touch: Left stick = Move | Right stick = Aim + Fire',
  ];
  features.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.36 + i * Math.min(22, W * 0.032)));

  ctx.fillStyle = '#aa44ff'; ctx.font = 'bold ' + Math.min(14, W * 0.025) + 'px monospace';
  ctx.fillText('10 UNIQUE UPGRADES + STAT BUILDS + LOOT', W / 2, H * 0.72);
  const icons = Object.values(UPGRADES).map(u => u.icon).join('  ');
  ctx.font = Math.min(18, W * 0.03) + 'px serif'; ctx.fillText(icons, W / 2, H * 0.77);

  if (highScore > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(14, W * 0.025) + 'px monospace';
    ctx.fillText('HIGH SCORE: ' + highScore, W / 2, H * 0.83);
  }

  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ffcc00' : '#ff8800';
  ctx.font = 'bold ' + Math.min(24, W * 0.04) + 'px monospace';
  ctx.fillText('[ CLICK or TAP to START ]', W / 2, H * 0.92);
}

export function drawGameOver(ctx, s) {
  const { W, H } = s;
  const highScore = s._highScore || 0;

  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3333'; ctx.font = 'bold ' + Math.min(52, W * 0.085) + 'px monospace';
  ctx.fillText('GAME OVER', W / 2, H * 0.15);
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(32, W * 0.055) + 'px monospace';
  ctx.fillText('FINAL SCORE: ' + s.score, W / 2, H * 0.24);
  if (s.score >= highScore && s.score > 0) {
    ctx.fillStyle = '#ff8844'; ctx.font = 'bold ' + Math.min(18, W * 0.03) + 'px monospace';
    ctx.fillText('★ NEW HIGH SCORE! ★', W / 2, H * 0.29);
  }
  const mins = Math.floor(s.timeSurvived / 60);
  const secs = Math.floor(s.timeSurvived % 60);
  ctx.fillStyle = '#88ccff'; ctx.font = 'bold ' + Math.min(16, W * 0.028) + 'px monospace';
  ctx.fillText('TIME SURVIVED: ' + mins + ':' + (secs < 10 ? '0' : '') + secs, W / 2, H * 0.34);

  ctx.fillStyle = '#aaa'; ctx.font = Math.min(14, W * 0.025) + 'px monospace';
  let ly = H * 0.40;
  ctx.fillText('Level: ' + s.playerLevel + ' / 33', W / 2, ly); ly += 20;
  ctx.fillText('Oil Rigs: ' + s.rigs.filter(r => r.owner === 'player').length + '/10', W / 2, ly); ly += 20;
  ctx.fillText('Upgrades: ' + s.totalUpgrades, W / 2, ly); ly += 20;
  ctx.fillText('Max Combo: ' + s.maxCombo + 'x | Max Streak: ' + s.maxStreak, W / 2, ly); ly += 20;

  const totalKillCount = s.totalKills.drone + s.totalKills.plane + s.totalKills.chopper + s.totalKills.boss;
  ctx.fillStyle = '#ff8844'; ctx.font = 'bold ' + Math.min(13, W * 0.023) + 'px monospace';
  ctx.fillText('KILLS: ' + totalKillCount, W / 2, ly); ly += 18;
  ctx.fillStyle = '#888'; ctx.font = Math.min(11, W * 0.02) + 'px monospace';
  ctx.fillText('Drones: ' + s.totalKills.drone + ' | Planes: ' + s.totalKills.plane + ' | Choppers: ' + s.totalKills.chopper + ' | Bosses: ' + s.totalKills.boss, W / 2, ly); ly += 18;
  ctx.fillText('Damage Dealt: ' + Math.floor(s.totalDamageDealt) + ' | Damage Taken: ' + Math.floor(s.totalDamageTaken), W / 2, ly); ly += 20;

  let ws = 'Wanted: '; for (let i = 0; i < s.wantedLevel; i++) ws += '★'; for (let i = s.wantedLevel; i < 4; i++) ws += '☆';
  ctx.fillText(ws, W / 2, ly); ly += 20;

  ctx.fillStyle = '#888'; ctx.font = Math.min(11, W * 0.02) + 'px monospace';
  const STAT_NAMES = ["Health Regen", "Max Health", "Body Damage", "Bullet Speed", "Bullet Penetration", "Bullet Damage", "Reload", "Movement Speed"];
  let statStr = 'Build: ';
  for (let i = 0; i < 8; i++) { if (s.stats[i] > 0) statStr += STAT_NAMES[i] + ':' + s.stats[i] + ' '; }
  ctx.fillText(statStr || 'Build: (no stats allocated)', W / 2, ly); ly += 16;

  if (s.totalUpgrades > 0) {
    ctx.fillStyle = '#888'; ctx.font = Math.min(12, W * 0.022) + 'px monospace';
    let ut = 'Abilities: '; for (const [k, l] of Object.entries(s.upgradeLevels)) { if (l > 0) ut += UPGRADES[k].icon + ' ' + UPGRADES[k].name + ' Lv' + l + '  '; }
    ctx.fillText(ut, W / 2, ly);
  }

  const t2 = performance.now() / 1000;
  ctx.fillStyle = Math.sin(t2 * 3) > 0 ? '#ffcc00' : '#ff8800';
  ctx.font = 'bold ' + Math.min(22, W * 0.04) + 'px monospace';
  ctx.fillText('[ CLICK or TAP to RESTART ]', W / 2, H * 0.92);
}

export function drawUpgradeScreen(ctx, s) {
  const { W, H } = s;
  const mouseX = s.input.mouseX, mouseY = s.input.mouseY;

  ctx.fillStyle = 'rgba(0,0,10,0.85)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold ' + Math.min(36, W * 0.06) + 'px monospace';
  ctx.fillText('CHOOSE AN UPGRADE', W / 2, H * 0.15);
  ctx.fillStyle = '#aaa'; ctx.font = Math.min(14, W * 0.025) + 'px monospace';
  ctx.fillText('Score: ' + s.score + ' | Level: ' + s.playerLevel + ' | Upgrades: ' + s.totalUpgrades, W / 2, H * 0.22);
  const cardW = Math.min(200, W * 0.28), cardH = Math.min(260, H * 0.45), gap = Math.min(30, W * 0.03);
  const totalW2 = s.upgradeChoices.length * cardW + (s.upgradeChoices.length - 1) * gap;
  const startX = (W - totalW2) / 2, startY = (H - cardH) / 2;
  for (let i = 0; i < s.upgradeChoices.length; i++) {
    const key = s.upgradeChoices[i], up = UPGRADES[key], lvl = s.upgradeLevels[key] || 0;
    const cx = startX + i * (cardW + gap), cy = startY;
    ctx.fillStyle = 'rgba(20,20,40,0.9)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = up.color + '88'; ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.stroke(); }
    else ctx.strokeRect(cx, cy, cardW, cardH);
    if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH) {
      ctx.fillStyle = up.color + '15';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
      else ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = up.color; ctx.lineWidth = 2;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.stroke(); }
      else ctx.strokeRect(cx, cy, cardW, cardH);
    }
    ctx.font = Math.min(40, cardW * 0.25) + 'px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(up.icon, cx + cardW / 2, cy + cardH * 0.25);
    ctx.font = 'bold ' + Math.min(16, cardW * 0.09) + 'px monospace'; ctx.fillStyle = up.color;
    ctx.fillText(up.name, cx + cardW / 2, cy + cardH * 0.42);
    ctx.font = Math.min(12, cardW * 0.07) + 'px monospace'; ctx.fillStyle = '#888';
    let dots = ''; for (let d = 0; d < up.maxLevel; d++) dots += d < lvl ? '●' : d === lvl ? '◉' : '○';
    ctx.fillText(dots, cx + cardW / 2, cy + cardH * 0.52);
    ctx.font = Math.min(12, cardW * 0.065) + 'px monospace'; ctx.fillStyle = '#bbb';
    ctx.fillText(up.desc, cx + cardW / 2, cy + cardH * 0.65);
    ctx.font = Math.min(11, cardW * 0.06) + 'px monospace'; ctx.fillStyle = '#666';
    ctx.fillText('Level ' + lvl + ' → ' + (lvl + 1), cx + cardW / 2, cy + cardH * 0.78);
    ctx.font = 'bold ' + Math.min(12, cardW * 0.065) + 'px monospace'; ctx.fillStyle = up.color + '88';
    ctx.fillText('[ CLICK ]', cx + cardW / 2, cy + cardH * 0.9);
  }
}

export function drawPauseScreen(ctx, s, settings) {
  const { W, H } = s;
  const mouseX = s.input.mouseX, mouseY = s.input.mouseY;

  ctx.fillStyle = 'rgba(0,0,10,0.8)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(40, W * 0.07) + 'px monospace';
  ctx.fillText('PAUSED', W / 2, H * 0.25);
  const mins = Math.floor(s.timeSurvived / 60);
  const secs = Math.floor(s.timeSurvived % 60);
  ctx.fillStyle = '#aaa'; ctx.font = Math.min(14, W * 0.025) + 'px monospace';
  ctx.fillText('Score: ' + s.score + ' | Time: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + ' | Level: ' + s.playerLevel, W / 2, H * 0.33);

  const btnW = 160, btnH = 40;
  const btnX = (W - btnW) / 2;
  drawPauseButton(ctx, btnX, H * 0.45, btnW, btnH, '▶ RESUME', '#44ff88', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.55, btnW, btnH, '🔊 SOUND: ' + (settings.soundOn ? 'ON' : 'OFF'), settings.soundOn ? '#44ccff' : '#666', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.63, btnW, btnH, '📳 SHAKE: ' + (settings.shakeOn ? 'ON' : 'OFF'), settings.shakeOn ? '#44ccff' : '#666', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.73, btnW, btnH, '↻ RESTART', '#ff6644', mouseX, mouseY);
  ctx.fillStyle = '#555'; ctx.font = Math.min(12, W * 0.022) + 'px monospace';
  ctx.fillText('Press P or ESC to resume', W / 2, H * 0.88);
}

function drawPauseButton(ctx, x, y, w, h, text, color, mouseX, mouseY) {
  ctx.fillStyle = 'rgba(20,20,40,0.8)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color + '88'; ctx.lineWidth = 2;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke(); }
  else ctx.strokeRect(x, y, w, h);
  if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
    ctx.fillStyle = color + '15';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = color; ctx.font = 'bold ' + Math.min(14, w * 0.08) + 'px monospace';
  ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + h / 2 + 5);
}
