// ============================================================
// Asteroids — Engine + UI
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
  const H = 500;
  $canvas.width = W;
  $canvas.height = H;

  // ---- Constants ----
  const TWO_PI = Math.PI * 2;
  const SHIP_SIZE = 14;
  const TURN_SPEED = 0.07;
  const THRUST_POWER = 0.12;
  const FRICTION = 0.985;
  const MAX_SPEED = 6;
  const BULLET_SPEED = 8;
  const BULLET_LIFE = 50;    // frames
  const MAX_BULLETS = 6;
  const SHOOT_COOLDOWN = 8;  // frames between shots

  const ASTEROID_SIZES = {
    large:  { radius: 40, speed: 1.2, points: 20 },
    medium: { radius: 22, speed: 2.0, points: 50 },
    small:  { radius: 12, speed: 3.0, points: 100 }
  };

  const INVULN_TIME = 120; // frames of invulnerability after respawn

  // ---- Game state ----
  let ship = {};
  let asteroids = [];
  let bullets = [];
  let particles = [];
  let score = 0;
  let lives = 0;
  let wave = 0;
  let running = false;
  let animFrame = null;
  let invulnTimer = 0;
  let shootCooldown = 0;

  // ---- Ship ----

  function createShip() {
    return {
      x: W / 2,
      y: H / 2,
      angle: -Math.PI / 2,  // pointing up
      dx: 0,
      dy: 0,
      thrusting: false
    };
  }

  // ---- Asteroids ----

  function createAsteroid(x, y, size) {
    const info = ASTEROID_SIZES[size];
    const angle = Math.random() * TWO_PI;
    const speed = info.speed * (0.7 + Math.random() * 0.6);
    // Generate jagged shape
    const verts = [];
    const numVerts = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVerts; i++) {
      const a = (TWO_PI / numVerts) * i;
      const r = info.radius * (0.7 + Math.random() * 0.4);
      verts.push({ a, r });
    }
    return {
      x, y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: info.radius,
      size,
      points: info.points,
      verts
    };
  }

  function spawnWaveAsteroids(count) {
    for (let i = 0; i < count; i++) {
      let x, y;
      // Spawn away from ship
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (dist(x, y, ship.x, ship.y) < 120);
      asteroids.push(createAsteroid(x, y, 'large'));
    }
  }

  // ---- Bullets ----

  function fireBullet() {
    if (bullets.length >= MAX_BULLETS || shootCooldown > 0) return;
    shootCooldown = SHOOT_COOLDOWN;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
      y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
      dx: Math.cos(ship.angle) * BULLET_SPEED + ship.dx * 0.3,
      dy: Math.sin(ship.angle) * BULLET_SPEED + ship.dy * 0.3,
      life: BULLET_LIFE
    });
  }

  // ---- Particles (explosions) ----

  function spawnExplosion(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TWO_PI;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x, y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        color
      });
    }
  }

  // ---- Helpers ----

  function dist(x1, y1, x2, y2) {
    const a = x1 - x2, b = y1 - y2;
    return Math.sqrt(a * a + b * b);
  }

  function wrap(obj) {
    if (obj.x < -50) obj.x += W + 100;
    if (obj.x > W + 50) obj.x -= W + 100;
    if (obj.y < -50) obj.y += H + 100;
    if (obj.y > H + 50) obj.y -= H + 100;
  }

  // ---- Update ----

  function update() {
    // Ship rotation & thrust
    if (keys['ArrowLeft'] || keys['a']) ship.angle -= TURN_SPEED;
    if (keys['ArrowRight'] || keys['d']) ship.angle += TURN_SPEED;

    if (ship.thrusting || keys['ArrowUp'] || keys['w']) {
      ship.dx += Math.cos(ship.angle) * THRUST_POWER;
      ship.dy += Math.sin(ship.angle) * THRUST_POWER;
    }

    // Friction
    ship.dx *= FRICTION;
    ship.dy *= FRICTION;

    // Clamp speed
    const spd = Math.sqrt(ship.dx * ship.dx + ship.dy * ship.dy);
    if (spd > MAX_SPEED) {
      ship.dx = (ship.dx / spd) * MAX_SPEED;
      ship.dy = (ship.dy / spd) * MAX_SPEED;
    }

    ship.x += ship.dx;
    ship.y += ship.dy;
    wrap(ship);

    // Bullets
    if (shootCooldown > 0) shootCooldown--;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx;
      b.y += b.dy;
      b.life--;
      wrap(b);
      if (b.life <= 0) bullets.splice(i, 1);
    }

    // Asteroids
    for (const a of asteroids) {
      a.x += a.dx;
      a.y += a.dy;
      wrap(a);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.dx;
      p.y += p.dy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Invulnerability
    if (invulnTimer > 0) invulnTimer--;

    // ---- Collisions ----

    // Bullets vs asteroids
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (dist(b.x, b.y, a.x, a.y) < a.radius) {
          // Hit!
          bullets.splice(bi, 1);
          score += a.points;
          spawnExplosion(a.x, a.y, 8, '#ccc');

          // Split
          if (a.size === 'large') {
            asteroids.push(createAsteroid(a.x, a.y, 'medium'));
            asteroids.push(createAsteroid(a.x, a.y, 'medium'));
          } else if (a.size === 'medium') {
            asteroids.push(createAsteroid(a.x, a.y, 'small'));
            asteroids.push(createAsteroid(a.x, a.y, 'small'));
          }
          asteroids.splice(ai, 1);
          updateUI();
          break;
        }
      }
    }

    // Ship vs asteroids
    if (invulnTimer <= 0) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (dist(ship.x, ship.y, a.x, a.y) < a.radius + SHIP_SIZE * 0.7) {
          // Hit ship
          spawnExplosion(ship.x, ship.y, 15, '#5dade2');
          lives--;
          updateUI();
          if (lives <= 0) {
            gameOverLose();
            return;
          }
          // Respawn
          ship = createShip();
          invulnTimer = INVULN_TIME;
          bullets = [];
          break;
        }
      }
    }

    // Wave cleared
    if (asteroids.length === 0) {
      nextWave();
    }
  }

  // ---- Drawing ----

  function drawShip() {
    // Blink during invulnerability
    if (invulnTimer > 0 && Math.floor(invulnTimer / 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Ship body
    ctx.strokeStyle = '#5dade2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
    ctx.lineTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame
    if (ship.thrusting || keys['ArrowUp'] || keys['w']) {
      ctx.strokeStyle = '#f0a000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE * 0.5, -SHIP_SIZE * 0.3);
      ctx.lineTo(-SHIP_SIZE * (0.8 + Math.random() * 0.4), 0);
      ctx.lineTo(-SHIP_SIZE * 0.5, SHIP_SIZE * 0.3);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < a.verts.length; i++) {
      const v = a.verts[i];
      const px = a.x + Math.cos(v.a) * v.r;
      const py = a.y + Math.sin(v.a) * v.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawBullets() {
    ctx.fillStyle = '#fff';
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, TWO_PI);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    drawShip();
    for (const a of asteroids) drawAsteroid(a);
    drawBullets();
    drawParticles();
  }

  // ---- Wave / Game state ----

  function nextWave() {
    wave++;
    const count = 3 + wave;
    spawnWaveAsteroids(count);
    updateUI();
    if (wave > 1) cascadeAnimation();
  }

  function gameOverLose() {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    $gameOverTitle.textContent = '💥 Game Over';
    $finalScore.textContent = score;
    $gameOver.hidden = false;
  }

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
      fireBullet();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // ---- Touch controls (whole document) ----
  // Left half = thrust, Right half = shoot
  // Drag horizontally to rotate

  let touchId = null;
  let touchStartX = null;

  document.addEventListener('touchstart', (e) => {
    if (!running) return;
    const touch = e.touches[0];
    const rect = $canvas.getBoundingClientRect();
    const relX = touch.clientX - rect.left;
    const halfW = rect.width / 2;

    touchId = touch.identifier;
    touchStartX = touch.clientX;

    if (relX > halfW) {
      fireBullet();
    } else {
      ship.thrusting = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!running) return;
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchId && touchStartX !== null) {
        const dx = touch.clientX - touchStartX;
        const rect = $canvas.getBoundingClientRect();
        const sensitivity = 0.005 * (W / rect.width);
        ship.angle += dx * sensitivity;
        touchStartX = touch.clientX;
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchId) {
        ship.thrusting = false;
        touchId = null;
        touchStartX = null;
      }
    }
  });

  // ---- Game loop ----

  function gameLoop() {
    if (!running) return;
    update();
    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ---- Game lifecycle ----

  function newGame() {
    if (animFrame) cancelAnimationFrame(animFrame);
    score = 0;
    lives = 3;
    wave = 0;
    ship = createShip();
    asteroids = [];
    bullets = [];
    particles = [];
    invulnTimer = INVULN_TIME;
    shootCooldown = 0;
    $gameOver.hidden = true;
    updateUI();

    nextWave();

    running = true;
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
  ship = createShip();
  draw();
})();
