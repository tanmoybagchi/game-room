// ============================================================
// Snake — Engine + UI
// ============================================================

import { cascadeAnimation } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  // ---- Constants ----
  const GRID = 20; // cells per side
  const BASE_INTERVAL = 150; // ms per tick at start
  const SPEED_STEP = 5; // speed up every N food

  // ---- DOM refs ----
  const $canvas = document.getElementById('board');
  const ctx = $canvas.getContext('2d');
  const $score = document.getElementById('score');
  const $highScore = document.getElementById('high-score');
  const $gameOver = document.getElementById('game-over-overlay');
  const $finalScore = document.getElementById('final-score');
  const $startOverlay = document.getElementById('start-overlay');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnRetry = document.getElementById('btn-retry');
  const $btnStart = document.getElementById('btn-start');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');
  const $btnUp = document.getElementById('btn-up');
  const $btnDown = document.getElementById('btn-down');
  const $btnLeft = document.getElementById('btn-left');
  const $btnRight = document.getElementById('btn-right');

  // ---- Canvas sizing ----
  const SIZE = 400;
  $canvas.width = SIZE;
  $canvas.height = SIZE;
  const CELL = SIZE / GRID;

  // ---- Game state ----
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snake_high') || '0', 10);
  let running = false;
  let tickTimer = null;
  let foodEaten = 0;

  // ---- Helpers ----
  function randomFoodPos() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID)
      };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function getInterval() {
    const speedUps = Math.floor(foodEaten / SPEED_STEP);
    return Math.max(60, BASE_INTERVAL - speedUps * 15);
  }

  // ---- Game lifecycle ----
  function newGame() {
    if (tickTimer) clearInterval(tickTimer);
    snake = [
      { x: Math.floor(GRID / 2), y: Math.floor(GRID / 2) },
      { x: Math.floor(GRID / 2) - 1, y: Math.floor(GRID / 2) },
      { x: Math.floor(GRID / 2) - 2, y: Math.floor(GRID / 2) }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    foodEaten = 0;
    food = randomFoodPos();
    running = true;
    $gameOver.hidden = true;
    $startOverlay.hidden = true;
    document.querySelectorAll('.win-particle').forEach(el => el.remove());
    updateUI();
    draw();
    tickTimer = setInterval(tick, getInterval());
  }

  function endGame() {
    running = false;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake_high', String(highScore));
    }
    $finalScore.textContent = score;
    $gameOver.hidden = false;
    updateUI();
  }

  // ---- Tick ----
  function tick() {
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame();
      return;
    }

    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    // Food
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      foodEaten++;
      food = randomFoodPos();
      updateUI();

      // Milestone celebration every 50 points
      if (score % 50 === 0) cascadeAnimation();

      // Speed up
      if (foodEaten % SPEED_STEP === 0) {
        clearInterval(tickTimer);
        tickTimer = setInterval(tick, getInterval());
      }
    } else {
      snake.pop();
    }

    draw();
  }

  // ---- Drawing ----
  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }

    // Snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#58d68d' : '#2ecc71';
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3);
      ctx.fill();
      // Highlight
      if (isHead) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, 4);
      }
    }

    // Food
    ctx.fillStyle = '#ef233c';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2 - 2, food.y * CELL + CELL / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateUI() {
    $score.textContent = `Score: ${score}`;
    $highScore.textContent = `Best: ${highScore}`;
  }

  // ---- Input: Keyboard ----
  document.addEventListener('keydown', (e) => {
    if (!running) return;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); if (dir.y !== 1)  nextDir = { x: 0, y: -1 }; break;
      case 'ArrowDown':  e.preventDefault(); if (dir.y !== -1) nextDir = { x: 0, y: 1 }; break;
      case 'ArrowLeft':  e.preventDefault(); if (dir.x !== 1)  nextDir = { x: -1, y: 0 }; break;
      case 'ArrowRight': e.preventDefault(); if (dir.x !== -1) nextDir = { x: 1, y: 0 }; break;
    }
  });

  // ---- Input: Touch buttons ----
  $btnUp.addEventListener('click', () => { if (running && dir.y !== 1) nextDir = { x: 0, y: -1 }; });
  $btnDown.addEventListener('click', () => { if (running && dir.y !== -1) nextDir = { x: 0, y: 1 }; });
  $btnLeft.addEventListener('click', () => { if (running && dir.x !== 1) nextDir = { x: -1, y: 0 }; });
  $btnRight.addEventListener('click', () => { if (running && dir.x !== -1) nextDir = { x: 1, y: 0 }; });

  // ---- Input: Swipe on canvas ----
  let touchStartX = 0;
  let touchStartY = 0;

  $canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  $canvas.addEventListener('touchend', (e) => {
    if (!running) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 15 && absDy < 15) return; // too small

    if (absDx > absDy) {
      if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
      else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
      else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
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
  updateUI();
  draw();
})();
