import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';

// === Constants ===
const GRID_ROWS = 10, GRID_COLS = 10;
const TILE = 60;
const PANEL_H = 160;
const W = GRID_COLS * TILE, H = GRID_ROWS * TILE + PANEL_H;
const PANEL_Y = GRID_ROWS * TILE;
const TOTAL_WAVES = 10;
const STARTING_LIVES = 20;
const SPAWN_INTERVAL = 0.8;
const STORAGE_KEY = 'gameroom-tower-defense';

// === Tower Definitions ===
const TOWER_TYPES = ['laser', 'missile', 'tesla', 'cryo', 'railgun'];
const TOWERS = {
  laser: {
    name: 'Laser', cost: 50, range: 3, dmg: 8, rate: 2.0, color: '#00ff88',
    upgrades: [
      { cost: 40, dmg: 14, rate: 2.5, range: 3.5 },
      { cost: 70, dmg: 22, rate: 3.0, range: 4 }
    ]
  },
  missile: {
    name: 'Missile', cost: 100, range: 4, dmg: 30, rate: 0.5, color: '#ff4444',
    splash: 1, splashPct: 0.5,
    upgrades: [
      { cost: 75, dmg: 45, rate: 0.6, range: 4.5, splash: 1.5, splashPct: 0.5 },
      { cost: 120, dmg: 65, rate: 0.7, range: 5, splash: 2, splashPct: 0.75 }
    ]
  },
  tesla: {
    name: 'Tesla', cost: 80, range: 2.5, dmg: 5, rate: 4.0, color: '#44aaff',
    chains: 2,
    upgrades: [
      { cost: 60, dmg: 8, rate: 5.0, range: 3, chains: 3 },
      { cost: 100, dmg: 12, rate: 6.0, range: 3.5, chains: 4 }
    ]
  },
  cryo: {
    name: 'Cryo', cost: 75, range: 3, dmg: 4, rate: 1.5, color: '#88ffff',
    slow: 0.4, slowDur: 2,
    upgrades: [
      { cost: 55, dmg: 7, rate: 1.8, range: 3.5, slow: 0.5, slowDur: 2.5 },
      { cost: 90, dmg: 10, rate: 2.0, range: 4, slow: 0.6, slowDur: 3 }
    ]
  },
  railgun: {
    name: 'Railgun', cost: 150, range: 6, dmg: 60, rate: 0.25, color: '#ffff00',
    pierce: true,
    upgrades: [
      { cost: 100, dmg: 90, rate: 0.3, range: 7 },
      { cost: 150, dmg: 130, rate: 0.35, range: 8 }
    ]
  }
};

// === Enemy Definitions ===
const ENEMY_TYPES = {
  scout: { name: 'Scout', hp: 30, speed: 2.5, reward: 5, livesCost: 1, color: '#44ff44', size: 16 },
  grunt: { name: 'Grunt', hp: 60, speed: 1.8, reward: 10, livesCost: 1, color: '#aa44ff', size: 20 },
  armored: { name: 'Armored', hp: 150, speed: 1.2, reward: 20, livesCost: 1, color: '#ff8800', size: 24 },
  wraith: { name: 'Wraith', hp: 40, speed: 4.0, reward: 15, livesCost: 1, color: '#00ffff', size: 16 },
  mothership: { name: 'Mothership', hp: 500, speed: 0.8, reward: 50, livesCost: 5, color: '#ff2222', size: 30 }
};

// === Wave Definitions ===
const WAVES = [
  [{ type: 'scout', count: 8 }],
  [{ type: 'scout', count: 10 }, { type: 'grunt', count: 3 }],
  [{ type: 'grunt', count: 6 }, { type: 'scout', count: 5 }],
  [{ type: 'armored', count: 4 }, { type: 'scout', count: 8 }],
  [{ type: 'wraith', count: 6 }, { type: 'grunt', count: 5 }, { type: 'armored', count: 3 }],
  [{ type: 'grunt', count: 10 }, { type: 'armored', count: 5 }, { type: 'wraith', count: 4 }],
  [{ type: 'armored', count: 8 }, { type: 'wraith', count: 8 }],
  [{ type: 'scout', count: 15 }, { type: 'grunt', count: 8 }, { type: 'armored', count: 5 }],
  [{ type: 'armored', count: 6 }, { type: 'wraith', count: 8 }, { type: 'grunt', count: 6 }],
  [{ type: 'mothership', count: 2 }, { type: 'armored', count: 6 }, { type: 'grunt', count: 10 }]
];

// === Map Definitions ===
const MAPS = [
  {
    name: 'Outpost Alpha',
    difficulty: 'Easy',
    credits: 300,
    path: [
      { c: 0, r: 1 }, { c: 1, r: 1 }, { c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 },
      { c: 5, r: 1 }, { c: 6, r: 1 }, { c: 7, r: 1 }, { c: 8, r: 1 },
      { c: 8, r: 2 }, { c: 8, r: 3 }, { c: 8, r: 4 },
      { c: 7, r: 4 }, { c: 6, r: 4 }, { c: 5, r: 4 }, { c: 4, r: 4 }, { c: 3, r: 4 }, { c: 2, r: 4 }, { c: 1, r: 4 },
      { c: 1, r: 5 }, { c: 1, r: 6 }, { c: 1, r: 7 },
      { c: 2, r: 7 }, { c: 3, r: 7 }, { c: 4, r: 7 }, { c: 5, r: 7 }, { c: 6, r: 7 },
      { c: 7, r: 7 }, { c: 8, r: 7 }, { c: 9, r: 7 }
    ]
  },
  {
    name: 'Serpent Run',
    difficulty: 'Easy',
    credits: 300,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
      { c: 3, r: 1 }, { c: 3, r: 2 }, { c: 3, r: 3 },
      { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 6, r: 3 }, { c: 7, r: 3 },
      { c: 7, r: 4 }, { c: 7, r: 5 }, { c: 7, r: 6 },
      { c: 6, r: 6 }, { c: 5, r: 6 }, { c: 4, r: 6 }, { c: 3, r: 6 },
      { c: 3, r: 7 }, { c: 3, r: 8 }, { c: 3, r: 9 },
      { c: 4, r: 9 }, { c: 5, r: 9 }, { c: 6, r: 9 }, { c: 7, r: 9 }, { c: 8, r: 9 }, { c: 9, r: 9 }
    ]
  },
  {
    name: 'Nebula Crossing',
    difficulty: 'Medium',
    credits: 350,
    path: [
      { c: 5, r: 0 }, { c: 5, r: 1 }, { c: 6, r: 1 }, { c: 7, r: 1 }, { c: 8, r: 1 },
      { c: 8, r: 2 }, { c: 8, r: 3 }, { c: 8, r: 4 }, { c: 8, r: 5 }, { c: 8, r: 6 }, { c: 8, r: 7 }, { c: 8, r: 8 },
      { c: 7, r: 8 }, { c: 6, r: 8 }, { c: 5, r: 8 }, { c: 4, r: 8 }, { c: 3, r: 8 }, { c: 2, r: 8 }, { c: 1, r: 8 },
      { c: 1, r: 7 }, { c: 1, r: 6 }, { c: 1, r: 5 }, { c: 1, r: 4 }, { c: 1, r: 3 },
      { c: 2, r: 3 }, { c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 }, { c: 6, r: 3 },
      { c: 6, r: 4 }, { c: 6, r: 5 }, { c: 6, r: 6 },
      { c: 5, r: 6 }, { c: 4, r: 6 },
      { c: 4, r: 7 }, { c: 4, r: 8 }, { c: 4, r: 9 }
    ]
  },
  {
    name: 'Warp Gate',
    difficulty: 'Medium',
    credits: 350,
    path: [
      { c: 0, r: 5 }, { c: 1, r: 5 }, { c: 2, r: 5 }, { c: 2, r: 4 }, { c: 2, r: 3 }, { c: 2, r: 2 },
      { c: 3, r: 2 }, { c: 4, r: 2 }, { c: 5, r: 2 }, { c: 6, r: 2 }, { c: 7, r: 2 },
      { c: 7, r: 3 }, { c: 7, r: 4 }, { c: 7, r: 5 }, { c: 7, r: 6 }, { c: 7, r: 7 },
      { c: 6, r: 7 }, { c: 5, r: 7 }, { c: 4, r: 7 }, { c: 3, r: 7 },
      { c: 3, r: 8 }, { c: 4, r: 8 }, { c: 5, r: 8 }, { c: 6, r: 8 }, { c: 7, r: 8 }, { c: 8, r: 8 }, { c: 9, r: 8 }
    ]
  },
  {
    name: 'Ion Storm',
    difficulty: 'Medium',
    credits: 375,
    path: [
      { c: 0, r: 4 }, { c: 1, r: 4 }, { c: 1, r: 3 }, { c: 1, r: 2 }, { c: 1, r: 1 },
      { c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 }, { c: 5, r: 1 }, { c: 6, r: 1 }, { c: 7, r: 1 }, { c: 8, r: 1 },
      { c: 8, r: 2 }, { c: 8, r: 3 }, { c: 8, r: 4 }, { c: 8, r: 5 },
      { c: 7, r: 5 }, { c: 6, r: 5 }, { c: 5, r: 5 }, { c: 4, r: 5 }, { c: 3, r: 5 },
      { c: 3, r: 6 }, { c: 3, r: 7 }, { c: 3, r: 8 },
      { c: 4, r: 8 }, { c: 5, r: 8 }, { c: 6, r: 8 }, { c: 7, r: 8 }, { c: 8, r: 8 },
      { c: 8, r: 9 }, { c: 9, r: 9 }
    ]
  },
  {
    name: 'Dark Nebula',
    difficulty: 'Hard',
    credits: 400,
    pathA: [
      { c: 0, r: 2 }, { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 },
      { c: 3, r: 3 }, { c: 3, r: 4 },
      { c: 4, r: 4 }, { c: 5, r: 4 }
    ],
    pathB: [
      { c: 9, r: 2 }, { c: 8, r: 2 }, { c: 7, r: 2 }, { c: 6, r: 2 },
      { c: 6, r: 3 }, { c: 6, r: 4 },
      { c: 5, r: 4 }
    ],
    pathMerged: [
      { c: 5, r: 4 }, { c: 5, r: 5 }, { c: 5, r: 6 }, { c: 5, r: 7 }, { c: 5, r: 8 }, { c: 5, r: 9 }
    ]
  },
  {
    name: 'Black Hole',
    difficulty: 'Hard',
    credits: 425,
    pathA: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 },
      { c: 4, r: 1 }, { c: 4, r: 2 }, { c: 4, r: 3 }, { c: 5, r: 3 }
    ],
    pathB: [
      { c: 9, r: 0 }, { c: 8, r: 0 }, { c: 7, r: 0 }, { c: 6, r: 0 }, { c: 5, r: 0 },
      { c: 5, r: 1 }, { c: 5, r: 2 }, { c: 5, r: 3 }
    ],
    pathMerged: [
      { c: 5, r: 3 }, { c: 5, r: 4 }, { c: 5, r: 5 },
      { c: 4, r: 5 }, { c: 3, r: 5 }, { c: 2, r: 5 },
      { c: 2, r: 6 }, { c: 2, r: 7 }, { c: 2, r: 8 },
      { c: 3, r: 8 }, { c: 4, r: 8 }, { c: 5, r: 8 }, { c: 6, r: 8 }, { c: 7, r: 8 },
      { c: 7, r: 9 }
    ]
  }
];

// === DOM Refs ===
const $canvas = document.getElementById('board');
const ctx = $canvas.getContext('2d');
const $waveInfo = document.getElementById('wave-info');
const $creditsDisplay = document.getElementById('credits-display');
const $livesDisplay = document.getElementById('lives-display');
const $winOverlay = document.getElementById('win-overlay');
const $gameOverOverlay = document.getElementById('game-over-overlay');
const $helpModal = document.getElementById('help-modal');

$canvas.width = W;
$canvas.height = H;

// === Game State ===
let state = 'map-select';
let mapIndex = 0;
let currentWave = 0;
let credits = 300;
let lives = STARTING_LIVES;
let towers = [];
let enemies = [];
let projectiles = [];
let effects = [];
let spawnQueue = [];
let spawnTimer = 0;
let waveCountdown = 0;
let selectedTowerType = null;
let selectedTower = null;
let hoverTile = null;
let lastTime = 0;
let animFrame = null;
let paused = false;
let pathSet = new Set();
let currentPaths = [];

// === Helpers ===
function tileCenter(c, r) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getTowerStats(tower) {
  const base = TOWERS[tower.type];
  if (tower.level === 1) return base;
  const upg = base.upgrades[tower.level - 2];
  return { ...base, ...upg };
}

function sellValue(tower) {
  const base = TOWERS[tower.type];
  let total = base.cost;
  for (let i = 0; i < tower.level - 1; i++) total += base.upgrades[i].cost;
  return Math.floor(total * 0.6);
}

function waveBonus(wave) { return 20 + wave * 10; }

function scaledHP(baseHP, wave) { return Math.round(baseHP * (1 + 0.15 * (wave - 1))); }

function buildPathSet(mapIdx) {
  pathSet.clear();
  const map = MAPS[mapIdx];
  if (map.path) {
    map.path.forEach(p => pathSet.add(`${p.c},${p.r}`));
    currentPaths = [map.path];
  } else {
    map.pathA.forEach(p => pathSet.add(`${p.c},${p.r}`));
    map.pathB.forEach(p => pathSet.add(`${p.c},${p.r}`));
    map.pathMerged.forEach(p => pathSet.add(`${p.c},${p.r}`));
    currentPaths = [
      [...map.pathA, ...map.pathMerged.slice(1)],
      [...map.pathB, ...map.pathMerged.slice(1)]
    ];
  }
}

function canPlace(c, r) {
  if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return false;
  if (pathSet.has(`${c},${r}`)) return false;
  if (towers.find(t => t.col === c && t.row === r)) return false;
  return true;
}

function towerAt(c, r) {
  return towers.find(t => t.col === c && t.row === r);
}

// === Map Selection ===
function drawMapSelect() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Select Map', W / 2, 35);

  const cols = 3;
  const cardW = 170, cardH = 140, gapX = 16, gapY = 55;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const startX = (W - totalW) / 2;
  const startY = 60;

  MAPS.forEach((map, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, cardW, cardH);

    // Draw mini path
    const pathTiles = map.path || [...(map.pathA || []), ...(map.pathB || []), ...(map.pathMerged || [])];
    const cellW = cardW / GRID_COLS, cellH = cardH / GRID_ROWS;
    ctx.fillStyle = '#555';
    pathTiles.forEach(p => {
      ctx.fillRect(x + p.c * cellW, y + p.r * cellH, cellW, cellH);
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(map.name, x + cardW / 2, y + cardH + 18);
    ctx.fillStyle = map.difficulty === 'Easy' ? '#44ff44' : map.difficulty === 'Medium' ? '#ffaa00' : '#ff4444';
    ctx.font = '11px monospace';
    ctx.fillText(map.difficulty, x + cardW / 2, y + cardH + 36);
  });
}

function handleMapSelectClick(cx, cy) {
  const cols = 3;
  const cardW = 170, cardH = 140, gapX = 16, gapY = 55;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const startX = (W - totalW) / 2;
  const startY = 60;

  for (let i = 0; i < MAPS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    if (cx >= x && cx <= x + cardW && cy >= y && cy <= y + cardH) {
      startGame(i);
      return;
    }
  }
}

// === Game Start ===
function startGame(idx) {
  mapIndex = idx;
  credits = MAPS[idx].credits;
  lives = STARTING_LIVES;
  currentWave = 0;
  towers = [];
  enemies = [];
  projectiles = [];
  effects = [];
  spawnQueue = [];
  selectedTowerType = null;
  selectedTower = null;
  buildPathSet(idx);
  state = 'between-waves';
  waveCountdown = 5;
  updateUI();
  lastTime = 0;
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(gameLoop);
}

function startNextWave() {
  currentWave++;
  const waveDef = WAVES[currentWave - 1];
  spawnQueue = [];
  waveDef.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      spawnQueue.push(group.type);
    }
  });
  spawnTimer = 0;
  state = 'playing';
  selectedTower = null;
  updateUI();
}

// === Enemy Spawning ===
function spawnEnemy(type) {
  const def = ENEMY_TYPES[type];
  const pathIdx = currentPaths.length > 1 ? Math.floor(Math.random() * currentPaths.length) : 0;
  const path = currentPaths[pathIdx];
  const start = path[0];
  const pos = tileCenter(start.c, start.r);
  enemies.push({
    type, x: pos.x, y: pos.y,
    hp: scaledHP(def.hp, currentWave),
    maxHp: scaledHP(def.hp, currentWave),
    speed: def.speed,
    reward: def.reward,
    livesCost: def.livesCost,
    color: def.color,
    size: def.size,
    pathIdx,
    waypointIndex: 1,
    slowAmount: 0,
    slowTimer: 0
  });
}

// === Update Functions ===
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const path = currentPaths[e.pathIdx];

    // Update slow
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) { e.slowAmount = 0; e.slowTimer = 0; }
    }

    const target = path[e.waypointIndex];
    if (!target) {
      lives -= e.livesCost;
      enemies.splice(i, 1);
      updateUI();
      if (lives <= 0) { gameOver(); return; }
      continue;
    }

    const tx = target.c * TILE + TILE / 2;
    const ty = target.r * TILE + TILE / 2;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const speed = e.speed * (1 - e.slowAmount) * TILE;
    const move = speed * dt;

    if (move >= d) {
      e.x = tx;
      e.y = ty;
      e.waypointIndex++;
    } else {
      e.x += (dx / d) * move;
      e.y += (dy / d) * move;
    }
  }
}

function updateTowers(dt) {
  for (const tower of towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const stats = getTowerStats(tower);
    const range = stats.range * TILE;
    const cx = tower.col * TILE + TILE / 2;
    const cy = tower.row * TILE + TILE / 2;

    // Find target (furthest along path)
    let target = null;
    let bestProgress = -1;
    for (const e of enemies) {
      const d = dist(cx, cy, e.x, e.y);
      if (d <= range) {
        const progress = e.waypointIndex + (1 - dist(e.x, e.y,
          (currentPaths[e.pathIdx][e.waypointIndex]?.c ?? 0) * TILE + TILE / 2,
          (currentPaths[e.pathIdx][e.waypointIndex]?.r ?? 0) * TILE + TILE / 2) / TILE);
        if (progress > bestProgress) {
          bestProgress = progress;
          target = e;
        }
      }
    }

    if (!target) continue;
    tower.cooldown = 1 / stats.rate;

    if (tower.type === 'railgun') {
      fireRailgun(tower, stats, cx, cy, target);
    } else if (tower.type === 'tesla') {
      fireTesla(tower, stats, cx, cy, target);
    } else if (tower.type === 'missile') {
      fireMissile(tower, stats, cx, cy, target);
    } else if (tower.type === 'cryo') {
      fireCryo(tower, stats, cx, cy, target);
    } else {
      fireLaser(tower, stats, cx, cy, target);
    }
  }
}

function fireLaser(tower, stats, cx, cy, target) {
  target.hp -= stats.dmg;
  effects.push({ type: 'laser', x1: cx, y1: cy, x2: target.x, y2: target.y, life: 0.12 });
  checkKill(target);
}

function fireMissile(tower, stats, cx, cy, target) {
  projectiles.push({
    x: cx, y: cy, tx: target.x, ty: target.y,
    speed: 8 * TILE, dmg: stats.dmg,
    splash: (stats.splash || 1) * TILE,
    splashPct: stats.splashPct || 0.5,
    color: stats.color, size: 4
  });
}

function fireTesla(tower, stats, cx, cy, target) {
  target.hp -= stats.dmg;
  effects.push({ type: 'lightning', x1: cx, y1: cy, x2: target.x, y2: target.y, primary: true, life: 0.18 });
  checkKill(target);

  let current = target;
  const hit = [target];
  const chains = stats.chains || 2;
  for (let i = 0; i < chains; i++) {
    let nearest = null, nearDist = Infinity;
    for (const e of enemies) {
      if (hit.includes(e)) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d < stats.range * TILE && d < nearDist) { nearest = e; nearDist = d; }
    }
    if (!nearest) break;
    nearest.hp -= stats.dmg * 0.5;
    effects.push({ type: 'lightning', x1: current.x, y1: current.y, x2: nearest.x, y2: nearest.y, primary: false, life: 0.15 });
    checkKill(nearest);
    hit.push(nearest);
    current = nearest;
  }
}

function fireCryo(tower, stats, cx, cy, target) {
  target.hp -= stats.dmg;
  target.slowAmount = Math.max(target.slowAmount, stats.slow || 0.4);
  target.slowTimer = stats.slowDur || 2;
  effects.push({ type: 'cryoblast', x1: cx, y1: cy, x2: target.x, y2: target.y, life: 0.25 });
  checkKill(target);
}

function fireRailgun(tower, stats, cx, cy, target) {
  const dx = target.x - cx;
  const dy = target.y - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / d, ny = dy / d;
  const endX = cx + nx * stats.range * TILE;
  const endY = cy + ny * stats.range * TILE;

  for (const e of enemies) {
    const ex = e.x - cx, ey = e.y - cy;
    const proj = ex * nx + ey * ny;
    if (proj < 0 || proj > stats.range * TILE) continue;
    const perpX = ex - proj * nx, perpY = ey - proj * ny;
    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpDist < TILE * 0.6) {
      e.hp -= stats.dmg;
      checkKill(e);
    }
  }
  effects.push({ type: 'railbeam', x1: cx, y1: cy, x2: endX, y2: endY, life: 0.2 });
  effects.push({ type: 'railimpact', x: target.x, y: target.y, life: 0.25 });
}

function checkKill(enemy) {
  if (enemy.hp <= 0 && enemies.includes(enemy)) {
    credits += enemy.reward;
    spawnExplosion(enemy.x, enemy.y, enemy.color, 10);
    enemies.splice(enemies.indexOf(enemy), 1);
    updateUI();
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const move = p.speed * dt;

    if (move >= d) {
      // Hit - apply splash
      for (const e of enemies) {
        const ed = dist(p.tx, p.ty, e.x, e.y);
        if (ed <= p.splash) {
          const dmg = ed < TILE * 0.5 ? p.dmg : p.dmg * p.splashPct;
          e.hp -= dmg;
          checkKill(e);
        }
      }
      spawnExplosion(p.tx, p.ty, p.color, 14);
      projectiles.splice(i, 1);
    } else {
      p.x += (dx / d) * move;
      p.y += (dy / d) * move;
    }
  }
}

function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 40 + Math.random() * 80;
    effects.push({
      type: 'particle',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? color : '#ffaa22',
      size: 2 + Math.random() * 3,
      life: 0.3 + Math.random() * 0.3
    });
  }
  effects.push({ type: 'shockwave', x, y, color, life: 0.25 });
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    if (e.life <= 0) { effects.splice(i, 1); continue; }
    if (e.type === 'particle') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.92;
      e.vy *= 0.92;
    }
  }
}

function updateSpawning(dt) {
  if (spawnQueue.length === 0) return;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy(spawnQueue.shift());
    spawnTimer = SPAWN_INTERVAL;
  }
}

// === Drawing ===
function draw() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  drawGrid();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawPanel();

  if (selectedTower) drawTowerInfo();
  if (state === 'between-waves') drawNextWaveButton();
}

function drawGrid() {
  // Draw path
  ctx.fillStyle = '#1a1a2e';
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (pathSet.has(`${c},${r}`)) {
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= GRID_ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(W, r * TILE); ctx.stroke();
  }
  for (let c = 0; c <= GRID_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, PANEL_Y); ctx.stroke();
  }

  // Hover tile
  if (hoverTile && selectedTowerType && state !== 'map-select') {
    const valid = canPlace(hoverTile.c, hoverTile.r);
    ctx.fillStyle = valid ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(hoverTile.c * TILE, hoverTile.r * TILE, TILE, TILE);

    if (valid) {
      const stats = TOWERS[selectedTowerType];
      ctx.beginPath();
      ctx.arc(hoverTile.c * TILE + TILE / 2, hoverTile.r * TILE + TILE / 2, stats.range * TILE, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// === Sprite Drawing Functions ===
function drawTowerSprite(type, cx, cy, s, level) {
  ctx.save();
  ctx.translate(cx, cy);
  const color = TOWERS[type].color;

  if (type === 'laser') {
    // Base platform
    ctx.fillStyle = '#1a3322';
    ctx.beginPath();
    ctx.ellipse(0, 4, s * 0.8, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Turret body
    ctx.fillStyle = '#225533';
    ctx.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.7);
    // Rotating barrel
    ctx.fillStyle = color;
    ctx.fillRect(-2, -s * 0.9, 4, s * 0.7);
    // Muzzle glow
    ctx.fillStyle = '#aaffcc';
    ctx.beginPath();
    ctx.arc(0, -s * 0.9, 3, 0, Math.PI * 2);
    ctx.fill();
    // Level dots
    if (level >= 2) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(-s * 0.5, -s * 0.2, 2, 0, Math.PI * 2); ctx.fill();
    }
    if (level >= 3) {
      ctx.fillStyle = color;
      ctx.fillRect(2, -s * 0.9, 4, s * 0.7);
      ctx.beginPath(); ctx.arc(4, -s * 0.9, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'missile') {
    // Launch platform
    ctx.fillStyle = '#331a1a';
    ctx.fillRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.8);
    // Missile tubes
    ctx.fillStyle = '#553333';
    ctx.fillRect(-s * 0.5, -s * 0.7, s * 0.35, s * 0.6);
    ctx.fillRect(s * 0.15, -s * 0.7, s * 0.35, s * 0.6);
    // Missile tips
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.33, -s * 0.95); ctx.lineTo(-s * 0.15, -s * 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.15, -s * 0.7); ctx.lineTo(s * 0.33, -s * 0.95); ctx.lineTo(s * 0.5, -s * 0.7);
    ctx.fill();
    // Exhaust vents
    ctx.fillStyle = '#ff6622';
    if (level >= 2) {
      ctx.beginPath(); ctx.arc(-s * 0.33, s * 0.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.33, s * 0.5, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (level >= 3) {
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.1, -s * 0.95, s * 0.2, s * 0.3);
    }
  } else if (type === 'tesla') {
    // Base coil
    ctx.fillStyle = '#1a2244';
    ctx.beginPath();
    ctx.ellipse(0, 4, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Coil tower
    ctx.strokeStyle = '#3355aa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    for (let i = 0; i < 5; i++) {
      const yy = s * 0.4 - i * (s * 0.25);
      ctx.lineTo((i % 2 === 0 ? -1 : 1) * s * 0.3, yy);
    }
    ctx.stroke();
    // Top orb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.7, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Electricity arcs
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1;
    if (level >= 2) {
      ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.7);
      ctx.lineTo(-s * 0.6, -s * 0.5); ctx.stroke();
    }
    if (level >= 3) {
      ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 0.7);
      ctx.lineTo(s * 0.6, -s * 0.5); ctx.stroke();
      ctx.fillStyle = '#aaddff';
      ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 0.15, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'cryo') {
    // Base
    ctx.fillStyle = '#1a2a33';
    ctx.beginPath();
    ctx.ellipse(0, 4, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tank body
    ctx.fillStyle = '#224455';
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.3); ctx.lineTo(-s * 0.3, -s * 0.5);
    ctx.lineTo(s * 0.3, -s * 0.5); ctx.lineTo(s * 0.4, s * 0.3);
    ctx.closePath(); ctx.fill();
    // Nozzle
    ctx.fillStyle = color;
    ctx.fillRect(-3, -s * 0.9, 6, s * 0.45);
    // Ice crystals
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, -s * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, -s * 0.95); ctx.lineTo(-6, -s * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -s * 0.95); ctx.lineTo(6, -s * 1.05); ctx.stroke();
    if (level >= 2) {
      ctx.fillStyle = 'rgba(136, 255, 255, 0.3)';
      ctx.beginPath(); ctx.arc(0, -s * 0.9, s * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    if (level >= 3) {
      ctx.fillStyle = 'rgba(136, 255, 255, 0.15)';
      ctx.beginPath(); ctx.arc(0, -s * 0.9, s * 0.7, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'railgun') {
    // Heavy base
    ctx.fillStyle = '#2a2a11';
    ctx.fillRect(-s * 0.8, 0, s * 1.6, s * 0.5);
    // Rail tracks
    ctx.fillStyle = '#555522';
    ctx.fillRect(-s * 0.9, -s * 0.15, s * 1.8, 3);
    ctx.fillRect(-s * 0.9, s * -0.35, s * 1.8, 3);
    // Central barrel
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.9, -s * 0.28, s * 1.8, 5);
    // Muzzle flash point
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath(); ctx.arc(-s * 0.9, -s * 0.25, 3, 0, Math.PI * 2); ctx.fill();
    // Capacitor
    ctx.fillStyle = '#444411';
    ctx.fillRect(s * 0.3, -s * 0.6, s * 0.4, s * 0.4);
    if (level >= 2) {
      ctx.fillStyle = color;
      ctx.fillRect(s * 0.35, -s * 0.55, s * 0.3, s * 0.1);
      ctx.fillRect(s * 0.35, -s * 0.4, s * 0.3, s * 0.1);
    }
    if (level >= 3) {
      ctx.strokeStyle = '#ffff88';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(-s * 0.9, -s * 0.25, 5, 0, Math.PI * 2); ctx.stroke();
    }
  }

  ctx.restore();
}

function drawEnemySprite(type, x, y, s, slowAmount) {
  ctx.save();
  ctx.translate(x, y);
  const color = ENEMY_TYPES[type].color;

  if (type === 'scout') {
    // Small triangular drone with wings
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(-s * 0.7, s * 0.6); ctx.lineTo(0, s * 0.3); ctx.lineTo(s * 0.7, s * 0.6);
    ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle = '#aaffaa';
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.25, 0, Math.PI * 2); ctx.fill();
    // Wing tips
    ctx.fillStyle = '#226622';
    ctx.fillRect(-s * 0.9, s * 0.3, s * 0.3, 2);
    ctx.fillRect(s * 0.6, s * 0.3, s * 0.3, 2);
  } else if (type === 'grunt') {
    // Bulky rounded alien body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Armor plates
    ctx.strokeStyle = '#6622aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.5, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, s * 0.2, s * 0.5, -0.8, 0.8); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#ff44ff';
    ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.35, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.35, 2, 0, Math.PI * 2); ctx.fill();
    // Legs/tentacles
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.7); ctx.lineTo(-s * 0.6, s * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.4, s * 0.7); ctx.lineTo(s * 0.6, s * 1.1); ctx.stroke();
  } else if (type === 'armored') {
    // Heavy hexagonal beetle shell
    ctx.fillStyle = '#553300';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = s * Math.cos(a), py = s * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // Inner armor
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = s * 0.65 * Math.cos(a), py = s * 0.65 * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // Mandibles
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.8); ctx.lineTo(-s * 0.5, -s * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.8); ctx.lineTo(s * 0.5, -s * 1.1); ctx.stroke();
    // Eye
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.arc(0, -s * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'wraith') {
    // Fast streaking diamond shape with trail
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.1); ctx.lineTo(-s * 0.5, 0); ctx.lineTo(0, s * 0.5); ctx.lineTo(s * 0.5, 0);
    ctx.closePath(); ctx.fill();
    // Energy core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
    // Speed trail
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.5); ctx.lineTo(-s * 0.4, s * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.5); ctx.lineTo(s * 0.4, s * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.5); ctx.lineTo(0, s * 1.3); ctx.stroke();
  } else if (type === 'mothership') {
    // Large saucer shape
    ctx.fillStyle = '#661111';
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dome on top
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.2, s * 0.5, s * 0.4, 0, Math.PI, 0);
    ctx.fill();
    // Underside glow
    ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 0.6, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Weapon ports
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(-s * 0.6, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.6, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, s * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
    // Antenna
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, -s * 0.85); ctx.stroke();
    ctx.fillStyle = '#ff8888';
    ctx.beginPath(); ctx.arc(0, -s * 0.85, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Slow indicator frost ring
  if (slowAmount > 0) {
    ctx.strokeStyle = 'rgba(136, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(0, 0, s + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawTowers() {
  for (const tower of towers) {
    const stats = getTowerStats(tower);
    const cx = tower.col * TILE + TILE / 2;
    const cy = tower.row * TILE + TILE / 2;

    drawTowerSprite(tower.type, cx, cy, 26, tower.level);

    // Selected highlight
    if (selectedTower === tower) {
      ctx.beginPath();
      ctx.arc(cx, cy, stats.range * TILE, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(240, 192, 64, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(tower.col * TILE + 1, tower.row * TILE + 1, TILE - 2, TILE - 2);
    }
  }
}

function drawEnemies() {
  for (const e of enemies) {
    drawEnemySprite(e.type, e.x, e.y, e.size, e.slowAmount);

    // HP bar
    const barW = e.size * 2.5;
    const barH = 3;
    const barX = e.x - barW / 2;
    const barY = e.y - e.size - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#44ff44' : e.hp / e.maxHp > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + Math.PI / 2);

    // Missile body
    ctx.fillStyle = '#aa2222';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();

    // Nose cone
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(-4, -8);
    ctx.lineTo(4, -8);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = '#661111';
    ctx.beginPath();
    ctx.moveTo(-6, 6); ctx.lineTo(-11, 13); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 6); ctx.lineTo(11, 13); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();

    // Exhaust flame
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(-3, 7); ctx.lineTo(0, 18); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-1.5, 7); ctx.lineTo(0, 14); ctx.lineTo(1.5, 7); ctx.closePath(); ctx.fill();

    ctx.restore();
  }
}

function drawEffects() {
  for (const e of effects) {
    const alpha = Math.max(0, e.life / 0.4);
    if (e.type === 'line') {
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = Math.max(0, e.life / 0.15);
      ctx.lineWidth = e.width || 2;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'cryoblast') {
      const t = Math.max(0, e.life / 0.25);
      const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len, ny = dy / len;
      const px = -dy / len, py = dx / len;

      // Cone spray from tower to target
      ctx.globalAlpha = t * 0.3;
      ctx.fillStyle = '#88ffff';
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2 + px * 15, e.y2 + py * 15);
      ctx.lineTo(e.x2 - px * 15, e.y2 - py * 15);
      ctx.closePath();
      ctx.fill();

      // Inner bright cone
      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = '#ccffff';
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2 + px * 6, e.y2 + py * 6);
      ctx.lineTo(e.x2 - px * 6, e.y2 - py * 6);
      ctx.closePath();
      ctx.fill();

      // Ice particles along the path
      ctx.globalAlpha = t;
      for (let i = 0; i < 6; i++) {
        const frac = 0.3 + i * 0.12;
        const spread = (1 - t) * 10 + Math.sin(i * 2.5) * 6;
        const ix = e.x1 + dx * frac + px * spread;
        const iy = e.y1 + dy * frac + py * spread;
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#aaeeff';
        ctx.fillRect(ix - 2, iy - 2, 4, 4);
      }

      // Frost burst at impact
      ctx.fillStyle = '#ccffff';
      ctx.globalAlpha = t * 0.7;
      ctx.beginPath(); ctx.arc(e.x2, e.y2, 10 * t, 0, Math.PI * 2); ctx.fill();
      // Ice crystal spikes at impact
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = t;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const r = 8 * t;
        ctx.beginPath();
        ctx.moveTo(e.x2, e.y2);
        ctx.lineTo(e.x2 + Math.cos(a) * r, e.y2 + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (e.type === 'lightning') {
      const t = Math.max(0, e.life / 0.18);
      const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const segments = Math.max(4, Math.floor(len / 12));
      const nx = -dy / len, ny = dx / len;

      // Draw jagged bolt
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      for (let i = 1; i < segments; i++) {
        const frac = i / segments;
        const mx = e.x1 + dx * frac;
        const my = e.y1 + dy * frac;
        const jitter = (Math.random() - 0.5) * 14;
        ctx.lineTo(mx + nx * jitter, my + ny * jitter);
      }
      ctx.lineTo(e.x2, e.y2);

      // Outer glow
      ctx.strokeStyle = e.primary ? '#44aaff' : '#2266dd';
      ctx.globalAlpha = t * 0.4;
      ctx.lineWidth = e.primary ? 6 : 4;
      ctx.stroke();

      // Core bolt
      ctx.strokeStyle = e.primary ? '#aaddff' : '#88bbff';
      ctx.globalAlpha = t;
      ctx.lineWidth = e.primary ? 2.5 : 1.5;
      ctx.stroke();

      // Endpoint spark
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = t;
      ctx.beginPath(); ctx.arc(e.x2, e.y2, (e.primary ? 5 : 3) * t, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'laser') {
      const t = Math.max(0, e.life / 0.12);
      // Outer glow
      ctx.strokeStyle = '#00ff88';
      ctx.globalAlpha = t * 0.25;
      ctx.lineWidth = 8 * t;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      // Inner beam
      ctx.strokeStyle = '#88ffcc';
      ctx.globalAlpha = t * 0.7;
      ctx.lineWidth = 3 * t;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      // Hot core
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = t;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      // Impact spark
      ctx.fillStyle = '#aaffdd';
      ctx.globalAlpha = t;
      ctx.beginPath(); ctx.arc(e.x2, e.y2, 4 * t, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'railbeam') {
      const t = Math.max(0, e.life / 0.2);
      // Starts thick and bright, snaps thin fast
      const width = t > 0.7 ? 14 : 14 * t;
      // Outer electric glow
      ctx.strokeStyle = '#ffff44';
      ctx.globalAlpha = t * 0.4;
      ctx.lineWidth = width + 6;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      // Main beam
      ctx.strokeStyle = '#ffffaa';
      ctx.globalAlpha = t * 0.8;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      // White-hot core
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = t;
      ctx.lineWidth = Math.max(2, width * 0.4);
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'railimpact') {
      const t = Math.max(0, e.life / 0.25);
      ctx.globalAlpha = t;
      // Sparks flying outward
      const sparks = 10;
      for (let i = 0; i < sparks; i++) {
        const angle = (Math.PI * 2 / sparks) * i + (1 - t) * 0.5;
        const spread = (1 - t) * 22;
        const sx = e.x + Math.cos(angle) * spread;
        const sy = e.y + Math.sin(angle) * spread;
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#ffdd44';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      // Bright impact flash
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x, e.y, 8 * t, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaa00';
      ctx.globalAlpha = t * 0.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 14 * t, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'particle') {
      ctx.globalAlpha = Math.max(0, e.life / 0.5);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
      ctx.globalAlpha = 1;
    } else if (e.type === 'shockwave') {
      const t = Math.max(0, e.life / 0.25);
      const radius = (1 - t) * 30;
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = t * 0.6;
      ctx.lineWidth = 3 * t;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Inner flash
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = t * t;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPanel() {
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, PANEL_Y, W, PANEL_H);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, PANEL_Y); ctx.lineTo(W, PANEL_Y); ctx.stroke();

  const btnW = 110, btnH = 135, gap = 8;
  const startX = (W - (TOWER_TYPES.length * btnW + (TOWER_TYPES.length - 1) * gap)) / 2;

  TOWER_TYPES.forEach((type, i) => {
    const x = startX + i * (btnW + gap);
    const y = PANEL_Y + 12;
    const def = TOWERS[type];
    const affordable = credits >= def.cost;
    const selected = selectedTowerType === type;

    ctx.fillStyle = selected ? '#222244' : '#1a1a2e';
    ctx.fillRect(x, y, btnW, btnH);
    ctx.strokeStyle = selected ? '#f0c040' : (affordable ? '#444' : '#222');
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x, y, btnW, btnH);

    ctx.globalAlpha = affordable ? 1 : 0.4;

    // Tower sprite icon
    drawTowerSprite(type, x + btnW / 2, y + 45, 28, 1);

    // Name and cost
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, x + btnW / 2, y + 90);
    ctx.fillStyle = affordable ? '#f0c040' : '#666';
    ctx.font = '13px monospace';
    ctx.fillText(`$${def.cost}`, x + btnW / 2, y + 112);

    ctx.globalAlpha = 1;
  });
}

function drawTowerInfo() {
  const tower = selectedTower;
  const stats = getTowerStats(tower);
  const base = TOWERS[tower.type];
  const cx = tower.col * TILE + TILE / 2;
  const cy = tower.row * TILE + TILE / 2;

  const popW = 260, popH = 170;
  let px = cx - popW / 2;
  let py = cy - TILE - popH - 10;
  if (py < 5) py = cy + TILE + 10;
  if (px < 5) px = 5;
  if (px + popW > W - 5) px = W - popW - 5;

  ctx.fillStyle = 'rgba(10, 10, 30, 0.94)';
  ctx.fillRect(px, py, popW, popH);
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, popW, popH);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${base.name} Lv${tower.level}`, px + 14, py + 30);

  ctx.font = '15px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`DMG: ${stats.dmg}   RNG: ${stats.range}`, px + 14, py + 58);
  ctx.fillText(`Rate: ${stats.rate}/s`, px + 14, py + 80);

  // Upgrade button
  const btnY = py + 105;
  const btnH = 48;
  if (tower.level < 3) {
    const upgCost = base.upgrades[tower.level - 1].cost;
    const canUpg = credits >= upgCost;
    ctx.fillStyle = canUpg ? '#224422' : '#222';
    ctx.fillRect(px + 10, btnY, 110, btnH);
    ctx.strokeStyle = canUpg ? '#44ff44' : '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 10, btnY, 110, btnH);
    ctx.fillStyle = canUpg ? '#44ff44' : '#666';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`UPG $${upgCost}`, px + 65, btnY + 30);
  }

  // Sell button
  const sv = sellValue(tower);
  ctx.fillStyle = '#332222';
  ctx.fillRect(px + 140, btnY, 110, btnH);
  ctx.strokeStyle = '#ff6644';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 140, btnY, 110, btnH);
  ctx.fillStyle = '#ff6644';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`SELL $${sv}`, px + 195, btnY + 30);
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, W, PANEL_Y);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, PANEL_Y / 2);
  ctx.font = '16px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Tap Pause or press Esc to resume', W / 2, PANEL_Y / 2 + 35);
}

function drawNextWaveButton() {
  const bw = 260, bh = 70;
  const bx = (W - bw) / 2, by = (PANEL_Y - bh) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(bx - 12, by - 12, bw + 24, bh + 24);
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#44ff44';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#44ff44';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  const secs = Math.ceil(waveCountdown);
  ctx.fillText(`Wave ${currentWave + 1} in ${secs}...`, W / 2, by + bh / 2 + 8);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#88cc88';
  ctx.fillText('tap to start now', W / 2, by + bh - 10);
}

// === Game Loop ===
function gameLoop(ts) {
  if (paused) {
    draw();
    drawPauseOverlay();
    animFrame = requestAnimationFrame(gameLoop);
    return;
  }

  const dt = lastTime ? (ts - lastTime) / 1000 : 0.016;
  lastTime = ts;

  if (state === 'map-select') {
    drawMapSelect();
    animFrame = requestAnimationFrame(gameLoop);
    return;
  }

  if (state === 'playing') {
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateEffects(dt);

    if (enemies.length === 0 && spawnQueue.length === 0) {
      projectiles = [];
      credits += waveBonus(currentWave);
      updateUI();
      if (currentWave >= TOTAL_WAVES) {
        triggerWin();
        return;
      }
      state = 'between-waves';
      waveCountdown = 5;
      saveState();
    }
  } else if (state === 'between-waves') {
    updateEffects(dt);
    waveCountdown -= dt;
    if (waveCountdown <= 0) {
      startNextWave();
    }
  }

  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// === Win / Game Over ===
function triggerWin() {
  state = 'win';
  clearState();
  updatePauseVisibility();
  showWinOverlay($winOverlay);
}

function gameOver() {
  state = 'game-over';
  clearState();
  updatePauseVisibility();
  $gameOverOverlay.hidden = false;
}

// === Input Handling ===
function getCanvasPos(e) {
  const rect = $canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function handleClick(e) {
  e.preventDefault();
  const pos = getCanvasPos(e);
  const { x, y } = pos;

  if (state === 'map-select') {
    handleMapSelectClick(x, y);
    return;
  }

  // Click in panel area
  if (y >= PANEL_Y) {
    handlePanelClick(x, y);
    return;
  }

  // Click "Next Wave" button
  if (state === 'between-waves') {
    const bw = 260, bh = 70;
    const bx = (W - bw) / 2, by = (PANEL_Y - bh) / 2;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
      startNextWave();
      return;
    }
  }

  // Click on grid
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

  // Check if clicking on tower info popup buttons
  if (selectedTower) {
    if (handlePopupClick(x, y)) return;
  }

  // Check if clicking existing tower
  const existing = towerAt(col, row);
  if (existing) {
    selectedTower = existing;
    selectedTowerType = null;
    return;
  }

  // Place tower
  if (selectedTowerType && canPlace(col, row)) {
    const cost = TOWERS[selectedTowerType].cost;
    if (credits >= cost) {
      credits -= cost;
      towers.push({ col, row, type: selectedTowerType, level: 1, cooldown: 0 });
      updateUI();
    }
    return;
  }

  // Deselect
  selectedTower = null;
}

function handlePanelClick(x, y) {
  const btnW = 110, btnH = 135, gap = 8;
  const startX = (W - (TOWER_TYPES.length * btnW + (TOWER_TYPES.length - 1) * gap)) / 2;

  for (let i = 0; i < TOWER_TYPES.length; i++) {
    const bx = startX + i * (btnW + gap);
    const by = PANEL_Y + 10;
    if (x >= bx && x <= bx + btnW && y >= by && y <= by + btnH) {
      const type = TOWER_TYPES[i];
      if (credits >= TOWERS[type].cost) {
        selectedTowerType = selectedTowerType === type ? null : type;
        selectedTower = null;
      }
      return;
    }
  }
}

function handlePopupClick(x, y) {
  const tower = selectedTower;
  const base = TOWERS[tower.type];
  const cx = tower.col * TILE + TILE / 2;
  const cy = tower.row * TILE + TILE / 2;

  const popW = 260, popH = 170;
  let px = cx - popW / 2;
  let py = cy - TILE - popH - 10;
  if (py < 5) py = cy + TILE + 10;
  if (px < 5) px = 5;
  if (px + popW > W - 5) px = W - popW - 5;

  const btnY = py + 105;
  const btnH = 48;

  // Upgrade button
  if (tower.level < 3) {
    const upgCost = base.upgrades[tower.level - 1].cost;
    if (x >= px + 10 && x <= px + 120 && y >= btnY && y <= btnY + btnH) {
      if (credits >= upgCost) {
        credits -= upgCost;
        tower.level++;
        updateUI();
      }
      return true;
    }
  }

  // Sell button
  if (x >= px + 140 && x <= px + 250 && y >= btnY && y <= btnY + btnH) {
    credits += sellValue(tower);
    towers.splice(towers.indexOf(tower), 1);
    selectedTower = null;
    updateUI();
    return true;
  }

  return false;
}

function handleMouseMove(e) {
  const pos = getCanvasPos(e);
  if (pos.y < PANEL_Y) {
    hoverTile = { c: Math.floor(pos.x / TILE), r: Math.floor(pos.y / TILE) };
  } else {
    hoverTile = null;
  }
}

// === UI Updates ===
function updateUI() {
  $waveInfo.textContent = `Wave: ${currentWave}/${TOTAL_WAVES}`;
  $creditsDisplay.textContent = `Credits: ${credits}`;
  $livesDisplay.textContent = `Lives: ${lives}`;
  updatePauseVisibility();
}

// === Persistence ===
function saveState() {
  const data = {
    mapIndex, currentWave, credits, lives,
    towers: towers.map(t => ({ col: t.col, row: t.row, type: t.type, level: t.level }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    mapIndex = data.mapIndex;
    currentWave = data.currentWave;
    credits = data.credits;
    lives = data.lives;
    towers = data.towers.map(t => ({ ...t, cooldown: 0 }));
    buildPathSet(mapIndex);
    state = 'between-waves';
    waveCountdown = 5;
    updateUI();
    return true;
  } catch { return false; }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// === Event Listeners ===
$canvas.addEventListener('click', handleClick);
$canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); }, { passive: false });
$canvas.addEventListener('mousemove', handleMouseMove);
$canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);
  if (pos.y < PANEL_Y) {
    hoverTile = { c: Math.floor(pos.x / TILE), r: Math.floor(pos.y / TILE) };
  } else {
    hoverTile = null;
  }
}, { passive: false });

const $pauseBtn = document.getElementById('btn-pause');
function togglePause() {
  if (state !== 'playing' && state !== 'between-waves') return;
  paused = !paused;
  if (!paused) lastTime = 0;
  $pauseBtn.innerHTML = paused
    ? '▶️ <span class="btn-label">Resume</span>'
    : '⏸️ <span class="btn-label">Pause</span>';
}
function updatePauseVisibility() {
  $pauseBtn.hidden = (state === 'map-select' || state === 'win' || state === 'game-over');
}
$pauseBtn.addEventListener('click', togglePause);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') togglePause();
});

document.getElementById('btn-new-game').addEventListener('click', () => {
  paused = false;
  $pauseBtn.querySelector('.btn-label').textContent = 'Pause';
  clearState();
  if (animFrame) cancelAnimationFrame(animFrame);
  state = 'map-select';
  enemies = []; towers = []; projectiles = []; effects = []; spawnQueue = [];
  selectedTower = null; selectedTowerType = null;
  $winOverlay.hidden = true;
  $gameOverOverlay.hidden = true;
  hideWinOverlay($winOverlay);
  lastTime = 0;
  animFrame = requestAnimationFrame(gameLoop);
});

document.getElementById('btn-retry').addEventListener('click', () => {
  $gameOverOverlay.hidden = true;
  startGame(mapIndex);
});

document.getElementById('btn-play-again').addEventListener('click', () => {
  hideWinOverlay($winOverlay);
  enemies = []; towers = []; projectiles = []; effects = []; spawnQueue = [];
  selectedTower = null; selectedTowerType = null;
  state = 'map-select';
  lastTime = 0;
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = requestAnimationFrame(gameLoop);
});

document.getElementById('btn-help').addEventListener('click', () => $helpModal.showModal());
document.getElementById('btn-help-close').addEventListener('click', () => $helpModal.close());
$helpModal.addEventListener('click', (e) => { if (e.target === $helpModal) $helpModal.close(); });

// === Init ===
if (!loadState()) {
  state = 'map-select';
}
updateUI();
animFrame = requestAnimationFrame(gameLoop);
