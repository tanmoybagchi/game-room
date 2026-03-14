// ============================================================
// Spider Solitaire — Engine + UI (1-suit)
// ============================================================

import {
  SUITS, SUIT_SYMBOLS, SUIT_COLORS, RANKS, RANK_VALUES,
  createDeck, shuffle,
  createCardEl, buildStackGhost, cascadeAnimation,
  clearSelection as clearSelectionUI,
  saveToStorage, loadFromStorage, clearStorage,
  CARD_BACKS, applyCardBack, randomCardBackIndex,
  cloneGameState, pushToHistory, showWinOverlay, hideWinOverlay,
  getCardOffset, wireGameControls
} from '../../js/shared/card-engine.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'spider_save';
  const NUM_COLS = 10;
  const COMPLETE_RUN_LENGTH = 13; // K down to A

  let cardBackIndex = 0;

  // ---- DOM refs ----
  const $board = document.getElementById('game-board');
  const $stock = document.getElementById('stock');
  const $completedArea = document.getElementById('completed-area');
  const $tableauCols = Array.from(document.querySelectorAll('.tableau-col'));
  const $btnUndo = document.getElementById('btn-undo');
  const $btnNewGame = document.getElementById('btn-new-game');
  const $btnPlayAgain = document.getElementById('btn-play-again');
  const $winOverlay = document.getElementById('win-overlay');

  // ---- Game state ----
  let state = null;
  let history = [];
  let moveCount = 0;
  let selectedCard = null;

  // ---- Create 1-suit deck (104 cards = 8 decks of spades) ----
  function createSpiderDeck() {
    const deck = [];
    for (let d = 0; d < 8; d++) {
      for (const rank of RANKS) {
        deck.push({ suit: 'spades', rank, faceUp: false });
      }
    }
    return shuffle(deck);
  }

  // ---- State management ----
  function newGame() {
    const deck = createSpiderDeck();
    state = {
      stock: [],
      tableau: [],
      completed: 0
    };

    // Deal: 4 columns of 6 cards, 6 columns of 5 cards (54 cards total)
    for (let col = 0; col < NUM_COLS; col++) {
      state.tableau[col] = [];
      const count = col < 4 ? 6 : 5;
      for (let i = 0; i < count; i++) {
        const card = deck.pop();
        card.faceUp = (i === count - 1);
        state.tableau[col].push(card);
      }
    }

    // Remaining 50 cards go to stock (5 deals of 10)
    state.stock = deck;

    history = [];
    moveCount = 0;
    selectedCard = null;
    cardBackIndex = randomCardBackIndex();
    applyCardBack(CARD_BACKS[cardBackIndex]);
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

  // ---- Run validation ----
  // A valid run is a descending same-suit sequence
  function isValidRun(pile, fromIndex) {
    for (let i = fromIndex; i < pile.length - 1; i++) {
      const a = pile[i];
      const b = pile[i + 1];
      if (!a.faceUp || !b.faceUp) return false;
      if (a.suit !== b.suit) return false;
      if (RANK_VALUES[a.rank] !== RANK_VALUES[b.rank] + 1) return false;
    }
    return true;
  }

  // ---- Move validation ----
  function canPlaceOnTableau(card, col) {
    const pile = state.tableau[col];
    if (pile.length === 0) return true;
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return RANK_VALUES[card.rank] === RANK_VALUES[top.rank] - 1;
  }

  // ---- Check for complete K→A run at bottom of a column ----
  function checkAndRemoveRun(col) {
    const pile = state.tableau[col];
    if (pile.length < 13) return false;

    const startIdx = pile.length - 13;
    // Must be K at start
    if (pile[startIdx].rank !== 'K') return false;
    // Must be same-suit descending run
    if (!isValidRun(pile, startIdx)) return false;

    // Remove the run
    pile.splice(startIdx, 13);
    state.completed++;
    autoFlipTop(pile);
    return true;
  }

  // ---- Moves ----
  function dealFromStock() {
    if (state.stock.length === 0) return;
    // All columns must have at least one card
    for (let col = 0; col < NUM_COLS; col++) {
      if (state.tableau[col].length === 0) return;
    }

    pushHistory();
    for (let col = 0; col < NUM_COLS; col++) {
      if (state.stock.length === 0) break;
      const card = state.stock.pop();
      card.faceUp = true;
      state.tableau[col].push(card);
    }
    moveCount++;

    // Check all columns for completed runs after dealing
    for (let col = 0; col < NUM_COLS; col++) {
      checkAndRemoveRun(col);
    }

    render();
    saveState();
    checkWin();
  }

  function moveCards(fromCol, fromIndex, toCol) {
    pushHistory();
    const cards = state.tableau[fromCol].splice(fromIndex);
    state.tableau[toCol].push(...cards);
    autoFlipTop(state.tableau[fromCol]);
    moveCount++;

    checkAndRemoveRun(toCol);

    render();
    saveState();
    checkWin();
  }

  function autoFlipTop(pile) {
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
    }
  }

  // ---- Win detection ----
  function checkWin() {
    if (state.completed === 8) showWinOverlay($winOverlay);
  }

  function hideWin() {
    hideWinOverlay($winOverlay);
  }

  // ---- Rendering ----
  function render() {
    renderStock();
    renderCompleted();
    renderTableau();
    $btnUndo.disabled = history.length === 0;
  }

  function getGhostCards(col, cardIndex) {
    return state.tableau[col].slice(cardIndex);
  }

  function renderStock() {
    $stock.innerHTML = '';
    $stock.classList.toggle('has-cards', state.stock.length > 0);
    if (state.stock.length > 0) {
      const el = createCardEl({ suit: 'spades', rank: '', faceUp: false });
      el.draggable = false;
      el.style.top = '0';
      $stock.appendChild(el);
      // Show remaining deals count
      const deals = Math.ceil(state.stock.length / NUM_COLS);
      const countEl = document.createElement('span');
      countEl.className = 'stock-count';
      countEl.textContent = `${deals} deal${deals !== 1 ? 's' : ''}`;
      $stock.appendChild(countEl);
    }
  }

  function renderCompleted() {
    $completedArea.innerHTML = '';
    for (let i = 0; i < state.completed; i++) {
      const marker = document.createElement('div');
      marker.className = 'completed-marker';
      marker.textContent = '♠';
      $completedArea.appendChild(marker);
    }
  }

  function renderTableau() {
    $tableauCols.forEach((colEl, ci) => {
      colEl.innerHTML = '';
      const pile = state.tableau[ci];
      colEl.classList.toggle('has-cards', pile.length > 0);
      pile.forEach((card, ri) => {
        const offset = getOffset(ri, pile);
        const el = createCardEl(card, { top: offset });
        el.dataset.source = 'tableau';
        el.dataset.col = ci;
        el.dataset.cardIndex = ri;
        el.style.zIndex = ri + 1;
        colEl.appendChild(el);
      });
      if (pile.length > 0) {
        const lastOffset = getOffset(pile.length - 1, pile);
        colEl.style.height = (lastOffset + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h') || 115)) + 'px';
      } else {
        colEl.style.height = '';
      }
    });
  }

  function getOffset(ri, pile) {
    return getCardOffset(ri, pile);
  }

  // ---- Selection ----
  function clearSel() {
    selectedCard = null;
    clearSelectionUI();
  }

  function selectCard(col, cardIndex) {
    clearSel();
    selectedCard = { col, cardIndex };
    const colEl = $tableauCols[col];
    const cards = colEl.querySelectorAll('.card');
    for (let i = cardIndex; i < cards.length; i++) cards[i].classList.add('selected');
  }

  function handleTapTarget(targetCol) {
    if (!selectedCard) return;
    const sel = selectedCard;
    clearSel();

    const card = state.tableau[sel.col][sel.cardIndex];
    if (canPlaceOnTableau(card, targetCol)) {
      moveCards(sel.col, sel.cardIndex, targetCol);
    }
  }

  // ---- Click / Tap handling ----
  $board.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    const pileEl = e.target.closest('.pile');

    // Stock click
    if (pileEl === $stock || (cardEl && cardEl.closest('#stock'))) {
      clearSel();
      dealFromStock();
      return;
    }

    // Empty pile click with selection
    if (pileEl && !cardEl && selectedCard && pileEl.classList.contains('tableau-col')) {
      handleTapTarget(parseInt(pileEl.dataset.col));
      return;
    }

    if (!cardEl || !cardEl.classList.contains('face-up')) return;

    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (selectedCard) {
      handleTapTarget(col);
      return;
    }

    // Only allow selecting valid runs
    const pile = state.tableau[col];
    if (!isValidRun(pile, cardIndex)) return;

    selectCard(col, cardIndex);
  });

  // ---- Double-click: auto-move to best column ----
  $board.addEventListener('dblclick', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) return;
    clearSel();

    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    const pile = state.tableau[col];

    if (!isValidRun(pile, cardIndex)) return;

    const card = pile[cardIndex];

    // Try to find best target: prefer same-suit match, then any valid match
    let bestCol = -1;
    let bestSameSuit = -1;

    for (let tc = 0; tc < NUM_COLS; tc++) {
      if (tc === col) continue;
      if (!canPlaceOnTableau(card, tc)) continue;
      if (state.tableau[tc].length === 0) {
        if (bestCol < 0) bestCol = tc;
      } else {
        const top = state.tableau[tc][state.tableau[tc].length - 1];
        if (top.suit === card.suit && bestSameSuit < 0) bestSameSuit = tc;
        else if (bestCol < 0) bestCol = tc;
      }
    }

    const target = bestSameSuit >= 0 ? bestSameSuit : bestCol;
    if (target >= 0) moveCards(col, cardIndex, target);
  });

  // ---- Drag and Drop (desktop) ----
  let dragData = null;
  let dragGhost = null;

  $board.addEventListener('dragstart', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) { e.preventDefault(); return; }
    clearSel();

    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (isNaN(col)) { e.preventDefault(); return; }
    if (!isValidRun(state.tableau[col], cardIndex)) { e.preventDefault(); return; }

    dragData = { col, cardIndex };

    const colEl = $tableauCols[col];
    const cards = colEl.querySelectorAll('.card');
    for (let i = cardIndex; i < cards.length; i++) cards[i].classList.add('dragging');

    dragGhost = buildStackGhost(getGhostCards(col, cardIndex));
    document.body.appendChild(dragGhost);
    dragGhost.style.left = '-9999px';
    e.dataTransfer.setDragImage(dragGhost, 30, 20);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  });

  $board.addEventListener('dragend', () => {
    document.querySelectorAll('.card.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
    dragData = null;
  });

  $board.addEventListener('dragover', (e) => {
    if (!dragData) return;
    const pileEl = e.target.closest('.pile');
    if (pileEl && pileEl.classList.contains('tableau-col')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  });

  $board.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragData) return;
    const pileEl = e.target.closest('.pile');
    if (!pileEl || !pileEl.classList.contains('tableau-col')) return;
    const dd = dragData;
    dragData = null;

    const targetCol = parseInt(pileEl.dataset.col);
    const card = state.tableau[dd.col][dd.cardIndex];
    if (canPlaceOnTableau(card, targetCol)) moveCards(dd.col, dd.cardIndex, targetCol);

    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));
  });

  // ---- Touch support (mobile) ----
  let touchDrag = null;
  let touchGhost = null;

  $board.addEventListener('touchstart', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) return;
    const source = cardEl.dataset.source;
    if (source !== 'tableau') return;
    const col = parseInt(cardEl.dataset.col);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    if (!isValidRun(state.tableau[col], cardIndex)) return;
    const touch = e.touches[0];
    touchDrag = { col, cardIndex, startX: touch.clientX, startY: touch.clientY, moved: false, el: cardEl };
  }, { passive: true });

  $board.addEventListener('touchmove', (e) => {
    if (!touchDrag) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchDrag.startX;
    const dy = touch.clientY - touchDrag.startY;

    if (!touchDrag.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchDrag.moved = true;
      clearSel();
      touchGhost = buildStackGhost(getGhostCards(touchDrag.col, touchDrag.cardIndex));
      document.body.appendChild(touchGhost);

      const colEl = $tableauCols[touchDrag.col];
      const cards = colEl.querySelectorAll('.card');
      for (let i = touchDrag.cardIndex; i < cards.length; i++) cards[i].style.opacity = '0';
    }

    if (touchDrag.moved && touchGhost) {
      e.preventDefault();
      touchGhost.style.left = (touch.clientX - 30) + 'px';
      touchGhost.style.top = (touch.clientY - 40) + 'px';
    }
  }, { passive: false });

  $board.addEventListener('touchend', (e) => {
    if (!touchDrag) return;
    const td = touchDrag;
    touchDrag = null;

    if (touchGhost) { touchGhost.remove(); touchGhost = null; }
    td.el.style.opacity = '';
    const colEl = $tableauCols[td.col];
    if (colEl) colEl.querySelectorAll('.card').forEach(c => c.style.opacity = '');
    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));

    if (!td.moved) return;
    const touch = e.changedTouches[0];
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!dropEl) return;
    const pileEl = dropEl.closest('.pile');
    if (!pileEl || !pileEl.classList.contains('tableau-col')) return;

    const targetCol = parseInt(pileEl.dataset.col);
    const card = state.tableau[td.col][td.cardIndex];
    if (canPlaceOnTableau(card, targetCol)) moveCards(td.col, td.cardIndex, targetCol);
  });

  // ---- Persistence ----
  function saveState() {
    saveToStorage(STORAGE_KEY, { state, history, moveCount, cardBackIndex });
  }

  function loadState() {
    const data = loadFromStorage(STORAGE_KEY);
    if (!data || !data.state || !data.state.tableau) return false;
    state = data.state;
    history = data.history || [];
    moveCount = data.moveCount || 0;
    cardBackIndex = data.cardBackIndex ?? 0;
    applyCardBack(CARD_BACKS[cardBackIndex]);
    return true;
  }

  function clearSave() { clearStorage(STORAGE_KEY); }

  // ---- Button handlers + Init ----
  wireGameControls({
    $btnUndo, $btnNewGame, $btnPlayAgain,
    undo, newGame, clearSave, loadState, render
  });
})();
