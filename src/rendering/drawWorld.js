import { TILE } from '../constants.js';
import { clamp } from '../utils.js';

export function drawWater(ctx, s) {
  const { camera, time, W, H } = s;

  const sx = Math.floor(camera.x / TILE), sy = Math.floor(camera.y / TILE);
  const ex = Math.ceil((camera.x + W) / TILE), ey = Math.ceil((camera.y + H) / TILE);
  for (let y = sy; y <= ey; y++) {
    for (let x = sx; x <= ex; x++) {
      const w = Math.sin(time * 1.5 + x * 0.5 + y * 0.3) * 0.02;
      const base = (x + y) % 2 === 0 ? 0.15 : 0.18;
      const r = clamp(Math.floor((0.04 + w) * 255), 0, 255);
      const g = clamp(Math.floor((base + w) * 255), 0, 255);
      const b = clamp(Math.floor((0.35 + base + w) * 255), 0, 255);
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    }
  }
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#88ccff';
  for (let y = sy; y <= ey; y += 2) { ctx.fillRect(sx * TILE + Math.sin(time * 2 + y * 0.4) * 20, y * TILE, (ex - sx) * TILE, 3); }
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 12; i++) {
    const cx2 = camera.x + (Math.sin(time * 0.3 + i * 2.1) * 0.5 + 0.5) * W;
    const cy2 = camera.y + (Math.cos(time * 0.2 + i * 1.7) * 0.5 + 0.5) * H;
    ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(cx2, cy2, 30 + Math.sin(time + i) * 15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
