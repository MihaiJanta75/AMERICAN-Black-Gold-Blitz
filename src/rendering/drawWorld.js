import { TILE, DAY_NIGHT_CYCLE } from '../constants.js';
import { clamp, rand } from '../utils.js';

export function drawWater(ctx, s) {
  const { camera, time, W, H } = s;
  const dayPhase = (time % DAY_NIGHT_CYCLE) / DAY_NIGHT_CYCLE;
  const dayBrightness = 0.7 + 0.3 * Math.cos(dayPhase * Math.PI * 2);
  const nightTint = Math.max(0, Math.sin(dayPhase * Math.PI * 2 - Math.PI) * 0.3);

  const sx = Math.floor(camera.x / TILE), sy = Math.floor(camera.y / TILE);
  const ex = Math.ceil((camera.x + W) / TILE), ey = Math.ceil((camera.y + H) / TILE);
  const rMult = dayBrightness;
  const rOffset = nightTint * 0.1 * 255;
  const gMult = dayBrightness;
  const bMult = dayBrightness;
  const bOffset = nightTint * 0.15 * 255;
  for (let y = sy; y <= ey; y++) {
    for (let x = sx; x <= ex; x++) {
      const w = Math.sin(time * 1.5 + x * 0.5 + y * 0.3) * 0.02;
      const base = (x + y) % 2 === 0 ? 0.15 : 0.18;
      const r = clamp(Math.floor((0.04 + w) * rMult * 255 + rOffset), 0, 255);
      const g = clamp(Math.floor((base + w) * gMult * 255), 0, 255);
      const b = clamp(Math.floor((0.35 + base + w) * bMult * 255 + bOffset), 0, 255);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    }
  }
  ctx.globalAlpha = 0.06 * dayBrightness; ctx.fillStyle = '#88ccff';
  for (let y = sy; y <= ey; y += 2) { ctx.fillRect(sx * TILE + Math.sin(time * 2 + y * 0.4) * 20, y * TILE, (ex - sx) * TILE, 3); }
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 12; i++) {
    const cx2 = camera.x + (Math.sin(time * 0.3 + i * 2.1) * 0.5 + 0.5) * W;
    const cy2 = camera.y + (Math.cos(time * 0.2 + i * 1.7) * 0.5 + 0.5) * H;
    ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(cx2, cy2, 30 + Math.sin(time + i) * 15, 0, Math.PI * 2); ctx.fill();
  }
  if (nightTint > 0.05) {
    ctx.globalAlpha = nightTint * 0.8;
    for (let i = 0; i < 20; i++) {
      const starX = camera.x + ((i * 137.5 + 50) % W);
      const starY = camera.y + ((i * 97.3 + 30) % H);
      const twinkle = 0.5 + Math.sin(time * 2 + i * 1.3) * 0.5;
      ctx.fillStyle = 'rgba(255,255,220,' + twinkle + ')';
      ctx.beginPath(); ctx.arc(starX, starY, 1 + twinkle, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
