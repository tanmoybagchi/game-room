import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'gameroom-minesweeper';

  const ROWS = 10, COLS = 10, MINE_TOTAL = 15;

  const $board = document.getElementById('board');
  const $mineCount = document.getElementById('mine-count');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnFlag = document.getElementById('btn-flag-mode');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');
  const $winOverlay = document.getElementById('win-overlay');
  const $gameOverOverlay = document.getElementById('game-over-overlay');
  const $btnTryAgain = document.getElementById('btn-try-again');
  const $btnPlayAgain = document.getElementById('btn-play-again');

  let grid, rows, cols, mineTotal, flagCount, revealedCount, gameOver, firstClick;
  let flagMode;

  function init() {
    rows = ROWS;
    cols = COLS;
    mineTotal = MINE_TOTAL;
    flagCount = 0;
    revealedCount = 0;
    gameOver = false;
    firstClick = true;
    flagMode = false;
    $btnFlag.classList.remove('active');
    hideWinOverlay($winOverlay);
    $gameOverOverlay.hidden = true;

    grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        mine: false, revealed: false, flagged: false, adjacent: 0
      }))
    );

    $board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    render();
    updateMineCount();
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < mineTotal) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (grid[r][c].mine) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      grid[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].mine) continue;
        grid[r][c].adjacent = neighbors(r, c).filter(([nr, nc]) => grid[nr][nc].mine).length;
      }
    }
  }

  function neighbors(r, c) {
    const result = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc]);
      }
    }
    return result;
  }

  function reveal(r, c) {
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged || gameOver) return;
    cell.revealed = true;
    revealedCount++;

    if (cell.mine) {
      cell.hit = true;
      gameOver = true;
      revealAllMines();
      render();
      $gameOverOverlay.hidden = false;
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (cell.adjacent === 0) {
      neighbors(r, c).forEach(([nr, nc]) => reveal(nr, nc));
    }

    if (revealedCount === rows * cols - mineTotal) {
      gameOver = true;
      showWinOverlay($winOverlay);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function toggleFlag(r, c) {
    const cell = grid[r][c];
    if (cell.revealed || gameOver) return;
    cell.flagged = !cell.flagged;
    flagCount += cell.flagged ? 1 : -1;
    updateMineCount();
    render();
  }

  function revealAllMines() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].mine) grid[r][c].revealed = true;
      }
    }
  }

  function updateMineCount() {
    $mineCount.textContent = `💣 ${mineTotal - flagCount}`;
  }

  function render() {
    $board.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const el = document.createElement('div');
        el.className = 'cell';
        el.dataset.row = r;
        el.dataset.col = c;

        if (cell.revealed) {
          el.classList.add('revealed');
          if (cell.mine) {
            el.classList.add(cell.hit ? 'mine-hit' : 'mine');
            el.textContent = '💣';
          } else if (cell.adjacent > 0) {
            el.textContent = cell.adjacent;
            el.dataset.num = cell.adjacent;
          }
        } else if (cell.flagged) {
          el.classList.add('flagged');
          el.textContent = '🚩';
        }

        $board.appendChild(el);
      }
    }
  }

  // ---- Event handling ----
  let longPressTimer = null;
  let longPressed = false;

  $board.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.cell');
    if (!el) return;
    longPressed = false;
    longPressTimer = setTimeout(() => {
      longPressed = true;
      const r = parseInt(el.dataset.row);
      const c = parseInt(el.dataset.col);
      toggleFlag(r, c);
    }, 400);
  });

  $board.addEventListener('pointerup', (e) => {
    clearTimeout(longPressTimer);
    if (longPressed) return;
    const el = e.target.closest('.cell');
    if (!el) return;
    const r = parseInt(el.dataset.row);
    const c = parseInt(el.dataset.col);

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
    }

    if (flagMode) {
      toggleFlag(r, c);
    } else {
      reveal(r, c);
      render();
    }
    saveState();
  });

  $board.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
  $board.addEventListener('contextmenu', (e) => e.preventDefault());

  $btnFlag.addEventListener('click', () => {
    flagMode = !flagMode;
    $btnFlag.classList.toggle('active', flagMode);
  });

  $btnNew.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });

  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => {
    if (e.target === $helpModal) $helpModal.close();
  });

  $btnPlayAgain.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });
  $btnTryAgain.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });

  // ---- Save / Load ----
  function saveState() {
    if (gameOver || firstClick) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      grid, rows, cols, mineTotal, flagCount, revealedCount
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      rows = data.rows;
      cols = data.cols;
      mineTotal = data.mineTotal;
      flagCount = data.flagCount;
      revealedCount = data.revealedCount;
      grid = data.grid;
      gameOver = false;
      firstClick = false;
      flagMode = false;
      $btnFlag.classList.remove('active');
      hideWinOverlay($winOverlay);
      $board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      updateMineCount();
      render();
      return true;
    } catch { return false; }
  }

  if (!loadState()) init();
})();
