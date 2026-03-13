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

// ---- Win animations ----
function animCascade() {
  const suits = Object.values(SUIT_SYMBOLS);
  const colors = ['#dc3545', '#1a1d27', '#dc3545', '#1a1d27'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = suits[i % 4];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-50px';
    el.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
    el.style.color = colors[i % 4];
    el.style.animationName = 'winCascade';
    el.style.animationDuration = (Math.random() * 2 + 2) + 's';
    el.style.animationDelay = (Math.random() * 3) + 's';
    document.body.appendChild(el);
  }
}

function animFireworks() {
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#fff'];
  for (let burst = 0; burst < 5; burst++) {
    const cx = 20 + Math.random() * 60;
    const cy = 20 + Math.random() * 50;
    const delay = burst * 0.6;
    for (let i = 0; i < 16; i++) {
      const el = document.createElement('div');
      el.className = 'win-particle';
      el.textContent = '✦';
      el.style.left = cx + 'vw';
      el.style.top = cy + 'vh';
      el.style.fontSize = (Math.random() * 0.8 + 0.6) + 'rem';
      el.style.color = colors[Math.floor(Math.random() * colors.length)];
      const angle = (i / 16) * 360;
      const dist = 15 + Math.random() * 20;
      el.style.setProperty('--dx', Math.cos(angle * Math.PI / 180) * dist + 'vw');
      el.style.setProperty('--dy', Math.sin(angle * Math.PI / 180) * dist + 'vh');
      el.style.animationName = 'winFirework';
      el.style.animationDuration = (Math.random() * 0.8 + 1) + 's';
      el.style.animationDelay = delay + 's';
      document.body.appendChild(el);
    }
  }
}

function animConfetti() {
  const confettiChars = ['■', '●', '▲', '★', '♦'];
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#ff69b4'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = confettiChars[Math.floor(Math.random() * confettiChars.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-30px';
    el.style.fontSize = (Math.random() * 0.6 + 0.4) + 'rem';
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty('--sway', (Math.random() * 40 - 20) + 'vw');
    el.style.animationName = 'winConfetti';
    el.style.animationDuration = (Math.random() * 3 + 3) + 's';
    el.style.animationDelay = (Math.random() * 2) + 's';
    document.body.appendChild(el);
  }
}

function animFountain() {
  const suits = Object.values(SUIT_SYMBOLS);
  const colors = ['#dc3545', '#f0c040', '#3498db', '#2ecc71'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = suits[i % 4];
    el.style.left = (40 + Math.random() * 20) + 'vw';
    el.style.bottom = '-30px';
    el.style.top = 'auto';
    el.style.fontSize = (Math.random() * 1.2 + 0.8) + 'rem';
    el.style.color = colors[i % 4];
    el.style.setProperty('--spread', (Math.random() * 80 - 40) + 'vw');
    el.style.setProperty('--height', (60 + Math.random() * 30) + 'vh');
    el.style.animationName = 'winFountain';
    el.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
    el.style.animationDelay = (Math.random() * 2.5) + 's';
    document.body.appendChild(el);
  }
}

function animSpiral() {
  const suits = Object.values(SUIT_SYMBOLS);
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = suits[i % 4];
    el.style.left = '50vw';
    el.style.top = '40vh';
    el.style.fontSize = (Math.random() * 1.2 + 0.8) + 'rem';
    el.style.color = colors[i % colors.length];
    const angle = (i / 36) * 720;
    const dist = 10 + (i / 36) * 40;
    el.style.setProperty('--sx', Math.cos(angle * Math.PI / 180) * dist + 'vw');
    el.style.setProperty('--sy', Math.sin(angle * Math.PI / 180) * dist + 'vh');
    el.style.animationName = 'winSpiral';
    el.style.animationDuration = '2.5s';
    el.style.animationDelay = (i * 0.08) + 's';
    document.body.appendChild(el);
  }
}

const WIN_ANIMATIONS = [animCascade, animFireworks, animConfetti, animFountain, animSpiral];

export function cascadeAnimation() {
  const anim = WIN_ANIMATIONS[Math.floor(Math.random() * WIN_ANIMATIONS.length)];
  anim();
  setTimeout(() => {
    document.querySelectorAll('.win-particle').forEach(el => el.remove());
  }, 7000);
}

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
export function cloneGameState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function pushToHistory(history, state, moveCount) {
  history.push({ state: cloneGameState(state), moveCount });
  if (history.length > 200) history.shift();
}

export function showWinOverlay($overlay) {
  $overlay.hidden = false;
  cascadeAnimation();
}

export function hideWinOverlay($overlay) {
  $overlay.hidden = true;
  document.querySelectorAll('.win-particle').forEach(el => el.remove());
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
