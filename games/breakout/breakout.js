// ============================================================
// Breakout — Engine + UI
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

  // ---- Game constants ----
  const IS_TOUCH = 'ontouchstart' in window;
  const PADDLE_W = IS_TOUCH ? 110 : 80;
  const PADDLE_H = 12;
  const PADDLE_Y = H - 30;
  const BALL_R = 6;
  const BRICK_ROWS = 8;
  const BRICK_COLS = 10;
  const BRICK_H = 18;
  const BRICK_PAD = 4;
  const BRICK_TOP = 50;
  const BRICK_W = (W - (BRICK_COLS + 1) * BRICK_PAD) / BRICK_COLS;

  const ROW_COLORS = [
    '#ef233c', '#ef233c',
    '#f0a000', '#f0a000',
    '#00c040', '#00c040',
    '#f0f000', '#f0f000'
  ];
  const ROW_POINTS = [7, 7, 5, 5, 3, 3, 1, 1];

  const BASE_SPEED = IS_TOUCH ? 4 : 5;

  // ---- Game state ----
  let paddleX = 0;
  let ball = { x: 0, y: 0, dx: 0, dy: 0 };
  let bricks = [];
  let score = 0;
  let lives = 0;
  let level = 0;
  let running = false;
  let launched = false;
  let animFrame = null;

  // ---- Brick management ----
  function createBricks() {
    bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_PAD + c * (BRICK_W + BRICK_PAD),
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: BRICK_W,
          h: BRICK_H,
          color: ROW_COLORS[r],
          points: ROW_POINTS[r],
          alive: true
        });
      }
    }
  }

  // ---- Reset ball on paddle ----
  function resetBall() {
    launched = false;
    ball.x = paddleX + PADDLE_W / 2;
    ball.y = PADDLE_Y - BALL_R;
    const speed = BASE_SPEED + (level - 1) * 0.5;
    ball.dx = speed * 0.7;
    ball.dy = -speed;
  }

  // ---- Game lifecycle ----
  function newGame() {
    if (animFrame) cancelAnimationFrame(animFrame);
    score = 0;
    lives = 3;
    level = 1;
    paddleX = (W - PADDLE_W) / 2;
    $gameOver.hidden = true;
    $startOverlay.hidden = true;
    document.querySelectorAll('.win-particle').forEach(el => el.remove());
    running = true;
    createBricks();
    resetBall();
    updateUI();
    loop();
  }

  function nextLevel() {
    level++;
    createBricks();
    resetBall();
    updateUI();
  }

  function loseLife() {
    lives--;
    updateUI();
    if (lives <= 0) {
      endGame(false);
    } else {
      resetBall();
    }
  }

  function endGame(won) {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    $gameOverTitle.textContent = won ? '🎉 You Win!' : 'Game Over';
    $finalScore.textContent = score;
    $gameOver.hidden = false;
    if (won) cascadeAnimation();
  }

  // ---- UI updates ----
  function updateUI() {
    $score.textContent = `Score: ${score}`;
    $level.textContent = `Level: ${level}`;
    $lives.textContent = '❤️'.repeat(lives);
  }

  // ---- Drawing ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 4);
    }

    // Paddle
    ctx.fillStyle = '#e8eaed';
    ctx.beginPath();
    ctx.roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Physics ----
  function update() {
    if (!launched) {
      ball.x = paddleX + PADDLE_W / 2;
      ball.y = PADDLE_Y - BALL_R;
      return;
    }

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.dx = Math.abs(ball.dx); }
    if (ball.x + BALL_R >= W) { ball.x = W - BALL_R; ball.dx = -Math.abs(ball.dx); }
    if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.dy = Math.abs(ball.dy); }

    // Bottom — lose life
    if (ball.y + BALL_R >= H) { loseLife(); return; }

    // Paddle collision
    if (ball.dy > 0 &&
        ball.y + BALL_R >= PADDLE_Y &&
        ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
        ball.x >= paddleX && ball.x <= paddleX + PADDLE_W) {
      ball.dy = -Math.abs(ball.dy);
      // Angle based on where ball hits paddle
      const hit = (ball.x - paddleX) / PADDLE_W; // 0..1
      const angle = (hit - 0.5) * Math.PI * 0.7; // -63°..+63°
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      ball.dx = speed * Math.sin(angle);
      ball.dy = -speed * Math.cos(angle);
      ball.y = PADDLE_Y - BALL_R;
    }

    // Brick collisions
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
          ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
        b.alive = false;
        score += b.points * level;
        updateUI();

        // Determine bounce direction
        const overlapLeft = (ball.x + BALL_R) - b.x;
        const overlapRight = (b.x + b.w) - (ball.x - BALL_R);
        const overlapTop = (ball.y + BALL_R) - b.y;
        const overlapBottom = (b.y + b.h) - (ball.y - BALL_R);
        const minX = Math.min(overlapLeft, overlapRight);
        const minY = Math.min(overlapTop, overlapBottom);

        if (minX < minY) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
        break; // one brick per frame
      }
    }

    // Check level clear
    if (bricks.every(b => !b.alive)) {
      cascadeAnimation();
      nextLevel();
    }
  }

  // ---- Game loop ----
  function loop() {
    if (!running) return;
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // ---- Input: Keyboard ----
  const keys = {};
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      keys[e.key] = true;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (running && !launched) launched = true;
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.key] = false; });

  // Smooth keyboard paddle movement via a separate interval
  setInterval(() => {
    if (!running) return;
    const step = 8;
    if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - step);
    if (keys['ArrowRight']) paddleX = Math.min(W - PADDLE_W, paddleX + step);
    if (!launched) {
      ball.x = paddleX + PADDLE_W / 2;
    }
  }, 16);

  // ---- Input: Mouse ----
  $canvas.addEventListener('mousemove', (e) => {
    if (!running) return;
    const rect = $canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, mx - PADDLE_W / 2));
    if (!launched) ball.x = paddleX + PADDLE_W / 2;
  });

  $canvas.addEventListener('click', () => {
    if (running && !launched) launched = true;
  });

  // ---- Input: Touch (whole document so finger doesn't block view) ----
  document.addEventListener('touchmove', (e) => {
    if (!running) return;
    e.preventDefault();
    const rect = $canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const tx = (e.touches[0].clientX - rect.left) * scaleX;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, tx - PADDLE_W / 2));
    if (!launched) ball.x = paddleX + PADDLE_W / 2;
  }, { passive: false });

  document.addEventListener('touchstart', (e) => {
    if (running && !launched) {
      launched = true;
    }
  }, { passive: true });

  // ---- Help modal ----
  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => { if (e.target === $helpModal) $helpModal.close(); });

  // ---- Buttons ----
  $btnNew.addEventListener('click', newGame);
  $btnRetry.addEventListener('click', newGame);
  $btnStart.addEventListener('click', newGame);

  // ---- Initial state ----
  createBricks();
  paddleX = (W - PADDLE_W) / 2;
  resetBall();
  draw();
})();
