// ============================================================
// Pyramid Solitaire — Engine + UI
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

  const STORAGE_KEY = 'pyramid_save';
  const ROWS = 7;
  const PYRAMID_CARD_VALUE = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

  // ---- DOM refs ----
  const $board = document.getElementById('game-board');
  const $stock = document.getElementById('stock');
  const $waste = document.getElementById('waste');
  const $pyramid = document.getElementById('pyramid');
  const $btnUndo = document.getElementById('btn-undo');
  const $btnNewGame = document.getElementById('btn-new-game');
  const $btnPlayAgain = document.getElementById('btn-play-again');
  const $winOverlay = document.getElementById('win-overlay');

  // ---- Game state ----
  let state = null;
  let history = [];
  let moveCount = 0;
  let selectedCard = null; // { location, row, col } or { location: 'waste' }

  // ---- State management ----
  function newGame() {
    const deck = shuffle(createDeck(true));
    state = {
      pyramid: [], // 2D array [row][col], null = removed
      stock: [],
      waste: []
    };

    let di = 0;
    for (let row = 0; row < ROWS; row++) {
      state.pyramid[row] = [];
      for (let col = 0; col <= row; col++) {
        state.pyramid[row][col] = deck[di++];
      }
    }

    state.stock = deck.slice(di).reverse();
    state.stock.forEach(c => c.faceUp = false);

    history = [];
    moveCount = 0;
    selectedCard = null;
    clearSel();
    hideWinOverlay($winOverlay);
    render();
    saveState();
  }

  function cloneState() { return cloneGameState(state); }

  function pushHistory() {
    pushToHistory(history, state, moveCount);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history.pop();
    state = prev.state;
    moveCount = prev.moveCount;
    selectedCard = null;
    clearSel();
    render();
    saveState();
  }

  // ---- Card exposure check ----
  function isExposed(row, col) {
    if (!state.pyramid[row][col]) return false;
    if (row === ROWS - 1) return true;
    const left = state.pyramid[row + 1][col];
    const right = state.pyramid[row + 1][col + 1];
    return !left && !right;
  }

  // ---- Pairing logic ----
  function cardValue(card) {
    return PYRAMID_CARD_VALUE[card.rank];
  }

  function tryPair(a, b) {
    // a and b are card objects, check if they sum to 13
    if (!a || !b) return false;
    return cardValue(a) + cardValue(b) === 13;
  }

  function removeCard(location, row, col) {
    if (location === 'pyramid') {
      state.pyramid[row][col] = null;
    } else if (location === 'waste') {
      state.waste.pop();
    }
  }

  function getCard(loc) {
    if (loc.location === 'pyramid') return state.pyramid[loc.row][loc.col];
    if (loc.location === 'waste') return state.waste.length > 0 ? state.waste[state.waste.length - 1] : null;
    return null;
  }

  function handleCardClick(loc) {
    const card = getCard(loc);
    if (!card) return;

    // King = auto-remove
    if (card.rank === 'K') {
      pushHistory();
      removeCard(loc.location, loc.row, loc.col);
      moveCount++;
      selectedCard = null;
      clearSel();
      render();
      saveState();
      checkWin();
      return;
    }

    if (!selectedCard) {
      selectedCard = loc;
      render();
      return;
    }

    // Second selection — try to pair
    const first = getCard(selectedCard);
    if (!first) { selectedCard = loc; render(); return; }

    // Clicking same card — deselect
    if (selectedCard.location === loc.location && selectedCard.row === loc.row && selectedCard.col === loc.col) {
      selectedCard = null;
      clearSel();
      render();
      return;
    }

    if (tryPair(first, card)) {
      pushHistory();
      removeCard(selectedCard.location, selectedCard.row, selectedCard.col);
      removeCard(loc.location, loc.row, loc.col);
      moveCount++;
      selectedCard = null;
      clearSel();
      render();
      saveState();
      checkWin();
    } else {
      // Reselect the new card
      selectedCard = loc;
      render();
    }
  }

  function drawStock() {
    if (state.stock.length === 0) return;
    pushHistory();
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
    moveCount++;
    selectedCard = null;
    clearSel();
    render();
    saveState();
  }

  // ---- Win detection ----
  function checkWin() {
    const allRemoved = state.pyramid.every(row => row.every(c => c === null));
    if (allRemoved) showWinOverlay($winOverlay);
  }

  // ---- Rendering ----
  function render() {
    renderPyramid();
    renderStock();
    renderWaste();
    $btnUndo.disabled = history.length === 0;
  }

  function renderPyramid() {
    $pyramid.innerHTML = '';
    for (let row = 0; row < ROWS; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'pyramid-row';
      for (let col = 0; col <= row; col++) {
        const slot = document.createElement('div');
        slot.className = 'pyramid-slot';
        const card = state.pyramid[row][col];
        if (card) {
          const exposed = isExposed(row, col);
          const el = createCardEl(card);
          el.style.position = 'absolute';
          el.style.top = '0';
          el.style.left = '0';
          if (!exposed) {
            el.classList.add('blocked');
            el.draggable = false;
          } else {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              handleCardClick({ location: 'pyramid', row, col });
            });
            // Highlight if selected
            if (selectedCard && selectedCard.location === 'pyramid' && selectedCard.row === row && selectedCard.col === col) {
              el.classList.add('pair-selected');
            }
          }
          slot.appendChild(el);
        } else {
          slot.classList.add('removed');
        }
        rowEl.appendChild(slot);
      }
      $pyramid.appendChild(rowEl);
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
      if (selectedCard && selectedCard.location === 'waste') {
        el.classList.add('pair-selected');
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick({ location: 'waste' });
      });
      $waste.appendChild(el);
    }
  }

  // ---- Selection ----
  function clearSel() {
    selectedCard = null;
    clearSelectionUI();
    document.querySelectorAll('.pair-selected').forEach(el => el.classList.remove('pair-selected'));
  }

  // ---- Click handling ----
  $board.addEventListener('click', (e) => {
    const pileEl = e.target.closest('.pile');
    if (pileEl === $stock || (e.target.closest('.stock-pile'))) {
      clearSel();
      drawStock();
      return;
    }
    // Clicking empty space deselects
    if (!e.target.closest('.card')) {
      selectedCard = null;
      render();
    }
  });

  // ---- Persistence ----
  function saveState() {
    saveToStorage(STORAGE_KEY, { state, history, moveCount });
  }

  function loadState() {
    const data = loadFromStorage(STORAGE_KEY);
    if (!data || !data.state || !data.state.pyramid) return false;
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
