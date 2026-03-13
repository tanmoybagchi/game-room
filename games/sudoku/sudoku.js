// ============================================================
// Sudoku — Engine + UI
// ============================================================

import {
  saveToStorage, loadFromStorage, clearStorage,
  wireHelpModal
} from '../../js/shared/card-engine.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'sudoku_save';

  // ---- Difficulty: number of given cells ----
  const GIVENS = { easy: 42, medium: 32, hard: 26, expert: 22 };

  // ---- DOM refs ----
  const $grid = document.getElementById('grid');
  const $numPad = document.getElementById('number-pad');
  const $btnUndo = document.getElementById('btn-undo');
  const $btnNewGame = document.getElementById('btn-new-game');
  const $btnPlayAgain = document.getElementById('btn-play-again');
  const $btnNotes = document.getElementById('btn-notes');
  const $btnErase = document.getElementById('btn-erase');
  const $difficulty = document.getElementById('difficulty');
  const $winOverlay = document.getElementById('win-overlay');

  // ---- State ----
  let puzzle = [];    // 81-length: 0 = blank, 1-9 = given
  let solution = [];  // 81-length: the complete solution
  let board = [];     // 81-length: current player values (0 = empty)
  let notes = [];     // 81-length: each is a Set of candidate numbers
  let given = [];     // 81-length: boolean, true if cell is a given
  let selected = -1;  // index of selected cell
  let notesMode = false;
  let history = [];
  let difficulty = 'medium';

  // ============================================================
  // Puzzle generation
  // ============================================================

  function generateSolution() {
    const grid = new Array(81).fill(0);
    fillGrid(grid);
    return grid;
  }

  function fillGrid(grid) {
    const empty = grid.indexOf(0);
    if (empty === -1) return true;
    const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const n of nums) {
      if (isValid(grid, empty, n)) {
        grid[empty] = n;
        if (fillGrid(grid)) return true;
        grid[empty] = 0;
      }
    }
    return false;
  }

  function isValid(grid, idx, num) {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    // Check row
    for (let c = 0; c < 9; c++) {
      if (grid[row * 9 + c] === num) return false;
    }
    // Check col
    for (let r = 0; r < 9; r++) {
      if (grid[r * 9 + col] === num) return false;
    }
    // Check 3x3 box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (grid[r * 9 + c] === num) return false;
      }
    }
    return true;
  }

  function generatePuzzle(diff) {
    solution = generateSolution();
    puzzle = [...solution];
    const numGivens = GIVENS[diff] || GIVENS.medium;
    const numToRemove = 81 - numGivens;

    // Create shuffled list of all cell indices
    const indices = shuffleArray([...Array(81).keys()]);
    let removed = 0;

    for (const idx of indices) {
      if (removed >= numToRemove) break;
      const backup = puzzle[idx];
      puzzle[idx] = 0;

      // Check unique solution for harder levels
      if (diff === 'hard' || diff === 'expert') {
        if (countSolutions([...puzzle], 2) !== 1) {
          puzzle[idx] = backup; // restore — not unique
          continue;
        }
      }
      removed++;
    }
  }

  function countSolutions(grid, limit) {
    const empty = grid.indexOf(0);
    if (empty === -1) return 1;
    let count = 0;
    for (let n = 1; n <= 9; n++) {
      if (isValid(grid, empty, n)) {
        grid[empty] = n;
        count += countSolutions(grid, limit);
        grid[empty] = 0;
        if (count >= limit) return count;
      }
    }
    return count;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ============================================================
  // Game logic
  // ============================================================

  function newGame() {
    difficulty = $difficulty.value;
    generatePuzzle(difficulty);
    board = [...puzzle];
    given = puzzle.map(v => v !== 0);
    notes = Array.from({ length: 81 }, () => new Set());
    selected = -1;
    notesMode = false;
    history = [];
    $btnNotes.classList.remove('active');
    $winOverlay.hidden = true;
    render();
    saveState();
  }

  function pushHistory() {
    history.push({
      board: [...board],
      notes: notes.map(s => new Set(s))
    });
    if (history.length > 200) history.shift();
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history.pop();
    board = prev.board;
    notes = prev.notes;
    render();
    saveState();
  }

  function placeNumber(num) {
    if (selected < 0 || given[selected]) return;

    if (notesMode) {
      pushHistory();
      if (board[selected] !== 0) {
        board[selected] = 0; // clear main value to show notes
      }
      if (notes[selected].has(num)) {
        notes[selected].delete(num);
      } else {
        notes[selected].add(num);
      }
    } else {
      pushHistory();
      // Toggle: if same number, clear it
      if (board[selected] === num) {
        board[selected] = 0;
      } else {
        board[selected] = num;
        notes[selected].clear();
      }
    }

    render();
    saveState();
    checkWin();
  }

  function eraseCell() {
    if (selected < 0 || given[selected]) return;
    if (board[selected] === 0 && notes[selected].size === 0) return;
    pushHistory();
    board[selected] = 0;
    notes[selected].clear();
    render();
    saveState();
  }

  // ---- Conflict detection ----
  function getConflicts() {
    const errors = new Set();
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) continue;
      const peers = getPeers(i);
      for (const p of peers) {
        if (board[p] === board[i]) {
          errors.add(i);
          errors.add(p);
        }
      }
    }
    return errors;
  }

  function getPeers(idx) {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    const peers = [];
    for (let c = 0; c < 9; c++) {
      const i = row * 9 + c;
      if (i !== idx) peers.push(i);
    }
    for (let r = 0; r < 9; r++) {
      const i = r * 9 + col;
      if (i !== idx) peers.push(i);
    }
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        const i = r * 9 + c;
        if (i !== idx) peers.push(i);
      }
    }
    return [...new Set(peers)];
  }

  function getSameRowColBox(idx) {
    return new Set(getPeers(idx));
  }

  // ---- Win check ----
  function checkWin() {
    if (board.some(v => v === 0)) return;
    if (getConflicts().size > 0) return;
    $winOverlay.hidden = false;
  }

  // ============================================================
  // Rendering
  // ============================================================

  function render() {
    renderGrid();
    renderNumPad();
    $btnUndo.disabled = history.length === 0;
  }

  function renderGrid() {
    $grid.innerHTML = '';
    const errors = getConflicts();
    const selectedNum = selected >= 0 ? board[selected] : 0;
    const highlightSet = selected >= 0 ? getSameRowColBox(selected) : new Set();

    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = i;

      if (given[i]) cell.classList.add('given');
      else if (board[i] !== 0) cell.classList.add('player');

      if (i === selected) cell.classList.add('selected');
      else if (selectedNum && board[i] === selectedNum) cell.classList.add('same-number');
      else if (highlightSet.has(i)) cell.classList.add('same-row-col-box');

      if (errors.has(i)) cell.classList.add('error');

      if (board[i] !== 0) {
        cell.textContent = board[i];
      } else if (notes[i].size > 0) {
        const notesDiv = document.createElement('div');
        notesDiv.className = 'notes';
        for (let n = 1; n <= 9; n++) {
          const sp = document.createElement('span');
          sp.textContent = notes[i].has(n) ? n : '';
          notesDiv.appendChild(sp);
        }
        cell.appendChild(notesDiv);
      }

      cell.addEventListener('click', () => {
        selected = (selected === i) ? -1 : i;
        render();
      });

      $grid.appendChild(cell);
    }
  }

  function renderNumPad() {
    $numPad.innerHTML = '';
    // Count how many of each digit are placed
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) {
      if (board[i] > 0) counts[board[i]]++;
    }
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = n;
      if (counts[n] >= 9) btn.classList.add('completed');
      btn.addEventListener('click', () => placeNumber(n));
      $numPad.appendChild(btn);
    }
  }

  // ============================================================
  // Event wiring
  // ============================================================

  $btnNotes.addEventListener('click', () => {
    notesMode = !notesMode;
    $btnNotes.classList.toggle('active', notesMode);
  });

  $btnErase.addEventListener('click', eraseCell);
  $btnUndo.addEventListener('click', undo);
  $btnNewGame.addEventListener('click', () => { clearStorage(STORAGE_KEY); newGame(); });
  $btnPlayAgain.addEventListener('click', () => { clearStorage(STORAGE_KEY); newGame(); });
  $difficulty.addEventListener('change', () => { clearStorage(STORAGE_KEY); newGame(); });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (selected < 0) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      placeNumber(num);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      eraseCell();
      return;
    }
    // Arrow key navigation
    const row = Math.floor(selected / 9);
    const col = selected % 9;
    if (e.key === 'ArrowUp' && row > 0) { selected -= 9; render(); }
    else if (e.key === 'ArrowDown' && row < 8) { selected += 9; render(); }
    else if (e.key === 'ArrowLeft' && col > 0) { selected -= 1; render(); }
    else if (e.key === 'ArrowRight' && col < 8) { selected += 1; render(); }
  });

  wireHelpModal(
    document.getElementById('btn-help'),
    document.getElementById('btn-help-close'),
    document.getElementById('help-modal')
  );

  // ============================================================
  // Persistence
  // ============================================================

  function saveState() {
    saveToStorage(STORAGE_KEY, {
      puzzle, solution, board, given, difficulty, history,
      notes: notes.map(s => [...s])
    });
  }

  function loadState() {
    const data = loadFromStorage(STORAGE_KEY);
    if (!data || !data.puzzle || !data.board) return false;
    puzzle = data.puzzle;
    solution = data.solution;
    board = data.board;
    given = data.given;
    difficulty = data.difficulty || 'medium';
    history = data.history || [];
    notes = (data.notes || []).map(arr => new Set(arr));
    if (notes.length !== 81) notes = Array.from({ length: 81 }, () => new Set());
    $difficulty.value = difficulty;
    return true;
  }

  // ---- Init ----
  if (!loadState()) {
    newGame();
  } else {
    render();
  }
})();
