// ============================================================
// Shared Card Game Engine
// ============================================================

// ---- Constants ----
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const SUIT_COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_VALUES = Object.fromEntries(RANKS.map((r, i) => [r, i]));

// ---- Deck helpers ----
export function createDeck(faceUp = false) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp });
    }
  }
  return deck;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- Foundation validation ----
export function canPlaceOnFoundation(card, fi, foundations) {
  const pile = foundations[fi];
  if (pile.length === 0) return card.rank === 'A';
  const top = pile[pile.length - 1];
  return card.suit === top.suit
    && RANK_VALUES[card.rank] === RANK_VALUES[top.rank] + 1;
}

export function findFoundationForCard(card, foundations) {
  for (let i = 0; i < 4; i++) {
    if (canPlaceOnFoundation(card, i, foundations)) return i;
  }
  return -1;
}

// ---- Rendering ----
export function createCardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card ${card.faceUp ? 'face-up' : 'face-down'}`;
  if (card.faceUp) {
    el.classList.add(SUIT_COLORS[card.suit]);
    const sym = SUIT_SYMBOLS[card.suit];
    const EMBLEM = { K: '👑', Q: '👑', J: '⚔️' };
    const emblem = EMBLEM[card.rank] ? `<span class="card-crown">${EMBLEM[card.rank]}</span>` : '';
    el.innerHTML = `<span class="card-peek">${card.rank}${sym}</span>${emblem}<span class="card-rank">${card.rank}</span><span class="card-suit">${sym}</span>`;
    el.draggable = true;
  }
  if (opts.top != null) el.style.top = opts.top + 'px';
  el.dataset.suit = card.suit;
  el.dataset.rank = card.rank;
  return el;
}

export function buildStackGhost(cards) {
  const styles = getComputedStyle(document.documentElement);
  const cardW = styles.getPropertyValue('--card-w').trim();
  const cardH = parseFloat(styles.getPropertyValue('--card-h')) || 130;
  const upPx = parseFloat(styles.getPropertyValue('--tableau-offset')) || 28;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10000';
  container.style.width = cardW;
  const totalH = cardH + (cards.length - 1) * upPx;
  container.style.height = totalH + 'px';

  cards.forEach((card, i) => {
    const el = createCardEl(card, { top: i * upPx });
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.width = cardW;
    el.draggable = false;
    container.appendChild(el);
  });

  return container;
}

// ---- Win animations (re-exported from shared module) ----
export { cascadeAnimation, showWinOverlay, hideWinOverlay } from './win-animation.js';

// ---- Selection helpers ----
export function clearSelection() {
  document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.pile.drop-target').forEach(el => el.classList.remove('drop-target'));
}

// ---- localStorage persistence ----
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — okay to skip */ }
}

export function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStorage(key) {
  localStorage.removeItem(key);
}

// ---- Card back designs ----
export const CARD_BACKS = [
  { bg: '#c0392b', border: '#922b21', accent: 'rgba(255,255,255,0.35)', inner: 'rgba(255,255,255,0.2)',
    pattern: `repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.08) 3px,rgba(255,255,255,0.08) 6px),repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(255,255,255,0.08) 3px,rgba(255,255,255,0.08) 6px)` },
  { bg: '#1a5276', border: '#154360', accent: 'rgba(255,255,255,0.3)', inner: 'rgba(255,255,255,0.15)',
    pattern: `repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(255,255,255,0.07) 4px,rgba(255,255,255,0.07) 5px)` },
  { bg: '#1e8449', border: '#196f3d', accent: 'rgba(255,255,255,0.3)', inner: 'rgba(255,255,255,0.15)',
    pattern: `repeating-linear-gradient(0deg,transparent,transparent 6px,rgba(255,255,255,0.06) 6px,rgba(255,255,255,0.06) 7px),repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(255,255,255,0.06) 6px,rgba(255,255,255,0.06) 7px)` },
  { bg: '#6c3483', border: '#5b2c6f', accent: 'rgba(255,255,255,0.3)', inner: 'rgba(255,255,255,0.15)',
    pattern: `repeating-linear-gradient(60deg,transparent,transparent 4px,rgba(255,255,255,0.07) 4px,rgba(255,255,255,0.07) 7px),repeating-linear-gradient(-60deg,transparent,transparent 4px,rgba(255,255,255,0.07) 4px,rgba(255,255,255,0.07) 7px)` },
  { bg: '#2c3e50', border: '#1c2833', accent: 'rgba(255,255,255,0.25)', inner: 'rgba(255,255,255,0.12)',
    pattern: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`, patternSize: '8px 8px' },
  { bg: '#922b21', border: '#7b241c', accent: 'rgba(255,215,0,0.3)', inner: 'rgba(255,215,0,0.15)',
    pattern: `repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,215,0,0.06) 2px,rgba(255,215,0,0.06) 4px),repeating-linear-gradient(-45deg,transparent,transparent 2px,rgba(255,215,0,0.06) 2px,rgba(255,215,0,0.06) 4px)` }
];

export function applyCardBack(design) {
  const root = document.documentElement;
  root.style.setProperty('--card-back-bg', design.bg);
  root.style.setProperty('--card-back-border', design.border);
  root.style.setProperty('--card-back-accent', design.accent);
  root.style.setProperty('--card-back-inner', design.inner);
  root.style.setProperty('--card-back-pattern', design.pattern);
  if (design.patternSize) {
    root.style.setProperty('--card-back-pattern-size', design.patternSize);
  } else {
    root.style.removeProperty('--card-back-pattern-size');
  }
}

export function randomCardBackIndex() {
  return Math.floor(Math.random() * CARD_BACKS.length);
}

// ---- UI wiring ----
export function wireHelpModal(btnHelp, btnClose, modal) {
  btnHelp.addEventListener('click', () => modal.showModal());
  btnClose.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
}

// ---- Game engine helpers ----

// Double-tap detection (works on mobile where dblclick is unreliable).
// Returns a function that should be called on each click with identifying
// properties of the tapped card. Returns true if this click is a double-tap.
export function createDoubleTapHandler(delay = 400) {
  let last = { time: 0, id: null };
  return function isDoubleTap(...idParts) {
    const id = idParts.join('|');
    const now = Date.now();
    if (now - last.time < delay && last.id === id) {
      last = { time: 0, id: null };
      return true;
    }
    last = { time: now, id };
    return false;
  };
}

export function cloneGameState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function pushToHistory(history, state, moveCount) {
  history.push({ state: cloneGameState(state), moveCount });
  if (history.length > 200) history.shift();
}

export function getCardOffset(ri, pile) {
  const styles = getComputedStyle(document.documentElement);
  const downPx = parseFloat(styles.getPropertyValue('--tableau-offset-down')) || 14;
  const upPx = parseFloat(styles.getPropertyValue('--tableau-offset')) || 26;
  let offset = 0;
  for (let i = 0; i < ri; i++) {
    offset += pile[i].faceUp ? upPx : downPx;
  }
  return offset;
}

export function wireGameControls({ $btnUndo, $btnNewGame, $btnPlayAgain, undo, newGame, clearSave, loadState, render }) {
  $btnUndo.addEventListener('click', undo);
  $btnNewGame.addEventListener('click', () => { clearSave(); newGame(); });
  $btnPlayAgain.addEventListener('click', () => { clearSave(); newGame(); });
  wireHelpModal(
    document.getElementById('btn-help'),
    document.getElementById('btn-help-close'),
    document.getElementById('help-modal')
  );
  if (!loadState()) newGame();
  else render();
}
