// ============================================================
// Tetris — Engine + UI
// ============================================================

(() => {
  'use strict';

  // ---- Constants ----
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30; // px per cell on canvas

  const PIECES = {
    I: { shape: [[0,0],[1,0],[2,0],[3,0]], color: '#00f0f0' },
    O: { shape: [[0,0],[1,0],[0,1],[1,1]], color: '#f0f000' },
    T: { shape: [[0,0],[1,0],[2,0],[1,1]], color: '#a000f0' },
    S: { shape: [[1,0],[2,0],[0,1],[1,1]], color: '#00f000' },
    Z: { shape: [[0,0],[1,0],[1,1],[2,1]], color: '#f00000' },
    J: { shape: [[0,0],[0,1],[1,1],[2,1]], color: '#0000f0' },
    L: { shape: [[2,0],[0,1],[1,1],[2,1]], color: '#f0a000' }
  };

  const PIECE_NAMES = Object.keys(PIECES);
  const LINE_POINTS = [0, 100, 300, 500, 800];
  const LEVEL_SPEED = level => Math.max(50, 800 - (level - 1) * 70);

  // ---- DOM refs ----
  const $canvas = document.getElementById('board');
  const $ctx = $canvas.getContext('2d');
  const $nextCanvas = document.getElementById('next-canvas');
  const $nextCtx = $nextCanvas.getContext('2d');
  const $score = document.getElementById('score');
  const $level = document.getElementById('level');
  const $lines = document.getElementById('lines');
  const $gameOver = document.getElementById('game-over-overlay');
  const $finalScore = document.getElementById('final-score');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnRetry = document.getElementById('btn-retry');
  const $btnStart = document.getElementById('btn-start');
  const $startOverlay = document.getElementById('start-overlay');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');

  // Touch controls
  const $btnLeft = document.getElementById('btn-left');
  const $btnRight = document.getElementById('btn-right');
  const $btnRotate = document.getElementById('btn-rotate');
  const $btnDown = document.getElementById('btn-down');
  const $btnDrop = document.getElementById('btn-drop');

  // ---- Game state ----
  let board = [];
  let current = null;  // { cells, color, x, y }
  let nextPiece = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropTimer = null;
  let gameOver = false;
  let bag = [];

  // ---- Piece generation (7-bag randomizer) ----
  function refillBag() {
    bag = [...PIECE_NAMES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  function nextFromBag() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  function createPiece(name) {
    const p = PIECES[name];
    const cells = p.shape.map(([x, y]) => [x, y]);
    return { cells, color: p.color, x: Math.floor((COLS - 3) / 2), y: 0 };
  }

  // ---- Board helpers ----
  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function isValid(cells, ox, oy) {
    for (const [cx, cy] of cells) {
      const nx = cx + ox;
      const ny = cy + oy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
    return true;
  }

  function lock() {
    for (const [cx, cy] of current.cells) {
      const nx = cx + current.x;
      const ny = cy + current.y;
      if (ny < 0) { endGame(); return; }
      board[ny][nx] = current.color;
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // re-check same row
      }
    }
    if (cleared > 0) {
      lines += cleared;
      score += LINE_POINTS[cleared] * level;
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        resetTimer();
      }
      updateStats();
    }
  }

  function spawn() {
    current = createPiece(nextPiece);
    nextPiece = nextFromBag();
    if (!isValid(current.cells, current.x, current.y)) {
      endGame();
      return;
    }
    drawNext();
  }

  // ---- Movement ----
  function moveLeft() {
    if (gameOver) return;
    if (isValid(current.cells, current.x - 1, current.y)) {
      current.x--;
      draw();
    }
  }

  function moveRight() {
    if (gameOver) return;
    if (isValid(current.cells, current.x + 1, current.y)) {
      current.x++;
      draw();
    }
  }

  function moveDown() {
    if (gameOver) return;
    if (isValid(current.cells, current.x, current.y + 1)) {
      current.y++;
      draw();
      return true;
    }
    lock();
    draw();
    return false;
  }

  function hardDrop() {
    if (gameOver) return;
    let dist = 0;
    while (isValid(current.cells, current.x, current.y + dist + 1)) dist++;
    score += dist * 2;
    current.y += dist;
    updateStats();
    lock();
    draw();
  }

  function rotate() {
    if (gameOver) return;
    const rotated = current.cells.map(([x, y]) => [-y, x]);
    // Normalize: shift so min x/y = 0
    const minX = Math.min(...rotated.map(c => c[0]));
    const minY = Math.min(...rotated.map(c => c[1]));
    const normalized = rotated.map(([x, y]) => [x - minX, y - minY]);

    // Wall kick offsets
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (isValid(normalized, current.x + kick, current.y)) {
        current.cells = normalized;
        current.x += kick;
        draw();
        return;
      }
    }
  }

  // ---- Ghost piece (drop preview) ----
  function getGhostY() {
    let gy = current.y;
    while (isValid(current.cells, current.x, gy + 1)) gy++;
    return gy;
  }

  // ---- Rendering ----
  function draw() {
    $ctx.clearRect(0, 0, $canvas.width, $canvas.height);

    // Grid lines
    $ctx.strokeStyle = '#1a1a1a';
    $ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      $ctx.beginPath();
      $ctx.moveTo(0, r * BLOCK);
      $ctx.lineTo(COLS * BLOCK, r * BLOCK);
      $ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      $ctx.beginPath();
      $ctx.moveTo(c * BLOCK, 0);
      $ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      $ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawBlock($ctx, c, r, board[r][c]);
      }
    }

    if (!current || gameOver) return;

    // Ghost piece
    const ghostY = getGhostY();
    for (const [cx, cy] of current.cells) {
      drawBlock($ctx, cx + current.x, cy + ghostY, current.color, 0.2);
    }

    // Current piece
    for (const [cx, cy] of current.cells) {
      drawBlock($ctx, cx + current.x, cy + current.y, current.color);
    }
  }

  function drawBlock(ctx, x, y, color, alpha = 1) {
    if (y < 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, 4);
    ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, 4, BLOCK - 2);
    ctx.globalAlpha = 1;
  }

  function drawNext() {
    const p = PIECES[nextPiece];
    const cells = p.shape;
    const size = 20;
    $nextCtx.clearRect(0, 0, $nextCanvas.width, $nextCanvas.height);

    // Center the preview
    const maxX = Math.max(...cells.map(c => c[0])) + 1;
    const maxY = Math.max(...cells.map(c => c[1])) + 1;
    const offX = ($nextCanvas.width - maxX * size) / 2;
    const offY = ($nextCanvas.height - maxY * size) / 2;

    for (const [cx, cy] of cells) {
      $nextCtx.fillStyle = p.color;
      $nextCtx.fillRect(offX + cx * size + 1, offY + cy * size + 1, size - 2, size - 2);
      $nextCtx.fillStyle = 'rgba(255,255,255,0.15)';
      $nextCtx.fillRect(offX + cx * size + 1, offY + cy * size + 1, size - 2, 3);
      $nextCtx.fillRect(offX + cx * size + 1, offY + cy * size + 1, 3, size - 2);
    }
  }

  function updateStats() {
    $score.textContent = score;
    $level.textContent = level;
    $lines.textContent = lines;
  }

  // ---- Timer ----
  function resetTimer() {
    if (dropTimer) clearInterval(dropTimer);
    dropTimer = setInterval(() => { moveDown(); }, LEVEL_SPEED(level));
  }

  // ---- Game lifecycle ----
  function newGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    bag = [];
    refillBag();
    nextPiece = nextFromBag();
    $gameOver.hidden = true;
    $startOverlay.hidden = true;
    updateStats();
    spawn();
    draw();
    resetTimer();
  }

  function endGame() {
    gameOver = true;
    if (dropTimer) clearInterval(dropTimer);
    dropTimer = null;
    $finalScore.textContent = score;
    $gameOver.hidden = false;
    draw();
  }

  // ---- Keyboard ----
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); moveRight(); break;
      case 'ArrowDown':  e.preventDefault(); moveDown(); break;
      case 'ArrowUp':    e.preventDefault(); rotate(); break;
      case ' ':          e.preventDefault(); hardDrop(); break;
    }
  });

  // ---- Touch controls ----
  $btnLeft.addEventListener('click', moveLeft);
  $btnRight.addEventListener('click', moveRight);
  $btnDown.addEventListener('click', moveDown);
  $btnRotate.addEventListener('click', rotate);
  $btnDrop.addEventListener('click', hardDrop);

  // Swipe support on canvas
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  $canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  $canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 15 && absDy < 15 && dt < 300) {
      // Tap → rotate
      rotate();
      return;
    }

    if (absDx > absDy && absDx > 30) {
      if (dx > 0) moveRight(); else moveLeft();
    } else if (absDy > 30) {
      if (dy > 0) moveDown(); else hardDrop();
    }
  }, { passive: true });

  // ---- Help modal ----
  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => { if (e.target === $helpModal) $helpModal.close(); });

  // ---- New game / Retry / Start ----
  $btnNew.addEventListener('click', newGame);
  $btnRetry.addEventListener('click', newGame);
  $btnStart.addEventListener('click', newGame);

  // ---- Initial state (show empty board) ----
  board = createBoard();
  draw();
})();
