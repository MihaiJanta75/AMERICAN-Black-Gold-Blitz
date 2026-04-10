import { FACTIONS } from '../config.js';
import { rand } from '../utils.js';

export function drawEnemies(ctx, s) {
  const { time } = s;
  for (const e of s.enemies) {
    const f = FACTIONS[e.faction] || FACTIONS.red;
    if (e.stunTimer > 0) {
      ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#44ffff'; ctx.lineWidth = 1;
      for (let sc = 0; sc < 3; sc++) { const sa = Math.random() * Math.PI * 2; const sr = rand(8, 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.restore();
    }
    if (e.type === 'drone') drawDrone(ctx, e, f, time);
    else if (e.type === 'plane') drawPlaneE(ctx, e, f, time);
    else if (e.type === 'chopper') drawChopperE(ctx, e, f, time);
    // HP bar
    if (e.hp < e.maxHp) {
      const bw = e.isBoss ? 40 : e.type === 'chopper' ? 30 : 24;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - bw / 2 - 1, e.y - (e.isBoss ? 32 : 24), bw + 2, 5);
      ctx.fillStyle = '#222'; ctx.fillRect(e.x - bw / 2, e.y - (e.isBoss ? 31 : 23), bw, 3);
      const hp = e.hp / e.maxHp;
      ctx.fillStyle = f.accent;
      ctx.fillRect(e.x - bw / 2, e.y - (e.isBoss ? 31 : 23), bw * hp, 3);
    }
    if (e.isBoss) {
      ctx.globalAlpha = 0.4 + Math.sin(time * 4) * 0.2;
      ctx.strokeStyle = f.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = f.accent; ctx.textAlign = 'center';
      ctx.fillText('BOSS', e.x, e.y - (e.isBoss ? 36 : 28));
    }
  }
}

function drawDrone(ctx, e, f, time) {
  const scale = e.isBoss ? 1.6 : (f.style === 'tanky' ? 1.3 : 1);
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.scale(scale, scale);
  ctx.strokeStyle = f.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke();
  ctx.fillStyle = f.body; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.accent; ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,' + (100 + Math.sin(time * 8) * 50) + ',0,0.9)';
  ctx.beginPath(); ctx.arc(3, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-17, -5); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#44aadd'; ctx.beginPath(); ctx.ellipse(12, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = f.accent; ctx.fillRect(0, -1.5, 10, 3);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffaa44'; ctx.beginPath(); ctx.ellipse(-14, 0, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(18, 0); ctx.rotate(e.propAngle || 0);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  ctx.restore();
}

function drawChopperE(ctx, e, f, time) {
  const scale = e.isBoss ? 1.5 : 1;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.scale(scale, scale);
  ctx.fillStyle = f.dark; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-20, -1); ctx.lineTo(-20, 1); ctx.lineTo(-6, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.body; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-24, -5); ctx.lineTo(-18, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.body;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.bezierCurveTo(12, -6, 4, -9, -4, -7); ctx.lineTo(-8, -4); ctx.lineTo(-6, 0); ctx.lineTo(-8, 4); ctx.lineTo(-4, 7); ctx.bezierCurveTo(4, 9, 12, 6, 14, 0); ctx.closePath(); ctx.fill();
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
  ctx.globalAlpha = 0.5; ctx.strokeStyle = f.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-rotorR, 0); ctx.lineTo(rotorR, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -rotorR); ctx.lineTo(0, rotorR); ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Tail rotor
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.translate(-20 * scale, -4 * scale); ctx.rotate(e.tailRotorAngle || 0);
  ctx.globalAlpha = 0.4; ctx.strokeStyle = f.accent; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
}
