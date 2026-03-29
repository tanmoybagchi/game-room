// ============================================================
// Yukon Solitaire â€” Engine + UI
// ============================================================

import {
  SUITS, SUIT_SYMBOLS, SUIT_COLORS, RANKS, RANK_VALUES,
  createDeck, shuffle,
  canPlaceOnFoundation, findFoundationForCard,
  createCardEl, buildStackGhost, cascadeAnimation,
  clearSelection as clearSelectionUI,
  saveToStorage, loadFromStorage, clearStorage,
  CARD_BACKS, applyCardBack, randomCardBackIndex,
  cloneGameState, pushToHistory, showWinOverlay, hideWinOverlay,
  getCardOffset, wireGameControls, createDoubleTapHandler,
  snapshotCardPositions, animateCardsFromSnapshot
} from '../../js/shared/card-engine.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'yukon_save';

  // ---- DOM refs ----
  const $board = document.getElementById('game-board');
  const $foundations = Array.from(document.querySelectorAll('.foundation'));
  const $tableauCols = Array.from(document.querySelectorAll('.tableau-col'));
  const $btnUndo = document.getElementById('btn-undo');
  const $btnNewGame = document.getElementById('btn-new-game');
  const $btnPlayAgain = document.getElementById('btn-play-again');
  const $winOverlay = document.getElementById('win-overlay');

  // ---- Game state ----
  let state = null;
  let history = [];
  let moveCount = 0;
  let cardBackIndex = 0;
  let selectedCard = null;
  let skipFlip = false;

  // ---- Yukon deal ----
  // Col 0: 1 card (face up)
  // Col 1: 2 cards (1 face down + 1 face up) + 4 extra face up = 6 total
  // Col 2: 3 cards (2 face down + 1 face up) + 4 extra face up = 7 total
  // ...
  // Col 6: 7 cards (6 face down + 1 face up) + 4 extra face up = 11 total
  // Total: 1 + 6 + 7 + 8 + 9 + 10 + 11 = 52

  function newGame() {
    const deck = shuffle(createDeck(false));
    state = {
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], []]
    };

    let di = 0;

    // Standard Klondike deal first
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[di++];
        card.faceUp = (row === col);
        state.tableau[col].push(card);
      }
    }

    // Deal remaining 24 cards: 4 face-up cards each to columns 1-6
    for (let col = 1; col < 7; col++) {
      for (let i = 0; i < 4; i++) {
        const card = deck[di++];
        card.faceUp = true;
        state.tableau[col].push(card);
      }
    }

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

  function pushHistory() {
    pushToHistory(history, state, moveCount);
  }

  function undo() {
    if (history.length === 0) return;
    const oldPositions = snapshotCardPositions($board);
    const prev = history.pop();
    state = prev.state;
    moveCount = prev.moveCount;
    selectedCard = null;
    clearSel();
    render();
    if (!skipFlip) animateCardsFromSnapshot($board, oldPositions);
    saveState();
  }

  // ---- Move validation ----
  // Yukon: any face-up card can be moved. Placement rules are same as Klondike.
  function canPlaceOnTableau(card, col) {
    const pile = state.tableau[col];
    if (pile.length === 0) return card.rank === 'K';
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return SUIT_COLORS[card.suit] !== SUIT_COLORS[top.suit]
      && RANK_VALUES[card.rank] === RANK_VALUES[top.rank] - 1;
  }

  // ---- Moves ----
  function moveCards(fromPile, fromIndex, toPile) {
    pushHistory();
    const oldPositions = snapshotCardPositions($board);
    const cards = fromPile.splice(fromIndex);
    toPile.push(...cards);
    autoFlipTop(fromPile);
    moveCount++;
    render();
    if (!skipFlip) animateCardsFromSnapshot($board, oldPositions);
    saveState();
    checkWin();
  }

  function moveToFoundation(fromPile, cardIndex, fi) {
    pushHistory();
    const oldPositions = snapshotCardPositions($board);
    const card = fromPile.splice(cardIndex, 1)[0];
    state.foundations[fi].push(card);
    autoFlipTop(fromPile);
    moveCount++;
    render();
    if (!skipFlip) animateCardsFromSnapshot($board, oldPositions);
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
    if (state.foundations.every(f => f.length === 13)) showWinOverlay($winOverlay);
  }

  // ---- Rendering ----
  function render() {
    renderFoundations();
    renderTableau();
    $btnUndo.disabled = history.length === 0;
  }

  function getGhostCards(source, col, cardIndex) {
    if (source === 'tableau') return state.tableau[col].slice(cardIndex);
    if (source === 'foundation') return [state.foundations[col][state.foundations[col].length - 1]];
    return [];
  }

  function renderFoundations() {
    $foundations.forEach((fEl, fi) => {
      const existing = fEl.querySelectorAll('.card');
      existing.forEach(e => e.remove());
      const pile = state.foundations[fi];
      fEl.classList.toggle('has-cards', pile.length > 0);
      if (pile.length > 0) {
        const card = pile[pile.length - 1];
        const el = createCardEl(card);
        el.dataset.source = 'foundation';
        el.dataset.foundation = fi;
        el.dataset.cardIndex = pile.length - 1;
        fEl.appendChild(el);
      }
    });
  }

  function renderTableau() {
    $tableauCols.forEach((colEl, ci) => {
      colEl.innerHTML = '';
      const pile = state.tableau[ci];
      colEl.classList.toggle('has-cards', pile.length > 0);
      pile.forEach((card, ri) => {
        const offset = getCardOffset(ri, pile);
        const el = createCardEl(card, { top: offset });
        el.dataset.source = 'tableau';
        el.dataset.col = ci;
        el.dataset.cardIndex = ri;
        el.style.zIndex = ri + 1;
        // In Yukon, any face-up card is draggable (not just ordered sequences)
        if (card.faceUp) el.draggable = true;
        colEl.appendChild(el);
      });
      if (pile.length > 0) {
        const lastOffset = getCardOffset(pile.length - 1, pile);
        colEl.style.height = (lastOffset + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h') || 130)) + 'px';
      } else {
        colEl.style.height = '';
      }
    });
  }

  // ---- Selection ----
  function clearSel() {
    selectedCard = null;
    clearSelectionUI();
  }

  function selectCard(source, col, cardIndex) {
    clearSel();
    selectedCard = { source, col, cardIndex };
    if (source === 'tableau') {
      const colEl = $tableauCols[col];
      const cards = colEl.querySelectorAll('.card');
      for (let i = cardIndex; i < cards.length; i++) cards[i].classList.add('selected');
    } else if (source === 'foundation') {
      $foundations[col].querySelector('.card')?.classList.add('selected');
    }
  }

  function handleTapTarget(targetSource, targetCol) {
    if (!selectedCard) return;
    const sel = selectedCard;
    clearSel();

    if (targetSource === 'tableau') {
      let card;
      if (sel.source === 'tableau') {
        card = state.tableau[sel.col][sel.cardIndex];
        if (canPlaceOnTableau(card, targetCol)) moveCards(state.tableau[sel.col], sel.cardIndex, state.tableau[targetCol]);
      } else if (sel.source === 'foundation') {
        card = state.foundations[sel.col][state.foundations[sel.col].length - 1];
        if (canPlaceOnTableau(card, targetCol)) moveCards(state.foundations[sel.col], state.foundations[sel.col].length - 1, state.tableau[targetCol]);
      }
    } else if (targetSource === 'foundation') {
      if (sel.source === 'tableau') {
        const pile = state.tableau[sel.col];
        if (sel.cardIndex === pile.length - 1) {
          const card = pile[pile.length - 1];
          if (canPlaceOnFoundation(card, targetCol, state.foundations)) moveToFoundation(pile, pile.length - 1, targetCol);
        }
      }
    }
  }

  // ---- Click / Tap handling ----
  const isDoubleTap = createDoubleTapHandler();

  function tryAutoFoundation(source, col, cardIndex) {
    if (source !== 'tableau') return false;
    const pile = state.tableau[col];
    if (cardIndex !== pile.length - 1) return false;
    const card = pile[pile.length - 1];
    const fi = findFoundationForCard(card, state.foundations);
    if (fi >= 0) { moveToFoundation(pile, pile.length - 1, fi); return true; }
    // Kings: move to an empty tableau column
    if (card.rank === 'K') {
      for (let tc = 0; tc < 7; tc++) {
        if (tc !== col && state.tableau[tc].length === 0) {
          moveCards(pile, pile.length - 1, state.tableau[tc]);
          return true;
        }
      }
    }
    return false;
  }

  $board.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    const pileEl = e.target.closest('.pile');

    if (pileEl && !cardEl && selectedCard) {
      if (pileEl.classList.contains('tableau-col')) handleTapTarget('tableau', parseInt(pileEl.dataset.col));
      else if (pileEl.classList.contains('foundation')) handleTapTarget('foundation', parseInt(pileEl.dataset.foundation));
      return;
    }

    if (!cardEl || !cardEl.classList.contains('face-up')) return;

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.foundation ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (isDoubleTap(source, col, cardIndex)) {
      clearSel();
      if (tryAutoFoundation(source, col, cardIndex)) return;
    }

    if (selectedCard) {
      if (source === 'tableau') { handleTapTarget('tableau', col); return; }
      if (source === 'foundation') { handleTapTarget('foundation', col); return; }
      clearSel();
      return;
    }

    selectCard(source, col, cardIndex);
  });

  // ---- Double-click: auto-move to foundation (desktop) ----
  $board.addEventListener('dblclick', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) return;
    clearSel();

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    tryAutoFoundation(source, col, cardIndex);
  });

  // ---- Drag and Drop (desktop) ----
  let dragData = null;
  let dragGhost = null;

  $board.addEventListener('dragstart', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) { e.preventDefault(); return; }
    clearSel();

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.foundation ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    dragData = { source, col, cardIndex };

    if (source === 'tableau') {
      const colEl = $tableauCols[col];
      const cards = colEl.querySelectorAll('.card');
      for (let i = cardIndex; i < cards.length; i++) cards[i].classList.add('dragging');
    } else {
      cardEl.classList.add('dragging');
    }

    dragGhost = buildStackGhost(getGhostCards(source, col, cardIndex));
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
    if (pileEl && (pileEl.classList.contains('tableau-col') || pileEl.classList.contains('foundation'))) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  });

  $board.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragData) return;
    const pileEl = e.target.closest('.pile');
    if (!pileEl) return;
    const dd = dragData;
    dragData = null;

    skipFlip = true;
    if (pileEl.classList.contains('tableau-col')) executeDragMove(dd, 'tableau', parseInt(pileEl.dataset.col));
    else if (pileEl.classList.contains('foundation')) executeDragMove(dd, 'foundation', parseInt(pileEl.dataset.foundation));
    skipFlip = false;
    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));
  });

  function executeDragMove(dd, targetType, targetIndex) {
    if (targetType === 'tableau') {
      let fromPile, card;
      if (dd.source === 'tableau') {
        fromPile = state.tableau[dd.col]; card = fromPile[dd.cardIndex];
        if (canPlaceOnTableau(card, targetIndex)) moveCards(fromPile, dd.cardIndex, state.tableau[targetIndex]);
      } else if (dd.source === 'foundation') {
        fromPile = state.foundations[dd.col]; card = fromPile[fromPile.length - 1];
        if (canPlaceOnTableau(card, targetIndex)) moveCards(fromPile, fromPile.length - 1, state.tableau[targetIndex]);
      }
    } else if (targetType === 'foundation') {
      if (dd.source === 'tableau') {
        const fromPile = state.tableau[dd.col];
        if (dd.cardIndex === fromPile.length - 1) {
          const card = fromPile[fromPile.length - 1];
          if (canPlaceOnFoundation(card, targetIndex, state.foundations)) moveToFoundation(fromPile, fromPile.length - 1, targetIndex);
        }
      }
    }
  }

  // ---- Touch support (mobile) ----
  let touchDrag = null;
  let touchGhost = null;

  $board.addEventListener('touchstart', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) return;
    const source = cardEl.dataset.source;
    if (!source) return;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.foundation ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    const touch = e.touches[0];
    touchDrag = { source, col, cardIndex, startX: touch.clientX, startY: touch.clientY, moved: false, el: cardEl };
  }, { passive: true });

  $board.addEventListener('touchmove', (e) => {
    if (!touchDrag) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchDrag.startX;
    const dy = touch.clientY - touchDrag.startY;

    if (!touchDrag.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchDrag.moved = true;
      clearSel();
      touchGhost = buildStackGhost(getGhostCards(touchDrag.source, touchDrag.col, touchDrag.cardIndex));
      document.body.appendChild(touchGhost);

      if (touchDrag.source === 'tableau') {
        const colEl = $tableauCols[touchDrag.col];
        const cards = colEl.querySelectorAll('.card');
        for (let i = touchDrag.cardIndex; i < cards.length; i++) cards[i].style.opacity = '0';
      } else {
        touchDrag.el.style.opacity = '0';
      }
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
    if (td.source === 'tableau') {
      const colEl = $tableauCols[td.col];
      if (colEl) colEl.querySelectorAll('.card').forEach(c => c.style.opacity = '');
    }
    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));

    if (!td.moved) return;
    const touch = e.changedTouches[0];
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!dropEl) return;
    const pileEl = dropEl.closest('.pile');
    if (!pileEl) return;

    const dd = { source: td.source, col: td.col, cardIndex: td.cardIndex };
    skipFlip = true;
    if (pileEl.classList.contains('tableau-col')) executeDragMove(dd, 'tableau', parseInt(pileEl.dataset.col));
    else if (pileEl.classList.contains('foundation')) executeDragMove(dd, 'foundation', parseInt(pileEl.dataset.foundation));
    skipFlip = false;
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
    cardBackIndex = data.cardBackIndex || 0;
    applyCardBack(CARD_BACKS[cardBackIndex]);
    return true;
  }

  function clearSave() { clearStorage(STORAGE_KEY); }

  // ---- Init ----
  wireGameControls({
    $btnUndo, $btnNewGame, $btnPlayAgain,
    undo, newGame, clearSave, loadState, render
  });
})();
