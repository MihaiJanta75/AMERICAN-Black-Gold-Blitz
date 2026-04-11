import { FACTIONS } from '../config.js';
import { COMMANDER_BUFF_RADIUS } from '../constants.js';
import { rand } from '../utils.js';

export function drawEnemies(ctx, s) {
  const { time, nightMode, nightAlpha } = s;

  for (const e of s.enemies) {
    const f = FACTIONS[e.faction] || FACTIONS.red;

    // Stun sparks
    if (e.stunTimer > 0) {
      ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#44ffff'; ctx.lineWidth = 1;
      for (let sc = 0; sc < 4; sc++) {
        const sa = (time * 8 + sc * Math.PI / 2) % (Math.PI * 2);
        const sr = rand(6, 14);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Panic: draw confused indicator
    if (e.panicTimer > 0) {
      ctx.save(); ctx.translate(e.x, e.y - e.radius - 10);
      ctx.font = '10px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
      ctx.fillText('?!', 0, 0);
      ctx.restore();
    }

    // Shield bubble from shield drone
    if (e.shieldBubble) {
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.globalAlpha = 0.18 + Math.sin(time * 5) * 0.06;
      ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#aa44ff';
      ctx.globalAlpha = 0.06; ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Bounty target: rotating golden crown ring + pulsing corona
    if (e.isBounty) {
      ctx.save(); ctx.translate(e.x, e.y);
      // Outer pulsing glow
      ctx.globalAlpha = 0.25 + Math.sin(time * 5) * 0.15;
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 20, 0, Math.PI * 2); ctx.fill();
      // Rotating dashed ring
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 12, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // Crown icon above
      ctx.globalAlpha = 0.9 + Math.sin(time * 4) * 0.1;
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -e.radius - 16);
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Revenge mark: red skull + pulsing red ring
    if (e.isMarked) {
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.globalAlpha = 0.30 + Math.sin(time * 7) * 0.20;
      ctx.fillStyle = '#ff2244';
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff2244'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = time * 28;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff2244'; ctx.textAlign = 'center';
      ctx.fillText('☠', 0, -e.radius - 14);
      ctx.restore();
    }

    // Commander aura ring
    if (e.subType === 'command' && !e.isBoss) {
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.globalAlpha = 0.07 + Math.sin(time * 2) * 0.03;
      ctx.strokeStyle = f.accent; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(0, 0, COMMANDER_BUFF_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Ghost elite: near-invisible when not firing
    if (e.isGhostElite && !e.ghostVisible) {
      ctx.globalAlpha = 0.12 + Math.sin(time * 4) * 0.06;
    }

    // Elite name banner above all named elites
    if (e.isElite && e.eliteDef) {
      const def = e.eliteDef;
      ctx.save(); ctx.translate(e.x, e.y - e.radius - 24);
      ctx.globalAlpha = 0.9 + Math.sin(time * 3) * 0.1;
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = def.color; ctx.textAlign = 'center';
      ctx.fillText(def.icon + ' ' + def.name, 0, 0);
      // HP bar for elite
      const ehp = e.hp / e.maxHp;
      const ebw = 60;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-ebw / 2 - 1, 4, ebw + 2, 7);
      ctx.fillStyle = ehp > 0.5 ? def.color : ehp > 0.25 ? '#ff8800' : '#ff2200';
      ctx.fillRect(-ebw / 2, 5, ebw * ehp, 5);
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Visibility glow — faction-coloured halo behind each enemy so they read against any background
    const glowR = e.radius * (e.isBoss ? 2.2 : 1.9);
    ctx.save();
    // Outer soft halo
    ctx.globalAlpha = 0.18 + Math.sin(time * 3 + e.x * 0.007) * 0.05;
    ctx.fillStyle = f.glow;
    ctx.beginPath(); ctx.arc(e.x, e.y, glowR, 0, Math.PI * 2); ctx.fill();
    // Dark drop-shadow for contrast on light terrain
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(e.x + 2, e.y + 2, e.radius * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Render by type
    if (e.type === 'drone')        drawDrone(ctx, e, f, time);
    else if (e.type === 'plane')   drawPlaneE(ctx, e, f, time);
    else if (e.type === 'chopper') drawChopperE(ctx, e, f, time);
    else if (e.type === 'bomber')  drawBomberE(ctx, e, f, time);

    // Reset ghost alpha
    if (e.isGhostElite && !e.ghostVisible) ctx.globalAlpha = 1;

    // Night mode: glowing eyes on all enemies
    if (s.nightMode && s.nightAlpha > 0.3) {
      const eyeAlpha = Math.min(0.9, s.nightAlpha * 1.1) * (0.7 + Math.sin(time * 4) * 0.3);
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
      ctx.globalAlpha = eyeAlpha;
      ctx.fillStyle = e.isBoss ? '#ff2200' : (e.subType === 'command' ? '#ffcc00' : f.accent);
      const eyeOffset = e.radius * 0.35;
      ctx.beginPath(); ctx.arc(eyeOffset, -3, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffset, 3, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // HP bar — always visible for commanders and bosses
    if (e.hp < e.maxHp || e.subType === 'command' || e.isBoss) {
      const bw = e.isBoss ? 44 : e.type === 'chopper' ? 32 : 26;
      const barY = e.y - (e.isBoss ? 34 : 26);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - bw / 2 - 1, barY - 1, bw + 2, 5);
      ctx.fillStyle = '#222'; ctx.fillRect(e.x - bw / 2, barY, bw, 3);
      const hp = Math.max(0, e.hp / e.maxHp);
      const hpColor = hp > 0.6 ? f.accent : hp > 0.3 ? '#ffcc00' : '#ff3333';
      ctx.fillStyle = hpColor; ctx.fillRect(e.x - bw / 2, barY, bw * hp, 3);
    }

    // Boss indicators
    if (e.isBoss) {
      ctx.globalAlpha = 0.45 + Math.sin(time * 4) * 0.2;
      ctx.strokeStyle = f.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = f.accent; ctx.textAlign = 'center';
      ctx.fillText('BOSS', e.x, e.y - e.radius - 10);
    }

    // Commander label
    if (e.subType === 'command' && !e.isBoss) {
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
      ctx.fillText('CMD', e.x, e.y - e.radius - 8);
    }

    // Commander buffed glow on nearby units
    if (e.commanderBuffed) {
      ctx.globalAlpha = 0.12 + Math.sin(time * 6) * 0.06;
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/* ===== DRONE (all subtypes) ===== */
function drawDrone(ctx, e, f, time) {
  const scale = e.isBoss ? 1.6 : (f.style === 'tanky' ? 1.3 : 1);

  // Kamikaze: red tint + pulsing
  if (e.subType === 'kamikaze') {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.globalAlpha = 0.25 + Math.sin(time * 12) * 0.15;
    ctx.fillStyle = '#ff2200';
    ctx.beginPath(); ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Scout: green tint + antenna
  if (e.subType === 'scout') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
    ctx.strokeStyle = '#44ffaa'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -16); ctx.stroke();
    ctx.fillStyle = '#44ffaa'; ctx.beginPath(); ctx.arc(0, -16, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Shield drone: bubble emitter visual
  if (e.subType === 'shield') {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(time * 1.5);
    ctx.globalAlpha = 0.3; ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const ra = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ra) * 10, Math.sin(ra) * 10, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Oil thief: dark with dripping effect
  if (e.subType === 'oil_thief') {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(0, 0, 20 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }

  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.scale(scale, scale);
  ctx.strokeStyle = f.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke();
  ctx.fillStyle = f.body; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.accent; ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI * 2); ctx.fill();

  // Status indicator light color by subtype
  let lightColor = 'rgba(255,' + (100 + Math.sin(time * 8) * 50) + ',0,0.9)';
  if (e.subType === 'kamikaze') lightColor = 'rgba(255,50,0,1)';
  if (e.subType === 'scout')    lightColor = 'rgba(80,255,150,0.9)';
  if (e.subType === 'shield')   lightColor = 'rgba(160,80,255,0.9)';
  if (e.subType === 'oil_thief') lightColor = 'rgba(80,40,0,0.9)';
  ctx.fillStyle = lightColor;
  ctx.beginPath(); ctx.arc(3, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Rotors
  const offsets = [[-9, -9], [9, -9], [-9, 9], [9, 9]];
  for (const [ox, oy] of offsets) {
    const rx = e.x + (Math.cos(e.angle) * ox - Math.sin(e.angle) * oy) * scale;
    const ry = e.y + (Math.sin(e.angle) * ox + Math.cos(e.angle) * oy) * scale;
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(e.rotorAngle);
    ctx.globalAlpha = 0.4; ctx.strokeStyle = f.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.globalAlpha = 0.08; ctx.fillStyle = f.accent; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  }
}

/* ===== BOMBER ===== */
function drawBomberE(ctx, e, f, time) {
  const scale = 1.4;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.scale(scale, scale);
  // Heavy bomber body
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.bezierCurveTo(14, -8, 2, -10, -12, -8); ctx.lineTo(-18, -3); ctx.lineTo(-18, 3); ctx.lineTo(-12, 8); ctx.bezierCurveTo(2, 10, 14, 8, 18, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = f.accent; ctx.lineWidth = 0.8; ctx.stroke();
  // Heavy wings
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(-8, -22); ctx.lineTo(-14, -22); ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(-8, 22); ctx.lineTo(-14, 22); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.accent; ctx.fillRect(-14, -23, 4, 2); ctx.fillRect(-14, 21, 4, 2);
  // Cockpit
  ctx.fillStyle = '#224466';
  ctx.beginPath(); ctx.ellipse(10, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Bomb bay indicator
  ctx.fillStyle = e.bombDropped ? '#333' : '#cc4400';
  ctx.globalAlpha = e.bombDropped ? 0.3 : (0.7 + Math.sin(time * 8) * 0.3);
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Propellers
  ctx.save(); ctx.translate(18, 0); ctx.rotate(e.propAngle || 0);
  ctx.globalAlpha = 0.55; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();
  ctx.restore();
  // DANGER label + HP bar
  if (!e.bombDropped) {
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#ff4400'; ctx.textAlign = 'center';
    ctx.fillText('💣 BOMBER', e.x, e.y - e.radius * scale - 10);
  }
}

/* ===== PLANE ===== */
function drawPlaneE(ctx, e, f, time) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
  ctx.fillStyle = f.body;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.bezierCurveTo(16, -3, 4, -5, -8, -4); ctx.lineTo(-14, -2); ctx.lineTo(-14, 2); ctx.lineTo(-8, 4); ctx.bezierCurveTo(4, 5, 16, 3, 18, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.accent;
  ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(-6, -16); ctx.lineTo(-10, -16); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(-6, 16); ctx.lineTo(-10, 16); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.accent; ctx.fillRect(-9, -17, 3, 2); ctx.fillRect(-9, 15, 3, 2);
  ctx.fillStyle = f.dark;
  ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-16, -8); ctx.lineTo(-18, -8); ctx.lineTo(-14, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-16, 8); ctx.lineTo(-18, 8); ctx.lineTo(-14, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#44aadd'; ctx.beginPath(); ctx.ellipse(12, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.accent; ctx.fillRect(0, -1.5, 10, 3);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffaa44'; ctx.beginPath(); ctx.ellipse(-14, 0, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(18, 0); ctx.rotate(e.propAngle || 0);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  ctx.restore();
}

/* ===== CHOPPER (normal + command) ===== */
function drawChopperE(ctx, e, f, time) {
  const scale = e.isBoss ? 1.5 : (e.subType === 'command' ? 1.2 : 1);
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.scale(scale, scale);
  ctx.fillStyle = f.dark; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-20, -1); ctx.lineTo(-20, 1); ctx.lineTo(-6, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.body; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-24, -5); ctx.lineTo(-18, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.body;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.bezierCurveTo(12, -6, 4, -9, -4, -7); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.lineTo(-8, 4); ctx.lineTo(-4, 7); ctx.bezierCurveTo(4, 9, 12, 6, 14, 0); ctx.closePath(); ctx.fill();

  // Command chopper: extra gold stripe
  if (e.subType === 'command') {
    ctx.fillStyle = '#ffcc00'; ctx.globalAlpha = 0.5;
    ctx.fillRect(-2, -8, 10, 3); ctx.fillRect(-2, 5, 10, 3);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(200,100,100,0.3)'; ctx.beginPath(); ctx.ellipse(4, -2, 6, 2.5, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.dark; ctx.fillRect(0, -10, 6, 2.5); ctx.fillRect(0, 7.5, 6, 2.5);
  ctx.fillStyle = '#ffaa44'; ctx.beginPath(); ctx.ellipse(8, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = f.accent; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(8, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = f.accent; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.bezierCurveTo(12, -6, 4, -9, -4, -7); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.lineTo(-8, 4); ctx.lineTo(-4, 7); ctx.bezierCurveTo(4, 9, 12, 6, 14, 0); ctx.stroke();
  ctx.restore();

  // Main rotor
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rotorAngle || 0);
  const rotorR = 18 * scale;
  ctx.globalAlpha = 0.07; ctx.fillStyle = f.accent; ctx.beginPath(); ctx.arc(0, 0, rotorR, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.55; ctx.strokeStyle = f.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-rotorR, 0); ctx.lineTo(rotorR, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -rotorR); ctx.lineTo(0, rotorR); ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Tail rotor
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.translate(-20 * scale, -4 * scale); ctx.rotate(e.tailRotorAngle || 0);
  ctx.globalAlpha = 0.4; ctx.strokeStyle = f.accent; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
}
