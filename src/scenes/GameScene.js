import Phaser from 'phaser';
import { removeLoadingScreen } from '../main.js';
import { WORLD_W, WORLD_H, JOYSTICK_RADIUS, DASH_DURATION, DASH_COOLDOWN, HOMING_THRESHOLD, UPGRADE_INTERVAL } from '../constants.js';
import { rand, lerp, clamp } from '../utils.js';
import { UPGRADES } from '../config.js';
import {
  state, resetGameState, getMaxOil, getUpgradeChoices, applyUpgrade,
  allocateStat, hasPowerup, addScreenFlash, addShake,
  spawnExplosion, spawnFloatingText,
} from '../state/GameState.js';
import { getSettings, toggleSetting, getHighScore, saveHighScore } from '../SettingsManager.js';
import { initAudio, playSound } from '../SoundManager.js';

// Logic
import { updatePlayer } from '../logic/playerLogic.js';
import { spawnWave, updateEnemies, updateRigRecapture } from '../logic/enemyLogic.js';
import { updateCombat, updateRigs, updateLoot } from '../logic/combatLogic.js';

// Rendering
import { drawWater } from '../rendering/drawWorld.js';
import { drawPlayer, drawOrbitals, drawShadows } from '../rendering/drawPlayer.js';
import { drawEnemies } from '../rendering/drawEnemies.js';
import { drawRigs } from '../rendering/drawRigs.js';
import { drawBullets, drawLoot, drawParticles, drawFloatingTexts } from '../rendering/drawEffects.js';
import { drawHUD, drawStatPanel, drawTouchControls, drawScreenEffects } from '../rendering/drawHUD.js';
import { drawTitle, drawGameOver, drawUpgradeScreen, drawPauseScreen } from '../rendering/drawScreens.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    const s = state;
    this.s = s;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Set up dimensions and draw directly to Phaser's canvas via postrender
    s.W = this.scale.width || window.innerWidth;
    s.H = this.scale.height || window.innerHeight;
    this.ctx = this.game.canvas.getContext('2d');
    this.scale.on('resize', (gameSize) => {
      s.W = gameSize.width;
      s.H = gameSize.height;
    });
    this._postRenderHandler = () => this.render(getSettings());
    this.game.events.on('postrender', this._postRenderHandler);

    // Keyboard input via Phaser (null-check for mobile environments)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (e) => {
        s.input.keys[e.code] = true;
        if (s.gameState === 'playing' && e.key >= '1' && e.key <= '8') allocateStat(s, parseInt(e.key) - 1);
        if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
        if (e.code === 'KeyF') { toggleSetting('autoFire'); }
      });
      this.input.keyboard.on('keyup', (e) => { s.input.keys[e.code] = false; });
    }

    // Mouse input via Phaser
    this.input.on('pointermove', (pointer) => {
      s.input.mouseX = pointer.x;
      s.input.mouseY = pointer.y;
    });
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) s.input.rightMouseDown = true;
      else s.input.mouseDown = true;

      // Click/tap handlers for game states
      if (s.gameState === 'title' || s.gameState === 'gameover') {
        initAudio(); this.startGame();
      } else if (s.gameState === 'upgrade') {
        this.handleUpgradeClick(pointer.x, pointer.y);
      } else if (s.gameState === 'paused') {
        this.handlePauseClick(pointer.x, pointer.y);
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (pointer.rightButtonReleased) s.input.rightMouseDown = false;
      else s.input.mouseDown = false;
    });

    this._loadingRemoved = false;

    // Fallback: remove loading screen after 3s in case postrender never fires
    setTimeout(() => removeLoadingScreen(), 3000);

    // Disable context menu
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch controls — attach to document so gestures starting outside canvas still register
    if (this.isTouchDevice) {
      this._touchStartHandler = (e) => this.handleTouch(e);
      this._touchMoveHandler = (e) => this.handleTouch(e);
      this._touchEndHandler = (e) => this.handleTouchEnd(e);
      document.addEventListener('touchstart', this._touchStartHandler, { passive: false });
      document.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
      document.addEventListener('touchend', this._touchEndHandler, { passive: false });
      document.addEventListener('touchcancel', this._touchEndHandler, { passive: false });
    }
  }

  soundFn(type, vol) {
    playSound(type, vol, getSettings().soundOn);
  }

  shutdown() {
    if (this._postRenderHandler) {
      this.game.events.off('postrender', this._postRenderHandler);
    }
    if (this.isTouchDevice) {
      document.removeEventListener('touchstart', this._touchStartHandler);
      document.removeEventListener('touchmove', this._touchMoveHandler);
      document.removeEventListener('touchend', this._touchEndHandler);
      document.removeEventListener('touchcancel', this._touchEndHandler);
    }
  }

  startGame() {
    resetGameState(this.s);
  }

  togglePause() {
    const s = this.s;
    if (s.gameState === 'playing') { s.paused = true; s.gameState = 'paused'; }
    else if (s.gameState === 'paused') { s.paused = false; s.gameState = 'playing'; }
  }

  /* ===== TOUCH HANDLING ===== */
  handleTouch(e) {
    e.preventDefault();
    const s = this.s;

    // Start game on title/gameover tap
    if (s.gameState === 'title' || s.gameState === 'gameover') {
      if (e.type === 'touchstart') {
        initAudio();
        this.startGame();
      }
      return;
    }

    if (s.gameState === 'upgrade') { this.handleUpgradeTouchEvent(e); return; }
    if (s.gameState === 'playing' && s.showStatPanel) { this.handleStatTouch(e); }
    if (s.gameState === 'paused') return;
    if (s.gameState !== 'playing') return;

    const { W, H } = s;
    const MOBILE_BTN_SIZE = 36;
    const MOBILE_BTN_Y = H - MOBILE_BTN_SIZE - 50;
    const DASH_BTN_X = 20;
    const AF_BTN_X = 70;
    const PAUSE_BTN_X = W - 50;
    const PAUSE_BTN_Y = 10;
    const PAUSE_BTN_SIZE = 30;

    for (const t of e.changedTouches) {
      if (t.clientX > PAUSE_BTN_X && t.clientY < PAUSE_BTN_Y + PAUSE_BTN_SIZE && e.type === 'touchstart') {
        this.togglePause(); return;
      }
      if (t.clientX >= DASH_BTN_X && t.clientX <= DASH_BTN_X + MOBILE_BTN_SIZE && t.clientY > MOBILE_BTN_Y && t.clientY < MOBILE_BTN_Y + MOBILE_BTN_SIZE && e.type === 'touchstart') {
        if (s.player.dashCooldown <= 0 && s.input.touchMove.active) {
          const dashA = Math.atan2(s.input.touchMove.y, s.input.touchMove.x);
          s.player.dashing = DASH_DURATION;
          s.player.dashAngle = dashA;
          s.player.dashCooldown = DASH_COOLDOWN;
          this.soundFn('dash');
          addScreenFlash(s, '#44ccff', 0.1);
        }
        return;
      }
      if (t.clientX >= AF_BTN_X && t.clientX <= AF_BTN_X + MOBILE_BTN_SIZE && t.clientY > MOBILE_BTN_Y && t.clientY < MOBILE_BTN_Y + MOBILE_BTN_SIZE && e.type === 'touchstart') {
        toggleSetting('autoFire');
        return;
      }
    }

    s.input.touchFire = false;
    s.input.touchMissile = false;
    for (const t of e.touches) {
      if (t.clientX < W * 0.4) {
        if (!s.input.joystickCenter) s.input.joystickCenter = { x: t.clientX, y: t.clientY };
        const dx = t.clientX - s.input.joystickCenter.x;
        const dy = t.clientY - s.input.joystickCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > 5) {
          s.input.touchMove.x = dx / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchMove.y = dy / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchMove.active = true;
        }
      } else {
        if (!s.input.aimJoystickCenter) s.input.aimJoystickCenter = { x: t.clientX, y: t.clientY };
        const dx = t.clientX - s.input.aimJoystickCenter.x;
        const dy = t.clientY - s.input.aimJoystickCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          s.input.touchAim.x = dx / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchAim.y = dy / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchAim.active = true;
          s.input.touchFire = true;
          if (d > JOYSTICK_RADIUS * 1.3) s.input.touchMissile = true;
        } else {
          s.input.touchAim.active = false;
          s.input.touchFire = false;
        }
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const s = this.s;
    if (e.touches.length === 0) {
      s.input.touchMove = { x: 0, y: 0, active: false };
      s.input.touchAim = { x: 0, y: 0, active: false };
      s.input.joystickCenter = null;
      s.input.aimJoystickCenter = null;
      s.input.touchFire = false;
      s.input.touchMissile = false;
    } else {
      let hasLeft = false, hasRight = false;
      for (const t of e.touches) {
        if (t.clientX < s.W * 0.4) hasLeft = true;
        else hasRight = true;
      }
      if (!hasLeft) { s.input.touchMove = { x: 0, y: 0, active: false }; s.input.joystickCenter = null; }
      if (!hasRight) { s.input.touchAim = { x: 0, y: 0, active: false }; s.input.aimJoystickCenter = null; s.input.touchFire = false; s.input.touchMissile = false; }
    }
  }

  handleStatTouch(e) {
    const s = this.s;
    for (const t of e.changedTouches) {
      if (t.clientX < 200 && s.statPoints > 0) {
        const idx = Math.floor((t.clientY - 80) / 28);
        if (idx >= 0 && idx < 8) allocateStat(s, idx);
      }
    }
  }

  handleUpgradeTouchEvent(e) {
    for (const t of e.changedTouches) this.handleUpgradeClick(t.clientX, t.clientY);
  }

  handleUpgradeClick(mx, my) {
    const s = this.s;
    if (s.upgradeChoices.length === 0) return;
    const { W, H } = s;
    const cardW = Math.min(200, W * 0.28);
    const cardH = Math.min(260, H * 0.45);
    const gap = Math.min(30, W * 0.03);
    const totalW2 = s.upgradeChoices.length * cardW + (s.upgradeChoices.length - 1) * gap;
    const startX = (W - totalW2) / 2;
    const startY = (H - cardH) / 2;
    for (let i = 0; i < s.upgradeChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW && my >= startY && my <= startY + cardH) {
        applyUpgrade(s, s.upgradeChoices[i]);
        s.upgradeChoices = [];
        s.gameState = 'playing';
        return;
      }
    }
  }

  handlePauseClick(mx, my) {
    const s = this.s;
    const { W, H } = s;
    const btnW = 160, btnH = 40;
    const resumeX = (W - btnW) / 2;
    if (mx >= resumeX && mx <= resumeX + btnW && my >= H * 0.45 && my <= H * 0.45 + btnH) {
      s.paused = false; s.gameState = 'playing'; return;
    }
    if (mx >= resumeX && mx <= resumeX + btnW && my >= H * 0.55 && my <= H * 0.55 + btnH) {
      toggleSetting('soundOn'); return;
    }
    if (mx >= resumeX && mx <= resumeX + btnW && my >= H * 0.63 && my <= H * 0.63 + btnH) {
      toggleSetting('shakeOn'); return;
    }
    if (mx >= resumeX && mx <= resumeX + btnW && my >= H * 0.73 && my <= H * 0.73 + btnH) {
      this.startGame(); return;
    }
  }

  /* ===== UPDATE ===== */
  update(phaserTime, phaserDelta) {
    const s = this.s;
    const dt = Math.min(phaserDelta / 1000, 0.05);
    const settings = getSettings();
    s.settingsAutoFire = settings.autoFire;
    s._highScore = getHighScore();
    const sfn = (type, vol) => this.soundFn(type, vol);

    if (s.gameState === 'playing') {
      this.updateGame(dt, sfn);
    }
  }

  updateGame(dt, soundFn) {
    const s = this.s;
    s.time += dt;
    s.timeSurvived += dt;

    // Combo/streak decay
    s.comboTimer -= dt; if (s.comboTimer <= 0) { s.combo = 0; s.comboTimer = 0; }
    s.streakTimer -= dt; if (s.streakTimer <= 0) { s.killStreak = 0; s.streakTimer = 0; }

    // Powerup timers
    for (const k in s.activePowerups) { s.activePowerups[k] -= dt; if (s.activePowerups[k] <= 0) delete s.activePowerups[k]; }

    // Screen effects decay
    s.screenFlash.alpha *= 0.92; if (s.screenFlash.alpha < 0.01) s.screenFlash.alpha = 0;
    s.vignetteIntensity *= 0.95; if (s.vignetteIntensity < 0.01) s.vignetteIntensity = 0;

    updatePlayer(s, dt, soundFn);
    updateRigs(s, dt);
    updateRigRecapture(s, dt);
    spawnWave(s, dt);
    updateEnemies(s, dt, soundFn);
    updateCombat(s, dt, soundFn);
    updateLoot(s, dt, soundFn);

    // Particles
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95;
      if (p.type === 'smoke') p.vy -= 0.02;
      p.life -= dt;
      if (p.life <= 0) s.particles.splice(i, 1);
    }

    // Floating texts
    for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
      s.floatingTexts[i].y -= 30 * dt;
      s.floatingTexts[i].life -= dt;
      if (s.floatingTexts[i].life <= 0) s.floatingTexts.splice(i, 1);
    }

    s.shakeAmount *= 0.9;
    if (s.shakeAmount < 0.1) s.shakeAmount = 0;

    // Camera
    this.updateCamera();

    // Upgrade check
    if (s.score >= s.nextUpgradeScore) {
      s.nextUpgradeScore += UPGRADE_INTERVAL + s.totalUpgrades * 100;
      s.upgradeChoices = getUpgradeChoices(s);
      if (s.upgradeChoices.length > 0) s.gameState = 'upgrade';
    }

    // Death
    if (s.player.oil <= 0) {
      s.player.oil = 0; s.player.alive = false; s.gameState = 'gameover';
      spawnExplosion(s, s.player.x, s.player.y, '#ff2200', 40);
      addShake(s, 12, true);
      addScreenFlash(s, '#ff0000', 0.4);
      this.soundFn('explosion', 0.6);
      saveHighScore(s.score);
    }
  }

  updateCamera() {
    const s = this.s;
    const p = s.player;
    let cx = p.x - s.W / 2;
    let cy = p.y - s.H / 2;
    if (s.input.touchAim.active) {
      cx += s.input.touchAim.x * s.W * 0.15;
      cy += s.input.touchAim.y * s.H * 0.15;
    } else if (!this.isTouchDevice) {
      cx += (s.input.mouseX - s.W / 2) * 0.12;
      cy += (s.input.mouseY - s.H / 2) * 0.12;
    }
    s.camera.x = lerp(s.camera.x, clamp(cx, 0, Math.max(0, WORLD_W - s.W)), 0.08);
    s.camera.y = lerp(s.camera.y, clamp(cy, 0, Math.max(0, WORLD_H - s.H)), 0.08);
  }

  /* ===== RENDER ===== */
  render(settings) {
    // Remove loading screen on first render regardless of drawing outcome
    if (!this._loadingRemoved) {
      this._loadingRemoved = true;
      removeLoadingScreen();
    }

    const s = this.s;
    const ctx = this.ctx;
    if (!ctx) return;

    try {
      ctx.clearRect(0, 0, s.W, s.H);

      if (s.gameState === 'title') {
        drawTitle(ctx, s);
      } else if (s.gameState === 'playing' || s.gameState === 'upgrade' || s.gameState === 'paused' || s.gameState === 'gameover') {
        // Draw world
        ctx.save();
        if (s.shakeAmount > 0) ctx.translate(rand(-s.shakeAmount, s.shakeAmount), rand(-s.shakeAmount, s.shakeAmount));
        ctx.translate(-s.camera.x, -s.camera.y);
        drawWater(ctx, s);
        drawRigs(ctx, s);
        drawLoot(ctx, s);
        drawShadows(ctx, s);
        drawEnemies(ctx, s);
        drawBullets(ctx, s);
        drawOrbitals(ctx, s);
        drawPlayer(ctx, s);
        drawParticles(ctx, s);
        drawFloatingTexts(ctx, s);
        ctx.restore();

        // HUD
        drawHUD(ctx, s, settings);
        drawStatPanel(ctx, s);
        drawTouchControls(ctx, s, settings, this.isTouchDevice);
        drawScreenEffects(ctx, s);

        // Overlay screens
        if (s.gameState === 'gameover') drawGameOver(ctx, s);
        else if (s.gameState === 'upgrade') drawUpgradeScreen(ctx, s);
        else if (s.gameState === 'paused') drawPauseScreen(ctx, s, settings);
      }
    } catch (err) {
      // Rendering errors should not crash the game loop
      console.error('Render error:', err);
    }
  }
}
