import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  const STORAGE_KEY = 'gameroom-memory';

  const COLS = 4, ROWS = 4;

  const SYMBOLS = [
    '🍎', '🍊', '🍋', '🍇', '🍉', '🍓',
    '🌸', '🌻', '🌺', '🍀', '🌙', '⭐',
    '🦋', '🐬', '🎸', '🚀', '🎯', '🧩',
    '🔔', '💎', '🎭', '🏀', '🌈', '🦊'
  ];

  const $board = document.getElementById('board');
  const $btnNew = document.getElementById('btn-new-game');
  const $btnHelp = document.getElementById('btn-help');
  const $helpModal = document.getElementById('help-modal');
  const $btnHelpClose = document.getElementById('btn-help-close');
  const $winOverlay = document.getElementById('win-overlay');
  const $btnPlayAgain = document.getElementById('btn-play-again');

  let cards, flipped, matched, locked;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function init() {
    const total = COLS * ROWS;
    const pairCount = total / 2;
    const symbols = shuffle([...SYMBOLS]).slice(0, pairCount);
    cards = shuffle([...symbols, ...symbols]);
    flipped = [];
    matched = new Set();
    locked = false;
    hideWinOverlay($winOverlay);

    $board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    render();
  }

  function render() {
    $board.innerHTML = '';
    cards.forEach((symbol, i) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.index = i;

      if (matched.has(i)) card.classList.add('matched');
      if (flipped.includes(i)) card.classList.add('flipped');

      const back = document.createElement('div');
      back.className = 'card-face card-back';

      const front = document.createElement('div');
      front.className = 'card-face card-front';
      front.textContent = symbol;

      card.appendChild(back);
      card.appendChild(front);
      $board.appendChild(card);
    });
  }

  $board.addEventListener('click', (e) => {
    if (locked) return;
    const card = e.target.closest('.memory-card');
    if (!card) return;
    const idx = parseInt(card.dataset.index);

    if (matched.has(idx) || flipped.includes(idx)) return;

    flipped.push(idx);
    card.classList.add('flipped');

    if (flipped.length === 2) {
      const [a, b] = flipped;

      if (cards[a] === cards[b]) {
        matched.add(a);
        matched.add(b);
        flipped = [];

        if (matched.size === cards.length) {
          setTimeout(() => {
            showWinOverlay($winOverlay);
            localStorage.removeItem(STORAGE_KEY);
          }, 400);
        } else {
          saveState();
        }
      } else {
        locked = true;
        setTimeout(() => {
          const allCards = $board.querySelectorAll('.memory-card');
          allCards[a].classList.remove('flipped');
          allCards[b].classList.remove('flipped');
          flipped = [];
          locked = false;
        }, 800);
      }
    }
  });

  $btnNew.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });
  $btnPlayAgain.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); init(); });

  $btnHelp.addEventListener('click', () => $helpModal.showModal());
  $btnHelpClose.addEventListener('click', () => $helpModal.close());
  $helpModal.addEventListener('click', (e) => {
    if (e.target === $helpModal) $helpModal.close();
  });

  // ---- Save / Load ----
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cards, matched: [...matched]
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      cards = data.cards;
      matched = new Set(data.matched);
      flipped = [];
      locked = false;
      hideWinOverlay($winOverlay);
      $board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
      render();
      return true;
    } catch { return false; }
  }

  if (!loadState()) init();
})();
