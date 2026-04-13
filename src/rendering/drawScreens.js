import { FACTIONS, FACTION_KEYS, UPGRADES, MILESTONE_DEFS, UPGRADE_CATEGORIES, MUTATIONS, RARITY_COLORS, RARITY_LABELS } from '../config.js';
import { getUpgradeCost } from '../state/GameState.js';
import { UPGRADE_SCREEN_GRACE_MS } from '../constants.js';

export function drawTitle(ctx, s) {
  const { W, H } = s;
  const highScore = s._highScore || 0;
  const t = performance.now() / 1000;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#060d1a'); grad.addColorStop(0.5, '#0a1a2a'); grad.addColorStop(1, '#0d2240');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

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

  // Faction previews
  ctx.font = 'bold ' + Math.min(12, W * 0.022) + 'px monospace';
  const factionPreviewY = H * 0.29;
  FACTION_KEYS.forEach((fk, fi) => {
    const f = FACTIONS[fk];
    const fx = W / 2 + (fi - 1.5) * 85;
    ctx.fillStyle = f.accent;
    ctx.beginPath(); ctx.arc(fx, factionPreviewY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.accent; ctx.fillText(f.name, fx, factionPreviewY + 16);
  });

  ctx.fillStyle = '#aaa'; ctx.font = Math.min(13, W * 0.025) + 'px monospace';
  const isMobile = s.isTouchDevice;
  const features = isMobile ? [
    '🕹 Left stick — Move',
    '🎯 Right stick — Aim & Fire (push past ring for missiles)',
    '⚡ Right stick + AUTO button — continuous fire',
    '💨 DASH button — dodge in move direction',
    '',
    '⚡ Level Up → 3 Card Choices  |  Spend Oil to Pick Upgrade',
    '🧠 Hive Mind AI — Commanders, Scouts, Kamikaze, Shield Drones',
    '🛢 Oil Economy — Shooting costs oil, own rigs to survive',
    '🏭 Capture & defend oil rigs — enemies raid with purpose',
  ] : [
    'WASD/Arrows - Move  |  Mouse - Aim  |  Space/LMB - Fire',
    'E/RMB - Homing Missiles  |  Q - Time Warp  |  B - Black Hole',
    'Shift - Dash Dodge  |  F - Auto-Fire  |  P - Pause',
    '',
    '⚡ Level Up → 3 Card Choices  |  Spend Oil to Pick Upgrade',
    '🧠 Hive Mind AI — Commanders, Scouts, Kamikaze, Shield Drones',
    '🛢 Oil Economy — Shooting costs oil, own rigs to survive',
    '🏭 Capture & defend oil rigs — enemies raid with purpose',
    '🌅 Dynamic day/night  |  🔊 Procedural sound',
  ];
  features.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.36 + i * Math.min(22, W * 0.032)));

  ctx.fillStyle = '#aa44ff'; ctx.font = 'bold ' + Math.min(14, W * 0.025) + 'px monospace';
  ctx.fillText('27 UPGRADES + COMPANIONS + SYNERGY EVOLUTIONS + INSANE COMBOS', W / 2, H * 0.73);

  if (highScore > 0) {
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(14, W * 0.025) + 'px monospace';
    ctx.fillText('HIGH SCORE: ' + highScore, W / 2, H * 0.81);
  }

  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ffcc00' : '#ff8800';
  ctx.font = 'bold ' + Math.min(24, W * 0.04) + 'px monospace';
  ctx.fillText(isMobile ? '[ TAP to START ]' : '[ CLICK or TAP to START ]', W / 2, H * 0.92);
}

export function drawGameOver(ctx, s) {
  const { W, H } = s;
  const highScore = s._highScore || 0;
  const t2 = performance.now() / 1000;

  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3333'; ctx.font = 'bold ' + Math.min(52, W * 0.085) + 'px monospace';
  ctx.fillText('GAME OVER', W / 2, H * 0.14);
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(32, W * 0.055) + 'px monospace';
  ctx.fillText('FINAL SCORE: ' + s.score, W / 2, H * 0.22);
  if (s.score >= highScore && s.score > 0) {
    ctx.fillStyle = '#ff8844'; ctx.font = 'bold ' + Math.min(18, W * 0.03) + 'px monospace';
    ctx.fillText('★ NEW HIGH SCORE! ★', W / 2, H * 0.27);
  }
  const mins = Math.floor(s.timeSurvived / 60);
  const secs = Math.floor(s.timeSurvived % 60);
  ctx.fillStyle = '#88ccff'; ctx.font = 'bold ' + Math.min(16, W * 0.028) + 'px monospace';
  ctx.fillText('TIME SURVIVED: ' + mins + ':' + (secs < 10 ? '0' : '') + secs, W / 2, H * 0.32);

  ctx.fillStyle = '#aaa'; ctx.font = Math.min(13, W * 0.023) + 'px monospace';
  let ly = H * 0.38;
  ctx.fillText('Level: ' + s.playerLevel + ' / 33', W / 2, ly); ly += 19;
  ctx.fillText('Oil Rigs Owned: ' + s.rigs.filter(r => r.owner === 'player').length + ' / 10', W / 2, ly); ly += 19;
  ctx.fillText('Upgrades: ' + s.totalUpgrades, W / 2, ly); ly += 19;
  ctx.fillText('Max Combo: ' + s.maxCombo + 'x  |  Max Streak: ' + s.maxStreak, W / 2, ly); ly += 19;

  const totalKillCount = (s.totalKills.drone || 0) + (s.totalKills.plane || 0) + (s.totalKills.chopper || 0) + (s.totalKills.boss || 0);
  ctx.fillStyle = '#ff8844'; ctx.font = 'bold ' + Math.min(13, W * 0.023) + 'px monospace';
  ctx.fillText('KILLS: ' + totalKillCount, W / 2, ly); ly += 17;
  ctx.fillStyle = '#888'; ctx.font = Math.min(11, W * 0.02) + 'px monospace';
  ctx.fillText('Drones: ' + (s.totalKills.drone || 0) + '  Planes: ' + (s.totalKills.plane || 0) + '  Choppers: ' + (s.totalKills.chopper || 0) + '  Bosses: ' + (s.totalKills.boss || 0), W / 2, ly); ly += 17;
  ctx.fillText('Damage Dealt: ' + Math.floor(s.totalDamageDealt) + '  |  Damage Taken: ' + Math.floor(s.totalDamageTaken), W / 2, ly); ly += 17;

  // Wanted
  let ws = 'Wanted: '; for (let i = 0; i < s.wantedLevel; i++) ws += '★'; for (let i = s.wantedLevel; i < 4; i++) ws += '☆';
  ctx.fillText(ws, W / 2, ly); ly += 17;

  // Build summary — card upgrades
  let buildStr = 'Build: ';
  const buildParts = [];
  for (const [k, l] of Object.entries(s.upgradeLevels || {})) {
    if (l > 0 && UPGRADES[k]) buildParts.push((UPGRADES[k].icon || '') + ' ' + UPGRADES[k].name + (l > 1 ? ' ×' + l : ''));
  }
  buildStr += buildParts.length > 0 ? buildParts.join('  ') : '(no cards picked)';
  ctx.fillText(buildStr, W / 2, ly); ly += 15;

  if (s.totalUpgrades > 0) {
    let ut = 'Abilities: ';
    for (const [k, l] of Object.entries(s.upgradeLevels)) {
      if (l > 0) ut += (UPGRADES[k] ? UPGRADES[k].icon : '?') + ' ' + (UPGRADES[k] ? UPGRADES[k].name : k) + ' Lv' + l + '  ';
    }
    ctx.fillText(ut, W / 2, ly);
  }

  ctx.fillStyle = Math.sin(t2 * 3) > 0 ? '#ffcc00' : '#ff8800';
  ctx.font = 'bold ' + Math.min(22, W * 0.04) + 'px monospace';
  ctx.fillText('[ CLICK or TAP to RESTART ]', W / 2, H * 0.92);
}

export function drawUpgradeScreen(ctx, s) {
  const { W, H } = s;
  const mouseX = s.input.mouseX, mouseY = s.input.mouseY;
  const t = performance.now() / 1000;

  ctx.fillStyle = 'rgba(0,0,10,0.92)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  // Header
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(26, W * 0.044) + 'px monospace';
  ctx.fillText('LEVEL ' + s.playerLevel + ' — PICK A CARD', W / 2, H * 0.07);

  const oilDisplay = Math.floor(s.player.oil);
  const oilColor = oilDisplay >= 120 ? '#44ff88' : oilDisplay >= 50 ? '#ffcc44' : '#ff4444';
  ctx.fillStyle = oilColor; ctx.font = 'bold ' + Math.min(13, W * 0.022) + 'px monospace';
  ctx.fillText('⛽ ' + oilDisplay + ' OIL', W / 2, H * 0.115);

  const choices = s.upgradeChoices;
  // Separate weapon card from stat/effect cards
  const weaponKey = choices.find(k => k && UPGRADES[k]?.category === 'weapon');
  const synergyKey = choices.find(k => k && UPGRADES[k]?.synergy);
  const mutationKey = choices.find(k => k && MUTATIONS[k]);
  const statChoices = choices.filter(k => k && UPGRADES[k]?.category !== 'weapon' && !UPGRADES[k]?.synergy && !MUTATIONS[k]);

  // 4-card layout: 3 stat cards + 1 weapon card (slightly narrower each)
  const cardCount = statChoices.length + (weaponKey ? 1 : 0);
  const cardW = Math.min(Math.floor(W * 0.22), 210);
  const cardH = Math.min(Math.floor(H * 0.60), 440);
  const gap = Math.max(8, Math.floor(W * 0.016));
  const totalW = cardCount * cardW + (cardCount - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = H * 0.135;

  // Draw stat cards
  for (let i = 0; i < statChoices.length; i++) {
    const key = statChoices[i];
    if (!key || !UPGRADES[key]) continue;
    drawUpgradeCard(ctx, key, startX + i * (cardW + gap), startY, cardW, cardH, s, mouseX, mouseY, false, t, false, s.pendingUpgradeCard === key);
  }

  // Draw weapon card — with golden border label
  if (weaponKey && UPGRADES[weaponKey]) {
    const wIdx = statChoices.length;
    const wx = startX + wIdx * (cardW + gap);
    ctx.fillStyle = '#ffaa00'; ctx.font = 'bold ' + Math.min(10, W * 0.018) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚔ WEAPON SLOT ⚔', wx + cardW / 2, startY - 10);
    drawUpgradeCard(ctx, weaponKey, wx, startY, cardW, cardH, s, mouseX, mouseY, false, t, true, s.pendingUpgradeCard === weaponKey);
  }

  const synH = Math.min(90, H * 0.14);
  let nextSpecialY = startY + cardH + 14;

  // Synergy card
  if (synergyKey && UPGRADES[synergyKey]) {
    ctx.fillStyle = '#cc88ff'; ctx.font = 'bold ' + Math.min(11, W * 0.02) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillText('⬇ SYNERGY EVOLUTION ⬇', W / 2, nextSpecialY - 8);
    const synW = Math.min(340, W * 0.50);
    drawUpgradeCard(ctx, synergyKey, (W - synW) / 2, nextSpecialY, synW, synH, s, mouseX, mouseY, true, t, false, s.pendingUpgradeCard === synergyKey);
    nextSpecialY += synH + 10;
  }

  // Mutation card
  if (mutationKey && MUTATIONS[mutationKey]) {
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold ' + Math.min(11, W * 0.02) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillText('🧬 MUTATION READY 🧬', W / 2, nextSpecialY - 8);
    const mutW = Math.min(340, W * 0.50);
    drawMutationCard(ctx, mutationKey, (W - mutW) / 2, nextSpecialY, mutW, synH, s, mouseX, mouseY, s.pendingUpgradeCard === mutationKey);
  }

  // Skip button
  const skipW = 180, skipH = 40;
  const skipX = (W - skipW) / 2, skipY = H * 0.92;
  const skipHover = mouseX >= skipX && mouseX <= skipX + skipW && mouseY >= skipY && mouseY <= skipY + skipH;
  ctx.fillStyle = skipHover ? 'rgba(80,60,20,0.9)' : 'rgba(30,20,10,0.75)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(skipX, skipY, skipW, skipH, 8); ctx.fill(); }
  else ctx.fillRect(skipX, skipY, skipW, skipH);
  ctx.strokeStyle = skipHover ? '#ffaa44' : '#554422'; ctx.lineWidth = 1.5;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(skipX, skipY, skipW, skipH, 8); ctx.stroke(); }
  else ctx.strokeRect(skipX, skipY, skipW, skipH);
  ctx.fillStyle = skipHover ? '#ffcc66' : '#886644';
  ctx.font = 'bold ' + Math.min(12, W * 0.022) + 'px monospace'; ctx.textAlign = 'center';
  ctx.fillText('SKIP — KEEP OIL', skipX + skipW / 2, skipY + skipH / 2 + 5);

  // Grace-period overlay: briefly dim and show a "LIFT YOUR FINGERS" notice so the
  // player doesn't accidentally select a card immediately after the screen appears.
  const elapsed = s.upgradeScreenOpenTime ? Date.now() - s.upgradeScreenOpenTime : UPGRADE_SCREEN_GRACE_MS;
  if (elapsed < UPGRADE_SCREEN_GRACE_MS) {
    const progress = elapsed / UPGRADE_SCREEN_GRACE_MS; // 0 → 1
    const alpha = 0.72 * (1 - progress);
    ctx.fillStyle = `rgba(0,0,10,${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    // Pulsing "LIFT YOUR FINGERS" label
    const labelAlpha = 1 - progress * 0.4;
    ctx.globalAlpha = labelAlpha;
    const fontSize = Math.min(20, W * 0.038);
    ctx.font = 'bold ' + fontSize + 'px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.fillText(s.isTouchDevice ? '✋ LIFT YOUR FINGERS ✋' : '— PICK A CARD —', W / 2, H / 2);
    ctx.globalAlpha = 1;
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineH) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
  return lineY;
}

function drawUpgradeCard(ctx, key, cx, cy, cardW, cardH, s, mouseX, mouseY, isSynergy, t, isWeapon, isPending) {
  const up = UPGRADES[key];
  if (!up) return;
  const lvl = s.upgradeLevels[key] || 0;
  const cost = getUpgradeCost(key, lvl);
  const canAfford = s.player.oil >= cost;
  const isHovered = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH;
  const catDef = UPGRADE_CATEGORIES[up.category] || UPGRADE_CATEGORIES.special;
  const rarity = up.rarity || 'common';
  const rarityColor = RARITY_COLORS[rarity] || '#aaaacc';
  const isLegendary = rarity === 'legendary';
  const isRare = rarity === 'rare';
  const isStackable = (up.maxLevel || 1) >= 99;
  const alreadyOwned = lvl > 0;

  // ── Background ────────────────────────────────────────────────────────────
  let bgColor = 'rgba(14,14,32,0.96)';
  if (isWeapon) bgColor = 'rgba(22,14,4,0.97)';
  else if (isLegendary) bgColor = 'rgba(22,8,32,0.97)';
  else if (isSynergy) bgColor = 'rgba(20,14,38,0.97)';
  ctx.fillStyle = bgColor;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
  else ctx.fillRect(cx, cy, cardW, cardH);

  // Weapon card animated gold shimmer background
  if (isWeapon) {
    const shimmer = 0.05 + Math.abs(Math.sin(t * 2.8)) * 0.07;
    const grad = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
    grad.addColorStop(0, 'rgba(200,120,0,' + shimmer + ')');
    grad.addColorStop(0.5, 'rgba(255,180,0,' + (shimmer * 1.6) + ')');
    grad.addColorStop(1, 'rgba(180,80,0,' + shimmer + ')');
    ctx.fillStyle = grad;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  } else if (isLegendary) {
    // Legendary animated shimmer background
    const shimmer = 0.05 + Math.abs(Math.sin(t * 2.5)) * 0.06;
    const grad = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
    grad.addColorStop(0, 'rgba(180,0,180,' + shimmer + ')');
    grad.addColorStop(0.5, 'rgba(255,50,255,' + (shimmer * 1.5) + ')');
    grad.addColorStop(1, 'rgba(100,0,200,' + shimmer + ')');
    ctx.fillStyle = grad;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  }

  // Can't-afford dim
  if (!canAfford) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  }

  // ── Border ────────────────────────────────────────────────────────────────
  let borderColor = rarityColor + (canAfford ? 'cc' : '44');
  let borderWidth = isLegendary ? 2.5 : (isRare ? 2 : 1.5);
  if (isWeapon) { borderColor = canAfford ? '#ffaa00' : '#aa6600'; borderWidth = 2.5; }
  if (isHovered && canAfford) { borderColor = isWeapon ? '#ffdd44' : rarityColor; borderWidth = isLegendary || isWeapon ? 3 : 2.5; }
  if (isSynergy) { borderColor = canAfford ? '#ffcc00cc' : '#ffcc0044'; borderWidth = 2; }

  if (isLegendary || isWeapon) {
    // Animated dashed border for legendary and weapon cards
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -t * (isWeapon ? 22 : 18);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.stroke(); }
    else ctx.strokeRect(cx, cy, cardW, cardH);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  } else {
    ctx.strokeStyle = borderColor; ctx.lineWidth = borderWidth;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.stroke(); }
    else ctx.strokeRect(cx, cy, cardW, cardH);
  }

  // Hover glow
  if ((isHovered || isPending) && canAfford) {
    ctx.fillStyle = isPending ? (isWeapon ? 'rgba(255,220,0,0.22)' : rarityColor + '30') : (isWeapon ? 'rgba(255,180,0,0.10)' : rarityColor + '14');
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  }

  // Pending confirm glow (pulsing green outline)
  if (isPending && canAfford) {
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 6)) * 0.5;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - 2, cy - 2, cardW + 4, cardH + 4, 15); ctx.stroke(); }
    else ctx.strokeRect(cx - 2, cy - 2, cardW + 4, cardH + 4);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'center';

  if (isSynergy) {
    // Compact horizontal synergy card
    const t2 = performance.now() / 1000;
    ctx.globalAlpha = 0.06 + Math.sin(t2 * 3) * 0.04;
    ctx.fillStyle = '#ffcc00';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    ctx.globalAlpha = 1;

    ctx.font = Math.min(26, cardH * 0.38) + 'px serif'; ctx.fillStyle = '#fff';
    ctx.fillText(up.icon, cx + cardW * 0.09, cy + cardH * 0.58);
    ctx.font = 'bold ' + Math.min(14, cardW * 0.038) + 'px monospace'; ctx.fillStyle = '#ffcc00';
    ctx.fillText('SYNERGY: ' + up.name, cx + cardW / 2 + cardW * 0.06, cy + cardH * 0.28);
    ctx.font = Math.min(11, cardW * 0.03) + 'px monospace'; ctx.fillStyle = '#ccbbff';
    ctx.fillText(up.desc, cx + cardW / 2 + cardW * 0.06, cy + cardH * 0.52);
    ctx.font = 'bold ' + Math.min(11, cardW * 0.03) + 'px monospace';
    ctx.fillStyle = canAfford ? '#44ff88' : '#ff4444';
    const synergyPrompt = isPending ? '✓ CONFIRM EVOLVE' : '⛽ ' + cost + ' OIL  |  TAP TO EVOLVE';
    ctx.fillText(synergyPrompt, cx + cardW / 2 + cardW * 0.06, cy + cardH * 0.75);
    return;
  }

  // ── Category tag strip ────────────────────────────────────────────────────
  const tagH = Math.max(22, cardH * 0.07);
  const tagColor = isWeapon ? '#cc7700' : (isLegendary ? rarityColor : catDef.color);
  ctx.fillStyle = tagColor + (canAfford ? 'cc' : '44');
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx + 6, cy + 6, cardW - 12, tagH, 6); ctx.fill(); }
  else ctx.fillRect(cx + 6, cy + 6, cardW - 12, tagH);
  ctx.font = 'bold ' + Math.max(9, Math.min(12, cardH * 0.03)) + 'px monospace';
  ctx.fillStyle = canAfford ? '#000' : '#222';
  const tagLabel = isWeapon ? '⚔ WEAPON' : (isLegendary ? '★ LEGENDARY' : catDef.label);
  ctx.fillText(tagLabel, cx + cardW / 2, cy + tagH * 0.72 + 6);

  // ── Rarity badge (top-right corner) ─────────────────────────────────────
  if (!isLegendary && !isWeapon && rarity !== 'common') {
    const badge = RARITY_LABELS[rarity] || rarity.toUpperCase();
    ctx.font = 'bold ' + Math.max(8, Math.min(10, cardW * 0.042)) + 'px monospace';
    ctx.fillStyle = rarityColor;
    ctx.textAlign = 'right';
    ctx.fillText(badge, cx + cardW - 8, cy + tagH + 18);
    ctx.textAlign = 'center';
  }

  // ── Stack count badge (top-right corner for stackable + weapon cards) ─────
  if (alreadyOwned && (isStackable || isWeapon)) {
    const badgeSize = Math.max(8, Math.min(11, cardW * 0.046));
    ctx.font = 'bold ' + badgeSize + 'px monospace';
    ctx.fillStyle = canAfford ? '#ffdd55' : '#886622';
    ctx.textAlign = 'right';
    ctx.fillText('×' + lvl, cx + cardW - 8, cy + tagH + 18);
    ctx.textAlign = 'center';
  }

  // ── Icon ─────────────────────────────────────────────────────────────────
  const iconSize = Math.max(28, Math.min(52, cardH * 0.14));
  const iconY = cy + tagH + 18 + iconSize;
  ctx.font = iconSize + 'px serif';
  ctx.fillStyle = canAfford ? '#fff' : '#555';
  ctx.fillText(up.icon, cx + cardW / 2, iconY);

  // ── Name ─────────────────────────────────────────────────────────────────
  const nameSize = Math.max(11, Math.min(16, cardW * 0.07));
  ctx.font = 'bold ' + nameSize + 'px monospace';
  const nameColor = isWeapon ? (canAfford ? '#ffcc44' : '#555') : (canAfford ? (isLegendary ? rarityColor : up.color) : '#555');
  ctx.fillStyle = nameColor;
  const namePrefix = alreadyOwned ? '+1 ' : '';
  ctx.fillText(namePrefix + up.name, cx + cardW / 2, iconY + nameSize + 6);

  // ── Level dots (classic cards only, maxLevel ≤ 10) ───────────────────────
  const hasClassicDots = up.maxLevel > 1 && up.maxLevel <= 10;
  if (hasClassicDots) {
    const dotSize = Math.max(10, Math.min(14, cardW * 0.07));
    ctx.font = dotSize + 'px monospace';
    ctx.fillStyle = canAfford ? '#888' : '#444';
    let dots = '';
    for (let d = 0; d < up.maxLevel; d++) dots += d < lvl ? '●' : d === lvl ? '◉' : '○';
    ctx.fillText(dots, cx + cardW / 2, iconY + nameSize + dotSize + 14);
  }

  // ── Description (word-wrapped) ────────────────────────────────────────────
  const descSize = Math.max(9, Math.min(12, cardW * 0.052));
  ctx.font = descSize + 'px monospace';
  ctx.fillStyle = canAfford ? (isWeapon ? '#ffe8aa' : (isLegendary ? '#ffccff' : '#ccc')) : '#555';
  const descY = iconY + nameSize + (hasClassicDots ? 36 : 22);
  wrapText(ctx, up.desc, cx + cardW / 2, descY, cardW - 16, descSize + 4);

  // ── Oil cost ─────────────────────────────────────────────────────────────
  const costSize = Math.max(11, Math.min(15, cardW * 0.065));
  const costY = cy + cardH - 42;
  ctx.font = 'bold ' + costSize + 'px monospace';
  ctx.fillStyle = canAfford ? '#44ff88' : '#ff4444';
  ctx.fillText('⛽ ' + cost + ' OIL', cx + cardW / 2, costY);

  // ── Tap/click prompt ──────────────────────────────────────────────────────
  const promptSize = Math.max(9, Math.min(12, cardW * 0.055));
  ctx.font = 'bold ' + promptSize + 'px monospace';
  if (isPending && canAfford) {
    ctx.fillStyle = '#44ff88';
    ctx.fillText('✓ TAP TO CONFIRM', cx + cardW / 2, cy + cardH - 18);
  } else {
    ctx.fillStyle = canAfford
      ? (isLegendary ? rarityColor + 'cc' : up.color + '99')
      : '#553322';
    ctx.fillText(canAfford ? '[ TAP TO PICK ]' : '[ LOW FUNDS ]', cx + cardW / 2, cy + cardH - 18);
  }
}

function drawMutationCard(ctx, key, cx, cy, cardW, cardH, s, mouseX, mouseY, isPending) {
  const mut = MUTATIONS[key];
  if (!mut) return;
  const cost = 150;
  const canAfford = s.player.oil >= cost;
  const isHovered = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH;
  const t = performance.now() / 1000;

  // Background — deep dark with slight electric tint
  ctx.fillStyle = 'rgba(0,10,30,0.95)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
  else ctx.fillRect(cx, cy, cardW, cardH);

  // Pulsing electric shimmer
  ctx.globalAlpha = 0.08 + Math.sin(t * 5) * 0.05;
  ctx.fillStyle = mut.color;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
  ctx.globalAlpha = 1;

  // Can't-afford dim
  if (!canAfford) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  }

  // Electric border — animates dash offset
  const borderColor = isHovered && canAfford ? mut.color : (mut.color + (canAfford ? 'cc' : '55'));
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 5]);
  ctx.lineDashOffset = -t * 22;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.stroke(); }
  else ctx.strokeRect(cx, cy, cardW, cardH);
  ctx.setLineDash([]); ctx.lineDashOffset = 0;

  // Hover glow
  if (isHovered && canAfford) {
    ctx.fillStyle = mut.color + '22';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 12); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);
  }

  ctx.textAlign = 'center';
  // Icon
  ctx.font = Math.min(28, cardH * 0.32) + 'px serif'; ctx.fillStyle = canAfford ? '#fff' : '#555';
  ctx.fillText(mut.icon, cx + cardW * 0.08, cy + cardH * 0.6);
  // Name
  ctx.font = 'bold ' + Math.min(15, cardW * 0.042) + 'px monospace'; ctx.fillStyle = canAfford ? mut.color : '#555';
  ctx.fillText('MUTATE: ' + mut.name, cx + cardW / 2 + 10, cy + cardH * 0.3);
  // Desc
  ctx.font = Math.min(12, cardW * 0.034) + 'px monospace'; ctx.fillStyle = canAfford ? '#cceeff' : '#445555';
  ctx.fillText(mut.desc, cx + cardW / 2 + 10, cy + cardH * 0.56);
  // Cost
  ctx.font = 'bold ' + Math.min(11, cardW * 0.032) + 'px monospace';
  ctx.fillStyle = canAfford ? '#44ff88' : '#ff4444';
  ctx.fillText('EVOLVE: ' + cost + ' OIL', cx + cardW / 2 + 10, cy + cardH * 0.75);
  ctx.fillStyle = isPending && canAfford ? '#44ff88' : (canAfford ? (mut.color + '99') : '#334444');
  ctx.fillText(isPending && canAfford ? '✓ TAP TO CONFIRM' : (canAfford ? '[ MUTATE — CLICK ]' : '[ LOW FUNDS ]'), cx + cardW / 2 + 10, cy + cardH * 0.9);
  if (isPending && canAfford) {
    ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.globalAlpha = 0.5 + Math.abs(Math.sin(t * 6)) * 0.5;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - 2, cy - 2, cardW + 4, cardH + 4, 13); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

export function drawPauseScreen(ctx, s, settings) {
  const { W, H } = s;
  const mouseX = s.input.mouseX, mouseY = s.input.mouseY;

  ctx.fillStyle = 'rgba(0,0,10,0.82)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold ' + Math.min(40, W * 0.07) + 'px monospace';
  ctx.fillText('PAUSED', W / 2, H * 0.24);
  const mins = Math.floor(s.timeSurvived / 60);
  const secs = Math.floor(s.timeSurvived % 60);
  ctx.fillStyle = '#aaa'; ctx.font = Math.min(14, W * 0.025) + 'px monospace';
  ctx.fillText('Score: ' + s.score + '  |  Time: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + '  |  Level: ' + s.playerLevel, W / 2, H * 0.32);

  const btnW = 180, btnH = 42;
  const btnX = (W - btnW) / 2;
  drawPauseButton(ctx, btnX, H * 0.42, btnW, btnH, '▶ RESUME', '#44ff88', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.52, btnW, btnH, '🔊 SOUND: ' + (settings.soundOn ? 'ON' : 'OFF'), settings.soundOn ? '#44ccff' : '#666', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.61, btnW, btnH, '📳 SHAKE: ' + (settings.shakeOn ? 'ON' : 'OFF'), settings.shakeOn ? '#44ccff' : '#666', mouseX, mouseY);
  drawPauseButton(ctx, btnX, H * 0.71, btnW, btnH, '↻ RESTART', '#ff6644', mouseX, mouseY);
  ctx.fillStyle = '#555'; ctx.font = Math.min(12, W * 0.022) + 'px monospace';
  ctx.fillText('Press P or ESC to resume', W / 2, H * 0.88);
}

function drawPauseButton(ctx, x, y, w, h, text, color, mouseX, mouseY) {
  ctx.fillStyle = 'rgba(20,20,40,0.85)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color + '88'; ctx.lineWidth = 2;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke(); }
  else ctx.strokeRect(x, y, w, h);
  if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
    ctx.fillStyle = color + '18';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); }
    else ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = color; ctx.font = 'bold ' + Math.min(14, w * 0.08) + 'px monospace';
  ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + h / 2 + 5);
}

export function drawMilestoneScreen(ctx, s) {
  const { W, H } = s;
  const mouseX = s.input.mouseX, mouseY = s.input.mouseY;
  const t = performance.now() / 1000;

  // Overlay
  ctx.fillStyle = 'rgba(0,0,15,0.9)'; ctx.fillRect(0, 0, W, H);

  // Animated gold shimmer strip
  ctx.globalAlpha = 0.07 + Math.sin(t * 2.5) * 0.04;
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(0, H * 0.08, W, H * 0.84);
  ctx.globalAlpha = 1;

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold ' + Math.min(38, W * 0.062) + 'px monospace';
  ctx.fillText('★ MILESTONE UNLOCKED ★', W / 2, H * 0.13);

  ctx.fillStyle = '#aaaacc';
  ctx.font = Math.min(13, W * 0.023) + 'px monospace';
  ctx.fillText('Score: ' + s.score + '  |  Choose a permanent passive ability', W / 2, H * 0.20);

  const choices = s.milestoneChoices || [];
  if (choices.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = Math.min(14, W * 0.025) + 'px monospace';
    ctx.fillText('(No milestone choices available)', W / 2, H / 2);
    return;
  }

  const cardW = Math.min(200, W * 0.28);
  const cardH = Math.min(260, H * 0.44);
  const gap = Math.min(28, W * 0.03);
  const totalW = choices.length * cardW + (choices.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = (H - cardH) / 2 + H * 0.03;

  for (let i = 0; i < choices.length; i++) {
    const key = choices[i];
    const def = MILESTONE_DEFS.find(m => m.key === key);
    if (!def) continue;

    const cx = startX + i * (cardW + gap);
    const cy = startY;
    const isHovered = mouseX >= cx && mouseX <= cx + cardW && mouseY >= cy && mouseY <= cy + cardH;

    // Card background
    ctx.fillStyle = 'rgba(10,10,30,0.95)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
    else ctx.fillRect(cx, cy, cardW, cardH);

    // Border
    ctx.strokeStyle = isHovered ? def.color : def.color + '66';
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.stroke(); }
    else ctx.strokeRect(cx, cy, cardW, cardH);

    // Hover fill
    if (isHovered) {
      ctx.fillStyle = def.color + '14';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
      else ctx.fillRect(cx, cy, cardW, cardH);
    }

    // Pulsing glow when hovered
    if (isHovered) {
      ctx.globalAlpha = 0.08 + Math.sin(t * 4) * 0.04;
      ctx.fillStyle = def.color;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 14); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'center';

    // Icon
    ctx.font = Math.min(40, cardW * 0.24) + 'px serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(def.icon, cx + cardW / 2, cy + cardH * 0.26);

    // Name
    ctx.font = 'bold ' + Math.min(15, cardW * 0.085) + 'px monospace';
    ctx.fillStyle = def.color;
    ctx.fillText(def.name, cx + cardW / 2, cy + cardH * 0.43);

    // PASSIVE badge
    ctx.font = Math.min(10, cardW * 0.058) + 'px monospace';
    ctx.fillStyle = '#88aacc';
    ctx.fillText('PASSIVE', cx + cardW / 2, cy + cardH * 0.52);

    // Description
    ctx.font = Math.min(11, cardW * 0.064) + 'px monospace';
    ctx.fillStyle = '#ccccee';
    // Wrap description text at ~22 chars
    const words = def.desc.split(' ');
    let line = '', lines = [];
    for (const w of words) {
      if ((line + w).length > 22) { lines.push(line.trim()); line = w + ' '; }
      else line += w + ' ';
    }
    if (line.trim()) lines.push(line.trim());
    lines.forEach((ln, li) => ctx.fillText(ln, cx + cardW / 2, cy + cardH * 0.64 + li * Math.min(16, cardH * 0.07)));

    // Click prompt
    ctx.font = 'bold ' + Math.min(11, cardW * 0.064) + 'px monospace';
    ctx.fillStyle = def.color + '99';
    ctx.fillText('[ CLICK ]', cx + cardW / 2, cy + cardH * 0.91);
  }

  // Footer
  ctx.fillStyle = '#44aa66';
  ctx.font = 'bold ' + Math.min(12, W * 0.022) + 'px monospace';
  ctx.fillText('Permanent — carries through the entire run', W / 2, H * 0.93);
}
