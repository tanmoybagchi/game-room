// ============================================================
// Poker hand evaluator (pure, no DOM)
// Evaluates the best 5-card poker hand from 5-7 cards.
// Card shape matches card-engine: { suit: 'spades'|..., rank: 'A'|'2'..'10'|'J'|'Q'|'K' }
// ============================================================

// Ace-high poker values (card-engine's RANK_VALUES is Ace-low, so we define our own).
export const PV = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export const CAT = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
};

export const CAT_NAMES = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
];

const NAME = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight',
  9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};
const PLURAL = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens', 8: 'Eights',
  9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};

export function pokerValue(card) {
  return PV[card.rank];
}

// Given an array of distinct-or-not values, return the high card of the best
// straight (5..14), or 0 if none. Ace counts low for the wheel (A-2-3-4-5 -> 5).
export function straightHigh(values) {
  let mask = 0;
  for (const v of values) mask |= (1 << v);
  if (mask & (1 << 14)) mask |= (1 << 1);
  for (let high = 14; high >= 5; high--) {
    const run = 0b11111 << (high - 4);
    if ((mask & run) === run) return high;
  }
  return 0;
}

// Pick the 5 cards forming a straight with the given high card from `cards`.
function pickStraightCards(cards, high) {
  const out = [];
  for (let v = high; v > high - 5; v--) {
    const want = v === 1 ? 14 : v;
    const c = cards.find(k => pokerValue(k) === want && !out.includes(k));
    out.push(c);
  }
  return out;
}

function byValueDesc(a, b) {
  return pokerValue(b) - pokerValue(a);
}

function makeResult(cat, tiebreak, best5) {
  const tb = tiebreak.slice(0, 5);
  while (tb.length < 5) tb.push(0);
  let score = cat;
  for (const t of tb) score = score * 15 + t;
  return { cat, tiebreak: tb, score, best5, name: CAT_NAMES[cat] };
}

/**
 * Evaluate the best 5-card hand from 5-7 cards.
 * @returns {{cat:number, tiebreak:number[], score:number, best5:object[], name:string}}
 */
export function evaluate(cards) {
  if (cards.length < 5) throw new Error('evaluate needs at least 5 cards');
  const sorted = [...cards].sort(byValueDesc);

  // ---- Flush / straight flush ----
  const bySuit = {};
  for (const c of sorted) (bySuit[c.suit] ||= []).push(c);
  let flushCards = null;
  for (const s in bySuit) if (bySuit[s].length >= 5) flushCards = bySuit[s];

  if (flushCards) {
    const sfHigh = straightHigh(flushCards.map(pokerValue));
    if (sfHigh) {
      return makeResult(CAT.STRAIGHT_FLUSH, [sfHigh], pickStraightCards(flushCards, sfHigh));
    }
  }

  // ---- Rank groups ----
  const counts = new Map();
  for (const c of sorted) counts.set(pokerValue(c), (counts.get(pokerValue(c)) || 0) + 1);
  // groups: [{v, n}] sorted by count desc, then value desc
  const groups = [...counts.entries()]
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => b.n - a.n || b.v - a.v);
  const ofValue = v => sorted.filter(c => pokerValue(c) === v);
  const kickers = (exclude, k) => sorted.filter(c => !exclude.includes(pokerValue(c))).slice(0, k);

  if (groups[0].n === 4) {
    const quad = groups[0].v;
    const kick = kickers([quad], 1);
    return makeResult(CAT.QUADS, [quad, pokerValue(kick[0])], [...ofValue(quad), ...kick]);
  }

  if (groups[0].n === 3 && groups.length > 1 && groups[1].n >= 2) {
    const trips = groups[0].v;
    const pair = groups[1].v;
    return makeResult(CAT.FULL_HOUSE, [trips, pair], [...ofValue(trips), ...ofValue(pair).slice(0, 2)]);
  }

  if (flushCards) {
    const best = flushCards.slice(0, 5);
    return makeResult(CAT.FLUSH, best.map(pokerValue), best);
  }

  const stHigh = straightHigh(sorted.map(pokerValue));
  if (stHigh) {
    return makeResult(CAT.STRAIGHT, [stHigh], pickStraightCards(sorted, stHigh));
  }

  if (groups[0].n === 3) {
    const t = groups[0].v;
    const kick = kickers([t], 2);
    return makeResult(CAT.TRIPS, [t, ...kick.map(pokerValue)], [...ofValue(t), ...kick]);
  }

  if (groups[0].n === 2 && groups.length > 1 && groups[1].n === 2) {
    const p1 = groups[0].v;
    const p2 = groups[1].v;
    const kick = kickers([p1, p2], 1);
    return makeResult(CAT.TWO_PAIR, [p1, p2, pokerValue(kick[0])], [...ofValue(p1), ...ofValue(p2), ...kick]);
  }

  if (groups[0].n === 2) {
    const p = groups[0].v;
    const kick = kickers([p], 3);
    return makeResult(CAT.PAIR, [p, ...kick.map(pokerValue)], [...ofValue(p), ...kick]);
  }

  const best = sorted.slice(0, 5);
  return makeResult(CAT.HIGH_CARD, best.map(pokerValue), best);
}

export function compareHands(a, b) {
  return a.score - b.score;
}

/**
 * Human-readable description, e.g. "Pair of Kings, Ace kicker".
 * @param {object} r result from evaluate()
 * @param {{withKicker?: boolean}} opts
 */
export function describeHand(r, { withKicker = true } = {}) {
  const t = r.tiebreak;
  switch (r.cat) {
    case CAT.STRAIGHT_FLUSH:
      return t[0] === 14 ? 'Royal Flush' : `Straight Flush, ${NAME[t[0]]} high`;
    case CAT.QUADS:
      return `Four ${PLURAL[t[0]]}` + (withKicker ? `, ${NAME[t[1]]} kicker` : '');
    case CAT.FULL_HOUSE:
      return `Full House, ${PLURAL[t[0]]} full of ${PLURAL[t[1]]}`;
    case CAT.FLUSH:
      return `Flush, ${NAME[t[0]]} high`;
    case CAT.STRAIGHT:
      return `Straight, ${NAME[t[0]]} high`;
    case CAT.TRIPS:
      return `Three ${PLURAL[t[0]]}` + (withKicker ? `, ${NAME[t[1]]} kicker` : '');
    case CAT.TWO_PAIR:
      return `Two Pair, ${PLURAL[t[0]]} and ${PLURAL[t[1]]}` + (withKicker ? `, ${NAME[t[2]]} kicker` : '');
    case CAT.PAIR:
      return `Pair of ${PLURAL[t[0]]}` + (withKicker ? `, ${NAME[t[1]]} kicker` : '');
    default:
      return `${NAME[t[0]]} high`;
  }
}

// Short label for a hand with fewer than 5 cards known (preflop / flop indicator).
// Falls back to evaluate() when 5+ cards are available.
export function describePartial(cards) {
  if (cards.length >= 5) return describeHand(evaluate(cards), { withKicker: false });
  const sorted = [...cards].sort(byValueDesc);
  const counts = new Map();
  for (const c of sorted) counts.set(pokerValue(c), (counts.get(pokerValue(c)) || 0) + 1);
  const groups = [...counts.entries()].map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n || b.v - a.v);
  if (groups[0].n === 4) return `Four ${PLURAL[groups[0].v]}`;
  if (groups[0].n === 3) return `Three ${PLURAL[groups[0].v]}`;
  if (groups[0].n === 2 && groups[1]?.n === 2) return `Two Pair, ${PLURAL[groups[0].v]} and ${PLURAL[groups[1].v]}`;
  if (groups[0].n === 2) return `Pair of ${PLURAL[groups[0].v]}`;
  return `${NAME[groups[0].v]} high`;
}

// "AKs", "T9o", "QQ" style label for two hole cards.
export function holeLabel(c1, c2) {
  const SHORT = { 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const s = v => SHORT[v] || String(v);
  let a = pokerValue(c1), b = pokerValue(c2);
  if (b > a) [a, b] = [b, a];
  if (a === b) return s(a) + s(b);
  return s(a) + s(b) + (c1.suit === c2.suit ? 's' : 'o');
}

// Parse "As Kd 10h 7c" style shorthand into card objects (used by tests & lessons).
const SUIT_OF = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
export function parseCards(str) {
  return str.trim().split(/\s+/).map(tok => {
    let rank = tok.slice(0, -1);
    const suit = SUIT_OF[tok.slice(-1).toLowerCase()];
    if (rank === 'T') rank = '10';
    if (!suit || !(rank in PV)) throw new Error(`Bad card token: ${tok}`);
    return { suit, rank, faceUp: true };
  });
}

export function cardKey(c) {
  return `${c.suit}-${c.rank}`;
}
