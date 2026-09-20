// ============================================================
// Poker UI: all DOM rendering and animation for the table.
// Engine state in -> DOM out. No game logic here.
// ============================================================

import { createCardEl } from '../../js/shared/card-engine.js';
import { cardKey } from './hand-eval.js';
import { potTotal, STREETS, isLive } from './engine.js';

const $ = id => document.getElementById(id);

export const els = {
  get startScreen() { return $('start-screen'); },
  get lessonList() { return $('lesson-list'); },
  get tableScreen() { return $('table-screen'); },
  get table() { return $('table'); },
  get botsRow() { return $('bots-row'); },
  get humanRow() { return $('human-row'); },
  get pot() { return $('pot'); },
  get community() { return $('community'); },
  get banner() { return $('banner'); },
  get handStrength() { return $('hand-strength'); },
  get actionBar() { return $('action-bar'); },
  get btnFold() { return $('btn-fold'); },
  get btnCheckCall() { return $('btn-check-call'); },
  get btnRaise() { return $('btn-raise'); },
  get slider() { return $('raise-slider'); },
  get raiseAmount() { return $('raise-amount'); },
  get raiseRow() { return document.querySelector('.raise-row'); },
  get nextHandRow() { return $('next-hand-row'); },
  get log() { return $('action-log'); },
  get bankroll() { return $('bankroll-display'); },
};

// Seat positions around the oval by table size (index 0 = human at the bottom).
const LAYOUTS = {
  3: ['bottom', 'top-left', 'top-right'],
  4: ['bottom', 'left', 'top', 'right'],
  5: ['bottom', 'left', 'top-left', 'top-right', 'right'],
};

// ---- Screens ----
export function showScreen(name) {
  els.startScreen.hidden = name !== 'start';
  els.lessonList.hidden = name !== 'lessons';
  els.tableScreen.hidden = name !== 'table';
}

// ---- Toast ----
export function showToast(msg, ms = 1600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('fade'), ms);
  setTimeout(() => t.remove(), ms + 600);
}

// ---- Cards ----
function faceUpEl(card) {
  const el = createCardEl({ ...card, faceUp: true });
  el.draggable = false;
  return el;
}

function faceDownEl(card) {
  const el = createCardEl({ ...card, faceUp: false });
  el.draggable = false;
  return el;
}

/**
 * A card slot with a flip wrapper. `revealed` shows the face immediately.
 */
export function createFlipSlot(card, revealed) {
  const slot = document.createElement('div');
  slot.className = 'card-slot' + (revealed ? ' flipped' : '');
  slot.dataset.key = cardKey(card);
  const inner = document.createElement('div');
  inner.className = 'flip-inner';
  const back = document.createElement('div');
  back.className = 'flip-face back';
  back.appendChild(faceDownEl(card));
  const front = document.createElement('div');
  front.className = 'flip-face front';
  front.appendChild(faceUpEl(card));
  inner.append(back, front);
  slot.appendChild(inner);
  return slot;
}

export function createStaticSlot(card) {
  const slot = document.createElement('div');
  slot.className = 'card-slot';
  slot.dataset.key = cardKey(card);
  slot.appendChild(faceUpEl(card));
  return slot;
}

function emptySlot() {
  const slot = document.createElement('div');
  slot.className = 'card-slot empty';
  return slot;
}

function applyDealAnim(slot, delayMs) {
  const table = els.table.getBoundingClientRect();
  const r = slot.getBoundingClientRect();
  const dx = (table.left + table.width / 2) - (r.left + r.width / 2);
  const dy = (table.top + table.height * 0.35) - (r.top + r.height / 2);
  slot.style.setProperty('--deal-dx', `${dx}px`);
  slot.style.setProperty('--deal-dy', `${dy}px`);
  slot.style.animationDelay = `${delayMs}ms`;
  slot.classList.add('dealt');
  slot.addEventListener('animationend', () => slot.classList.remove('dealt'), { once: true });
}

// ---- Seats ----
export function buildSeats(state) {
  const n = state.players.length;
  const layout = LAYOUTS[n] || LAYOUTS[4];
  els.botsRow.innerHTML = '';
  els.humanRow.innerHTML = '';
  state.players.forEach((p, i) => {
    const seat = document.createElement('div');
    seat.className = 'seat ' + (p.isHuman ? 'human' : 'bot');
    seat.dataset.idx = i;
    seat.dataset.pos = layout[i] || 'top';
    seat.innerHTML = `
      <div class="seat-cards"></div>
      <div class="seat-bet" hidden><span class="chip"></span><span class="seat-bet-amt"></span></div>
      <div class="seat-info">
        <div class="dealer-btn" hidden>D</div>
        <div class="seat-name"></div>
        <div class="seat-stack"></div>
        <div class="seat-status"></div>
      </div>`;
    (p.isHuman ? els.humanRow : els.botsRow).appendChild(seat);
  });
}

export function seatEl(idx) {
  return els.table.querySelector(`.seat[data-idx="${idx}"]`);
}

/**
 * Render the table from engine state.
 * @param {object} state
 * @param {{ reveal?: Set<number>|'all', communityCount?: number, animate?: boolean }} view
 *   reveal: which bot seats to show face-up; communityCount: how many board cards to show
 *   (used to animate all-in run-outs one street at a time).
 */
export function renderTable(state, view = {}) {
  const reveal = view.reveal || new Set();
  const betting = STREETS.includes(state.street);
  const communityCount = view.communityCount ?? state.community.length;

  state.players.forEach((p, i) => {
    const seat = seatEl(i);
    if (!seat) return;
    seat.classList.toggle('active', betting && state.currentIdx === i);
    seat.classList.toggle('folded', p.folded);
    seat.classList.toggle('out', p.out);
    seat.querySelector('.seat-name').textContent = p.name;
    seat.querySelector('.seat-stack').textContent = p.stack;
    seat.querySelector('.dealer-btn').hidden = state.dealerIdx !== i;

    const status = seat.querySelector('.seat-status');
    let st = '';
    if (p.out) st = 'Out';
    else if (p.folded) st = 'Folded';
    else if (p.allIn) st = 'All-in';
    else if (state.street === 'preflop' && i === state.bbIdx && p.bet === state.blinds.bb && !state.acted[i]) st = 'Big blind';
    else if (state.street === 'preflop' && i === state.sbIdx && p.bet === state.blinds.sb && !state.acted[i]) st = 'Small blind';
    status.textContent = st;

    const bet = seat.querySelector('.seat-bet');
    bet.hidden = p.bet <= 0;
    bet.querySelector('.seat-bet-amt').textContent = p.bet;

    // Hole cards: rebuild when the hand changes
    const cardsEl = seat.querySelector('.seat-cards');
    const key = `${state.handNo}:${p.holeCards.map(cardKey).join(',')}`;
    if (cardsEl.dataset.hand !== key) {
      cardsEl.dataset.hand = key;
      cardsEl.innerHTML = '';
      if (p.holeCards.length === 0) {
        if (!p.out) cardsEl.append(emptySlot(), emptySlot());
      } else {
        p.holeCards.forEach((c, k) => {
          const slot = createFlipSlot(c, p.isHuman);
          cardsEl.appendChild(slot);
          if (view.animate) applyDealAnim(slot, (i + k * state.players.length) * 70);
        });
      }
    }
    const shouldReveal = p.isHuman || reveal === 'all' || reveal.has?.(i);
    cardsEl.querySelectorAll('.card-slot').forEach(s => {
      if (shouldReveal && p.holeCards.length) s.classList.add('flipped');
    });
  });

  // Community
  const com = els.community;
  const shown = com.querySelectorAll('.card-slot:not(.empty)').length;
  if (state.community.length < shown || state.handNo !== +com.dataset.hand) {
    com.innerHTML = '';
    com.dataset.hand = state.handNo;
  }
  const have = com.querySelectorAll('.card-slot:not(.empty)').length;
  com.querySelectorAll('.card-slot.empty').forEach(e => e.remove());
  for (let k = have; k < communityCount; k++) {
    const slot = createStaticSlot(state.community[k]);
    com.appendChild(slot);
    if (view.animate !== false) applyDealAnim(slot, (k - have) * 120);
  }
  for (let k = communityCount; k < 5; k++) com.appendChild(emptySlot());

  // Pot
  const total = potTotal(state);
  els.pot.textContent = state.street === 'hand-over' && state.results
    ? `Pot: ${state.results.total}`
    : `Pot: ${total}`;
}

/**
 * Fly the visible street bets into the pot (call before re-rendering a new street).
 */
export function flyBetsToPot() {
  const potRect = els.pot.getBoundingClientRect();
  els.table.querySelectorAll('.seat-bet:not([hidden])').forEach(bet => {
    const r = bet.getBoundingClientRect();
    const clone = bet.cloneNode(true);
    Object.assign(clone.style, {
      position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, margin: 0,
      zIndex: 5000, pointerEvents: 'none', transition: 'transform 0.45s ease-in, opacity 0.45s ease-in',
    });
    document.body.appendChild(clone);
    const dx = potRect.left + potRect.width / 2 - (r.left + r.width / 2);
    const dy = potRect.top + potRect.height / 2 - (r.top + r.height / 2);
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`;
      clone.style.opacity = '0.2';
    });
    setTimeout(() => clone.remove(), 500);
  });
}

export function clearWinners() {
  els.table.querySelectorAll('.card.winning').forEach(c => c.classList.remove('winning'));
  els.table.querySelectorAll('.seat.winner').forEach(s => s.classList.remove('winner'));
  els.table.querySelectorAll('.card-slot.dim').forEach(s => s.classList.remove('dim'));
}

/**
 * Highlight winning seats and the five cards that make the best hand.
 */
export function markWinners(state) {
  clearWinners();
  const res = state.results;
  if (!res) return;
  const winnerIdx = new Set(res.pots.filter(p => !p.refund).flatMap(p => p.winners.map(w => w.idx)));
  for (const idx of winnerIdx) seatEl(idx)?.classList.add('winner');
  if (res.uncontested) return;
  const keys = new Set();
  for (const idx of winnerIdx) res.hands[idx]?.best5.forEach(k => keys.add(k));
  els.table.querySelectorAll('.card-slot[data-key]').forEach(slot => {
    const seat = slot.closest('.seat');
    const idx = seat ? +seat.dataset.idx : null;
    const relevant = seat ? winnerIdx.has(idx) : true;
    if (relevant && keys.has(slot.dataset.key)) {
      // Only the visible face: flip slots hold a back and a front card element
      const card = slot.querySelector('.flip-face.front .card') || slot.querySelector('.card');
      card?.classList.add('winning');
    } else if (relevant) {
      slot.classList.add('dim');
    }
  });
}

export function winnersText(state) {
  const res = state.results;
  if (!res) return '';
  if (res.uncontested) {
    const w = res.pots[0].winners[0];
    return `${state.players[w.idx].name} win${state.players[w.idx].isHuman ? '' : 's'} ${w.amount} uncontested`;
  }
  return res.pots.filter(p => !p.refund).map(pot => {
    const names = pot.winners.map(w => state.players[w.idx].name).join(' & ');
    const amt = pot.winners.map(w => w.amount).reduce((a, b) => a + b, 0);
    const verb = pot.winners.length === 1 && !state.players[pot.winners[0].idx].isHuman ? 'wins' : 'win';
    return `${names} ${verb} ${amt} with ${pot.desc}`;
  }).join(' · ');
}

// ---- Banner / strength ----
export function showBanner(text) {
  els.banner.textContent = text;
  els.banner.hidden = false;
}

export function hideBanner() {
  els.banner.hidden = true;
}

export function setHandStrength(text) {
  els.handStrength.textContent = text || '';
}

// ---- Action bar ----
let sliderState = null;

/**
 * Show the action bar for the human with the given legal actions.
 * @param {object} la legalActions(state)
 * @param {object} state
 * @param {{ allow?: string[] }} opts  restrict enabled buttons (tutorial)
 */
export function showActionBar(la, state, opts = {}) {
  const allow = opts.allow ? new Set(opts.allow) : null;
  const ok = t => !allow || allow.has(t);
  const bar = els.actionBar;
  bar.hidden = false;

  els.btnFold.disabled = !ok('fold');
  if (la.check) {
    els.btnCheckCall.textContent = 'Check';
    els.btnCheckCall.dataset.action = 'check';
    els.btnCheckCall.disabled = !ok('check');
  } else {
    const human = state.players[state.currentIdx];
    const allIn = la.call >= human.stack;
    els.btnCheckCall.textContent = allIn ? `Call ${la.call} (all-in)` : `Call ${la.call}`;
    els.btnCheckCall.dataset.action = 'call';
    els.btnCheckCall.disabled = !ok('call');
  }

  if (la.raise) {
    const isBet = la.check || (state.players.every(p => p.bet === 0));
    sliderState = { min: la.raise.min, max: la.raise.max, isBet, step: state.blinds.bb, state };
    const s = els.slider;
    s.min = la.raise.min;
    s.max = la.raise.max;
    s.step = 1;
    s.value = la.raise.min;
    els.raiseRow.dataset.disabled = ok('raise') ? 'false' : 'true';
    els.btnRaise.disabled = !ok('raise');
    updateRaiseLabel(la.raise.min);
  } else {
    sliderState = null;
    els.raiseRow.dataset.disabled = 'true';
    els.btnRaise.disabled = true;
    els.btnRaise.textContent = 'Raise';
    els.raiseAmount.textContent = '—';
  }
}

export function hideActionBar() {
  els.actionBar.hidden = true;
}

export function getRaiseAmount() {
  return +els.slider.value;
}

export function setRaiseAmount(v) {
  if (!sliderState) return;
  const clamped = Math.max(sliderState.min, Math.min(sliderState.max, Math.round(v)));
  els.slider.value = clamped;
  updateRaiseLabel(clamped);
}

function updateRaiseLabel(v) {
  if (!sliderState) return;
  els.raiseAmount.textContent = v;
  const verb = sliderState.isBet ? 'Bet' : 'Raise to';
  els.btnRaise.textContent = v >= sliderState.max ? `All-in ${v}` : `${verb} ${v}`;
}

export function presetAmount(kind) {
  if (!sliderState) return null;
  const { state, min, max } = sliderState;
  const human = state.players[state.currentIdx];
  const pot = potTotal(state);
  const mb = Math.max(...state.players.filter(isLive).map(p => p.bet));
  const need = mb - human.bet;
  const potAfterCall = pot + need;
  switch (kind) {
    case 'min': return min;
    case 'half': return Math.max(min, Math.round(mb + potAfterCall / 2));
    case 'pot': return Math.max(min, Math.round(mb + potAfterCall));
    case 'allin': return max;
    default: return min;
  }
}

export function wireActionBar({ onFold, onCheckCall, onRaise }) {
  els.btnFold.addEventListener('click', onFold);
  els.btnCheckCall.addEventListener('click', () => onCheckCall(els.btnCheckCall.dataset.action));
  els.btnRaise.addEventListener('click', () => onRaise(getRaiseAmount()));
  els.slider.addEventListener('input', () => updateRaiseLabel(+els.slider.value));
  els.raiseRow.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = presetAmount(btn.dataset.preset);
      if (v != null) setRaiseAmount(v);
    });
  });
}

// ---- Log ----
export function renderLog(history) {
  const log = els.log;
  log.innerHTML = '';
  const recent = history.slice(-40);
  for (const h of recent) {
    const line = document.createElement('div');
    line.className = 'log-line ' + (h.action || '');
    line.textContent = h.text;
    log.appendChild(line);
  }
  log.scrollTop = log.scrollHeight;
}

// ---- Lesson list ----
export function renderLessonList(lessons, completed, onStart) {
  const ol = document.getElementById('lessons');
  ol.innerHTML = '';
  lessons.forEach((l, i) => {
    const done = completed.includes(l.id);
    const li = document.createElement('li');
    li.className = 'lesson-item' + (done ? ' done' : '');
    li.dataset.lesson = l.id;
    li.innerHTML = `
      <span class="lesson-num">${done ? '✓' : i + 1}</span>
      <div class="lesson-body">
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-blurb">${l.blurb}</div>
      </div>
      <button class="btn lesson-start">${done ? 'Replay' : 'Start'}</button>`;
    li.querySelector('.lesson-start').addEventListener('click', () => onStart(l.id));
    ol.appendChild(li);
  });
  const prog = document.getElementById('course-progress');
  const n = lessons.filter(l => completed.includes(l.id)).length;
  prog.textContent = n === lessons.length
    ? '🎓 Course complete! Replay any lesson below.'
    : `${n} of ${lessons.length} lessons completed`;
}

export function setBankroll(v) {
  els.bankroll.textContent = v;
}
