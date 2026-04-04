// ============================================================
// TriPeaks Solitaire — Engine + UI
// ============================================================

import {
  RANKS, RANK_VALUES,
  createDeck, shuffle,
  createCardEl, cascadeAnimation,
  clearSelection as clearSelectionUI,
  saveToStorage, loadFromStorage, clearStorage,
  cloneGameState, pushToHistory, showWinOverlay, hideWinOverlay,
  wireGameControls
} from '../../js/shared/card-engine.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'tripeaks_save';

  /*
    TriPeaks layout — 4 rows, 28 cards total:
    Row 0 (3 peaks):    positions 0,3,6        → 3 face-down
    Row 1 (6 cards):    positions 0..5          → 6 face-down
    Row 2 (9 cards):    positions 0..8          → 9 face-down
    Row 3 (10 cards):   positions 0..9          → 10 face-up

    Coverage: a card at [row][col] is covered by [row+1][col] and [row+1][col+1]
    (with adjustments for the 3-peak structure)

    We store cards in a flat structure mapping (row,col) to card,
    using the standard TriPeaks layout.
  */

  // Layout definition: for each row, the column indices that have cards
  const LAYOUT = [
    [0, 3, 6],             // row 0: peaks
    [0, 1, 3, 4, 6, 7],    // row 1
    [0, 1, 2, 3, 4, 5, 6, 7, 8], // row 2
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] // row 3
  ];

  // Children of (row, col): which cards in the next row cover this card
  // A card is exposed when ALL children are removed
  function getChildren(row, col) {
    if (row >= 3) return []; // bottom row has no children
    if (row === 0) {
      // Peak cards: col 0 → children at row1: (0,1), col 3 → (3,4), col 6 → (6,7)
      return [[row + 1, col], [row + 1, col + 1]];
    }
    // Row 1 and 2: children at (row+1, col) and (row+1, col+1)
    return [[row + 1, col], [row + 1, col + 1]];
  }

  // ---- DOM refs ----
  const $board = document.getElementById('game-board');
  const $peaks = document.getElementById('peaks');
  const $stock = document.getElementById('stock');
  const $waste = document.getElementById('waste');
  const $btnUndo = document.getElementById('btn-undo');
  const $btnNewGame = document.getElementById('btn-new-game');
  const $btnPlayAgain = document.getElementById('btn-play-again');
  const $winOverlay = document.getElementById('win-overlay');

  // ---- Game state ----
  let state = null;
  let history = [];
  let moveCount = 0;

  // state.board[row][col] = card | null
  // state.stock = [cards], state.waste = [cards]

  function newGame() {
    const deck = shuffle(createDeck(true));
    state = {
      board: [[], [], [], []],
      stock: [],
      waste: []
    };

    let di = 0;
    for (let row = 0; row < 4; row++) {
      // Initialize row with nulls for all possible column positions
      const maxCol = LAYOUT[row][LAYOUT[row].length - 1];
      state.board[row] = new Array(maxCol + 1).fill(null);
      for (const col of LAYOUT[row]) {
        const card = deck[di++];
        card.faceUp = (row === 3); // only bottom row face-up
        state.board[row][col] = card;
      }
    }

    // Remaining cards go to stock
    state.stock = deck.slice(di).reverse();
    state.stock.forEach(c => { c.faceUp = false; });

    // Turn over first waste card
    const firstWaste = state.stock.pop();
    firstWaste.faceUp = true;
    state.waste = [firstWaste];

    history = [];
    moveCount = 0;
    hideWinOverlay($winOverlay);
    render();
    saveState();
  }

  function pushHist() {
    pushToHistory(history, state, moveCount);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history.pop();
    state = prev.state;
    moveCount = prev.moveCount;
    render();
    saveState();
  }

  // ---- Exposure check ----
  function isExposed(row, col) {
    const card = state.board[row][col];
    if (!card) return false;
    if (row === 3) return true;
    const children = getChildren(row, col);
    return children.every(([r, c]) => !state.board[r][c]);
  }

  // ---- Move logic ----
  function canPlay(card) {
    if (!card || state.waste.length === 0) return false;
    const wasteTop = state.waste[state.waste.length - 1];
    const cardVal = RANK_VALUES[card.rank];
    const wasteVal = RANK_VALUES[wasteTop.rank];
    const diff = Math.abs(cardVal - wasteVal);
    // Wrap: A(0) and K(12) are adjacent
    return diff === 1 || diff === 12;
  }

  function playCard(row, col) {
    const card = state.board[row][col];
    if (!card || !isExposed(row, col) || !canPlay(card)) return;
    pushHist();
    state.board[row][col] = null;
    card.faceUp = true;
    state.waste.push(card);
    // Flip newly exposed cards
    flipExposed();
    moveCount++;
    render();
    saveState();
    checkWin();
  }

  function drawStock() {
    if (state.stock.length === 0 && state.waste.length <= 1) return;
    pushHist();
    if (state.stock.length === 0) {
      // Recycle waste back to stock
      state.stock = state.waste.reverse();
      state.stock.forEach(c => c.faceUp = false);
      state.waste = [];
      moveCount++;
      render();
      saveState();
      return;
    }
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
    moveCount++;
    render();
    saveState();
  }

  function flipExposed() {
    for (let row = 0; row < 4; row++) {
      for (const col of LAYOUT[row]) {
        const card = state.board[row][col];
        if (card && !card.faceUp && isExposed(row, col)) {
          card.faceUp = true;
        }
      }
    }
  }

  // ---- Win detection ----
  function checkWin() {
    const allClear = state.board.every(row => row.every(c => c === null));
    if (allClear) showWinOverlay($winOverlay);
  }

  // ---- Rendering ----
  function render() {
    renderPeaks();
    renderStock();
    renderWaste();
    $btnUndo.disabled = history.length === 0;
  }

  function renderPeaks() {
    $peaks.innerHTML = '';
    for (let row = 0; row < 4; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'peak-row';
      const maxCol = LAYOUT[row][LAYOUT[row].length - 1];
      for (let col = 0; col <= maxCol; col++) {
        const slot = document.createElement('div');
        slot.className = 'peak-slot';
        if (!LAYOUT[row].includes(col)) {
          // Empty spacer slot
          slot.style.visibility = 'hidden';
          rowEl.appendChild(slot);
          continue;
        }
        const card = state.board[row][col];
        if (card) {
          const exposed = isExposed(row, col);
          const el = createCardEl(card);
          el.style.position = 'absolute';
          el.style.top = '0';
          el.style.left = '0';
          if (exposed && canPlay(card)) {
            el.classList.add('playable');
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              playCard(row, col);
            });
          } else if (!exposed) {
            el.classList.add('blocked');
          }
          el.draggable = false;
          slot.appendChild(el);
        } else {
          slot.classList.add('removed');
        }
        rowEl.appendChild(slot);
      }
      $peaks.appendChild(rowEl);
    }
  }

  function renderStock() {
    $stock.innerHTML = '';
    $stock.classList.toggle('has-cards', state.stock.length > 0);
    if (state.stock.length > 0) {
      const el = createCardEl({ suit: 'spades', rank: '', faceUp: false });
      el.draggable = false;
      el.style.top = '0';
      $stock.appendChild(el);
    }
  }

  function renderWaste() {
    $waste.innerHTML = '';
    $waste.classList.toggle('has-cards', state.waste.length > 0);
    if (state.waste.length > 0) {
      const card = state.waste[state.waste.length - 1];
      const el = createCardEl(card);
      el.style.top = '0';
      el.draggable = false;
      $waste.appendChild(el);
    }
  }

  // ---- Click handling ----
  $board.addEventListener('click', (e) => {
    const pileEl = e.target.closest('.pile');
    if (pileEl === $stock || e.target.closest('.stock-pile')) {
      drawStock();
    }
  });

  // ---- Persistence ----
  function saveState() {
    saveToStorage(STORAGE_KEY, { state, history, moveCount });
  }

  function loadState() {
    const data = loadFromStorage(STORAGE_KEY);
    if (!data || !data.state || !data.state.board) return false;
    state = data.state;
    history = data.history || [];
    moveCount = data.moveCount || 0;
    return true;
  }

  function clearSave() { clearStorage(STORAGE_KEY); }

  // ---- Init ----
  wireGameControls({
    $btnUndo, $btnNewGame, $btnPlayAgain,
    undo, newGame, clearSave, loadState, render
  });
})();
