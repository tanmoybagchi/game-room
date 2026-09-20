import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluate, describeHand, describePartial, holeLabel, parseCards, straightHigh, CAT, compareHands,
} from '../../games/poker/hand-eval.js';
import { createDeck, shuffle } from '../../js/shared/card-engine.js';

const ev = s => evaluate(parseCards(s));
const keys = cards => cards.map(c => `${c.rank}${c.suit[0]}`).sort().join(' ');

test('categories are detected', () => {
  assert.equal(ev('As Ks Qs Js Ts 2d 3c').cat, CAT.STRAIGHT_FLUSH);
  assert.equal(ev('9s 9d 9h 9c Ks 2d 3c').cat, CAT.QUADS);
  assert.equal(ev('9s 9d 9h Kc Ks 2d 3c').cat, CAT.FULL_HOUSE);
  assert.equal(ev('2s 5s 9s Js Ks 2d 3c').cat, CAT.FLUSH);
  assert.equal(ev('5s 6d 7h 8c 9s Kd 2c').cat, CAT.STRAIGHT);
  assert.equal(ev('9s 9d 9h Kc Qs 2d 3c').cat, CAT.TRIPS);
  assert.equal(ev('9s 9d Kh Kc Qs 2d 3c').cat, CAT.TWO_PAIR);
  assert.equal(ev('9s 9d Kh Jc Qs 2d 3c').cat, CAT.PAIR);
  assert.equal(ev('9s 8d Kh Jc Qs 2d 3c').cat, CAT.HIGH_CARD);
});

test('wheel straight is five-high and loses to six-high', () => {
  const wheel = ev('As 2d 3h 4c 5s Kd Qc');
  const six = ev('2s 3d 4h 5c 6s Kd Qc');
  assert.equal(wheel.cat, CAT.STRAIGHT);
  assert.equal(wheel.tiebreak[0], 5);
  assert.equal(describeHand(wheel), 'Straight, Five high');
  assert.ok(compareHands(wheel, six) < 0);
  assert.equal(keys(wheel.best5), keys(parseCards('As 2d 3h 4c 5s')));
});

test('wheel beats trips', () => {
  assert.ok(compareHands(ev('As 2d 3h 4c 5s Kd Qc'), ev('Ks Kd Kh 4c 5s 2d Qc')) > 0);
});

test('straightHigh handles broadway and gaps', () => {
  assert.equal(straightHigh([14, 13, 12, 11, 10]), 14);
  assert.equal(straightHigh([14, 2, 3, 4, 5]), 5);
  assert.equal(straightHigh([2, 3, 4, 5, 7]), 0);
  assert.equal(straightHigh([2, 3, 4, 5, 6, 7, 8]), 8);
});

test('board plays -> identical scores', () => {
  const a = ev('As Ks Qs Js Ts 2d 3c');
  const b = ev('As Ks Qs Js Ts 9h 9d');
  assert.equal(a.score, b.score);
  assert.equal(describeHand(a), 'Royal Flush');
});

test('kickers break ties and describe correctly', () => {
  const kk_a = ev('Kh Kd As 7c 4d 9s 2c');
  const kk_q = ev('Kh Kd Qs 7c 4d 9s 2c');
  assert.ok(compareHands(kk_a, kk_q) > 0);
  assert.equal(describeHand(kk_a), 'Pair of Kings, Ace kicker');
  // A-K vs A-Q when the board has a Queen: A-Q makes a pair, A-K is just high card
  const board = 'Qh 7c 4d 9s 2c';
  const ak = ev(`As Kd ${board}`);
  const aq = ev(`Ac Qd ${board}`);
  assert.equal(aq.cat, CAT.PAIR);
  assert.equal(ak.cat, CAT.HIGH_CARD);
  assert.ok(compareHands(aq, ak) > 0);
  // Identical strength -> tie
  assert.equal(ev(`As Ks ${board}`).score, ev(`Ad Kd ${board}`).score);
});

test('two pair uses the two highest pairs', () => {
  const r = ev('2s 2d 9h 9c Kd Ks 5c');
  assert.equal(r.cat, CAT.TWO_PAIR);
  assert.deepEqual(r.tiebreak.slice(0, 3), [13, 9, 5]);
  assert.equal(describeHand(r), 'Two Pair, Kings and Nines, Five kicker');
});

test('full house ordering: trips rank dominates', () => {
  const tens = ev('Ts Td Th 4c 4d 2s 3c');
  const nines = ev('9s 9d 9h Ac Ad 2s 3c');
  assert.ok(compareHands(tens, nines) > 0);
  assert.equal(describeHand(tens), 'Full House, Tens full of Fours');
  // two trips -> full house using higher trips + pair from lower trips
  const two3 = ev('Ts Td Th 9c 9d 9s 2c');
  assert.equal(two3.cat, CAT.FULL_HOUSE);
  assert.deepEqual(two3.tiebreak.slice(0, 2), [10, 9]);
});

test('quads kicker', () => {
  const r = ev('7s 7d 7h 7c As Kd 2c');
  assert.deepEqual(r.tiebreak.slice(0, 2), [7, 14]);
  assert.equal(describeHand(r), 'Four Sevens, Ace kicker');
  assert.ok(compareHands(r, ev('7s 7d 7h 7c Qs Kd 2c')) > 0);
});

test('flush beats straight, uses top five of suit', () => {
  const fl = ev('2s 5s 9s Js Ks 3s 4d');
  const st = ev('5s 6d 7h 8c 9s Kd 2c');
  assert.ok(compareHands(fl, st) > 0);
  assert.deepEqual(fl.tiebreak, [13, 11, 9, 5, 3]);
  assert.equal(describeHand(fl), 'Flush, King high');
});

test('straight flush preferred over higher plain flush', () => {
  const r = ev('5s 6s 7s 8s 9s As Kd');
  assert.equal(r.cat, CAT.STRAIGHT_FLUSH);
  assert.equal(r.tiebreak[0], 9);
});

test('best5 can skip both hole cards', () => {
  const r = ev('2c 3d Ah Kh Qh Jh Th');
  assert.equal(r.cat, CAT.STRAIGHT_FLUSH);
  assert.equal(keys(r.best5), keys(parseCards('Ah Kh Qh Jh Th')));
});

test('best5 always has exactly 5 distinct cards', () => {
  const deck = createDeck(true);
  for (let i = 0; i < 2000; i++) {
    shuffle(deck);
    const r = evaluate(deck.slice(0, 7));
    assert.equal(r.best5.length, 5);
    assert.equal(new Set(r.best5.map(c => `${c.rank}${c.suit}`)).size, 5);
    for (const c of r.best5) assert.ok(deck.slice(0, 7).includes(c));
  }
});

test('describePartial and holeLabel', () => {
  assert.equal(describePartial(parseCards('As Ad')), 'Pair of Aces');
  assert.equal(describePartial(parseCards('As Kd')), 'Ace high');
  assert.equal(describePartial(parseCards('As Kd Kh 4c')), 'Pair of Kings');
  assert.equal(describePartial(parseCards('As Kd Kh Ac 3d')), 'Two Pair, Aces and Kings');
  const [a, k] = parseCards('As Ks');
  assert.equal(holeLabel(a, k), 'AKs');
  assert.equal(holeLabel(k, a), 'AKs');
  assert.equal(holeLabel(...parseCards('Td 9c')), 'T9o');
  assert.equal(holeLabel(...parseCards('Qd Qc')), 'QQ');
});

test('7-card category frequencies are sane (100k hands)', () => {
  const N = 100000;
  const counts = new Array(9).fill(0);
  const deck = createDeck(true);
  for (let i = 0; i < N; i++) {
    shuffle(deck);
    counts[evaluate(deck.slice(0, 7)).cat]++;
  }
  const pct = c => counts[c] / N * 100;
  // Known 7-card probabilities: SF 0.031%, quads 0.168%, FH 2.60%, flush 3.03%, straight 4.62%,
  // trips 4.83%, two pair 23.5%, pair 43.8%, high card 17.4%
  const within = (c, expect, tol) => assert.ok(Math.abs(pct(c) - expect) < tol, `${c}: ${pct(c).toFixed(3)} vs ${expect}`);
  within(CAT.STRAIGHT_FLUSH, 0.031, 0.03);
  within(CAT.QUADS, 0.168, 0.08);
  within(CAT.FULL_HOUSE, 2.60, 0.4);
  within(CAT.FLUSH, 3.03, 0.4);
  within(CAT.STRAIGHT, 4.62, 0.5);
  within(CAT.TRIPS, 4.83, 0.5);
  within(CAT.TWO_PAIR, 23.5, 1.0);
  within(CAT.PAIR, 43.8, 1.0);
  within(CAT.HIGH_CARD, 17.4, 1.0);
});
