import { hasPowerup, getPickupRadius } from '../state/GameState.js';

export function drawPlayer(ctx, s) {
  const p = s.player;
  if (!p.alive) return;
  const { time } = s;
  const px = p.x, py = p.y, a = p.angle;

  // Dash afterimage
  if (p.dashing > 0) {
    ctx.globalAlpha = 0.15;
    for (let g = 1; g <= 3; g++) {
      const gx = px - Math.cos(p.dashAngle) * g * 8;
      const gy = py - Math.sin(p.dashAngle) * g * 8;
      ctx.fillStyle = '#44ccff';
      ctx.beginPath(); ctx.arc(gx, gy, 12 - g * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(px, py); ctx.rotate(a);
  if (p.invincible > 0 && Math.sin(time * 30) > 0) ctx.globalAlpha = 0.4;
  if (p.dashing > 0) ctx.globalAlpha = 0.7;
  // Tail
  ctx.fillStyle = '#1a4a1a';
  ctx.beginPath(); ctx.moveTo(-8, -2.5); ctx.lineTo(-22, -1.5); ctx.lineTo(-22, 1.5); ctx.lineTo(-8, 2.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a6a2a';
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-26, -6); ctx.lineTo(-20, -1); ctx.closePath(); ctx.fill();
  // Body
  ctx.fillStyle = '#2a5a2a';
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.bezierCurveTo(14, -7, 6, -10, -4, -9); ctx.lineTo(-10, -6); ctx.lineTo(-8, 0); ctx.lineTo(-10, 6); ctx.lineTo(-4, 9); ctx.bezierCurveTo(6, 10, 14, 7, 16, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(100,180,100,0.3)'; ctx.beginPath(); ctx.ellipse(4, -3, 8, 3, -0.1, 0, Math.PI * 2); ctx.fill();
  // Pylons
  ctx.fillStyle = '#1a3a1a'; ctx.fillRect(-2, -12, 8, 3); ctx.fillRect(-2, 9, 8, 3);
  ctx.fillStyle = '#444'; ctx.fillRect(10, -11.5, 6, 2); ctx.fillRect(10, 9.5, 6, 2);
  // Cockpit
  const grad = ctx.createRadialGradient(10, 0, 0, 10, 0, 6);
  grad.addColorStop(0, '#aaddff'); grad.addColorStop(0.6, '#6699cc'); grad.addColorStop(1, '#335577');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(10, 0, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a8a4a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(10, 0, 6, 5, 0, 0, Math.PI * 2); ctx.stroke();
  // Intake
  ctx.fillStyle = '#1a3a1a'; ctx.beginPath(); ctx.ellipse(-2, 0, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Exhaust
  if (p.engineGlow > 0.3) { ctx.globalAlpha = (p.engineGlow - 0.3) * 0.5; ctx.fillStyle = '#557799'; ctx.beginPath(); ctx.ellipse(-10, 0, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = p.invincible > 0 && Math.sin(time * 30) > 0 ? 0.4 : 1; }
  // Outline
  ctx.strokeStyle = '#4a8a4a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.bezierCurveTo(14, -7, 6, -10, -4, -9); ctx.lineTo(-10, -6); ctx.lineTo(-8, 0); ctx.lineTo(-10, 6); ctx.lineTo(-4, 9); ctx.bezierCurveTo(6, 10, 14, 7, 16, 0); ctx.stroke();
  ctx.restore();
  // Main rotor
  ctx.save(); ctx.translate(px, py); ctx.rotate(p.rotorAngle);
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 20); ctx.stroke();
  ctx.fillStyle = '#ff4400'; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.arc(-20, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -20, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 20, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Tail rotor
  ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.translate(-22, -5); ctx.rotate(p.tailRotorAngle);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
  // Shield
  if (p.shieldActive) {
    ctx.save(); ctx.translate(px, py);
    ctx.globalAlpha = 0.15 + Math.sin(time * 6) * 0.08;
    ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(170,68,255,0.05)'; ctx.fill(); ctx.restore();
  }
  // Magnet radius
  if (hasPowerup(s, 'magnet')) {
    ctx.save(); ctx.translate(px, py);
    ctx.globalAlpha = 0.08 + Math.sin(time * 4) * 0.04;
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, getPickupRadius(s), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  }
}

export function drawOrbitals(ctx, s) {
  if (s.upgradeStats.orbitalCount <= 0) return;
  for (let o = 0; o < s.upgradeStats.orbitalCount; o++) {
    const oa = s.time * 2.5 + o * Math.PI;
    const ox = s.player.x + Math.cos(oa) * 40;
    const oy = s.player.y + Math.sin(oa) * 40;
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#66ccff'; ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawCompanions(ctx, s) {
  const us = s.upgradeStats;
  if (!us) return;
  const px = s.player.x, py = s.player.y;
  const t = s.time;
  const oilOk = s.player.oil > 0;

  const COMPANION_TYPES = [
    { key: 'scoutDrones',   count: us.scoutDrones   || 0, color: '#44ddff', innerColor: '#aaeeff', radius: 52, speed: 2.8, size: 6  },
    { key: 'combatDrones',  count: us.combatDrones  || 0, color: '#ff4444', innerColor: '#ff9988', radius: 62, speed: 2.2, size: 7  },
    { key: 'shieldDrones',  count: us.shieldDrones  || 0, color: '#8844ff', innerColor: '#cc99ff', radius: 30, speed: 3.5, size: 6  },
    { key: 'repairDrones',  count: us.repairDrones  || 0, color: '#44ff88', innerColor: '#aaffcc', radius: 48, speed: 2.6, size: 6  },
    { key: 'bomberDrones',  count: us.bomberDrones  || 0, color: '#ff8800', innerColor: '#ffcc44', radius: 70, speed: 1.8, size: 8  },
  ];

  // Compute a global slot offset so different companion types orbit at different angles
  let slotBase = 0;
  for (const cfg of COMPANION_TYPES) {
    if (cfg.count <= 0) { slotBase += 3; continue; }

    for (let i = 0; i < cfg.count; i++) {
      const angleOffset = (slotBase + i) * (Math.PI * 2 / Math.max(cfg.count, 1));
      const oa = t * cfg.speed + angleOffset;
      const ox = px + Math.cos(oa) * cfg.radius;
      const oy = py + Math.sin(oa) * cfg.radius;

      const alpha = oilOk ? 1.0 : 0.25;

      // Outer glow ring
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = cfg.color;
      ctx.beginPath(); ctx.arc(ox, oy, cfg.size + 5, 0, Math.PI * 2); ctx.fill();

      // Body
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = cfg.color;
      ctx.beginPath(); ctx.arc(ox, oy, cfg.size, 0, Math.PI * 2); ctx.fill();

      // Inner bright core
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cfg.innerColor;
      ctx.beginPath(); ctx.arc(ox, oy, cfg.size * 0.45, 0, Math.PI * 2); ctx.fill();

      // Orbit trail
      ctx.globalAlpha = alpha * 0.10;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, cfg.radius, 0, Math.PI * 2); ctx.stroke();

      // Offline indicator
      if (!oilOk) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ff2200';
        ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('⚠', ox, oy - cfg.size - 4);
      }
    }
    slotBase += cfg.count + 1;
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
}

export function drawShadows(ctx, s) {
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#000';
  if (s.player.alive) { ctx.beginPath(); ctx.ellipse(s.player.x + 6, s.player.y + 10, 18, 10, 0.2, 0, Math.PI * 2); ctx.fill(); }
  for (const e of s.enemies) {
    const r = e.isBoss ? 20 : e.type === 'drone' ? 10 : e.type === 'plane' ? 16 : 14;
    ctx.beginPath(); ctx.ellipse(e.x + 5, e.y + 8, r, r * 0.6, 0.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
