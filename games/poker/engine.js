// ============================================================
// Texas Hold'em engine (pure, no DOM, no timers)
// State is a plain JSON-serializable object mutated in place.
// Randomness enters only through the deck passed to startHand().
// ============================================================

import { createDeck, shuffle, SUIT_SYMBOLS } from '../../js/shared/card-engine.js';
import { evaluate, describeHand, cardKey } from './hand-eval.js';

export const BOT_NAMES = ['Ava', 'Bruno', 'Chen', 'Dee'];
export const DEFAULT_STACK = 1000;
export const DEFAULT_BLINDS = { sb: 10, bb: 20 };
export const STREETS = ['preflop', 'flop', 'turn', 'river'];

export function cardText(c) {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

export function randomPersonality(rng = Math.random) {
  return {
    aggression: +(0.6 + rng() * 0.8).toFixed(2),
    looseness: +(0.7 + rng() * 0.6).toFixed(2),
    bluffFreq: +(0.02 + rng() * 0.1).toFixed(3),
  };
}

export function createTable({
  botCount = 3,
  humanStack = DEFAULT_STACK,
  botStack = DEFAULT_STACK,
  blinds = DEFAULT_BLINDS,
  bots = null,          // optional [{name, personality}]
  humanName = 'You',
  rng = Math.random,
} = {}) {
  const players = [{
    id: 0, name: humanName, isHuman: true, stack: humanStack,
    bet: 0, totalBet: 0, folded: false, allIn: false, out: false, holeCards: [], personality: null,
  }];
  for (let i = 0; i < botCount; i++) {
    const spec = bots?.[i] || {};
    players.push({
      id: i + 1,
      name: spec.name || BOT_NAMES[i],
      isHuman: false,
      stack: spec.stack ?? botStack,
      bet: 0, totalBet: 0, folded: false, allIn: false, out: false, holeCards: [],
      personality: spec.personality || randomPersonality(rng),
    });
  }
  return {
    players,
    deck: [],
    community: [],
    pot: 0,
    dealerIdx: null,
    sbIdx: -1,
    bbIdx: -1,
    street: 'idle',
    currentIdx: -1,
    minRaise: blinds.bb,
    lastAggressorIdx: -1,
    acted: players.map(() => false),
    raiseClosedFor: players.map(() => false),
    blinds: { ...blinds },
    handNo: 0,
    history: [],
    results: null,
  };
}

// ---- Helpers ----
export function canAct(p) {
  return !p.out && !p.folded && !p.allIn;
}

export function isLive(p) {
  return !p.out && !p.folded;
}

export function nextIndex(state, from, pred) {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (pred(state.players[i])) return i;
  }
  return -1;
}

export function nextActive(state, from) {
  return nextIndex(state, from, p => !p.out);
}

export function nextActor(state, from) {
  return nextIndex(state, from, canAct);
}

export function maxBet(state) {
  return Math.max(0, ...state.players.filter(isLive).map(p => p.bet));
}

export function toCall(state, idx) {
  const p = state.players[idx];
  return Math.min(maxBet(state) - p.bet, p.stack);
}

// Total chips in the middle right now (collected pot + live street bets).
export function potTotal(state) {
  return state.pot + state.players.reduce((s, p) => s + p.bet, 0);
}

export function activePlayers(state) {
  return state.players.filter(p => !p.out);
}

function log(state, entry) {
  state.history.push({ handNo: state.handNo, street: state.street, ...entry });
}

// Conjugate for the human ("You fold") vs bots ("Ava folds").
function v(p, third, first) {
  return p.isHuman ? first : third;
}

function putChips(state, idx, amount) {
  const p = state.players[idx];
  const amt = Math.min(amount, p.stack);
  p.stack -= amt;
  p.bet += amt;
  if (p.stack === 0) p.allIn = true;
  return amt;
}

// ---- Hand lifecycle ----

/**
 * Start a new hand. Requires >= 2 players not `out`.
 * @param {object} state
 * @param {{deck?: object[], dealerIdx?: number}} opts  deck is dealt from index 0.
 */
export function startHand(state, { deck = null, dealerIdx = null } = {}) {
  const active = activePlayers(state);
  if (active.length < 2) throw new Error('Need at least 2 active players');

  state.handNo++;
  state.community = [];
  state.pot = 0;
  state.results = null;
  state.street = 'preflop';
  state.minRaise = state.blinds.bb;
  state.acted = state.players.map(() => false);
  state.raiseClosedFor = state.players.map(() => false);
  for (const p of state.players) {
    p.bet = 0; p.totalBet = 0; p.folded = false; p.allIn = false; p.holeCards = [];
    if (p.stack <= 0) p.out = true;
  }

  // Button
  if (dealerIdx != null) state.dealerIdx = dealerIdx;
  else if (state.dealerIdx == null) state.dealerIdx = 0;
  else state.dealerIdx = nextActive(state, state.dealerIdx);
  if (state.players[state.dealerIdx].out) state.dealerIdx = nextActive(state, state.dealerIdx);

  const headsUp = active.length === 2;
  if (headsUp) {
    state.sbIdx = state.dealerIdx;
    state.bbIdx = nextActive(state, state.dealerIdx);
  } else {
    state.sbIdx = nextActive(state, state.dealerIdx);
    state.bbIdx = nextActive(state, state.sbIdx);
  }

  log(state, { action: 'hand', text: `Hand #${state.handNo} — ${state.players[state.dealerIdx].name} has the button` });

  // Blinds
  const sbP = state.players[state.sbIdx];
  const sbAmt = putChips(state, state.sbIdx, state.blinds.sb);
  log(state, { idx: state.sbIdx, action: 'blind', amount: sbAmt, text: `${sbP.name} ${v(sbP, 'posts', 'post')} small blind ${sbAmt}` });
  const bbP = state.players[state.bbIdx];
  const bbAmt = putChips(state, state.bbIdx, state.blinds.bb);
  log(state, { idx: state.bbIdx, action: 'blind', amount: bbAmt, text: `${bbP.name} ${v(bbP, 'posts', 'post')} big blind ${bbAmt}` });

  // Deal: one card at a time starting left of the dealer, two rounds.
  state.deck = deck ? deck.slice() : shuffle(createDeck(true));
  const order = [];
  let i = state.dealerIdx;
  for (let k = 0; k < active.length; k++) {
    i = nextActive(state, i);
    order.push(i);
  }
  for (let round = 0; round < 2; round++) {
    for (const idx of order) state.players[idx].holeCards.push(state.deck.shift());
  }
  log(state, { action: 'deal', text: 'Hole cards dealt' });

  state.lastAggressorIdx = state.bbIdx;
  state.currentIdx = nextActor(state, state.bbIdx);
  if (state.currentIdx === -1 || isBettingRoundComplete(state)) {
    // e.g. blinds put everyone all-in
    state.currentIdx = -1;
    advance(state);
  }
  return state;
}

// Deal order used by startHand (for tutorial deck rigging): seat indices in the
// order they receive cards, given a dealerIdx and the current `out` flags.
export function dealOrder(state, dealerIdx) {
  const order = [];
  const n = activePlayers(state).length;
  let i = dealerIdx;
  for (let k = 0; k < n; k++) {
    i = nextActive(state, i);
    order.push(i);
  }
  return order;
}

/**
 * Build a deck that deals specific hole cards / board (tutorial & tests).
 * `holes` maps seat index -> [card, card]; `board` is up to 5 cards. Unspecified
 * slots are filled from the remaining deck, shuffled with `rng`.
 */
export function buildRiggedDeck(state, dealerIdx, { holes = {}, board = [] } = {}, rng = Math.random) {
  const used = new Set();
  const take = c => { used.add(cardKey(c)); return c; };
  Object.values(holes).flat().forEach(c => used.add(cardKey(c)));
  board.forEach(c => used.add(cardKey(c)));
  const pool = createDeck(true).filter(c => !used.has(cardKey(c)));
  // Fisher-Yates with injected rng
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const order = dealOrder(state, dealerIdx);
  const deck = [];
  for (let round = 0; round < 2; round++) {
    for (const idx of order) {
      const c = holes[idx]?.[round];
      deck.push(c ? take({ ...c, faceUp: true }) : pool.pop());
    }
  }
  for (let k = 0; k < 5; k++) {
    const c = board[k];
    deck.push(c ? take({ ...c, faceUp: true }) : pool.pop());
  }
  return deck.concat(pool);
}

export function legalActions(state) {
  const idx = state.currentIdx;
  if (idx < 0 || !STREETS.includes(state.street)) return null;
  const p = state.players[idx];
  const mb = maxBet(state);
  const need = Math.min(mb - p.bet, p.stack);
  const othersCanRespond = state.players.some((q, i) => i !== idx && isLive(q) && !q.allIn);
  const canRaise = p.stack > need && othersCanRespond && !state.raiseClosedFor[idx];
  return {
    fold: true,
    check: need === 0,
    call: need > 0 ? need : null,
    raise: canRaise
      ? { min: Math.min(mb + state.minRaise, p.stack + p.bet), max: p.stack + p.bet }
      : null,
  };
}

/**
 * Apply an action for the current player. `raise.amount` is the TOTAL bet size
 * for this street (not the increment).
 */
export function applyAction(state, action) {
  const la = legalActions(state);
  if (!la) throw new Error('No action expected now');
  const idx = state.currentIdx;
  const p = state.players[idx];
  const mb = maxBet(state);

  switch (action.type) {
    case 'fold':
      p.folded = true;
      log(state, { idx, action: 'fold', text: `${p.name} ${v(p, 'folds', 'fold')}` });
      break;
    case 'check':
      if (!la.check) throw new Error('Cannot check facing a bet');
      log(state, { idx, action: 'check', text: `${p.name} ${v(p, 'checks', 'check')}` });
      break;
    case 'call': {
      if (la.call == null) throw new Error('Nothing to call');
      const amt = putChips(state, idx, la.call);
      log(state, { idx, action: 'call', amount: amt, text: `${p.name} ${v(p, 'calls', 'call')} ${amt}${p.allIn ? ' (all-in)' : ''}` });
      break;
    }
    case 'raise': {
      if (!la.raise) throw new Error('Cannot raise');
      let amount = Math.floor(action.amount);
      if (!(amount >= la.raise.min || amount === la.raise.max) || amount > la.raise.max) {
        throw new Error(`Illegal raise ${amount}; allowed ${la.raise.min}-${la.raise.max}`);
      }
      const increment = amount - mb;
      putChips(state, idx, amount - p.bet);
      const isBet = mb === 0;
      const fullRaise = increment >= state.minRaise;
      if (fullRaise) {
        state.minRaise = increment;
        state.lastAggressorIdx = idx;
        // Everyone else must act again and may re-raise.
        state.acted = state.players.map(() => false);
        state.raiseClosedFor = state.players.map(() => false);
      } else {
        // Short all-in: players who already acted may call but not re-raise.
        state.players.forEach((q, i) => { if (i !== idx && state.acted[i]) state.raiseClosedFor[i] = true; });
      }
      const verb = isBet ? v(p, 'bets', 'bet') : v(p, 'raises to', 'raise to');
      log(state, { idx, action: isBet ? 'bet' : 'raise', amount, text: `${p.name} ${verb} ${amount}${p.allIn ? ' (all-in)' : ''}` });
      break;
    }
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
  state.acted[idx] = true;
  advance(state);
  return state;
}

export function isBettingRoundComplete(state) {
  const actors = state.players.map((p, i) => [p, i]).filter(([p]) => canAct(p));
  if (actors.length === 0) return true;
  const mb = maxBet(state);
  return actors.every(([p, i]) => p.bet === mb && (state.acted[i] || actors.length <= 1));
}

function collectBets(state) {
  for (const p of state.players) {
    p.totalBet += p.bet;
    state.pot += p.bet;
    p.bet = 0;
  }
}

export function advance(state) {
  const live = state.players.filter(isLive);
  if (live.length === 1) {
    collectBets(state);
    const w = state.players.indexOf(live[0]);
    const amount = state.pot;
    live[0].stack += amount;
    state.pot = 0;
    state.results = {
      uncontested: true,
      total: amount,
      pots: [{ amount, eligible: [w], winners: [{ idx: w, amount }] }],
      hands: {},
    };
    log(state, { idx: w, action: 'win', amount, text: `${live[0].name} ${v(live[0], 'wins', 'win')} ${amount} uncontested` });
    state.street = 'hand-over';
    state.currentIdx = -1;
    return;
  }
  if (isBettingRoundComplete(state)) {
    nextStreet(state);
    return;
  }
  state.currentIdx = nextActor(state, state.currentIdx);
}

export function nextStreet(state) {
  collectBets(state);
  state.acted = state.players.map(() => false);
  state.raiseClosedFor = state.players.map(() => false);
  state.minRaise = state.blinds.bb;

  if (state.street === 'river') {
    showdown(state);
    return;
  }
  const si = STREETS.indexOf(state.street);
  state.street = STREETS[si + 1];
  const n = state.street === 'flop' ? 3 : 1;
  const dealt = [];
  for (let k = 0; k < n; k++) {
    const c = state.deck.shift();
    state.community.push(c);
    dealt.push(c);
  }
  const label = state.street[0].toUpperCase() + state.street.slice(1);
  log(state, { action: 'deal', cards: dealt.map(cardKey), text: `${label}: ${dealt.map(cardText).join(' ')}` });

  state.currentIdx = nextActor(state, state.dealerIdx);
  if (state.currentIdx === -1 || isBettingRoundComplete(state)) {
    state.currentIdx = -1;
    nextStreet(state); // run out the board
  }
}

export function showdown(state) {
  state.street = 'showdown';
  const live = state.players.map((p, i) => [p, i]).filter(([p]) => isLive(p));
  const hands = {};
  for (const [p, i] of live) {
    const r = evaluate([...p.holeCards, ...state.community]);
    hands[i] = { score: r.score, cat: r.cat, desc: describeHand(r), best5: r.best5.map(cardKey) };
  }

  // Side pots by contribution level
  const levels = [...new Set(state.players.filter(p => p.totalBet > 0).map(p => p.totalBet))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const L of levels) {
    let amount = 0;
    for (const p of state.players) amount += Math.max(0, Math.min(p.totalBet, L) - prev);
    prev = L;
    if (amount === 0) continue;
    let eligible = live.filter(([p]) => p.totalBet >= L).map(([, i]) => i);
    if (eligible.length === 0) eligible = live.map(([, i]) => i); // safety net
    // Merge with previous pot if same eligibility set (keeps display simple)
    const last = pots[pots.length - 1];
    if (last && last.eligible.join() === eligible.join()) last.amount += amount;
    else pots.push({ amount, eligible, winners: [] });
  }

  const total = state.pot;
  for (const pot of pots) {
    if (pot.eligible.length === 1) {
      // Uncalled portion of a bet: simply returned, not "won"
      const idx = pot.eligible[0];
      state.players[idx].stack += pot.amount;
      pot.winners = [{ idx, amount: pot.amount }];
      pot.refund = true;
      continue;
    }
    const best = Math.max(...pot.eligible.map(i => hands[i].score));
    const winners = pot.eligible.filter(i => hands[i].score === best);
    // Order winners starting left of dealer for odd-chip distribution
    const ordered = [];
    let i = state.dealerIdx;
    for (let k = 0; k < state.players.length; k++) {
      i = (i + 1) % state.players.length;
      if (winners.includes(i)) ordered.push(i);
    }
    const share = Math.floor(pot.amount / ordered.length);
    let remainder = pot.amount - share * ordered.length;
    pot.winners = ordered.map(idx => {
      const amt = share + (remainder-- > 0 ? 1 : 0);
      state.players[idx].stack += amt;
      return { idx, amount: amt };
    });
    pot.desc = hands[ordered[0]].desc;
  }
  state.pot = 0;
  state.results = { uncontested: false, total, pots, hands };

  for (const [p, i] of live) {
    log(state, { idx: i, action: 'show', text: `${p.name} ${v(p, 'shows', 'show')} ${p.holeCards.map(cardText).join(' ')} — ${hands[i].desc}` });
  }
  const realPots = pots.filter(p => !p.refund);
  pots.forEach((pot, k) => {
    if (pot.refund) {
      const rp = state.players[pot.winners[0].idx];
      log(state, { idx: pot.winners[0].idx, action: 'refund', amount: pot.amount, text: `${rp.name} ${v(rp, 'gets', 'get')} back ${pot.amount} (uncalled)` });
      return;
    }
    const label = realPots.length > 1 ? (k === 0 ? 'main pot' : 'side pot') : 'pot';
    for (const w of pot.winners) {
      const split = pot.winners.length > 1 ? ' (split)' : '';
      const wp = state.players[w.idx];
      log(state, { idx: w.idx, action: 'win', amount: w.amount, text: `${wp.name} ${v(wp, 'wins', 'win')} ${w.amount} from the ${label} with ${hands[w.idx].desc}${split}` });
    }
  });

  state.street = 'hand-over';
  state.currentIdx = -1;
}

/**
 * Mark busted players `out`. Returns which seats busted.
 */
export function settleHand(state) {
  const busted = [];
  state.players.forEach((p, i) => {
    if (!p.out && p.stack <= 0) { p.out = true; busted.push(i); }
  });
  return { humanBusted: busted.includes(0), busted };
}

export function rebuy(state, idx, amount = DEFAULT_STACK) {
  const p = state.players[idx];
  p.stack = amount;
  p.out = false;
  log(state, { idx, action: 'rebuy', amount, text: `${p.name} ${v(p, 'rebuys', 'rebuy')} for ${amount}` });
}

// Sum of all chips in play (for conservation checks).
export function totalChips(state) {
  return state.players.reduce((s, p) => s + p.stack + p.bet, 0) + state.pot;
}
