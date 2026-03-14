// ============================================================
// FreeCell — Engine + UI
// ============================================================

import {
  SUITS, SUIT_SYMBOLS, SUIT_COLORS, RANKS, RANK_VALUES,
  createDeck, shuffle,
  canPlaceOnFoundation, findFoundationForCard,
  createCardEl, buildStackGhost, cascadeAnimation,
  clearSelection as clearSelectionUI,
  saveToStorage, loadFromStorage, clearStorage,
  cloneGameState, pushToHistory, showWinOverlay, hideWinOverlay,
  wireGameControls
} from '../../js/shared/card-engine.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'freecell_save';

  // ---- DOM refs ----
  const $board = document.getElementById('game-board');
  const $freeCells = Array.from(document.querySelectorAll('.free-cell'));
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
  let selectedCard = null;

  // ---- State management ----
  function newGame() {
    const deck = shuffle(createDeck(true));
    state = {
      freeCells: [null, null, null, null],
      foundations: [[], [], [], []],
      tableau: [[], [], [], [], [], [], [], []]
    };

    for (let i = 0; i < 52; i++) {
      state.tableau[i % 8].push(deck[i]);
    }

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

  // ---- Move validation ----
  function canPlaceOnTableau(card, col) {
    const pile = state.tableau[col];
    if (pile.length === 0) return true; // any card on empty column
    const top = pile[pile.length - 1];
    return SUIT_COLORS[card.suit] !== SUIT_COLORS[top.suit]
      && RANK_VALUES[card.rank] === RANK_VALUES[top.rank] - 1;
  }

  function maxMoveable(excludeCol) {
    const emptyCells = state.freeCells.filter(c => c === null).length;
    let emptyCols = 0;
    for (let i = 0; i < 8; i++) {
      if (i !== excludeCol && state.tableau[i].length === 0) emptyCols++;
    }
    return (emptyCells + 1) * (1 << emptyCols);
  }

  function isValidRun(pile, fromIndex) {
    for (let i = fromIndex; i < pile.length - 1; i++) {
      const a = pile[i];
      const b = pile[i + 1];
      if (SUIT_COLORS[a.suit] === SUIT_COLORS[b.suit]) return false;
      if (RANK_VALUES[a.rank] !== RANK_VALUES[b.rank] + 1) return false;
    }
    return true;
  }

  // ---- Moves ----
  function moveCardsTableau(fromCol, fromIndex, toCol) {
    const pile = state.tableau[fromCol];
    const count = pile.length - fromIndex;
    const max = maxMoveable(toCol);
    if (count > max) return false;
    if (!isValidRun(pile, fromIndex)) return false;

    const topCard = pile[fromIndex];
    if (!canPlaceOnTableau(topCard, toCol)) return false;

    pushHistory();
    const cards = pile.splice(fromIndex);
    state.tableau[toCol].push(...cards);
    moveCount++;
    render();
    saveState();
    checkWin();
    return true;
  }

  function moveToFoundation(sourcePile, cardIndex, fi) {
    pushHistory();
    const card = sourcePile.splice(cardIndex, 1)[0];
    state.foundations[fi].push(card);
    moveCount++;
    render();
    saveState();
    checkWin();
  }

  function moveToFreeCell(sourcePile, cardIndex, cellIndex) {
    if (state.freeCells[cellIndex] !== null) return false;
    pushHistory();
    const card = sourcePile.splice(cardIndex, 1)[0];
    state.freeCells[cellIndex] = card;
    moveCount++;
    render();
    saveState();
    return true;
  }

  function moveFromFreeCell(cellIndex, toCol) {
    const card = state.freeCells[cellIndex];
    if (!card) return false;
    if (!canPlaceOnTableau(card, toCol)) return false;
    pushHistory();
    state.freeCells[cellIndex] = null;
    state.tableau[toCol].push(card);
    moveCount++;
    render();
    saveState();
    checkWin();
    return true;
  }

  function moveFreeCellToFoundation(cellIndex, fi) {
    const card = state.freeCells[cellIndex];
    if (!card) return false;
    if (!canPlaceOnFoundation(card, fi, state.foundations)) return false;
    pushHistory();
    state.freeCells[cellIndex] = null;
    state.foundations[fi].push(card);
    moveCount++;
    render();
    saveState();
    checkWin();
    return true;
  }

  function autoMoveToFoundations() {
    let moved = true;
    while (moved) {
      moved = false;
      for (let ci = 0; ci < 4; ci++) {
        const card = state.freeCells[ci];
        if (!card) continue;
        if (!isSafeAutoMove(card)) continue;
        const fi = findFoundationForCard(card, state.foundations);
        if (fi >= 0) {
          state.freeCells[ci] = null;
          state.foundations[fi].push(card);
          moved = true;
        }
      }
      for (let col = 0; col < 8; col++) {
        const pile = state.tableau[col];
        if (pile.length === 0) continue;
        const card = pile[pile.length - 1];
        if (!isSafeAutoMove(card)) continue;
        const fi = findFoundationForCard(card, state.foundations);
        if (fi >= 0) {
          pile.pop();
          state.foundations[fi].push(card);
          moved = true;
        }
      }
    }
  }

  function isSafeAutoMove(card) {
    const fi = findFoundationForCard(card, state.foundations);
    if (fi < 0) return false;
    if (card.rank === 'A') return true;
    if (card.rank === '2') {
      return state.foundations.some(f => f.length > 0);
    }
    const neededRank = RANK_VALUES[card.rank] - 1;
    for (const s of SUITS) {
      if (SUIT_COLORS[s] !== SUIT_COLORS[card.suit]) {
        const fIdx = state.foundations.findIndex(f => f.length > 0 && f[0].suit === s);
        if (fIdx < 0) return false;
        if (state.foundations[fIdx].length - 1 < neededRank) return false;
      }
    }
    return true;
  }

  // ---- Win detection ----
  function checkWin() {
    if (state.foundations.every(f => f.length === 13)) showWinOverlay($winOverlay);
  }

  // ---- Rendering ----
  function render() {
    renderFreeCells();
    renderFoundations();
    renderTableau();
    $btnUndo.disabled = history.length === 0;
  }

  function getGhostCards(source, col, cardIndex) {
    if (source === 'tableau') return state.tableau[col].slice(cardIndex);
    if (source === 'freecell') return [state.freeCells[col]];
    if (source === 'foundation') return [state.foundations[col][state.foundations[col].length - 1]];
    return [];
  }

  function renderFreeCells() {
    $freeCells.forEach((cellEl, ci) => {
      const existing = cellEl.querySelectorAll('.card');
      existing.forEach(e => e.remove());

      const card = state.freeCells[ci];
      cellEl.classList.toggle('has-cards', card !== null);
      if (card) {
        const el = createCardEl(card);
        el.dataset.source = 'freecell';
        el.dataset.cell = ci;
        el.dataset.cardIndex = 0;
        cellEl.appendChild(el);
      }
    });
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
        el.draggable = false;
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
        const upPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tableau-offset')) || 26;
        const offset = ri * upPx;
        const el = createCardEl(card, { top: offset });
        el.dataset.source = 'tableau';
        el.dataset.col = ci;
        el.dataset.cardIndex = ri;
        el.style.zIndex = ri + 1;
        colEl.appendChild(el);
      });

      if (pile.length > 0) {
        const upPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tableau-offset')) || 26;
        const lastOffset = (pile.length - 1) * upPx;
        colEl.style.height = (lastOffset + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h')) || 122)) + 'px';
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
    } else if (source === 'freecell') {
      $freeCells[col].querySelector('.card')?.classList.add('selected');
    } else if (source === 'foundation') {
      $foundations[col].querySelector('.card')?.classList.add('selected');
    }
  }

  function handleTapTarget(targetSource, targetIndex) {
    if (!selectedCard) return;
    const sel = selectedCard;
    clearSel();

    if (targetSource === 'tableau') {
      if (sel.source === 'tableau') {
        moveCardsTableau(sel.col, sel.cardIndex, targetIndex);
      } else if (sel.source === 'freecell') {
        moveFromFreeCell(sel.col, targetIndex);
      } else if (sel.source === 'foundation') {
        const pile = state.foundations[sel.col];
        const card = pile[pile.length - 1];
        if (canPlaceOnTableau(card, targetIndex)) {
          pushHistory();
          pile.pop();
          state.tableau[targetIndex].push(card);
          moveCount++;
          render();
          saveState();
        }
      }
    } else if (targetSource === 'foundation') {
      if (sel.source === 'tableau') {
        const pile = state.tableau[sel.col];
        if (sel.cardIndex === pile.length - 1) {
          const card = pile[pile.length - 1];
          if (canPlaceOnFoundation(card, targetIndex, state.foundations)) {
            moveToFoundation(pile, pile.length - 1, targetIndex);
          }
        }
      } else if (sel.source === 'freecell') {
        moveFreeCellToFoundation(sel.col, targetIndex);
      }
    } else if (targetSource === 'freecell') {
      if (sel.source === 'tableau') {
        const pile = state.tableau[sel.col];
        if (sel.cardIndex === pile.length - 1) {
          moveToFreeCell(pile, pile.length - 1, targetIndex);
        }
      } else if (sel.source === 'freecell') {
        if (state.freeCells[targetIndex] === null) {
          pushHistory();
          state.freeCells[targetIndex] = state.freeCells[sel.col];
          state.freeCells[sel.col] = null;
          moveCount++;
          render();
          saveState();
        }
      }
    }
  }

  // ---- Click / Tap handling ----
  $board.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    const pileEl = e.target.closest('.pile');

    if (pileEl && !cardEl && selectedCard) {
      if (pileEl.classList.contains('tableau-col')) handleTapTarget('tableau', parseInt(pileEl.dataset.col));
      else if (pileEl.classList.contains('foundation')) handleTapTarget('foundation', parseInt(pileEl.dataset.foundation));
      else if (pileEl.classList.contains('free-cell')) handleTapTarget('freecell', parseInt(pileEl.dataset.cell));
      return;
    }

    if (!cardEl || !cardEl.classList.contains('face-up')) return;

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.foundation ?? cardEl.dataset.cell ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (selectedCard) {
      if (source === 'tableau') { handleTapTarget('tableau', col); return; }
      if (source === 'foundation') { handleTapTarget('foundation', col); return; }
      if (source === 'freecell') { handleTapTarget('freecell', col); return; }
      clearSel();
      return;
    }

    if (source === 'tableau' && !isValidRun(state.tableau[col], cardIndex)) return;

    selectCard(source, col, cardIndex);
  });

  // ---- Double-click: auto-move to foundation ----
  $board.addEventListener('dblclick', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) return;
    clearSel();

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.cell ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (source === 'tableau') {
      const pile = state.tableau[col];
      if (cardIndex !== pile.length - 1) return;
      const card = pile[pile.length - 1];
      const fi = findFoundationForCard(card, state.foundations);
      if (fi >= 0) {
        moveToFoundation(pile, pile.length - 1, fi);
        autoMoveToFoundations();
        render();
        saveState();
      }
    } else if (source === 'freecell') {
      const card = state.freeCells[col];
      if (!card) return;
      const fi = findFoundationForCard(card, state.foundations);
      if (fi >= 0) {
        moveFreeCellToFoundation(col, fi);
        autoMoveToFoundations();
        render();
        saveState();
      }
    }
  });

  // ---- Drag and Drop (desktop) ----
  let dragData = null;
  let dragGhost = null;

  $board.addEventListener('dragstart', (e) => {
    const cardEl = e.target.closest('.card.face-up');
    if (!cardEl) { e.preventDefault(); return; }
    clearSel();

    const source = cardEl.dataset.source;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.foundation ?? cardEl.dataset.cell ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);

    if (source === 'tableau' && !isValidRun(state.tableau[col], cardIndex)) { e.preventDefault(); return; }
    if (source === 'foundation') { e.preventDefault(); return; }

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
    if (pileEl && (pileEl.classList.contains('tableau-col') || pileEl.classList.contains('foundation') || pileEl.classList.contains('free-cell'))) {
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

    if (pileEl.classList.contains('tableau-col')) executeDragMove(dd, 'tableau', parseInt(pileEl.dataset.col));
    else if (pileEl.classList.contains('foundation')) executeDragMove(dd, 'foundation', parseInt(pileEl.dataset.foundation));
    else if (pileEl.classList.contains('free-cell')) executeDragMove(dd, 'freecell', parseInt(pileEl.dataset.cell));

    document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));
  });

  function executeDragMove(dd, targetType, targetIndex) {
    if (targetType === 'tableau') {
      if (dd.source === 'tableau') moveCardsTableau(dd.col, dd.cardIndex, targetIndex);
      else if (dd.source === 'freecell') moveFromFreeCell(dd.col, targetIndex);
    } else if (targetType === 'foundation') {
      if (dd.source === 'tableau') {
        const pile = state.tableau[dd.col];
        if (dd.cardIndex === pile.length - 1) {
          const card = pile[pile.length - 1];
          if (canPlaceOnFoundation(card, targetIndex, state.foundations)) {
            moveToFoundation(pile, pile.length - 1, targetIndex);
            autoMoveToFoundations();
            render();
            saveState();
          }
        }
      } else if (dd.source === 'freecell') {
        if (moveFreeCellToFoundation(dd.col, targetIndex)) {
          autoMoveToFoundations();
          render();
          saveState();
        }
      }
    } else if (targetType === 'freecell') {
      if (dd.source === 'tableau') {
        const pile = state.tableau[dd.col];
        if (dd.cardIndex === pile.length - 1) moveToFreeCell(pile, pile.length - 1, targetIndex);
      } else if (dd.source === 'freecell') {
        if (state.freeCells[targetIndex] === null && dd.col !== targetIndex) {
          pushHistory();
          state.freeCells[targetIndex] = state.freeCells[dd.col];
          state.freeCells[dd.col] = null;
          moveCount++;
          render();
          saveState();
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
    if (!source || source === 'foundation') return;
    const col = parseInt(cardEl.dataset.col ?? cardEl.dataset.cell ?? 0);
    const cardIndex = parseInt(cardEl.dataset.cardIndex);
    if (source === 'tableau' && !isValidRun(state.tableau[col], cardIndex)) return;
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
    if (pileEl.classList.contains('tableau-col')) executeDragMove(dd, 'tableau', parseInt(pileEl.dataset.col));
    else if (pileEl.classList.contains('foundation')) executeDragMove(dd, 'foundation', parseInt(pileEl.dataset.foundation));
    else if (pileEl.classList.contains('free-cell')) executeDragMove(dd, 'freecell', parseInt(pileEl.dataset.cell));
  });

  // ---- Persistence ----
  function saveState() {
    saveToStorage(STORAGE_KEY, { state, history, moveCount });
  }

  function loadState() {
    const data = loadFromStorage(STORAGE_KEY);
    if (!data || !data.state || !data.state.tableau) return false;
    state = data.state;
    history = data.history || [];
    moveCount = data.moveCount || 0;
    return true;
  }

  function clearSave() { clearStorage(STORAGE_KEY); }

  // ---- Button handlers + Init ----
  wireGameControls({
    $btnUndo, $btnNewGame, $btnPlayAgain,
    undo, newGame, clearSave, loadState, render
  });
})();
