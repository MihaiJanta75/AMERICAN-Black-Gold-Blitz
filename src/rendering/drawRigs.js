import { CAPTURE_RADIUS, CAPTURE_TIME } from '../constants.js';

export function drawRigs(ctx, s) {
  const { time } = s;
  for (const rig of s.rigs) {
    if (rig.hp <= 0 && rig.owner !== 'enemy') {
      ctx.save(); ctx.translate(rig.x, rig.y);
      ctx.fillStyle = '#222'; ctx.fillRect(-18, -18, 36, 36);
      ctx.fillStyle = '#333'; ctx.fillRect(-12, -12, 8, 24); ctx.fillRect(2, -8, 10, 16);
      ctx.globalAlpha = 0.15; ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore(); continue;
    }
    ctx.save(); ctx.translate(rig.x, rig.y);
    ctx.strokeStyle = 'rgba(100,200,255,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 32 + Math.sin(time * 2 + rig.flamePhase) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#555'; ctx.fillRect(-26, -26, 4, 52); ctx.fillRect(22, -26, 4, 52); ctx.fillRect(-26, -26, 52, 4); ctx.fillRect(-26, 22, 52, 4);
    const deckColor = rig.owner === 'player' ? '#2a6644' : rig.owner === 'enemy' ? '#662222' : '#4a4a4a';
    ctx.fillStyle = deckColor;
    ctx.fillRect(-22, -22, 44, 44);
    const gridColor = rig.owner === 'player' ? 'rgba(68,255,136,0.2)' : rig.owner === 'enemy' ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
    for (let gx = -20; gx <= 20; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, -22); ctx.lineTo(gx, 22); ctx.stroke(); }
    for (let gy = -20; gy <= 20; gy += 10) { ctx.beginPath(); ctx.moveTo(-22, gy); ctx.lineTo(22, gy); ctx.stroke(); }
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-3, -28); ctx.lineTo(3, -28); ctx.lineTo(6, 0); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(5, -14); ctx.moveTo(5, -7); ctx.lineTo(-5, -14); ctx.moveTo(-4, -18); ctx.lineTo(4, -24); ctx.moveTo(4, -18); ctx.lineTo(-4, -24); ctx.stroke();
    ctx.save(); ctx.translate(10, -5); ctx.rotate(Math.sin(rig.craneAngle) * 0.3);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -12); ctx.stroke();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(18, -12); ctx.lineTo(18, -2 + Math.sin(time * 3) * 2); ctx.stroke();
    ctx.restore();
    const fs = 4 + Math.sin(rig.flamePhase) * 2;
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(0, -30, fs * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(0, -30, fs, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0, -30, fs * 0.5, 0, Math.PI * 2); ctx.fill();
    if (rig.owner === 'player') {
      ctx.strokeStyle = 'rgba(68,255,136,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 8, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(68,255,136,0.5)'; ctx.textAlign = 'center'; ctx.fillText('H', 0, 12);
      ctx.strokeStyle = 'rgba(68,255,136,' + (0.3 + Math.sin(time * 3) * 0.15) + ')'; ctx.lineWidth = 2; ctx.strokeRect(-24, -24, 48, 48);
    }
    if (rig.owner === 'enemy') {
      ctx.strokeStyle = 'rgba(255,68,68,' + (0.3 + Math.sin(time * 3) * 0.15) + ')'; ctx.lineWidth = 2; ctx.strokeRect(-24, -24, 48, 48);
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(255,68,68,0.5)'; ctx.textAlign = 'center'; ctx.fillText('E', 0, 12);
    }
    if (rig.underAttack && Math.sin(time * 8) > 0) {
      ctx.strokeStyle = 'rgba(255,0,0,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ff4444'; ctx.textAlign = 'center';
      ctx.fillText('⚠ ATTACK!', 0, -40);
    }
    ctx.restore();
    if (rig.owner === 'player' || rig.owner === 'enemy') {
      const bw = 44; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(rig.x - bw / 2 - 1, rig.y + 30, bw + 2, 6);
      ctx.fillStyle = '#333'; ctx.fillRect(rig.x - bw / 2, rig.y + 31, bw, 4);
      const hp = rig.hp / rig.maxHp;
      ctx.fillStyle = rig.owner === 'player' ? (hp > 0.5 ? '#44ff88' : hp > 0.25 ? '#ffcc00' : '#ff4444') : '#ff4444';
      ctx.fillRect(rig.x - bw / 2, rig.y + 31, bw * hp, 4);
    }
    if (rig.captureProgress > 0 && rig.owner !== 'player') {
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(rig.x, rig.y, CAPTURE_RADIUS, -Math.PI / 2, -Math.PI / 2 + (rig.captureProgress / CAPTURE_TIME) * Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,204,0,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(s.player.x, s.player.y); ctx.lineTo(rig.x, rig.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'center';
      ctx.fillText(Math.floor(rig.captureProgress / CAPTURE_TIME * 100) + '%', rig.x, rig.y - 35);
    }
  }
}
