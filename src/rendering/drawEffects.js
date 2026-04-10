import { clamp, rand } from '../utils.js';

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

export function drawFloatingTexts(ctx, s) {
  for (const ft of s.floatingTexts) {
    const alpha = clamp(ft.life / ft.maxLife, 0, 1);
    ctx.globalAlpha = alpha; ctx.font = 'bold ' + (ft.size || 13) + 'px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}
