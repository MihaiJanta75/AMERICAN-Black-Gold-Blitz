import Phaser from 'phaser';
import { removeLoadingScreen } from '../loadingScreen.js';
import { WORLD_W, WORLD_H, JOYSTICK_RADIUS, DASH_DURATION, DASH_COOLDOWN } from '../constants.js';
import { rand, lerp, clamp } from '../utils.js';
import { UPGRADES, MUTATIONS } from '../config.js';
import {
  state, resetGameState, getMaxOil, getUpgradeChoices, applyUpgrade,
  hasPowerup, addScreenFlash, addShake,
  spawnExplosion, spawnFloatingText,
} from '../state/GameState.js';
import { getSettings, toggleSetting, getHighScore, saveHighScore } from '../SettingsManager.js';
import { initAudio, playSound } from '../SoundManager.js';

// Mobile viewport zoom-out factor — shows more of the world on small screens
const MOBILE_ZOOM = 0.7;

// Logic
import { updatePlayer } from '../logic/playerLogic.js';
import { spawnWave, updateEnemies, updateRigRecapture } from '../logic/enemyLogic.js';
import { updateCombat, updateRigs, updateLoot, updateEvents, updateWrecks, updatePipelines } from '../logic/combatLogic.js';

// Rendering
import { drawWater } from '../rendering/drawWorld.js';
import { drawTerritories } from '../rendering/drawTerritories.js';
import { drawPlayer, drawOrbitals, drawCompanions, drawShadows } from '../rendering/drawPlayer.js';
import { drawEnemies } from '../rendering/drawEnemies.js';
import { drawRigs } from '../rendering/drawRigs.js';
import { drawBullets, drawLoot, drawParticles, drawFloatingTexts, drawNapalmZones, drawWrecks, drawActiveEvent } from '../rendering/drawEffects.js';
import { drawHUD, drawTouchControls, drawScreenEffects } from '../rendering/drawHUD.js';
import { drawTitle, drawGameOver, drawUpgradeScreen, drawPauseScreen } from '../rendering/drawScreens.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    const s = state;
    this.s = s;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    s.isTouchDevice = this.isTouchDevice;

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
      // On touch devices, touch events are handled separately; skip mouse state to avoid
      // Phaser's touch-to-pointer conversion causing unintended shooting on left-stick touch.
      if (!this.isTouchDevice) {
        if (pointer.rightButtonDown()) s.input.rightMouseDown = true;
        else s.input.mouseDown = true;
      }

      // Click/tap handlers for game states
      if (s.gameState === 'title' || s.gameState === 'gameover') {
        initAudio(); this.startGame();
      } else if (s.gameState === 'upgrade') {
        this.handleUpgradeClick(pointer.x, pointer.y);
      } else if (s.gameState === 'paused') {
        this.handlePauseClick(pointer.x, pointer.y);
      } else if (s.gameState === 'milestone') {
        this.handleMilestoneClick(pointer.x, pointer.y);
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (!this.isTouchDevice) {
        if (pointer.rightButtonReleased()) s.input.rightMouseDown = false;
        else s.input.mouseDown = false;
      }
    });

    this._loadingRemoved = false;
    this._lastShootHaptic = 0;

    // Fallback: remove loading screen after 3s in case postrender never fires
    setTimeout(() => removeLoadingScreen(), 3000);

    // Disable context menu
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch controls — attach to document so gestures starting outside canvas still register
    this._moveTouchId = null;
    this._aimTouchId = null;
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
    // Haptic feedback on mobile — shooting and damage feel distinctly different
    if (this.isTouchDevice && navigator.vibrate) {
      if (type === 'hit') {
        // Double-punch: clearly feels like taking a hit
        navigator.vibrate([50, 30, 50]);
      } else if (type === 'shoot') {
        // Short light tap; throttled so rapid-fire weapons don't overwhelm
        const now = Date.now();
        if (!this._lastShootHaptic || now - this._lastShootHaptic > 80) {
          this._lastShootHaptic = now;
          navigator.vibrate(12);
        }
      }
    }
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
    this._lastShootHaptic = 0;
  }

  startGame() {
    resetGameState(this.s);
    // Ensure napalmZones array exists after reset
    if (!this.s.napalmZones) this.s.napalmZones = [];
    if (!this.s.killFeed) this.s.killFeed = [];
    if (!this.s.oilIncomeRate) this.s.oilIncomeRate = 0;
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
        // Fall through so this same touch is also registered as a joystick touch.
        // Without this, the tap that starts the game is lost and the first drag does nothing.
      } else {
        return;
      }
    }

    if (s.gameState === 'upgrade') { this.handleUpgradeTouchEvent(e); return; }
    if (s.gameState === 'milestone') { for (const t of e.changedTouches) this.handleMilestoneClick(t.clientX, t.clientY); return; }
    if (s.gameState === 'paused') return;
    if (s.gameState !== 'playing') return;

    const { W, H } = s;
    const PAUSE_BTN_X = W - 50;
    const PAUSE_BTN_Y = 10;
    const PAUSE_BTN_SIZE = 30;
    // Mobile action button layout — must match drawTouchControls in drawHUD.js
    const MOBILE_BTN_SIZE = 50;
    const MOBILE_BTN_GAP = 12;
    const DASH_BTN_X = W - MOBILE_BTN_SIZE - 14;
    const DASH_BTN_Y = H - MOBILE_BTN_SIZE * 3 - MOBILE_BTN_GAP * 2 - 20;

    // On touchstart, assign each new touch to a joystick role based on its starting position.
    // We track roles by touch identifier so the left stick can never accidentally shoot.
    if (e.type === 'touchstart') {
      for (const t of e.changedTouches) {
        if (t.clientX > PAUSE_BTN_X && t.clientY < PAUSE_BTN_Y + PAUSE_BTN_SIZE) {
          this.togglePause(); return;
        }
        if (t.clientX >= DASH_BTN_X && t.clientX <= DASH_BTN_X + MOBILE_BTN_SIZE && t.clientY >= DASH_BTN_Y && t.clientY < DASH_BTN_Y + MOBILE_BTN_SIZE) {
          if (s.player.dashCooldown <= 0 && s.input.touchMove.active) {
            const dashA = Math.atan2(s.input.touchMove.y, s.input.touchMove.x);
            s.player.dashing = DASH_DURATION;
            s.player.dashAngle = dashA;
            s.player.dashCooldown = Math.max(0.5, DASH_COOLDOWN - (s.upgradeStats.dashCooldownBonus || 0));
            this.soundFn('dash');
            addScreenFlash(s, '#44ccff', 0.1);
          }
          continue;
        }
        // Assign touch to move (left half) or aim (right half) role based on start position
        if (t.clientX < W * 0.5) {
          if (this._moveTouchId == null) {
            this._moveTouchId = t.identifier;
            s.input.joystickCenter = { x: t.clientX, y: t.clientY };
          }
        } else {
          if (this._aimTouchId == null) {
            this._aimTouchId = t.identifier;
            s.input.aimJoystickCenter = { x: t.clientX, y: t.clientY };
          }
        }
      }
    }

    // Update joystick values from all active touches using their assigned roles
    s.input.touchFire = false;
    s.input.touchMissile = false;

    // Start with all touch inputs inactive for this frame
    let hasRightJoystick = false;
    for (const t of e.touches) {
      if (this._moveTouchId !== null && t.identifier === this._moveTouchId) {
        const dx = t.clientX - s.input.joystickCenter.x;
        const dy = t.clientY - s.input.joystickCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > 5) {
          s.input.touchMove.x = dx / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchMove.y = dy / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchMove.active = true;
        }
      } else if (this._aimTouchId !== null && t.identifier === this._aimTouchId) {
        const dx = t.clientX - s.input.aimJoystickCenter.x;
        const dy = t.clientY - s.input.aimJoystickCenter.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          s.input.touchAim.x = dx / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchAim.y = dy / Math.max(d, JOYSTICK_RADIUS);
          s.input.touchAim.active = true;
          hasRightJoystick = true;
          if (d > JOYSTICK_RADIUS * 1.3) s.input.touchMissile = true;
        } else {
          s.input.touchAim.active = false;
        }
      }
    }
    // Only fire if right joystick was actually moved (never from left stick)
    if (hasRightJoystick) {
      s.input.touchFire = true;
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const s = this.s;
    for (const t of e.changedTouches) {
      if (this._moveTouchId !== null && t.identifier === this._moveTouchId) {
        this._moveTouchId = null;
        s.input.touchMove = { x: 0, y: 0, active: false };
        s.input.joystickCenter = null;
      } else if (this._aimTouchId !== null && t.identifier === this._aimTouchId) {
        this._aimTouchId = null;
        s.input.touchAim = { x: 0, y: 0, active: false };
        s.input.aimJoystickCenter = null;
        s.input.touchFire = false;
        s.input.touchMissile = false;
      }
    }
    if (e.touches.length === 0) {
      this._moveTouchId = null;
      this._aimTouchId = null;
      s.input.touchMove = { x: 0, y: 0, active: false };
      s.input.touchAim = { x: 0, y: 0, active: false };
      s.input.joystickCenter = null;
      s.input.aimJoystickCenter = null;
      s.input.touchFire = false;
      s.input.touchMissile = false;
    }
  }

  handleUpgradeTouchEvent(e) {
    for (const t of e.changedTouches) this.handleUpgradeClick(t.clientX, t.clientY);
  }

  handleUpgradeClick(mx, my) {
    const s = this.s;
    if (s.upgradeChoices.length === 0) return;
    const { W, H } = s;

    // Skip button — always works on first tap (no confirm needed)
    const skipW = 180, skipH = 44;
    const skipX = (W - skipW) / 2, skipY = H * 0.91;
    if (mx >= skipX && mx <= skipX + skipW && my >= skipY && my <= skipY + skipH) {
      s.pendingUpgradeCard = null;
      s.upgradeChoices = [];
      s.gameState = 'playing';
      return;
    }

    const choices = s.upgradeChoices;
    const weaponKey = choices.find(k => k && UPGRADES[k]?.category === 'weapon');
    const synergyKey = choices.find(k => k && UPGRADES[k]?.synergy);
    const mutationKey = choices.find(k => k && MUTATIONS[k]);
    const statChoices = choices.filter(k => k && UPGRADES[k]?.category !== 'weapon' && !UPGRADES[k]?.synergy && !MUTATIONS[k]);

    // 4-card layout: matches drawUpgradeScreen geometry exactly
    const cardCount = statChoices.length + (weaponKey ? 1 : 0);
    const cardW = Math.min(Math.floor(W * 0.22), 210);
    const cardH = Math.min(Math.floor(H * 0.60), 440);
    const gap = Math.max(8, Math.floor(W * 0.016));
    const totalW = cardCount * cardW + (cardCount - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = H * 0.135;

    // Helper: handle a card tap with two-tap confirm
    const handleCardTap = (key) => {
      if (s.pendingUpgradeCard === key) {
        // Second tap on same card — confirm
        applyUpgrade(s, key);
        s.pendingUpgradeCard = null;
        s.upgradeChoices = [];
        s.gameState = 'playing';
        return true;
      } else {
        // First tap — mark as pending
        s.pendingUpgradeCard = key;
        return false;
      }
    };

    // Stat cards
    for (let i = 0; i < statChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW && my >= startY && my <= startY + cardH) {
        if (handleCardTap(statChoices[i])) return;
        return;
      }
    }

    // Weapon card (rightmost slot)
    if (weaponKey) {
      const wIdx = statChoices.length;
      const wx = startX + wIdx * (cardW + gap);
      if (mx >= wx && mx <= wx + cardW && my >= startY && my <= startY + cardH) {
        if (handleCardTap(weaponKey)) return;
        return;
      }
    }

    const synH = Math.min(90, H * 0.14);
    let nextY = startY + cardH + 14;

    // Synergy card (rendered at nextY, wider)
    if (synergyKey) {
      const synW = Math.min(340, W * 0.50);
      const synX = (W - synW) / 2;
      if (mx >= synX && mx <= synX + synW && my >= nextY && my <= nextY + synH) {
        if (handleCardTap(synergyKey)) return;
        return;
      }
      nextY += synH + 10;
    }

    // Mutation card (rendered below synergy)
    if (mutationKey) {
      const mutW = Math.min(340, W * 0.50);
      const mutX = (W - mutW) / 2;
      if (mx >= mutX && mx <= mutX + mutW && my >= nextY && my <= nextY + synH) {
        if (handleCardTap(mutationKey)) return;
        return;
      }
    }

    // Tapped outside any card — clear pending
    s.pendingUpgradeCard = null;
  }

  handleMilestoneClick(mx, my) {
    const s = this.s;
    if (s.milestoneChoices.length === 0) { s.gameState = 'playing'; return; }
    const { W, H } = s;
    const cardW = Math.min(200, W * 0.28);
    const cardH = Math.min(240, H * 0.40);
    const gap = Math.min(28, W * 0.03);
    const totalW = s.milestoneChoices.length * cardW + (s.milestoneChoices.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = (H - cardH) / 2;
    for (let i = 0; i < s.milestoneChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW && my >= startY && my <= startY + cardH) {
        applyMilestone(s, s.milestoneChoices[i]);
        s.milestoneChoices = [];
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

    // Score multiplier decay — punishes passive play
    if (!s.scoreMult) s.scoreMult = 1.0;
    s.scoreMult = Math.max(1.0, s.scoreMult - 0.018 * dt * 60);

    // Rampage timer
    if (s.player.rampageActive) {
      s.player.rampageTimer = (s.player.rampageTimer || 0) + dt;
    }

    // Bounty contract timer
    if (s.bountyTimer !== undefined) {
      s.bountyTimer -= dt;
      if (s.bountyTimer <= 0) {
        if (s.bountyTarget) { s.bountyTarget.isBounty = false; s.bountyTarget = null; }
        s.bountyTimer = 45 + Math.random() * 20;
        // Pick new bounty target from live enemies (prefer commanders/choppers)
        const candidates = s.enemies.filter(e => e.hp > 0);
        if (candidates.length > 0) {
          const weighted = candidates.filter(e => e.subType === 'command' || e.isBoss || e.type === 'chopper');
          const chosen = (weighted.length > 0 && Math.random() < 0.6) ? weighted[Math.floor(Math.random() * weighted.length)] : candidates[Math.floor(Math.random() * candidates.length)];
          chosen.isBounty = true;
          s.bountyTarget = chosen;
        }
      }
    }

    // Powerup timers
    for (const k in s.activePowerups) { s.activePowerups[k] -= dt; if (s.activePowerups[k] <= 0) delete s.activePowerups[k]; }

    // Screen effects decay
    s.screenFlash.alpha *= 0.92; if (s.screenFlash.alpha < 0.01) s.screenFlash.alpha = 0;
    s.vignetteIntensity *= 0.95; if (s.vignetteIntensity < 0.01) s.vignetteIntensity = 0;

    updatePlayer(s, dt, soundFn);
    updateRigs(s, dt);
    updateRigRecapture(s, dt);
    updatePipelines(s, dt, soundFn);
    updateEvents(s, dt, soundFn);
    spawnWave(s, dt);
    updateEnemies(s, dt, soundFn);
    updateCombat(s, dt, soundFn);
    updateWrecks(s, dt, soundFn);
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

    // Level-up upgrade check (XP-based — fires once per level-up)
    if (s.pendingLevelUp && s.gameState === 'playing') {
      s.pendingLevelUp = false;
      s.upgradeChoices = getUpgradeChoices(s);
      if (s.upgradeChoices.length > 0) { s.isBountyUpgrade = false; s.pendingUpgradeCard = null; s.gameState = 'upgrade'; }
    }

    // Bounty card (from commander kills / supply drops)
    if (s.bountyCards.length > 0 && s.gameState === 'playing') {
      s.upgradeChoices = [s.bountyCards.shift()];
      s.isBountyUpgrade = true;
      s.pendingUpgradeCard = null;
      s.gameState = 'upgrade';
    }

    // Death — phoenix wildcard first, then second_wind milestone
    if (s.player.oil <= 0) {
      if (s.upgradeStats.hasPhoenix && !s.upgradeStats.phoenixUsed) {
        s.upgradeStats.phoenixUsed = true;
        s.player.oil = Math.floor(getMaxOil(s) * 0.5);
        s.player.invincible = 3.0;
        spawnFloatingText(s, s.player.x, s.player.y - 50, '🔥 PHOENIX RISE!', '#ff8800', 22);
        addScreenFlash(s, '#441100', 0.4);
        addShake(s, 8, true);
      } else if (s.milestoneUnlocks?.second_wind && !s.secondWindUsed) {
        s.secondWindUsed = true;
        s.player.oil = s.upgradeStats.secondWindOil || 25;
        s.player.invincible = 2.0;
        spawnFloatingText(s, s.player.x, s.player.y - 40, '💨 SECOND WIND!', '#44ccff', 18);
        addScreenFlash(s, '#003344', 0.3);
      } else {
        s.player.oil = 0; s.player.alive = false; s.gameState = 'gameover';
        spawnExplosion(s, s.player.x, s.player.y, '#ff2200', 40);
        addShake(s, 12, true);
        addScreenFlash(s, '#ff0000', 0.4);
        this.soundFn('explosion', 0.6);
        saveHighScore(s.score);
      }
    }
  }

  updateCamera() {
    const s = this.s;
    const p = s.player;
    const zoom = this.isTouchDevice ? MOBILE_ZOOM : 1.0;
    // With zoom < 1, the viewport covers s.W/zoom × s.H/zoom world units
    s.vW = s.W / zoom;
    s.vH = s.H / zoom;
    let cx = p.x - s.vW / 2;
    let cy = p.y - s.vH / 2;
    if (s.input.touchAim.active) {
      cx += s.input.touchAim.x * (s.vW * 0.15);
      cy += s.input.touchAim.y * (s.vH * 0.15);
    } else if (!this.isTouchDevice) {
      cx += (s.input.mouseX - s.W / 2) * 0.12;
      cy += (s.input.mouseY - s.H / 2) * 0.12;
    }
    s.camera.x = lerp(s.camera.x, clamp(cx, 0, Math.max(0, WORLD_W - s.vW)), 0.08);
    s.camera.y = lerp(s.camera.y, clamp(cy, 0, Math.max(0, WORLD_H - s.vH)), 0.08);
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
        // Draw world with mobile zoom-out applied so more of the world is visible on small screens
        ctx.save();
        if (s.shakeAmount > 0) ctx.translate(rand(-s.shakeAmount, s.shakeAmount), rand(-s.shakeAmount, s.shakeAmount));
        const zoom = this.isTouchDevice ? MOBILE_ZOOM : 1.0;
        if (zoom !== 1.0) ctx.scale(zoom, zoom);
        ctx.translate(-s.camera.x, -s.camera.y);
        drawWater(ctx, s);
        drawTerritories(ctx, s);
        drawNapalmZones(ctx, s);
        drawActiveEvent(ctx, s);
        drawRigs(ctx, s);
        drawLoot(ctx, s);
        drawShadows(ctx, s);
        drawEnemies(ctx, s);
        drawWrecks(ctx, s);
        drawBullets(ctx, s);
        drawOrbitals(ctx, s);
        drawCompanions(ctx, s);
        drawPlayer(ctx, s);
        drawParticles(ctx, s);
        drawFloatingTexts(ctx, s);
        ctx.restore();

        // HUD
        drawHUD(ctx, s, settings);
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
