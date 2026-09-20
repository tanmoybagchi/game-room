// ============================================================
// Poker controller: wires engine <-> ui <-> bots <-> tutorial,
// owns timers, mode switching and persistence.
// ============================================================

import {
  saveToStorage, loadFromStorage, CARD_BACKS, applyCardBack, randomCardBackIndex, wireHelpModal,
} from '../../js/shared/card-engine.js';
import { showWinOverlay, hideWinOverlay } from '../../js/shared/win-animation.js';
import * as E from './engine.js';
import { decide } from './bot.js';
import { describePartial } from './hand-eval.js';
import * as ui from './ui.js';
import { tutorial } from './tutorial.js';
import { LESSONS } from './lessons.js';

const STORAGE_KEY = 'gameroom-poker';
const SAVE_VERSION = 1;
const HISTORY_CAP = 60;
const BIG_STACK = 5000;

// ---- Persistence ----
function defaultSave() {
  return {
    v: SAVE_VERSION,
    bankroll: E.DEFAULT_STACK,
    settings: { botCount: 3, cardBack: randomCardBackIndex() },
    lessonsCompleted: [],
    bots: [],
    hand: null,
    reachedBigStack: false,
  };
}

function loadSave() {
  const raw = loadFromStorage(STORAGE_KEY);
  const d = defaultSave();
  if (!raw || raw.v !== SAVE_VERSION) return d;
  return {
    ...d,
    ...raw,
    settings: { ...d.settings, ...(raw.settings || {}) },
    lessonsCompleted: Array.isArray(raw.lessonsCompleted) ? raw.lessonsCompleted : [],
    bots: Array.isArray(raw.bots) ? raw.bots : [],
  };
}

let save = loadSave();

function persist() {
  if (mode === 'play' && state) {
    state.history = state.history.slice(-HISTORY_CAP);
    save.hand = state.street === 'hand-over' || state.street === 'idle' ? null : state;
    save.bots = state.players.slice(1).map(p => ({ name: p.name, personality: p.personality, stack: p.stack }));
    save.bankroll = state.players[0].stack;
  }
  saveToStorage(STORAGE_KEY, save);
}

// ---- Runtime ----
let state = null;
let mode = 'idle'; // 'idle' | 'play' | 'tutorial'
let botDelay = { min: 450, max: 1100 };
let fastDelay = 250;
let autoAdvanceMs = 5000;
let timer = null;
let handOverTimer = null;
let runoutTimer = null;

function clearTimers() {
  clearTimeout(timer); timer = null;
  clearTimeout(handOverTimer); handOverTimer = null;
  clearTimeout(runoutTimer); runoutTimer = null;
}

function human() { return state.players[0]; }

function newGameLabel() {
  document.getElementById('btn-new-game-label').textContent = mode === 'tutorial' ? 'Restart Lesson' : 'New Hand';
}

// ---- Entering play ----
function enterPlay() {
  clearTimers();
  mode = 'play';
  const botCount = save.settings.botCount;
  const saved = save.hand;
  if (saved && saved.players?.length === botCount + 1 && E.STREETS.includes(saved.street)) {
    state = saved;
  } else {
    state = E.createTable({ botCount, humanStack: save.bankroll, bots: save.bots });
    save.hand = null;
  }
  newGameLabel();
  ui.buildSeats(state);
  ui.showScreen('table');
  document.getElementById('bust-overlay').hidden = true;
  if (state.street === 'idle' || state.street === 'hand-over') {
    startNewHand();
  } else {
    ui.renderTable(state, { animate: false });
    ui.renderLog(state.history);
    updateStrength();
    scheduleNext();
  }
}

/**
 * Start a new hand. `rig` may contain { deck, dealerIdx } (tutorial/tests).
 */
function startNewHand(rig = {}) {
  clearTimers();
  if (E.STREETS.includes(state.street)) cancelHand(); // abandoning a hand in progress refunds everyone
  ui.clearWinners();
  ui.hideBanner();
  ui.hideActionBar();
  ui.els.nextHandRow.hidden = true;
  // Busted bots buy back in so the table never runs dry
  state.players.forEach((p, i) => { if (!p.isHuman && (p.out || p.stack <= 0)) E.rebuy(state, i); });
  if (human().out || human().stack <= 0) return showBust();
  E.startHand(state, rig);
  ui.renderTable(state, { animate: true });
  ui.renderLog(state.history);
  updateStrength();
  persist();
  tutorial.onStateChange?.(state);
  scheduleNext();
}

function scheduleNext() {
  clearTimeout(timer); timer = null;
  if (state.street === 'hand-over') { onHandOver(); return; }
  if (state.currentIdx < 0) return;
  const p = state.players[state.currentIdx];
  if (p.isHuman) {
    humanTurn();
  } else {
    if (tutorial.active && tutorial.holdBots) return; // coach is talking; resumed via ctx.resume()
    const humanOut = !E.isLive(human());
    const d = humanOut ? fastDelay : botDelay.min + Math.random() * (botDelay.max - botDelay.min);
    timer = setTimeout(botTurn, d);
  }
}

function humanTurn() {
  const la = E.legalActions(state);
  const opts = tutorial.active ? tutorial.actionOptions(state, la) : {};
  ui.showActionBar(la, state, opts);
  tutorial.onHumanTurn?.(state, la);
}

function botTurn() {
  timer = null;
  const idx = state.currentIdx;
  if (idx < 0 || state.players[idx].isHuman) return;
  if (tutorial.active && tutorial.holdBots) return;
  const action = (tutorial.active && tutorial.botOverride(state, idx)) || decide(state, idx);
  doAction(action);
}

function humanAct(action) {
  if (ui.els.actionBar.hidden) return;
  if (state.currentIdx !== 0) return;
  if (tutorial.active && !tutorial.interceptAction(action, state)) return; // rejected by the coach
  ui.hideActionBar();
  doAction(action);
}

function doAction(action) {
  const prevCom = state.community.length;
  const prevStreet = state.street;
  const hadBets = state.players.some(p => p.bet > 0);
  try {
    E.applyAction(state, action);
  } catch (err) {
    console.error('Illegal action', action, err);
    // Fall back to something legal so the game never stalls
    const la = E.legalActions(state);
    if (la) E.applyAction(state, la.check ? { type: 'check' } : { type: 'fold' });
  }
  if (state.street !== prevStreet && (hadBets || action.type === 'call' || action.type === 'raise')) ui.flyBetsToPot();
  afterAction(prevCom);
}

function afterAction(prevCom) {
  const len = state.community.length;
  const runout = (prevCom === 0 && len > 3) || (prevCom === 3 && len === 5);
  ui.renderLog(state.history);
  if (runout) {
    // Everyone is all-in: reveal the board one street at a time
    const steps = [3, 4, 5].filter(n => n > prevCom && n <= len);
    ui.renderTable(state, { communityCount: prevCom, reveal: liveBots() });
    let k = 0;
    const step = () => {
      ui.renderTable(state, { communityCount: steps[k] });
      updateStrength(steps[k]);
      k++;
      if (k < steps.length) runoutTimer = setTimeout(step, 900);
      else runoutTimer = setTimeout(() => { persist(); tutorial.onStateChange?.(state); scheduleNext(); }, 900);
    };
    runoutTimer = setTimeout(step, 500);
    return;
  }
  ui.renderTable(state);
  updateStrength();
  persist();
  tutorial.onStateChange?.(state);
  scheduleNext();
}

function liveBots() {
  const s = new Set();
  state.players.forEach((p, i) => { if (!p.isHuman && E.isLive(p)) s.add(i); });
  return s;
}

function updateStrength(communityCount = null) {
  const h = human();
  if (!h.holeCards.length) return ui.setHandStrength('');
  if (h.folded) return ui.setHandStrength('You folded');
  if (state.street === 'hand-over' && state.results?.hands?.[0]) {
    return ui.setHandStrength(`You have: ${state.results.hands[0].desc}`);
  }
  const com = communityCount == null ? state.community : state.community.slice(0, communityCount);
  ui.setHandStrength(`You have: ${describePartial([...h.holeCards, ...com])}`);
}

function onHandOver() {
  clearTimers();
  ui.hideActionBar();
  const reveal = state.results.uncontested ? new Set() : liveBots();
  ui.renderTable(state, { reveal });
  ui.markWinners(state);
  ui.showBanner(ui.winnersText(state));
  ui.renderLog(state.history);
  updateStrength();

  const { humanBusted } = E.settleHand(state);

  if (mode === 'play') {
    persist();
    if (!humanBusted && human().stack >= BIG_STACK && !save.reachedBigStack) {
      save.reachedBigStack = true;
      persist();
      celebrate('🏆 Big Stack!', `You've built a ${BIG_STACK}-chip stack. Keep it rolling!`);
    }
  }

  if (tutorial.active) {
    tutorial.onHandOver?.(state);
    return;
  }

  if (humanBusted) {
    handOverTimer = setTimeout(showBust, 1800);
    return;
  }
  ui.els.nextHandRow.hidden = false;
  handOverTimer = setTimeout(() => startNewHand(), autoAdvanceMs);
}

function showBust() {
  clearTimers();
  ui.hideActionBar();
  ui.els.nextHandRow.hidden = true;
  document.getElementById('bust-overlay').hidden = false;
}

function rebuyHuman() {
  document.getElementById('bust-overlay').hidden = true;
  E.rebuy(state, 0, E.DEFAULT_STACK);
  save.bankroll = E.DEFAULT_STACK;
  persist();
  startNewHand();
}

function celebrate(title, text) {
  document.getElementById('win-title').textContent = title;
  document.getElementById('win-text').textContent = text;
  showWinOverlay(document.getElementById('win-overlay'));
}

// Abandon the current hand: refund all chips in the middle to their owners.
function cancelHand() {
  clearTimers();
  ui.hideActionBar();
  if (!state) return;
  for (const p of state.players) {
    p.stack += p.bet + p.totalBet;
    p.bet = 0; p.totalBet = 0;
    p.folded = false; p.allIn = false; p.holeCards = [];
  }
  state.community = [];
  state.pot = 0;
  state.street = 'idle';
  state.currentIdx = -1;
  state.results = null;
}

function goToMenu() {
  clearTimers();
  ui.hideActionBar();
  if (tutorial.active) tutorial.exit();
  if (mode === 'play') persist();
  mode = 'idle';
  ui.setBankroll(save.bankroll);
  ui.showScreen('start');
  newGameLabel();
}

// ---- Tutorial ----
function showLessons() {
  ui.renderLessonList(LESSONS, save.lessonsCompleted, startLesson);
  ui.showScreen('lessons');
}

function startLesson(id) {
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson) return;
  clearTimers();
  mode = 'tutorial';
  newGameLabel();
  state = E.createTable({
    botCount: 3,
    bots: [
      { name: 'Ava', personality: { aggression: 1, looseness: 1, bluffFreq: 0.05 } },
      { name: 'Bruno', personality: { aggression: 1.2, looseness: 1.1, bluffFreq: 0.08 } },
      { name: 'Chen', personality: { aggression: 0.8, looseness: 0.9, bluffFreq: 0.03 } },
    ],
  });
  ui.buildSeats(state);
  ui.clearWinners();
  ui.hideBanner();
  ui.hideActionBar();
  ui.els.nextHandRow.hidden = true;
  ui.showScreen('table');
  ui.renderTable(state, { animate: false });
  ui.renderLog([]);
  ui.setHandStrength('');
  tutorial.start(lesson, tutorialCtx);
}

const tutorialCtx = {
  getState: () => state,
  startHand: rig => startNewHand(rig),
  cancelHand,
  buildDeck: (dealerIdx, spec) => E.buildRiggedDeck(state, dealerIdx, spec),
  legalActions: () => E.legalActions(state),
  showActionBar: opts => { if (state.currentIdx === 0 && E.STREETS.includes(state.street)) ui.showActionBar(E.legalActions(state), state, opts); },
  hideActionBar: () => ui.hideActionBar(),
  isHumanTurn: () => state.currentIdx === 0 && E.STREETS.includes(state.street),
  resume: () => { if (state && E.STREETS.includes(state.street)) scheduleNext(); },
  setBotDelay: ms => { botDelay = { min: ms, max: ms }; fastDelay = Math.min(ms, 250); },
  resetBotDelay: () => { botDelay = { min: 450, max: 1100 }; fastDelay = 250; },
  renderTable: view => ui.renderTable(state, view),
  toast: msg => ui.showToast(msg),
  complete: id => {
    if (!save.lessonsCompleted.includes(id)) save.lessonsCompleted.push(id);
    persist();
    if (LESSONS.every(l => save.lessonsCompleted.includes(l.id))) {
      celebrate('🎓 Course Complete!', 'You finished every lesson. Time to take a seat at the table.');
    }
  },
  exitToLessons: () => {
    clearTimers();
    ui.hideActionBar();
    mode = 'idle';
    newGameLabel();
    showLessons();
  },
};

// ---- Wiring ----
function init() {
  applyCardBack(CARD_BACKS[save.settings.cardBack] || CARD_BACKS[0]);
  ui.setBankroll(save.bankroll);
  document.getElementById('bot-count').value = String(save.settings.botCount);

  wireHelpModal(
    document.getElementById('btn-help'),
    document.getElementById('btn-help-close'),
    document.getElementById('help-modal'),
  );

  document.getElementById('btn-play').addEventListener('click', () => {
    const n = +document.getElementById('bot-count').value;
    if (n !== save.settings.botCount) { save.settings.botCount = n; save.hand = null; }
    persist();
    enterPlay();
  });
  document.getElementById('btn-tutorial').addEventListener('click', showLessons);
  document.getElementById('btn-lessons-back').addEventListener('click', () => ui.showScreen('start'));
  document.getElementById('btn-menu').addEventListener('click', goToMenu);
  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (mode === 'tutorial') { tutorial.restart(); return; }
    if (mode !== 'play') return;
    startNewHand();
  });
  document.getElementById('btn-next-hand').addEventListener('click', () => { if (mode === 'play') startNewHand(); });
  document.getElementById('btn-play-again').addEventListener('click', rebuyHuman);
  document.getElementById('btn-win-continue').addEventListener('click', () => hideWinOverlay(document.getElementById('win-overlay')));

  ui.wireActionBar({
    onFold: () => humanAct({ type: 'fold' }),
    onCheckCall: kind => humanAct({ type: kind }),
    onRaise: amount => humanAct({ type: 'raise', amount }),
  });

  document.addEventListener('keydown', e => {
    if (ui.els.actionBar.hidden || e.target.closest('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'f' && !ui.els.btnFold.disabled) humanAct({ type: 'fold' });
    else if (k === 'c' && !ui.els.btnCheckCall.disabled) humanAct({ type: ui.els.btnCheckCall.dataset.action });
    else if (k === 'r' && !ui.els.btnRaise.disabled) humanAct({ type: 'raise', amount: ui.getRaiseAmount() });
  });

  ui.showScreen('start');
  newGameLabel();
}

init();

// ---- Debug / test hook (used by Playwright specs; harmless in production) ----
window.__poker = {
  getState: () => state,
  getSave: () => save,
  getMode: () => mode,
  setBotDelay: ms => { botDelay = { min: ms, max: ms }; fastDelay = Math.min(ms, fastDelay); },
  setAutoAdvance: ms => { autoAdvanceMs = ms; },
  setTutorialDelay: ms => { tutorial.botDelayMs = ms; },
  lessons: LESSONS,
  startHand: rig => startNewHand(rig),
  rig: (spec, dealerIdx = 0) => startNewHand({ deck: E.buildRiggedDeck(state, dealerIdx, spec), dealerIdx }),
  act: action => humanAct(action),
  enterPlay,
  cancelHand,
  engine: E,
};
