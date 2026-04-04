import { cascadeAnimation } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'gameroom-2048';
  const SIZE = 4;
  const $board = document.getElementById('board');
  const $tiles = document.getElementById('tiles');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');
  const $gameOverOverlay = document.getElementById('game-over-overlay');
  const $btnRetry = document.getElementById('btn-retry');
  const $winToast = document.getElementById('win-toast');

  let grid, won, moving;

  // Build background grid
  const $gridBg = $board.querySelector('.grid-bg');
  $gridBg.innerHTML = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    $gridBg.appendChild(cell);
  }

  function init() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    won = false;
    moving = false;
    $gameOverOverlay.hidden = true;
    $winToast.hidden = true;
    addRandom();
    addRandom();
    render();
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) empty.push([r, c]);
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return [r, c];
  }

  function getMetrics() {
    const boardRect = $board.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle($board).paddingLeft);
    const gap = pad;
    const cellSize = (boardRect.width - pad * 2 - gap * (SIZE - 1)) / SIZE;
    return { pad, gap, cellSize };
  }

  function render() {
    $tiles.innerHTML = '';
    const { pad, gap, cellSize } = getMetrics();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) continue;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.value = grid[r][c];
        tile.textContent = grid[r][c];
        tile.style.width = cellSize + 'px';
        tile.style.height = cellSize + 'px';
        tile.style.fontSize = cellSize * 0.4 + 'px';
        tile.style.left = (c * (cellSize + gap)) + 'px';
        tile.style.top = (r * (cellSize + gap)) + 'px';
        $tiles.appendChild(tile);
      }
    }
  }

  function slide(row) {
    let arr = row.filter(v => v !== 0);
    const merged = [];
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        merged.push(arr[i]);
        arr[i + 1] = 0;
      }
    }
    arr = arr.filter(v => v !== 0);
    while (arr.length < SIZE) arr.push(0);
    return { result: arr, merged };
  }

  function move(direction) {
    if (moving) return false;
    const prev = grid.map(r => [...r]);
    let moved = false;

    if (direction === 'left' || direction === 'right') {
      for (let r = 0; r < SIZE; r++) {
        let row = [...grid[r]];
        if (direction === 'right') row.reverse();
        const { result } = slide(row);
        if (direction === 'right') result.reverse();
        grid[r] = result;
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        let col = grid.map(r => r[c]);
        if (direction === 'down') col.reverse();
        const { result } = slide(col);
        if (direction === 'down') result.reverse();
        for (let r = 0; r < SIZE; r++) grid[r][c] = result[r];
      }
    }

    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] !== prev[r][c]) moved = true;

    if (moved) {
      moving = true;
      const newCell = addRandom();
      render();
      // Mark new tile
      if (newCell) {
        const { gap, cellSize } = getMetrics();
        const tiles = $tiles.querySelectorAll('.tile');
        tiles.forEach(t => {
          const tl = parseFloat(t.style.left);
          const tt = parseFloat(t.style.top);
          const tr = Math.round(tt / (cellSize + gap));
          const tc = Math.round(tl / (cellSize + gap));
          if (tr === newCell[0] && tc === newCell[1]) {
            t.classList.add('new');
          }
        });
      }
      setTimeout(() => { moving = false; }, 130);

      if (!won && grid.some(r => r.some(v => v === 2048))) {
        won = true;
        $winToast.hidden = false;
        cascadeAnimation();
        setTimeout(() => { $winToast.hidden = true; }, 2200);
      }
      if (isGameOver()) {
        $gameOverOverlay.hidden = false;
        localStorage.removeItem(STORAGE_KEY);
      }
      saveState();
    }
    return moved;
  }

  function isGameOver() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return false;
        if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
        if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
      }
    return true;
  }

  // ---- Keyboard ----
  document.addEventListener('keydown', (e) => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]);
    }
  });

  // ---- Touch/swipe ----
  let startX, startY;

  $board.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  $board.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 30) return;
    e.preventDefault();
    if (absX > absY) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  });

  // Mouse fallback for desktop
  $board.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
  });

  $board.addEventListener('mouseup', (e) => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 20) return;
    if (absX > absY) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  });

  // ---- UI ----
  $btnNew.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });
  $btnRetry.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });

  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => {
    if (e.target === $helpModal) $helpModal.close();
  });

  // ---- Save / Load ----
  function saveState() {
    if (isGameOver()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, won }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      grid = data.grid;

      won = data.won || false;
      moving = false;
      $gameOverOverlay.hidden = true;
      $winToast.hidden = true;
      render();
      return true;
    } catch { return false; }
  }

  if (!loadState()) init();
})();
