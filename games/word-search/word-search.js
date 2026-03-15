import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

(() => {
  'use strict';

  /* ───── word pool ───── */
  const WORDS = [
    'tiger','horse','eagle','whale','shark','snake','mouse','camel','panda','zebra',
    'robin','crane','bison','otter','raven','llama','koala','squid','viper','heron',
    'finch','gecko','goose','lemur','moose','stork','trout','hyena','tapir','macaw',
    'dingo','civet','bream','perch','swift','egret','quail','snail','skunk','hippo',
    'rhino','mink','newt','toad','crab','wren','ocean','river','stone','cloud',
    'storm','flame','frost','coral','cedar','creek','bloom','maple','cliff','marsh',
    'grove','beach','delta','oasis','trail','dunes','brook','field','ridge','bluff',
    'gorge','basin','shoal','ledge','glade','thorn','birch','ferns','petal','slope',
    'caves','fjord','knoll','swamp','inlet','butte','heath','brush','gully','crest',
    'plain','ditch','blaze','moss','stump','earth','comet','orbit','solar','lunar',
    'venus','pluto','titan','stars','rover','probe','flare','nova','mars','rings',
    'phase','radio','gamma','light','dwarf','astro','nebula','craft','ether','vesta',
    'ceres','pulse','diode','laser','array','burst','void','black','white','giant',
    'epoch','bolts','surge','drift','waves','glow','beam','halo','bread','grape',
    'lemon','mango','olive','peach','pizza','salad','steak','sushi','cream','pasta',
    'melon','honey','bacon','berry','toast','sauce','candy','juice','bagel','broth',
    'chili','curry','dates','flour','gravy','herbs','jerky','kebab','nacho','onion',
    'prawn','roast','scone','thyme','wafer','wrap','basil','feast','fudge','gumbo',
    'mocha','mochi','panko','pilaf','ramen','torte','cocoa','pixel','robot','cable',
    'fiber','bytes','email','modem','virus','codec','linux','debug','proxy','query',
    'stack','cache','drive','parse','token','flask','react','nodes','class','queue',
    'logic','bloat','crypt','patch','mount','shell','regex','ports','trunk','merge',
    'build','route','input','block','scope','loops','fetch','async','typed','frame',
    'batch','micro','proto'
  ];

  const GRID_SIZE = 12;
  const WORDS_PER_GAME = 8;
  const DIRS = [
    [0, 1],   // right
    [1, 0],   // down
    [1, 1],   // diag-down-right
    [-1, 1],  // diag-up-right
    [0, -1],  // left
    [1, -1],  // diag-down-left
    [-1, 0],  // up
    [-1, -1]  // diag-up-left
  ];

  /* ───── state ───── */
  let grid, words, wordCells, foundWords;
  let selecting = false, startCell = null, currentCells = [];
  let colorIndex = 0;
  const WORD_COLORS = [
    '#2ecc71', '#f39c12', '#e74c3c', '#3498db',
    '#e91e90', '#9b59b6', '#1abc9c', '#e67e22'
  ];

  /* ───── DOM ───── */
  const gridEl = document.getElementById('grid');
  const wordListEl = document.getElementById('word-list');
  const $winOverlay = document.getElementById('win-overlay');

  /* ───── grid generation ───── */
  function generatePuzzle() {
    grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
    wordCells = {};

    const pool = [...WORDS];
    // shuffle & pick
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    words = pool.slice(0, WORDS_PER_GAME);

    // place words
    for (const word of words) {
      placeWord(word);
    }

    // fill empty cells with random letters
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c]) {
          grid[r][c] = alpha[Math.floor(Math.random() * 26)];
        }
      }
    }
  }

  function placeWord(word) {
    const shuffledDirs = [...DIRS];
    for (let i = shuffledDirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
    }

    for (let attempt = 0; attempt < 100; attempt++) {
      const dir = shuffledDirs[attempt % shuffledDirs.length];
      const [dr, dc] = dir;
      const maxR = GRID_SIZE - 1 - (dr !== 0 ? (word.length - 1) * Math.abs(dr) : 0);
      const maxC = GRID_SIZE - 1 - (dc !== 0 ? (word.length - 1) * Math.abs(dc) : 0);

      const startR = dr < 0
        ? Math.floor(Math.random() * (GRID_SIZE - word.length + 1)) + word.length - 1
        : Math.floor(Math.random() * (GRID_SIZE - (dr > 0 ? word.length - 1 : 0)));
      const startC = dc < 0
        ? Math.floor(Math.random() * (GRID_SIZE - word.length + 1)) + word.length - 1
        : Math.floor(Math.random() * (GRID_SIZE - (dc > 0 ? word.length - 1 : 0)));

      let fits = true;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const r = startR + dr * i;
        const c = startC + dc * i;
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) { fits = false; break; }
        if (grid[r][c] && grid[r][c] !== word[i]) { fits = false; break; }
        cells.push([r, c]);
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          grid[cells[i][0]][cells[i][1]] = word[i];
        }
        wordCells[word] = cells;
        return;
      }
    }
  }

  /* ───── render grid ───── */
  function renderGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    gridEl.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = grid[r][c];
        cell.dataset.row = r;
        cell.dataset.col = c;
        gridEl.appendChild(cell);
      }
    }
    // add SVG overlay
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ws-overlay');
    svg.id = 'ws-overlay';
    gridEl.appendChild(svg);
  }

  /* ───── render word list ───── */
  function renderWordList() {
    wordListEl.innerHTML = '';
    for (const w of words) {
      const el = document.createElement('span');
      el.className = 'wl-word';
      el.textContent = w;
      el.dataset.word = w;
      if (foundWords.has(w)) el.classList.add('found');
      wordListEl.appendChild(el);
    }
  }

  /* ───── selection logic ───── */
  function getCellAt(r, c) {
    return gridEl.querySelector(`.ws-cell[data-row="${r}"][data-col="${c}"]`);
  }

  function cellsInLine(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const dist = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    // must be in a straight line
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [];
    const cells = [];
    for (let i = 0; i <= dist; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  }

  function clearSelection() {
    currentCells.forEach(([r, c]) => {
      const cell = getCellAt(r, c);
      if (cell) cell.classList.remove('selecting');
    });
    currentCells = [];
  }

  function highlightSelection(cells) {
    cells.forEach(([r, c]) => {
      const cell = getCellAt(r, c);
      if (cell) cell.classList.add('selecting');
    });
  }

  function getRowCol(e) {
    const target = e.target.closest('.ws-cell');
    if (!target) return null;
    return [parseInt(target.dataset.row), parseInt(target.dataset.col)];
  }

  function handleStart(e) {
    const rc = getRowCol(e);
    if (!rc) return;
    e.preventDefault();
    selecting = true;
    startCell = rc;
    clearSelection();
    currentCells = [rc];
    highlightSelection(currentCells);
  }

  function handleMove(e) {
    if (!selecting) return;
    let rc;
    if (e.touches) {
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el || !el.classList.contains('ws-cell')) return;
      rc = [parseInt(el.dataset.row), parseInt(el.dataset.col)];
    } else {
      rc = getRowCol(e);
    }
    if (!rc) return;
    e.preventDefault();
    clearSelection();
    currentCells = cellsInLine(startCell[0], startCell[1], rc[0], rc[1]);
    highlightSelection(currentCells);
  }

  function handleEnd() {
    if (!selecting) return;
    selecting = false;

    // check if selection matches a word
    const selectedWord = currentCells.map(([r, c]) => grid[r][c]).join('');
    const reversedWord = [...selectedWord].reverse().join('');

    let matched = null;
    for (const w of words) {
      if (!foundWords.has(w) && (w === selectedWord || w === reversedWord)) {
        matched = w;
        break;
      }
    }

    clearSelection();

    if (matched) {
      foundWords.add(matched);
      // highlight found cells
      const cells = wordCells[matched];
      cells.forEach(([r, c]) => {
        const cell = getCellAt(r, c);
        cell.classList.add('found', 'found-flash');
      });
      // draw continuous outline
      drawWordOutline(matched, true);
      // update word list
      const wlItem = wordListEl.querySelector(`[data-word="${matched}"]`);
      if (wlItem) wlItem.classList.add('found');
      saveState();

      if (foundWords.size === words.length) {
        const banner = document.createElement('div');
        banner.className = 'win-banner';
        banner.textContent = '🎉 All words found!';
        gridEl.after(banner);
        showWinOverlay($winOverlay);
      }
    }

    startCell = null;
  }

  gridEl.addEventListener('mousedown', handleStart);
  gridEl.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  gridEl.addEventListener('touchstart', handleStart, { passive: false });
  gridEl.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('touchend', handleEnd);

  /* ───── draw continuous outline around a found word ───── */
  function drawWordOutline(word, animate) {
    const cells = wordCells[word];
    if (!cells || cells.length === 0) return;
    const svg = document.getElementById('ws-overlay');
    if (!svg) return;

    const gridRect = gridEl.getBoundingClientRect();
    const first = getCellAt(cells[0][0], cells[0][1]);
    const last = getCellAt(cells[cells.length - 1][0], cells[cells.length - 1][1]);
    if (!first || !last) return;

    const pad = 3;
    const fRect = first.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();

    const x1 = fRect.left - gridRect.left + fRect.width / 2;
    const y1 = fRect.top - gridRect.top + fRect.height / 2;
    const x2 = lRect.left - gridRect.left + lRect.width / 2;
    const y2 = lRect.top - gridRect.top + lRect.height / 2;

    const cellW = fRect.width / 2 + pad;
    const cellH = fRect.height / 2 + pad;

    // build a rotated rect (capsule) around the word line
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);

    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const half = Math.max(cellW, cellH);
    const w = len + half * 2;
    const h = half * 2;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', -w / 2);
    rect.setAttribute('y', -h / 2);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', h / 2);
    rect.setAttribute('ry', h / 2);
    rect.setAttribute('transform', `translate(${cx},${cy}) rotate(${angle * 180 / Math.PI})`);
    rect.setAttribute('fill', WORD_COLORS[colorIndex % WORD_COLORS.length]);
    colorIndex++;
    rect.classList.add('word-outline');
    if (animate) rect.classList.add('flash');
    svg.appendChild(rect);
  }

  /* ───── save / restore ───── */
  const SAVE_KEY = 'gameroom-wordsearch';

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      grid, words, wordCells, foundWords: [...foundWords]
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function restoreGame(state) {
    grid = state.grid;
    words = state.words;
    wordCells = state.wordCells;
    foundWords = new Set(state.foundWords);
    colorIndex = 0;

    renderGrid();
    renderWordList();

    // restore found highlights
    for (const w of foundWords) {
      const cells = wordCells[w];
      if (!cells) continue;
      cells.forEach(([r, c]) => {
        const cell = getCellAt(r, c);
        if (cell) cell.classList.add('found');
      });
      drawWordOutline(w, false);
    }

    if (foundWords.size === words.length) {
      const banner = document.createElement('div');
      banner.className = 'win-banner';
      banner.textContent = '🎉 All words found!';
      gridEl.after(banner);
    }
  }

  /* ───── new game ───── */
  function newGame() {
    foundWords = new Set();
    colorIndex = 0;
    const existing = document.querySelector('.win-banner');
    if (existing) existing.remove();
    generatePuzzle();
    renderGrid();
    renderWordList();
    saveState();
    hideWinOverlay($winOverlay);
  }

  /* ───── init ───── */
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-play-again').addEventListener('click', newGame);

  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help').addEventListener('click', () => helpModal.showModal());
  document.getElementById('btn-help-close').addEventListener('click', () => helpModal.close());
  helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.close(); });

  const saved = loadState();
  if (saved && saved.grid) {
    restoreGame(saved);
  } else {
    newGame();
  }
})();
