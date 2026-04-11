import { TERRITORY_RADIUS, TERRITORY_CLUSTER_RANGE } from '../constants.js';

/**
 * Draws territory auras around oil rigs in world space.
 * Called after camera transform is applied (ctx.translate(-cam.x, -cam.y)),
 * so rig.x/rig.y are used directly.
 *
 * Visual layers per rig:
 *   1. Soft radial fill (color = owner)
 *   2. Pulsing boundary ring
 *   3. Filled capsule bridge between close player rigs + bonus glow at midpoint
 */
export function drawTerritories(ctx, s) {
  const { time } = s;

  /* ── Per-rig aura ─────────────────────────────────────────────────────── */
  for (const rig of s.rigs) {
    if (rig.owner === 'burnout' || rig.owner === 'depleted') continue;
    if (rig.hp <= 0 && rig.owner !== 'enemy') continue;

    const cx = rig.x, cy = rig.y;
    const spawnFade = rig.spawnFlash !== undefined ? rig.spawnFlash : 1;
    const pulse = 0.72 + Math.sin(time * 1.6 + rig.flamePhase) * 0.28;
    const R = TERRITORY_RADIUS * pulse;

    let r, g, b;
    let innerAlpha, ringColor;

    if (rig.owner === 'player') {
      // Gold rig: gold-tinted territory; Cursed rig: orange-red territory
      if (rig.rigType === 'gold') {
        r = 255; g = 200; b = 40;
      } else if (rig.rigType === 'cursed') {
        r = 255; g = 100; b = 20;
      } else {
        r = 68; g = 255; b = 136;
      }
      const clusterBoost = Math.min(rig.clusterCount || 0, 3) * 0.045;
      innerAlpha = (0.10 + clusterBoost) * spawnFade;
      ringColor = `rgba(${r},${g},${b},${(0.18 + clusterBoost * 1.5).toFixed(2)})`;
    } else if (rig.owner === 'enemy') {
      r = 255; g = 68; b = 68;
      innerAlpha = 0.07 * spawnFade;
      ringColor = 'rgba(255,68,68,0.12)';
    } else {
      // neutral / uncaptured
      r = 180; g = 155; b = 90;
      innerAlpha = 0.04 * spawnFade;
      ringColor = 'rgba(180,155,90,0.08)';
    }

    // Radial fill
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0,   `rgba(${r},${g},${b},${(innerAlpha * 1.8).toFixed(3)})`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},${innerAlpha.toFixed(3)})`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Boundary ring (only for player/enemy — neutral is too faint)
    if (rig.owner === 'player' || rig.owner === 'enemy') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -time * 18;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
  }

  /* ── Cluster bonus zones (player pairs within range) ─────────────────── */
  const pRigs = s.rigs.filter(r => r.owner === 'player' && r.hp > 0);

  for (let i = 0; i < pRigs.length; i++) {
    for (let j = i + 1; j < pRigs.length; j++) {
      const ra = pRigs[i], rb = pRigs[j];
      const dx = rb.x - ra.x, dy = rb.y - ra.y;
      const d = Math.hypot(dx, dy);
      if (d > TERRITORY_CLUSTER_RANGE) continue;

      const mx = (ra.x + rb.x) / 2;
      const my = (ra.y + rb.y) / 2;

      // Proximity factor: 1.0 when touching, 0 at cluster range edge
      const proximity = 1 - d / TERRITORY_CLUSTER_RANGE;

      /* ── Filled capsule bridge between the two territory circles ────── */
      // A thick rounded stroke creates a pill/capsule that organically fills
      // the gap between the two overlapping territory auras.
      const bridgeAlpha = proximity * 0.13 + Math.sin(time * 1.8) * 0.025;
      const bridgeWidth = Math.max(16, TERRITORY_RADIUS * 0.55 * proximity);

      const bridgeGrad = ctx.createLinearGradient(ra.x, ra.y, rb.x, rb.y);
      bridgeGrad.addColorStop(0,   `rgba(68,255,136,${(bridgeAlpha * 0.5).toFixed(3)})`);
      bridgeGrad.addColorStop(0.5, `rgba(68,255,136,${bridgeAlpha.toFixed(3)})`);
      bridgeGrad.addColorStop(1,   `rgba(68,255,136,${(bridgeAlpha * 0.5).toFixed(3)})`);

      ctx.save();
      ctx.strokeStyle = bridgeGrad;
      ctx.lineWidth = bridgeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ra.x, ra.y);
      ctx.lineTo(rb.x, rb.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();

      /* ── Midpoint bonus glow ────────────────────────────────────────── */
      const bonusR = (35 + proximity * 30) + Math.sin(time * 3.5) * 7;
      const bonusAlpha = proximity * 0.28 + Math.sin(time * 3.5) * 0.06;
      const bonusGrad = ctx.createRadialGradient(mx, my, 0, mx, my, bonusR);
      bonusGrad.addColorStop(0, `rgba(100,255,160,${bonusAlpha.toFixed(3)})`);
      bonusGrad.addColorStop(1, 'rgba(68,255,136,0)');
      ctx.fillStyle = bonusGrad;
      ctx.beginPath(); ctx.arc(mx, my, bonusR, 0, Math.PI * 2); ctx.fill();

      /* ── Rotating arc at midpoint ───────────────────────────────────── */
      const ringA = time * 1.4;
      const ringAlpha = 0.30 + proximity * 0.25 + Math.sin(time * 3) * 0.08;
      ctx.strokeStyle = `rgba(68,255,136,${ringAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, 18 + proximity * 8, ringA, ringA + Math.PI * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mx, my, 18 + proximity * 8, ringA + Math.PI, ringA + Math.PI * 2.4);
      ctx.stroke();

      /* ── Bonus % label at midpoint ──────────────────────────────────── */
      if (proximity > 0.25) {
        const bonusPct = Math.round(35 * Math.min((pRigs[i].clusterCount || 0), 3));
        ctx.globalAlpha = Math.min(1, (proximity - 0.25) * 2.5) * (0.6 + Math.sin(time * 2) * 0.2);
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#88ffbb';
        ctx.textAlign = 'center';
        ctx.fillText('+' + bonusPct + '% OIL', mx, my - bonusR * 0.65);
        ctx.globalAlpha = 1;
      }
    }
  }
}
