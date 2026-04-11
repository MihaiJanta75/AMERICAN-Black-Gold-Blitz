import { clamp, rand } from '../utils.js';
import { PIPELINE_HP } from '../constants.js';

export function drawBullets(ctx, s) {
  for (const b of s.bullets) {
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.globalAlpha = 0.3; ctx.fillStyle = b.crit ? '#ff4444' : '#ffee55'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = b.crit ? '#ff6666' : '#ffee88'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const b of s.enemyBullets) {
    const c = b.color || '#ff4444';
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.globalAlpha = 0.3; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaa88'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const m of s.homingMissiles) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle);
    ctx.fillStyle = '#dd6600';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-4, -3); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(6, 0, 2.5, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#aa4400'; ctx.fillRect(-6, -5, 3, 2); ctx.fillRect(-6, 3, 3, 2);
    ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(-7, 0, 2 + Math.sin(s.time * 30) * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function drawNapalmZones(ctx, s) {
  if (!s.napalmZones || s.napalmZones.length === 0) return;
  const t = s.time;
  for (const nz of s.napalmZones) {
    const lifePct = nz.life / nz.maxLife;
    const alpha = lifePct * 0.65;
    // Outer glow
    ctx.globalAlpha = alpha * 0.35;
    const grad = ctx.createRadialGradient(nz.x, nz.y, 0, nz.x, nz.y, nz.radius * 1.8);
    grad.addColorStop(0, '#ff6600');
    grad.addColorStop(0.5, '#ff3300');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(nz.x, nz.y, nz.radius * 1.8, 0, Math.PI * 2); ctx.fill();
    // Core fire
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.arc(nz.x, nz.y, nz.radius * (0.7 + Math.sin(t * 8 + nz.x) * 0.15), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(nz.x, nz.y, nz.radius * (0.35 + Math.sin(t * 14 + nz.y) * 0.1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawLoot(ctx, s) {
  const { time } = s;
  for (const l of s.loot) {
    const bob = Math.sin(l.bobPhase) * 2;
    const alpha = l.life < 3 ? l.life / 3 : 1;
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = l.glow;
    ctx.beginPath(); ctx.arc(l.x, l.y + bob, l.radius * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = l.color;
    if (l.type === 'powerup') {
      ctx.save(); ctx.translate(l.x, l.y + bob); ctx.rotate(time * 2);
      ctx.beginPath();
      for (let sc = 0; sc < 5; sc++) {
        const a1 = (sc / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((sc + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
        if (sc === 0) ctx.moveTo(Math.cos(a1) * l.radius, Math.sin(a1) * l.radius);
        else ctx.lineTo(Math.cos(a1) * l.radius, Math.sin(a1) * l.radius);
        ctx.lineTo(Math.cos(a2) * l.radius * 0.5, Math.sin(a2) * l.radius * 0.5);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (l.type === 'oil') {
      ctx.beginPath(); ctx.arc(l.x, l.y + bob, l.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.save(); ctx.translate(l.x, l.y + bob); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-l.radius * 0.6, -l.radius * 0.6, l.radius * 1.2, l.radius * 1.2);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawParticles(ctx, s) {
  for (const p of s.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'smoke') {
      ctx.globalAlpha = alpha * 0.5; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 - alpha), 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'fire') {
      ctx.globalAlpha = alpha * 0.3; ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'oil') {
      ctx.globalAlpha = alpha * 0.7; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.5 - alpha * 0.5), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawWrecks(ctx, s) {
  if (!s.wrecks || s.wrecks.length === 0) return;
  for (const w of s.wrecks) {
    const alpha = Math.min(1, w.life / w.maxLife) * 0.85;
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);
    ctx.globalAlpha = alpha;
    // Wreck body — metallic debris
    ctx.fillStyle = '#444';
    if (w.type === 'drone') {
      ctx.fillRect(-10, -4, 20, 8);
      ctx.fillRect(-4, -10, 8, 20);
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (w.type === 'plane') {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -5); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#555';
      ctx.fillRect(-8, -1, 4, 2);
    } else {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555';
      ctx.fillRect(-4, -2, 8, 4);
    }
    // Oil slick glow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Oil label when life > 7s
    if (w.life > 4) {
      ctx.globalAlpha = Math.min(1, (w.life - 4) * 0.4);
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#88aacc'; ctx.textAlign = 'center';
      ctx.fillText('+' + w.oil + ' oil', w.x, w.y - 18);
      ctx.globalAlpha = 1;
    }
  }
}

export function drawPipelines(ctx, s) {
  if (!s.pipelines || s.pipelines.length === 0) return;
  const t = s.time;
  for (const pipe of s.pipelines) {
    const ax = pipe.rigA.x, ay = pipe.rigA.y;
    const bx = pipe.rigB.x, by = pipe.rigB.y;
    const hpPct = pipe.hp / pipe.maxHp;
    // Animated dashed line
    ctx.save();
    ctx.globalAlpha = 0.55 * hpPct;
    ctx.strokeStyle = hpPct > 0.5 ? '#44ff88' : '#ff8844';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    // Glow pulse
    ctx.globalAlpha = 0.12 * hpPct * (0.7 + Math.sin(t * 4) * 0.3);
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

export function drawActiveEvent(ctx, s) {
  const ev = s.activeEvent;
  if (!ev) return;
  const t = s.time;

  if (ev.type === 'geyser') {
    const { x, y } = ev.data;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1;
    // Bubbling area
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 80);
    grad.addColorStop(0, '#334444');
    grad.addColorStop(0.5, '#1a2a2a');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 80, 0, Math.PI * 2); ctx.fill();
    // Bubble particles
    for (let i = 0; i < 6; i++) {
      const ba = (i / 6) * Math.PI * 2 + t * (0.5 + i * 0.1);
      const br = (20 + Math.sin(t * 3 + i) * 15);
      ctx.globalAlpha = 0.4 + Math.sin(t * 4 + i * 0.5) * 0.2;
      ctx.fillStyle = '#224433';
      ctx.beginPath(); ctx.arc(x + Math.cos(ba) * br, y + Math.sin(ba) * br, 4 + Math.sin(t * 5 + i) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Label
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#44cc88'; ctx.textAlign = 'center';
    ctx.fillText('⛽ GEYSER', x, y - 88);
    ctx.restore();
  }

  if (ev.type === 'supply_drop' && !ev.data.claimed) {
    const { x, y } = ev.data;
    ev.data.bobPhase = (ev.data.bobPhase || 0) + 0.03;
    const bob = Math.sin(ev.data.bobPhase) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    // Crate
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
    ctx.strokeRect(-14, -14, 28, 28);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
    // Glowing parachute
    ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.2;
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -35, 18, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, -35); ctx.lineTo(-10, -14); ctx.moveTo(18, -35); ctx.lineTo(10, -14); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
    ctx.fillText('📦 SUPPLY', 0, 28);
    ctx.restore();
  }
}

export function drawFloatingTexts(ctx, s) {
  for (const ft of s.floatingTexts) {
    const alpha = clamp(ft.life / ft.maxLife, 0, 1);
    ctx.globalAlpha = alpha; ctx.font = 'bold ' + (ft.size || 13) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}
