// ============================================================
// Tutorial runner: plays lesson steps on the real table.
// The controller consults `tutorial` on every bot turn / human action.
// ============================================================

import { createCardEl } from '../../js/shared/card-engine.js';
import { parseCards } from './hand-eval.js';
import { legalActions, maxBet, potTotal } from './engine.js';

const $ = id => document.getElementById(id);

const TALK_STEPS = new Set(['say', 'highlight', 'quiz', 'showCards', 'endLesson']);
const COUNTED = new Set(['say', 'highlight', 'quiz', 'showCards', 'awaitAction', 'awaitHandOver', 'endLesson']);

// Named spotlight targets -> selectors (functions receive engine state)
const TARGETS = {
  'human-cards': () => '.seat.human .seat-cards',
  'human-seat': () => '.seat.human .seat-info',
  community: () => '#community',
  pot: () => '#pot',
  'btn-fold': () => '#btn-fold',
  'btn-check-call': () => '#btn-check-call',
  'btn-raise': () => '#btn-raise',
  presets: () => '.presets',
  slider: () => '.slider-wrap',
  'action-bar': () => '#action-bar',
  'hand-strength': () => '#hand-strength',
  dealer: s => `.seat[data-idx="${s.dealerIdx}"] .seat-info`,
  'dealer-btn': s => `.seat[data-idx="${s.dealerIdx}"] .dealer-btn`,
  sb: s => `.seat[data-idx="${s.sbIdx}"] .seat-info`,
  bb: s => `.seat[data-idx="${s.bbIdx}"] .seat-info`,
  log: () => '#action-log-wrap',
};

function resolveTarget(t, state) {
  if (!t) return null;
  if (typeof t === 'function') t = t(state);
  if (t.startsWith('seat:')) return document.querySelector(`.seat[data-idx="${t.slice(5)}"] .seat-info`);
  const sel = TARGETS[t] ? TARGETS[t](state) : t;
  return document.querySelector(sel);
}

function cardsEl(str) {
  const wrap = document.createElement('div');
  wrap.className = 'card-group-cards';
  for (const c of parseCards(str)) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    const el = createCardEl({ ...c, faceUp: true });
    el.draggable = false;
    slot.appendChild(el);
    wrap.appendChild(slot);
  }
  return wrap;
}

export const tutorial = {
  active: false,
  holdBots: false,
  lesson: null,
  ctx: null,
  runId: 0,
  stepIdx: 0,
  pending: null,        // { type, step, resolve }
  botQueues: {},
  botDefault: 'check-call',
  botDelayMs: 700,      // bot think time during lessons (tests set 0)
  allow: [],
  _spotTarget: null,
  _wired: false,

  // ---------- lifecycle ----------
  start(lesson, ctx) {
    this.wire();
    this.lesson = lesson;
    this.ctx = ctx;
    this.active = true;
    this.botQueues = {};
    this.botDefault = 'check-call';
    this.allow = [];
    this.pending = null;
    ctx.setBotDelay(this.botDelayMs);
    $('coach-lesson-title').textContent = lesson.title;
    this.run();
  },

  restart() {
    if (!this.lesson) return;
    const { lesson, ctx } = this;
    this.stop();
    ctx.cancelHand();
    ctx.renderTable({ animate: false });
    this.start(lesson, ctx);
  },

  exit() {
    const ctx = this.ctx;
    this.stop();
    ctx?.resetBotDelay();
    ctx?.cancelHand();
  },

  stop() {
    this.runId++;
    this.active = false;
    this.holdBots = false;
    this.pending = null;
    this.hideCoach();
    this.spotlight(null);
  },

  wire() {
    if (this._wired) return;
    this._wired = true;
    $('coach-next').addEventListener('click', () => this.pending?.type === 'next' && this.resolvePending());
    $('coach-exit').addEventListener('click', () => { const ctx = this.ctx; this.exit(); ctx.exitToLessons(); });
    window.addEventListener('resize', () => this._spotTarget && this.spotlight(this._spotTarget));
  },

  // ---------- runner ----------
  async run() {
    const id = ++this.runId;
    this.active = true;
    const steps = this.lesson.steps;
    const counted = steps.filter(s => COUNTED.has(s.type)).length;
    let done = 0;
    for (let i = 0; i < steps.length; i++) {
      if (this.runId !== id) return;
      const step = steps[i];
      this.stepIdx = i;
      if (COUNTED.has(step.type)) this.renderProgress(counted, done);
      await this.runStep(step);
      if (this.runId !== id) return;
      if (COUNTED.has(step.type)) done++;
    }
  },

  renderProgress(total, done) {
    const el = $('coach-progress');
    el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < done ? ' done' : i === done ? ' current' : '');
      el.appendChild(d);
    }
  },

  waitFor(type, step) {
    return new Promise(resolve => { this.pending = { type, step, resolve }; });
  },

  resolvePending(value) {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    p.resolve(value);
  },

  async runStep(step) {
    const state = this.ctx.getState();
    if (TALK_STEPS.has(step.type)) this.holdBots = true;
    else $('coach-next').hidden = true; // no stale Next button while silent steps run
    switch (step.type) {
      case 'say':
      case 'highlight': {
        this.showCoach({ text: step.text, next: true, cards: step.cards, keepCards: step.keepCards });
        this.spotlight(step.target ? resolveTarget(step.target, state) : null);
        await this.waitFor('next', step);
        this.spotlight(null);
        break;
      }
      case 'showCards': {
        this.showCoach({ text: step.text, next: true, cards: step.groups });
        await this.waitFor('next', step);
        break;
      }
      case 'quiz': {
        await this.runQuiz(step);
        break;
      }
      case 'rigDeck': {
        const ctx = this.ctx;
        if (['preflop', 'flop', 'turn', 'river'].includes(state.street)) ctx.cancelHand();
        const spec = {
          holes: Object.fromEntries(Object.entries(step.holes || {}).map(([k, v]) => [k, parseCards(v)])),
          board: step.board ? parseCards(step.board) : [],
        };
        this.holdBots = true; // the deal happens, but bots wait until a step releases them
        const deck = ctx.buildDeck(step.dealerIdx ?? 0, spec);
        ctx.startHand({ deck, dealerIdx: step.dealerIdx ?? 0 });
        await new Promise(r => setTimeout(r, step.wait ?? 400));
        break;
      }
      case 'botScript': {
        for (const [seat, actions] of Object.entries(step.seats || {})) this.botQueues[seat] = [...actions];
        if (step.default) this.botDefault = step.default;
        break;
      }
      case 'awaitAction': {
        await this.runAwaitAction(step);
        break;
      }
      case 'awaitStreet': {
        this.showCoach({ text: step.text, next: false, up: true, keepCards: step.keepCards });
        this.allow = ['check', 'call'];
        this.release();
        const s = this.ctx.getState();
        if (!this.streetReached(s, step.street)) await this.waitFor('street', step);
        break;
      }
      case 'awaitTurn': {
        // Let the bots act until it is the human's turn (or the hand ends)
        this.showCoach({ text: step.text, next: false, up: true, keepCards: step.keepCards });
        this.allow = [];
        this.release();
        const s = this.ctx.getState();
        if (!this.ctx.isHumanTurn() && s.street !== 'hand-over') await this.waitFor('turn', step);
        break;
      }
      case 'awaitHandOver': {
        this.showCoach({ text: step.text, next: false, up: true });
        this.allow = step.allow || ['fold', 'check', 'call', 'raise'];
        this.release();
        if (this.ctx.getState().street !== 'hand-over') await this.waitFor('handOver', step);
        break;
      }
      case 'endLesson': {
        this.showCoach({ text: step.text, next: true, nextLabel: 'Finish ✓' });
        await this.waitFor('next', step);
        const ctx = this.ctx;
        const id = this.lesson.id;
        this.exit();
        ctx.complete(id);
        ctx.exitToLessons();
        break;
      }
      default:
        console.warn('Unknown step', step);
    }
  },

  streetReached(state, street) {
    const order = ['preflop', 'flop', 'turn', 'river', 'showdown', 'hand-over'];
    return order.indexOf(state.street) >= order.indexOf(street);
  },

  release() {
    this.holdBots = false;
    if (this.ctx.isHumanTurn()) this.ctx.showActionBar({ allow: this.allow });
    else this.ctx.resume();
  },

  async runQuiz(step) {
    this.showCoach({ text: step.prompt, next: false, cards: step.groups, keepCards: step.keepCards });
    const box = $('coach-choices');
    box.innerHTML = '';
    let feedback = null;
    const result = await new Promise(resolve => {
      step.choices.forEach((label, i) => {
        const b = document.createElement('button');
        b.className = 'btn coach-choice';
        b.textContent = label;
        b.addEventListener('click', () => {
          const correct = typeof step.answer === 'function' ? step.answer(i) : i === step.answer;
          box.querySelectorAll('.coach-choice').forEach(x => x.classList.remove('wrong'));
          feedback?.remove();
          feedback = document.createElement('div');
          if (correct) {
            b.classList.add('correct');
            box.querySelectorAll('.coach-choice').forEach(x => { x.disabled = true; });
            feedback.className = 'coach-feedback good';
            feedback.textContent = step.explain || 'Correct!';
            box.appendChild(feedback);
            resolve(true);
          } else {
            b.classList.add('wrong');
            feedback.className = 'coach-feedback bad';
            feedback.textContent = (step.wrong && step.wrong[i]) || step.wrongText || 'Not quite — try again.';
            box.appendChild(feedback);
          }
        });
        box.appendChild(b);
      });
    });
    void result;
    $('coach-next').hidden = false;
    this.pending = null;
    await this.waitFor('next', step);
    box.innerHTML = '';
  },

  async runAwaitAction(step) {
    this.allow = step.allow || ['fold', 'check', 'call', 'raise'];
    this.showCoach({ text: step.text, next: false, up: true, keepCards: step.keepCards });
    this.release();
    const accepted = await this.waitFor('action', step);
    void accepted;
    if (step.onRight) {
      this.holdBots = true;
      this.showCoach({ text: step.onRight, next: true, feedback: 'good' });
      await this.waitFor('next', step);
    }
  },

  // ---------- controller hooks ----------
  botOverride(state, idx) {
    const q = this.botQueues[idx];
    const spec = q && q.length ? q.shift() : this.botDefault;
    return this.normalize(spec, state);
  },

  normalize(spec, state) {
    if (!spec) return null;
    const la = legalActions(state);
    if (!la) return null;
    const call = () => (la.call != null ? { type: 'call' } : { type: 'check' });
    if (typeof spec === 'string') {
      switch (spec) {
        case 'fold': return la.check ? { type: 'check' } : { type: 'fold' };
        case 'check': return la.check ? { type: 'check' } : call();
        case 'call': return call();
        case 'check-call': return call();
        case 'allin': return la.raise ? { type: 'raise', amount: la.raise.max } : call();
        default: return null;
      }
    }
    if (spec.raise != null) {
      if (!la.raise) return call();
      const amt = Math.max(la.raise.min, Math.min(la.raise.max, spec.raise));
      return { type: 'raise', amount: amt };
    }
    return null;
  },

  actionOptions() {
    if (this.pending && ['action', 'street', 'handOver'].includes(this.pending.type)) return { allow: this.allow };
    return { allow: [] };
  },

  onHumanTurn() {
    if (this.pending?.type === 'turn') { this.resolvePending(); return; }
    if (this.pending?.type === 'action' && this.pending.step.hint) {
      this.showCoach({ text: this.pending.step.hint, next: false, up: true });
    }
  },

  /** Return true to let the action through, false to reject (state untouched). */
  interceptAction(action, state) {
    const p = this.pending;
    if (!p) return false;
    if (p.type === 'street' || p.type === 'handOver') return this.allow.includes(action.type);
    if (p.type !== 'action') return false;
    const step = p.step;
    const la = legalActions(state);
    const verdict = this.checkAccept(step.accept, action, state, la);
    if (verdict === true) {
      this.resolvePending(action);
      return true;
    }
    const msg = typeof verdict === 'string' ? verdict : (step.onWrong || 'Try a different action.');
    this.showCoach({ text: msg, next: false, up: true, feedback: 'bad' });
    this.ctx.toast('Not this time — read the coach tip');
    return false;
  },

  checkAccept(accept, action, state, la) {
    if (!accept) return true;
    if (typeof accept === 'function') return accept(action, state, la);
    const list = Array.isArray(accept) ? accept : [accept];
    for (const a of list) {
      if (typeof a === 'string') { if (a === action.type) return true; continue; }
      if (a.type !== action.type) continue;
      if (action.type === 'raise') {
        const pot = potTotal(state);
        const mb = maxBet(state);
        const need = mb - state.players[0].bet;
        const potAfterCall = pot + need;
        const min = a.min ?? (a.minPotFrac != null ? mb + Math.floor(potAfterCall * a.minPotFrac) : 0);
        const max = a.max ?? (a.maxPotFrac != null ? mb + Math.ceil(potAfterCall * a.maxPotFrac) : Infinity);
        if (action.amount < min) return a.tooSmall || `Bet bigger — at least ${min}.`;
        if (action.amount > max) return a.tooBig || `That's too much — no more than ${max}.`;
        return true;
      }
      return true;
    }
    return false;
  },

  onStateChange(state) {
    const p = this.pending;
    if (!p) return;
    if (p.type === 'street' && this.streetReached(state, p.step.street)) this.resolvePending();
  },

  onHandOver() {
    const p = this.pending;
    if (!p) return;
    if (p.type === 'handOver' || p.type === 'street' || p.type === 'turn') this.resolvePending();
    // an awaitAction that never got its turn (e.g. everyone folded) also moves on
    else if (p.type === 'action') this.resolvePending(null);
  },

  // ---------- coach panel ----------
  showCoach({ text = '', next = false, nextLabel = 'Next ▶', up = false, cards = null, keepCards = false, feedback = null }) {
    const c = $('coach');
    if (!text && !next && !cards && !keepCards) { this.hideCoach(); return; }
    c.hidden = false;
    c.classList.toggle('up', up);
    const t = $('coach-text');
    t.innerHTML = text || '';
    t.className = 'coach-text' + (feedback ? ` coach-feedback ${feedback}` : '');
    const nextBtn = $('coach-next');
    nextBtn.hidden = !next;
    nextBtn.textContent = nextLabel;
    $('coach-choices').innerHTML = '';
    const cc = $('coach-cards');
    if (cards) {
      cc.innerHTML = '';
      for (const g of cards) {
        const grp = document.createElement('div');
        grp.className = 'card-group';
        grp.appendChild(cardsEl(g.cards));
        if (g.label) {
          const l = document.createElement('div');
          l.className = 'card-group-label';
          l.textContent = g.label;
          grp.appendChild(l);
        }
        cc.appendChild(grp);
      }
    } else if (!keepCards) {
      cc.innerHTML = '';
    }
  },

  hideCoach() {
    $('coach').hidden = true;
    $('coach-cards').innerHTML = '';
    $('coach-choices').innerHTML = '';
  },

  spotlight(el) {
    const s = $('spotlight');
    this._spotTarget = el;
    if (!el) { s.hidden = true; return; }
    const r = el.getBoundingClientRect();
    const pad = 8;
    s.hidden = false;
    s.style.left = `${r.left - pad}px`;
    s.style.top = `${r.top - pad}px`;
    s.style.width = `${r.width + pad * 2}px`;
    s.style.height = `${r.height + pad * 2}px`;
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  },
};
