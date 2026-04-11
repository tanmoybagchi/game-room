import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'gameroom-nonogram';

  const $board = document.getElementById('board');
  const $sizeSelect = document.getElementById('size-select');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnMark = document.getElementById('btn-mark-mode');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');
  const $winOverlay = document.getElementById('win-overlay');
  const $btnPlayAgain = document.getElementById('btn-play-again');

  let size = 10;
  let solution = [];   // 2D boolean array – true = filled
  let playerGrid = []; // 2D: 0 = empty, 1 = filled, 2 = marked-X
  let rowClues = [];
  let colClues = [];
  let markMode = false;
  let gameOver = false;
  let isDragging = false;
  let dragAction = null; // 'fill', 'mark', or 'clear'

  /* ===== Puzzle generation ===== */

  function generatePuzzle(n) {
    // Generate a random pattern with ~40-60% fill rate for interesting puzzles
    const fillRate = 0.4 + Math.random() * 0.2;
    const grid = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Math.random() < fillRate)
    );

    // Ensure no completely empty rows or columns
    for (let r = 0; r < n; r++) {
      if (grid[r].every(c => !c)) {
        grid[r][Math.floor(Math.random() * n)] = true;
      }
    }
    for (let c = 0; c < n; c++) {
      if (grid.every(row => !row[c])) {
        grid[Math.floor(Math.random() * n)][c] = true;
      }
    }

    return grid;
  }

  function computeClues(grid, n) {
    const rows = [];
    const cols = [];

    for (let r = 0; r < n; r++) {
      const clue = [];
      let run = 0;
      for (let c = 0; c < n; c++) {
        if (grid[r][c]) {
          run++;
        } else if (run > 0) {
          clue.push(run);
          run = 0;
        }
      }
      if (run > 0) clue.push(run);
      rows.push(clue.length ? clue : [0]);
    }

    for (let c = 0; c < n; c++) {
      const clue = [];
      let run = 0;
      for (let r = 0; r < n; r++) {
        if (grid[r][c]) {
          run++;
        } else if (run > 0) {
          clue.push(run);
          run = 0;
        }
      }
      if (run > 0) clue.push(run);
      cols.push(clue.length ? clue : [0]);
    }

    return { rows, cols };
  }

  /* ===== Check if a row/col is satisfied ===== */

  function getRowRuns(r) {
    const runs = [];
    let run = 0;
    for (let c = 0; c < size; c++) {
      if (playerGrid[r][c] === 1) {
        run++;
      } else if (run > 0) {
        runs.push(run);
        run = 0;
      }
    }
    if (run > 0) runs.push(run);
    return runs.length ? runs : [0];
  }

  function getColRuns(c) {
    const runs = [];
    let run = 0;
    for (let r = 0; r < size; r++) {
      if (playerGrid[r][c] === 1) {
        run++;
      } else if (run > 0) {
        runs.push(run);
        run = 0;
      }
    }
    if (run > 0) runs.push(run);
    return runs.length ? runs : [0];
  }

  function cluesMatch(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  /* ===== Check win ===== */

  function checkWin() {
    for (let r = 0; r < size; r++) {
      if (!cluesMatch(getRowRuns(r), rowClues[r])) return false;
    }
    for (let c = 0; c < size; c++) {
      if (!cluesMatch(getColRuns(c), colClues[c])) return false;
    }
    return true;
  }

  /* ===== Render ===== */

  function render() {
    $board.innerHTML = '';

    const maxRowClueLen = Math.max(...rowClues.map(c => c.length));
    const maxColClueLen = Math.max(...colClues.map(c => c.length));

    // Column clue rows
    for (let cr = 0; cr < maxColClueLen; cr++) {
      const tr = document.createElement('tr');
      // Corner spacers
      for (let i = 0; i < maxRowClueLen; i++) {
        const td = document.createElement('td');
        td.className = 'corner-spacer';
        tr.appendChild(td);
      }
      // Column clue cells
      for (let c = 0; c < size; c++) {
        const td = document.createElement('td');
        td.className = 'clue-cell col-clue';
        const clue = colClues[c];
        const offset = maxColClueLen - clue.length;
        if (cr >= offset) {
          td.textContent = clue[cr - offset];
        }
        // Check if column is satisfied
        if (cluesMatch(getColRuns(c), colClues[c])) {
          td.classList.add('satisfied');
        }
        td.dataset.col = c;
        tr.appendChild(td);
      }
      $board.appendChild(tr);
    }

    // Grid rows
    for (let r = 0; r < size; r++) {
      const tr = document.createElement('tr');

      // Row clue cells
      for (let i = 0; i < maxRowClueLen; i++) {
        const td = document.createElement('td');
        td.className = 'clue-cell row-clue';
        const clue = rowClues[r];
        const offset = maxRowClueLen - clue.length;
        if (i >= offset) {
          td.textContent = clue[i - offset];
        }
        if (cluesMatch(getRowRuns(r), rowClues[r])) {
          td.classList.add('satisfied');
        }
        td.dataset.row = r;
        tr.appendChild(td);
      }

      // Grid cells
      for (let c = 0; c < size; c++) {
        const td = document.createElement('td');
        td.className = 'nono-cell';
        td.dataset.row = r;
        td.dataset.col = c;

        if (playerGrid[r][c] === 1) td.classList.add('filled');
        else if (playerGrid[r][c] === 2) td.classList.add('marked');

        // 5-cell group borders
        if ((c + 1) % 5 === 0 && c < size - 1) td.classList.add('border-right');
        if ((r + 1) % 5 === 0 && r < size - 1) td.classList.add('border-bottom');

        tr.appendChild(td);
      }
      $board.appendChild(tr);
    }
  }

  /* ===== Cell interaction ===== */

  function handleCellAction(r, c, forceAction) {
    if (gameOver) return;

    const current = playerGrid[r][c];
    let action = forceAction || dragAction;

    if (!action) {
      // Determine action based on current state and mode
      if (markMode) {
        action = current === 2 ? 'clear' : 'mark';
      } else {
        action = current === 1 ? 'clear' : 'fill';
      }
    }

    if (action === 'fill') {
      playerGrid[r][c] = playerGrid[r][c] === 1 ? 0 : 1;
    } else if (action === 'mark') {
      playerGrid[r][c] = playerGrid[r][c] === 2 ? 0 : 2;
    } else if (action === 'clear') {
      playerGrid[r][c] = 0;
    }

    render();
    saveState();

    if (checkWin()) {
      gameOver = true;
      showWinOverlay($winOverlay);
    }
  }

  function getCellFromEvent(e) {
    const target = e.target.closest('.nono-cell');
    if (!target) return null;
    return {
      r: parseInt(target.dataset.row),
      c: parseInt(target.dataset.col)
    };
  }

  /* ===== Event handlers ===== */

  $board.addEventListener('pointerdown', (e) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    e.preventDefault();
    isDragging = true;

    const current = playerGrid[cell.r][cell.c];
    // Set drag action
    if (markMode) {
      dragAction = current === 2 ? 'clear' : 'mark';
    } else {
      dragAction = current === 1 ? 'clear' : 'fill';
    }

    handleCellAction(cell.r, cell.c, dragAction);
  });

  $board.addEventListener('pointerover', (e) => {
    if (!isDragging) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    handleCellAction(cell.r, cell.c, dragAction);
  });

  document.addEventListener('pointerup', () => {
    isDragging = false;
    dragAction = null;
  });

  // Right-click to mark
  $board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const current = playerGrid[cell.r][cell.c];
    handleCellAction(cell.r, cell.c, current === 2 ? 'clear' : 'mark');
  });

  // Mark mode toggle
  $btnMark.addEventListener('click', () => {
    markMode = !markMode;
    $btnMark.classList.toggle('active', markMode);
  });

  // Size select
  $sizeSelect.addEventListener('change', () => {
    size = parseInt($sizeSelect.value);
    newGame();
  });

  // New game
  $btnNew.addEventListener('click', () => newGame());

  // Help
  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => {
    if (e.target === $helpModal) $helpModal.close();
  });

  // Play again
  $btnPlayAgain.addEventListener('click', () => {
    hideWinOverlay($winOverlay);
    newGame();
  });

  /* ===== Save / Load ===== */

  function saveState() {
    const state = { size, solution, playerGrid, rowClues, colClues };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw);
      if (!state.size || !state.solution || !state.playerGrid) return false;
      size = state.size;
      solution = state.solution;
      playerGrid = state.playerGrid;
      rowClues = state.rowClues;
      colClues = state.colClues;
      $sizeSelect.value = String(size);
      return true;
    } catch {
      return false;
    }
  }

  /* ===== New game ===== */

  function newGame() {
    gameOver = false;
    hideWinOverlay($winOverlay);

    solution = generatePuzzle(size);
    const clues = computeClues(solution, size);
    rowClues = clues.rows;
    colClues = clues.cols;

    playerGrid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 0)
    );

    render();
    saveState();
  }

  /* ===== Init ===== */

  function init() {
    if (!loadState()) {
      newGame();
    } else {
      if (checkWin()) {
        newGame();
      } else {
        render();
      }
    }
  }

  init();
})();
