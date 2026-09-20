import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTable, startHand, legalActions, applyAction, settleHand, rebuy, totalChips,
  buildRiggedDeck, potTotal, maxBet,
} from '../../games/poker/engine.js';
import { decide, chenScore } from '../../games/poker/bot.js';
import { parseCards } from '../../games/poker/hand-eval.js';

// Deterministic PRNG for reproducible sims
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffledDeck(rng) {
  const { createDeck } = globalThis.__ce;
  const d = createDeck(true);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
globalThis.__ce = await import('../../js/shared/card-engine.js');

const rig = (state, dealerIdx, spec) => buildRiggedDeck(state, dealerIdx, spec, mulberry32(7));
const holes = (...strs) => Object.fromEntries(strs.map((s, i) => [i, s ? parseCards(s) : undefined]).filter(([, v]) => v));

// Play a hand to completion with all seats driven by the bot
function playOut(state, rng, cap = 200) {
  let n = 0;
  const before = totalChips(state);
  while (state.street !== 'hand-over') {
    assert.ok(n++ < cap, 'action cap exceeded');
    const a = decide(state, state.currentIdx, rng);
    applyAction(state, a);
    assert.equal(totalChips(state), before, 'chip conservation');
    for (const p of state.players) assert.ok(p.stack >= 0, 'no negative stacks');
  }
  assert.ok(state.results, 'results present');
  return n;
}

test('simulate 10000 hands with bots: conservation, no stalls, sane payouts', () => {
  const rng = mulberry32(42);
  const state = createTable({ botCount: 3, rng });
  let handsPlayed = 0;
  let showdowns = 0;
  for (let h = 0; h < 10000; h++) {
    startHand(state, { deck: shuffledDeck(rng) });
    playOut(state, rng);
    handsPlayed++;
    if (!state.results.uncontested) showdowns++;
    const paid = state.results.pots.reduce((s, pot) => s + pot.winners.reduce((t, w) => t + w.amount, 0), 0);
    assert.equal(paid, state.results.total, 'all pot chips paid out');
    const { busted } = settleHand(state);
    for (const i of busted) rebuy(state, i);
  }
  assert.equal(handsPlayed, 10000);
  assert.ok(showdowns > 1000, `expected plenty of showdowns, got ${showdowns}`);
});

test('everyone folds preflop -> BB wins uncontested', () => {
  const s = createTable({ botCount: 3 });
  startHand(s, { deck: shuffledDeck(mulberry32(1)), dealerIdx: 0 });
  assert.equal(s.sbIdx, 1);
  assert.equal(s.bbIdx, 2);
  assert.equal(s.currentIdx, 3);
  applyAction(s, { type: 'fold' }); // seat 3
  assert.equal(s.currentIdx, 0);
  applyAction(s, { type: 'fold' }); // seat 0
  applyAction(s, { type: 'fold' }); // seat 1 (SB)
  assert.equal(s.street, 'hand-over');
  assert.ok(s.results.uncontested);
  assert.equal(s.players[2].stack, 1010);
  assert.equal(s.community.length, 0);
});

test('split pot with odd chip goes to first winner left of dealer', () => {
  const s = createTable({ botCount: 2, blinds: { sb: 5, bb: 15 } });
  const deck = rig(s, 0, {
    holes: { 0: parseCards('3c 5h'), 1: parseCards('As 10c'), 2: parseCards('Ad 10d') },
    board: parseCards('Ks Qd Jh 4c 2s'),
  });
  startHand(s, { deck, dealerIdx: 0 });
  // preflop: seat0 (dealer, first to act with 3 players) calls, seat1 completes, seat2 checks
  applyAction(s, { type: 'call' });
  applyAction(s, { type: 'call' });
  applyAction(s, { type: 'check' });
  assert.equal(s.street, 'flop');
  assert.equal(s.pot, 45);
  for (let street = 0; street < 3; street++) {
    for (let k = 0; k < 3; k++) applyAction(s, { type: 'check' });
  }
  assert.equal(s.street, 'hand-over');
  assert.equal(s.results.pots.length, 1);
  const w = Object.fromEntries(s.results.pots[0].winners.map(x => [x.idx, x.amount]));
  assert.deepEqual(w, { 1: 23, 2: 22 });
  assert.equal(s.players[0].stack, 985);
  assert.equal(s.players[1].stack, 1008);
  assert.equal(s.players[2].stack, 1007);
  assert.equal(s.results.hands[1].desc, 'Straight, Ace high');
});

test('short stack all-in creates main and side pots', () => {
  const s = createTable({ botCount: 2, bots: [{ stack: 1000 }, { stack: 150 }] });
  // seat2 (short) AA wins the main pot; seat0 KK beats seat1 QQ for the side pot
  const deck = rig(s, 0, {
    holes: { 0: parseCards('Kc Kd'), 1: parseCards('Qs Qh'), 2: parseCards('As Ad') },
    board: parseCards('8d 7c 4s 2h 9d'),
  });
  startHand(s, { deck, dealerIdx: 0 });
  // dealer 0, sb 1, bb 2 -> seat 0 acts first
  applyAction(s, { type: 'call' });                       // 0 calls 20
  applyAction(s, { type: 'call' });                       // 1 calls (10 more)
  let la = legalActions(s);
  assert.equal(s.currentIdx, 2);
  assert.equal(la.raise.max, 150);
  applyAction(s, { type: 'raise', amount: 150 });         // 2 shoves
  assert.ok(s.players[2].allIn);
  applyAction(s, { type: 'call' });                       // 0 calls 130
  applyAction(s, { type: 'call' });                       // 1 calls 130
  assert.equal(s.street, 'flop');
  assert.equal(s.pot, 450);
  assert.equal(s.currentIdx, 1);                          // first actor left of dealer who can act
  applyAction(s, { type: 'check' });                      // 1 checks
  la = legalActions(s);
  assert.equal(la.raise.min, 20);
  applyAction(s, { type: 'raise', amount: 200 });         // 0 bets 200
  applyAction(s, { type: 'call' });                       // 1 calls
  assert.equal(s.street, 'turn');
  applyAction(s, { type: 'check' }); applyAction(s, { type: 'check' });
  applyAction(s, { type: 'check' }); applyAction(s, { type: 'check' });
  assert.equal(s.street, 'hand-over');
  assert.equal(s.results.pots.length, 2);
  assert.equal(s.results.pots[0].amount, 450);
  assert.deepEqual(s.results.pots[0].eligible, [0, 1, 2]);
  assert.deepEqual(s.results.pots[0].winners, [{ idx: 2, amount: 450 }]);
  assert.equal(s.results.pots[1].amount, 400);
  assert.deepEqual(s.results.pots[1].eligible, [0, 1]);
  assert.deepEqual(s.results.pots[1].winners, [{ idx: 0, amount: 400 }]);
  assert.equal(s.players[2].stack, 450);
  assert.equal(s.players[0].stack, 1000 - 350 + 400);
  assert.equal(s.players[1].stack, 650);
});

test('heads-up: dealer is SB, acts first preflop and last postflop; all-in runs out the board', () => {
  const s = createTable({ botCount: 1 });
  const deck = rig(s, 0, { holes: { 0: parseCards('As Ah'), 1: parseCards('Ks Kh') }, board: parseCards('2c 5d 9h Jc 3s') });
  startHand(s, { deck, dealerIdx: 0 });
  assert.equal(s.sbIdx, 0);
  assert.equal(s.bbIdx, 1);
  assert.equal(s.currentIdx, 0);
  applyAction(s, { type: 'call' });
  assert.equal(s.currentIdx, 1);
  applyAction(s, { type: 'check' });
  assert.equal(s.street, 'flop');
  assert.equal(s.currentIdx, 1, 'BB acts first postflop heads-up');
  applyAction(s, { type: 'raise', amount: 40 });
  applyAction(s, { type: 'raise', amount: 980 });         // dealer shoves (980 left after the call)
  assert.equal(s.street, 'flop');
  applyAction(s, { type: 'call' });                       // BB calls all-in -> auto run-out
  assert.equal(s.street, 'hand-over');
  assert.equal(s.community.length, 5);
  assert.equal(s.players[0].stack, 2000);
  assert.equal(s.players[1].stack, 0);
  const { humanBusted, busted } = settleHand(s);
  assert.equal(humanBusted, false);
  assert.deepEqual(busted, [1]);
});

test('human bust is detected', () => {
  const s = createTable({ botCount: 1, humanStack: 100 });
  const deck = rig(s, 1, { holes: { 0: parseCards('7c 2d'), 1: parseCards('As Ad') }, board: parseCards('Kc 5d 9h Jc 3s') });
  startHand(s, { deck, dealerIdx: 1 });
  // dealer 1 = SB acts first
  applyAction(s, { type: 'raise', amount: 1000 });
  applyAction(s, { type: 'call' });
  assert.equal(s.street, 'hand-over');
  assert.equal(s.players[0].stack, 0);
  assert.equal(settleHand(s).humanBusted, true);
  rebuy(s, 0);
  assert.equal(s.players[0].stack, 1000);
  assert.equal(s.players[0].out, false);
});

test('min-raise rules and short all-in not reopening action', () => {
  const s = createTable({ botCount: 2, bots: [{ stack: 90 }, { stack: 1000 }] });
  startHand(s, { deck: shuffledDeck(mulberry32(3)), dealerIdx: 0 });
  // seat 0 first: raise to 60 (increment 40)
  let la = legalActions(s);
  assert.equal(la.raise.min, 40);
  applyAction(s, { type: 'raise', amount: 60 });
  assert.equal(s.minRaise, 40);
  // seat 1 (SB, stack 90 => 80 left + 10 bet): min raise would be 100, but max is 90
  la = legalActions(s);
  assert.equal(s.currentIdx, 1);
  assert.equal(la.raise.min, 90);
  assert.equal(la.raise.max, 90);
  assert.throws(() => applyAction(s, { type: 'raise', amount: 80 }));
  applyAction(s, { type: 'raise', amount: 90 }); // short all-in (+30 < 40)
  assert.equal(s.minRaise, 40, 'short all-in does not change min raise');
  // seat 2 (BB) has not acted since the full raise -> may still raise
  la = legalActions(s);
  assert.equal(s.currentIdx, 2);
  assert.ok(la.raise);
  assert.equal(la.raise.min, 130);
  applyAction(s, { type: 'call' });
  // seat 0 already acted; short all-in shouldn't reopen raising for them
  la = legalActions(s);
  assert.equal(s.currentIdx, 0);
  assert.equal(la.call, 30);
  assert.equal(la.raise, null);
  applyAction(s, { type: 'call' });
  assert.equal(s.street, 'flop');
  assert.equal(s.pot, 270);
});

test('board plays -> all live players split', () => {
  const s = createTable({ botCount: 2 });
  const deck = rig(s, 0, {
    holes: { 0: parseCards('2c 3d'), 1: parseCards('4h 6s'), 2: parseCards('7d 8c') },
    board: parseCards('As Ks Qs Js 10s'),
  });
  startHand(s, { deck, dealerIdx: 0 });
  applyAction(s, { type: 'call' }); applyAction(s, { type: 'call' }); applyAction(s, { type: 'check' });
  for (let i = 0; i < 9; i++) applyAction(s, { type: 'check' });
  assert.equal(s.street, 'hand-over');
  assert.equal(s.results.pots[0].winners.length, 3);
  assert.ok(s.players.every(p => p.stack === 1000));
  assert.equal(s.results.hands[0].desc, 'Royal Flush');
});

test('legalActions: check only when nothing to call; raise expressed as total', () => {
  const s = createTable({ botCount: 2 });
  startHand(s, { deck: shuffledDeck(mulberry32(5)), dealerIdx: 0 });
  const la = legalActions(s);
  assert.equal(la.check, false);
  assert.equal(la.call, 20);
  assert.deepEqual(la.raise, { min: 40, max: 1000 });
  assert.equal(potTotal(s), 30);
  assert.equal(maxBet(s), 20);
});

test('chen scores match known values', () => {
  const c = s => chenScore(...parseCards(s));
  assert.equal(c('As Ad'), 20);
  assert.equal(c('Ks Kd'), 16);
  assert.equal(c('As Ks'), 12);
  assert.equal(c('As Kd'), 10);
  assert.equal(c('10s 9s'), 8);
  assert.ok(c('7c 2d') < c('10s 9s'));
  assert.equal(c('5s 5d'), 5);
});
