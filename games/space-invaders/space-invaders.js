// ============================================================
// Space Invaders — Engine + UI
// ============================================================

import { cascadeAnimation } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  // ---- DOM refs ----
  const $canvas = document.getElementById('board');
  const ctx = $canvas.getContext('2d');
  const $score = document.getElementById('score');
  const $level = document.getElementById('level');
  const $lives = document.getElementById('lives');
  const $gameOver = document.getElementById('game-over-overlay');
  const $gameOverTitle = document.getElementById('game-over-title');
  const $finalScore = document.getElementById('final-score');
  const $startOverlay = document.getElementById('start-overlay');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnRetry = document.getElementById('btn-retry');
  const $btnStart = document.getElementById('btn-start');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');

  // ---- Canvas sizing ----
  const W = 500;
  const H = 600;
  $canvas.width = W;
  $canvas.height = H;

  // ---- Constants ----
  const SHIP_W = 36;
  const SHIP_H = 20;
  const SHIP_Y = H - 40;
  const BULLET_W = 3;
  const BULLET_H = 12;
  const BULLET_SPEED = 7;

  const ALIEN_ROWS = 5;
  const ALIEN_COLS = 11;
  const ALIEN_W = 28;
  const ALIEN_H = 20;
  const ALIEN_PAD_X = 12;
  const ALIEN_PAD_Y = 10;
  const ALIEN_TOP = 50;

  const ALIEN_BULLET_W = 3;
  const ALIEN_BULLET_H = 10;
  const ALIEN_BULLET_SPEED = 3.5;

  // Alien shapes (drawn via simple pixel art)
  const ALIEN_COLORS = ['#ef233c', '#f0a000', '#f0a000', '#5dade2', '#5dade2'];
  const ALIEN_POINTS = [30, 20, 20, 10, 10];

  // ---- Game state ----
  let shipX = 0;
  let aliens = [];
  let alienDir = 1;       // 1 = right, -1 = left
  let alienSpeed = 0;
  let alienMoveTimer = 0;
  let alienStepDown = false;
  let playerBullet = null;
  let alienBullets = [];
  let score = 0;
  let lives = 0;
  let wave = 0;
  let running = false;
  let animFrame = null;
  let lastTime = 0;
  let alienShootTimer = 0;
  let explosions = [];

  // ---- Helpers ----
  function scaleX(v) { return v; }
  function scaleY(v) { return v; }

  // ---- Alien grid creation ----
  function createAliens() {
    aliens = [];
    const totalW = ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X;
    const startX = (W - totalW) / 2;
    for (let r = 0; r < ALIEN_ROWS; r++) {
      for (let c = 0; c < ALIEN_COLS; c++) {
        aliens.push({
          x: startX + c * (ALIEN_W + ALIEN_PAD_X),
          y: ALIEN_TOP + r * (ALIEN_H + ALIEN_PAD_Y),
          w: ALIEN_W,
          h: ALIEN_H,
          row: r,
          alive: true
        });
      }
    }
  }

  function aliveAliens() {
    return aliens.filter(a => a.alive);
  }

  // ---- Drawing ----

  function drawShip() {
    ctx.fillStyle = '#5dade2';
    // Main body
    ctx.fillRect(shipX, SHIP_Y + 6, SHIP_W, SHIP_H - 6);
    // Nose
    ctx.fillRect(shipX + SHIP_W / 2 - 3, SHIP_Y, 6, 10);
    // Wings
    ctx.fillRect(shipX - 2, SHIP_Y + SHIP_H - 4, 4, 4);
    ctx.fillRect(shipX + SHIP_W - 2, SHIP_Y + SHIP_H - 4, 4, 4);
  }

  function drawAlien(a) {
    const color = ALIEN_COLORS[a.row];
    ctx.fillStyle = color;

    if (a.row === 0) {
      // Top row — small squid shape
      ctx.fillRect(a.x + 8, a.y, 12, 4);
      ctx.fillRect(a.x + 4, a.y + 4, 20, 4);
      ctx.fillRect(a.x + 2, a.y + 8, 24, 4);
      ctx.fillRect(a.x + 2, a.y + 12, 4, 4);
      ctx.fillRect(a.x + 10, a.y + 12, 8, 4);
      ctx.fillRect(a.x + 22, a.y + 12, 4, 4);
      // Eyes
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(a.x + 8, a.y + 8, 4, 4);
      ctx.fillRect(a.x + 16, a.y + 8, 4, 4);
    } else if (a.row <= 2) {
      // Middle rows — crab shape
      ctx.fillRect(a.x + 4, a.y, 20, 4);
      ctx.fillRect(a.x + 2, a.y + 4, 24, 4);
      ctx.fillRect(a.x, a.y + 8, 28, 4);
      ctx.fillRect(a.x + 2, a.y + 12, 6, 4);
      ctx.fillRect(a.x + 20, a.y + 12, 6, 4);
      ctx.fillRect(a.x + 10, a.y + 16, 8, 3);
      // Eyes
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(a.x + 8, a.y + 4, 4, 4);
      ctx.fillRect(a.x + 16, a.y + 4, 4, 4);
    } else {
      // Bottom rows — skull shape
      ctx.fillRect(a.x + 4, a.y, 20, 4);
      ctx.fillRect(a.x + 2, a.y + 4, 24, 4);
      ctx.fillRect(a.x, a.y + 8, 28, 4);
      ctx.fillRect(a.x, a.y + 12, 28, 4);
      ctx.fillRect(a.x + 4, a.y + 16, 4, 3);
      ctx.fillRect(a.x + 12, a.y + 16, 4, 3);
      ctx.fillRect(a.x + 20, a.y + 16, 4, 3);
      // Eyes
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(a.x + 6, a.y + 8, 4, 4);
      ctx.fillRect(a.x + 18, a.y + 8, 4, 4);
    }
  }

  function drawBullet(b, color) {
    ctx.fillStyle = color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  function drawExplosions() {
    for (const ex of explosions) {
      ctx.globalAlpha = ex.life;
      ctx.fillStyle = ex.color;
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 / 6) * i + ex.seed;
        const dist = (1 - ex.life) * 20;
        ctx.fillRect(
          ex.x + Math.cos(ang) * dist - 2,
          ex.y + Math.sin(ang) * dist - 2,
          4, 4
        );
      }
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Ship
    drawShip();

    // Aliens
    for (const a of aliens) {
      if (a.alive) drawAlien(a);
    }

    // Player bullet
    if (playerBullet) drawBullet(playerBullet, '#fff');

    // Alien bullets
    for (const b of alienBullets) {
      drawBullet(b, '#ef233c');
    }

    // Explosions
    drawExplosions();
  }

  // ---- Physics / Movement ----

  function moveAliens(dt) {
    alienMoveTimer += dt;
    const alive = aliveAliens();
    if (alive.length === 0) return;

    // Speed increases as fewer aliens remain
    const interval = Math.max(50, alienSpeed - (ALIEN_ROWS * ALIEN_COLS - alive.length) * 8);

    if (alienMoveTimer < interval) return;
    alienMoveTimer = 0;

    if (alienStepDown) {
      for (const a of alive) {
        a.y += ALIEN_H;
      }
      alienDir *= -1;
      alienStepDown = false;
      return;
    }

    const step = 8;
    let needDrop = false;
    for (const a of alive) {
      a.x += step * alienDir;
      if (a.x + a.w >= W - 5 || a.x <= 5) {
        needDrop = true;
      }
    }
    if (needDrop) {
      alienStepDown = true;
    }
  }

  function moveBullets() {
    // Player bullet
    if (playerBullet) {
      playerBullet.y -= BULLET_SPEED;
      if (playerBullet.y + playerBullet.h < 0) {
        playerBullet = null;
      }
    }

    // Alien bullets
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      alienBullets[i].y += ALIEN_BULLET_SPEED + (wave - 1) * 0.3;
      if (alienBullets[i].y > H) {
        alienBullets.splice(i, 1);
      }
    }
  }

  function alienShoot(dt) {
    alienShootTimer += dt;
    const shootInterval = Math.max(400, 1200 - (wave - 1) * 100);
    if (alienShootTimer < shootInterval) return;
    alienShootTimer = 0;

    const alive = aliveAliens();
    if (alive.length === 0) return;

    // Pick random bottom-most alien per column
    const cols = {};
    for (const a of alive) {
      const colKey = Math.round(a.x);
      if (!cols[colKey] || a.y > cols[colKey].y) {
        cols[colKey] = a;
      }
    }
    const shooters = Object.values(cols);
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    if (alienBullets.length < 3 + wave) {
      alienBullets.push({
        x: shooter.x + shooter.w / 2 - ALIEN_BULLET_W / 2,
        y: shooter.y + shooter.h,
        w: ALIEN_BULLET_W,
        h: ALIEN_BULLET_H
      });
    }
  }

  // ---- Collision ----

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkCollisions() {
    // Player bullet vs aliens
    if (playerBullet) {
      for (const a of aliens) {
        if (!a.alive) continue;
        if (rectsOverlap(playerBullet, a)) {
          a.alive = false;
          score += ALIEN_POINTS[a.row];
          explosions.push({
            x: a.x + a.w / 2,
            y: a.y + a.h / 2,
            color: ALIEN_COLORS[a.row],
            life: 1,
            seed: Math.random() * Math.PI * 2
          });
          playerBullet = null;
          updateUI();
          break;
        }
      }
    }

    // Alien bullets vs ship
    const shipRect = { x: shipX, y: SHIP_Y, w: SHIP_W, h: SHIP_H };
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(alienBullets[i], shipRect)) {
        alienBullets.splice(i, 1);
        loseLife();
        return;
      }
    }

    // Aliens reaching ship level
    for (const a of aliveAliens()) {
      if (a.y + a.h >= SHIP_Y) {
        gameOverLose();
        return;
      }
    }
  }

  // ---- Life / Game over ----

  function loseLife() {
    lives--;
    updateUI();
    if (lives <= 0) {
      gameOverLose();
    } else {
      // Brief invincibility flash (visual only)
      explosions.push({
        x: shipX + SHIP_W / 2,
        y: SHIP_Y + SHIP_H / 2,
        color: '#5dade2',
        life: 1,
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  function gameOverLose() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    $gameOverTitle.textContent = '💥 Game Over';
    $finalScore.textContent = score;
    $gameOver.hidden = false;
  }

  function nextWave() {
    wave++;
    alienDir = 1;
    alienMoveTimer = 0;
    alienStepDown = false;
    alienShootTimer = 0;
    alienBullets = [];
    playerBullet = null;
    alienSpeed = Math.max(200, 500 - (wave - 1) * 30);
    createAliens();
    updateUI();
    cascadeAnimation();
  }

  // ---- UI ----

  function updateUI() {
    $score.textContent = 'Score: ' + score;
    $level.textContent = 'Wave: ' + wave;
    const hearts = [];
    for (let i = 0; i < lives; i++) hearts.push('❤️');
    $lives.textContent = hearts.join('');
  }

  // ---- Input ----

  const keys = {};

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && running) {
      e.preventDefault();
      shoot();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  function handleInput() {
    const speed = 5;
    if (keys['ArrowLeft'] || keys['a']) {
      shipX = Math.max(0, shipX - speed);
    }
    if (keys['ArrowRight'] || keys['d']) {
      shipX = Math.min(W - SHIP_W, shipX + speed);
    }
  }

  function shoot() {
    if (!playerBullet) {
      playerBullet = {
        x: shipX + SHIP_W / 2 - BULLET_W / 2,
        y: SHIP_Y - BULLET_H,
        w: BULLET_W,
        h: BULLET_H
      };
    }
  }

  // ---- Touch controls (whole document so finger doesn't block view) ----

  let touchX = null;

  document.addEventListener('touchstart', (e) => {
    if (!running) return;
    const rect = $canvas.getBoundingClientRect();
    const scaleRatio = W / rect.width;
    touchX = (e.touches[0].clientX - rect.left) * scaleRatio;
    shoot();
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!running) return;
    e.preventDefault();
    const rect = $canvas.getBoundingClientRect();
    const scaleRatio = W / rect.width;
    const newX = (e.touches[0].clientX - rect.left) * scaleRatio;
    if (touchX !== null) {
      shipX += newX - touchX;
      shipX = Math.max(0, Math.min(W - SHIP_W, shipX));
    }
    touchX = newX;
  }, { passive: false });

  document.addEventListener('touchend', () => { touchX = null; });

  // Mouse controls
  let mouseDown = false;
  $canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const rect = $canvas.getBoundingClientRect();
    const scaleRatio = W / rect.width;
    touchX = (e.clientX - rect.left) * scaleRatio;
    shoot();
  });

  $canvas.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    const rect = $canvas.getBoundingClientRect();
    const scaleRatio = W / rect.width;
    const newX = (e.clientX - rect.left) * scaleRatio;
    if (touchX !== null) {
      shipX += newX - touchX;
      shipX = Math.max(0, Math.min(W - SHIP_W, shipX));
    }
    touchX = newX;
  });

  document.addEventListener('mouseup', () => { mouseDown = false; touchX = null; });

  // ---- Game loop ----

  function gameLoop(ts) {
    if (!running) return;
    const dt = lastTime ? ts - lastTime : 16;
    lastTime = ts;

    handleInput();
    moveAliens(dt);
    moveBullets();
    alienShoot(dt);
    checkCollisions();

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].life -= 0.03;
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    // Check wave clear
    if (aliveAliens().length === 0) {
      nextWave();
    }

    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ---- Game lifecycle ----

  function newGame() {
    if (animFrame) cancelAnimationFrame(animFrame);
    score = 0;
    lives = 3;
    wave = 1;
    shipX = W / 2 - SHIP_W / 2;
    playerBullet = null;
    alienBullets = [];
    explosions = [];
    alienDir = 1;
    alienMoveTimer = 0;
    alienStepDown = false;
    alienShootTimer = 0;
    alienSpeed = 500;
    createAliens();
    updateUI();
    $gameOver.hidden = true;

    running = true;
    lastTime = 0;
    animFrame = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    $startOverlay.hidden = true;
    newGame();
  }

  // ---- UI events ----
  $btnStart.addEventListener('click', startGame);
  $btnNew.addEventListener('click', () => {
    $startOverlay.hidden = true;
    newGame();
  });
  $btnRetry.addEventListener('click', () => {
    $gameOver.hidden = true;
    newGame();
  });
  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => {
    if (e.target === $helpModal) $helpModal.close();
  });

  // Initial draw
  shipX = W / 2 - SHIP_W / 2;
  createAliens();
  draw();
})();
