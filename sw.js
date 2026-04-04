const CACHE_NAME = 'gameroom-v6';
const BASE = '/game-room';
const ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/css/shared.css',
  '/css/game-shared.css',
  '/js/components/game-card.js',
  '/js/shared/card-engine.js',
  '/js/shared/win-animation.js',
  '/js/shared/wake-lock.js',
  '/images/spider.svg',
  '/games/freecell/index.html',
  '/games/freecell/freecell.css',
  '/games/freecell/freecell.js',
  '/games/klondike-solitaire/index.html',
  '/games/klondike-solitaire/solitaire.css',
  '/games/klondike-solitaire/solitaire.js',
  '/games/pyramid/index.html',
  '/games/pyramid/pyramid.css',
  '/games/pyramid/pyramid.js',
  '/games/spider-solitaire/index.html',
  '/games/spider-solitaire/spider.css',
  '/games/spider-solitaire/spider.js',
  '/games/sudoku/index.html',
  '/games/sudoku/sudoku.css',
  '/games/sudoku/sudoku.js',
  '/games/tripeaks/index.html',
  '/games/tripeaks/tripeaks.css',
  '/games/tripeaks/tripeaks.js',
  '/games/yukon/index.html',
  '/games/yukon/yukon.css',
  '/games/yukon/yukon.js',
  '/games/wordle/index.html',
  '/games/wordle/wordle.css',
  '/games/wordle/wordle.js',
  '/games/hangman/index.html',
  '/games/hangman/hangman.css',
  '/games/hangman/hangman.js',
  '/games/word-search/index.html',
  '/games/word-search/word-search.css',
  '/games/word-search/word-search.js',
  '/games/spelling-bee/index.html',
  '/games/spelling-bee/spelling-bee.css',
  '/games/spelling-bee/spelling-bee.js'
].map(path => BASE + path);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Try appending index.html for directory URLs
      const url = new URL(event.request.url);
      if (url.pathname.endsWith('/')) {
        return caches.match(url.pathname + 'index.html').then(c => c || fetch(event.request));
      }
      return fetch(event.request);
    })
  );
});
