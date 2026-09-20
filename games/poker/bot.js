// ============================================================
// Bot AI (pure): decide(state, seatIdx, rng) -> action
// Preflop: Chen formula + position. Postflop: made-hand tier + draw equity vs pot odds.
// Personality { aggression, looseness, bluffFreq } adds variety.
// ============================================================

import { evaluate, pokerValue, straightHigh, CAT, PV } from './hand-eval.js';
import { legalActions, maxBet, potTotal, isLive, canAct } from './engine.js';

// ---- Preflop: Chen formula ----
export function chenScore(c1, c2) {
  const v1 = pokerValue(c1), v2 = pokerValue(c2);
  const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
  const highPts = v => (v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v / 2);
  let score = highPts(hi);
  if (hi === lo) return Math.max(5, score * 2);
  if (c1.suit === c2.suit) score += 2;
  const gap = hi - lo - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;
  if (gap <= 1 && hi < 12) score += 1;
  return Math.ceil(score);
}

// 0 = last to act this street (best), 1 = first to act (worst)
function positionFrac(state, idx) {
  const n = state.players.length;
  const actors = state.players.filter(canAct).length;
  if (actors <= 1) return 0;
  // count actors after me in this street's order (preflop: after BB; postflop: after dealer)
  let after = 0;
  let i = idx;
  for (let k = 1; k < n; k++) {
    i = (i + 1) % n;
    const stop = state.street === 'preflop' ? state.bbIdx : state.dealerIdx;
    if (canAct(state.players[i]) && i !== idx) after++;
    if (i === stop) break;
  }
  return after / (actors - 1);
}

// ---- Postflop helpers ----
function drawOuts(hole, community) {
  const all = [...hole, ...community];
  let outs = 0;
  // Flush draw: 4 of a suit including a hole card
  const suits = {};
  for (const c of all) suits[c.suit] = (suits[c.suit] || 0) + 1;
  for (const s in suits) {
    if (suits[s] === 4 && hole.some(c => c.suit === s)) outs += 9;
  }
  // Straight draws: count ranks that would complete a straight using a hole card
  const vals = all.map(pokerValue);
  const have = new Set(vals);
  const cur = straightHigh(vals);
  if (!cur) {
    let straightOuts = 0;
    for (let v = 2; v <= 14; v++) {
      if (have.has(v)) continue;
      const h = straightHigh([...vals, v]);
      if (h) {
        // ensure at least one hole card participates
        const lowV = h - 4;
        const inRun = x => (x >= lowV && x <= h) || (lowV === 1 && x === 14);
        if (hole.some(c => inRun(pokerValue(c)))) straightOuts += 4;
      }
    }
    outs += Math.min(straightOuts, 8);
  }
  return Math.min(outs, 15);
}

function boardTop(community) {
  return Math.max(...community.map(pokerValue));
}

// Returns an approximate equity-like strength in [0, 1]
export function handStrength(hole, community) {
  if (community.length === 0) return null;
  const all = [...hole, ...community];
  const r = evaluate(all.length >= 5 ? all : padTo5(all));
  const holeInBest = r.best5.some(c => hole.includes(c));
  const boardOnly = community.length >= 5 ? evaluate(community) : null;
  const boardPlays = boardOnly && boardOnly.score === r.score;

  let base;
  if (r.cat >= CAT.STRAIGHT && holeInBest && !boardPlays) base = 0.92;
  else if (r.cat === CAT.TRIPS && holeInBest) base = 0.85;
  else if (r.cat === CAT.TWO_PAIR && holeInBest && !boardPlays) base = 0.72;
  else if (r.cat === CAT.PAIR) {
    const pairV = r.tiebreak[0];
    const pocket = pokerValue(hole[0]) === pokerValue(hole[1]);
    const top = boardTop(community);
    if (pocket && pairV > top) base = 0.62;                 // overpair
    else if (holeInBest && pairV === top) base = 0.55;      // top pair
    else if (holeInBest) base = 0.35;                       // middle/bottom pair
    else base = 0.18;                                       // board pair only
  } else if (boardPlays || !holeInBest) base = 0.12;
  else {
    // high card: overcards to the board help a little
    const top = boardTop(community);
    const over = hole.filter(c => pokerValue(c) > top).length;
    base = 0.1 + over * 0.05;
  }

  let draw = 0;
  if (community.length < 5 && r.cat < CAT.STRAIGHT) {
    const outs = drawOuts(hole, community);
    draw = outs * (community.length === 3 ? 0.04 : 0.02);
  }
  return { r, base, draw, total: Math.min(0.97, base + draw), boardPlays };
}

function padTo5(cards) {
  // Should not happen (community >= 3 means >= 5 cards), kept defensive.
  return cards;
}

function roundToBB(x, bb) {
  return Math.max(bb, Math.round(x / bb) * bb);
}

function raiseTo(state, la, p, fraction, aggression) {
  const pot = potTotal(state);
  const mb = maxBet(state);
  const need = mb - p.bet;
  const potAfterCall = pot + need;
  let amount = mb + potAfterCall * fraction * aggression;
  amount = roundToBB(amount, state.blinds.bb);
  amount = Math.max(la.raise.min, Math.min(la.raise.max, amount));
  // If this commits most of the stack, just shove
  if (amount >= (p.stack + p.bet) * 0.65) amount = la.raise.max;
  return { type: 'raise', amount };
}

/**
 * Decide an action for seat `idx`. Always returns a legal action.
 */
export function decide(state, idx, rng = Math.random) {
  const la = legalActions(state);
  const p = state.players[idx];
  const per = p.personality || { aggression: 1, looseness: 1, bluffFreq: 0.05 };
  const need = la.call || 0;
  const pot = potTotal(state);
  const bb = state.blinds.bb;
  const mb = maxBet(state);
  const pos = positionFrac(state, idx); // 0 late .. 1 early
  const opponents = state.players.filter((q, i) => i !== idx && isLive(q)).length;

  const fold = () => (la.check ? { type: 'check' } : { type: 'fold' });
  const callOrCheck = () => (need > 0 ? { type: 'call' } : { type: 'check' });
  const raise = (fraction) => (la.raise ? raiseTo(state, la, p, fraction, per.aggression) : callOrCheck());

  // ---------------- Preflop ----------------
  if (state.street === 'preflop') {
    const score = chenScore(p.holeCards[0], p.holeCards[1]);
    const raised = mb > bb;              // someone has raised
    const reraised = mb >= bb * 6;       // 3-bet pot
    const loose = per.looseness;

    if (!raised) {
      const openThresh = (7 + 2 * pos) / loose;      // late 7, early 9
      const callThresh = (4.5 + 1.5 * pos) / loose;  // late 4.5, early 6
      if (score >= openThresh) {
        // occasionally just call with medium hands to mix it up
        if (score < openThresh + 2 && rng() < 0.25) return callOrCheck();
        if (la.raise) {
          let amount = roundToBB(bb * (2.5 + per.aggression * 0.5 + (need > 0 ? 0 : 0)), bb);
          amount = Math.max(la.raise.min, Math.min(la.raise.max, amount));
          return { type: 'raise', amount };
        }
        return callOrCheck();
      }
      if (score >= callThresh) return callOrCheck();
      // late-position steal / bluff
      if (pos <= 0.34 && rng() < per.bluffFreq * 2 && la.raise) return raise(0.6);
      // cheap completes from the blinds
      if (need > 0 && need <= bb / 2 && rng() < 0.6) return callOrCheck();
      return fold();
    }

    // Facing a raise
    const ratio = need / Math.max(1, p.stack + p.bet); // fraction of stack to call
    if (reraised) {
      if (score >= 14) return raise(1.0);          // QQ+, AKs-ish → 4-bet/shove
      if (score >= 10 && ratio < 0.35) return callOrCheck();
      if (score >= 10 && need === 0) return callOrCheck();
      return fold();
    }
    const threeBetThresh = 11 / Math.sqrt(loose);
    const callThresh = (7 + 1.5 * pos) / loose;
    if (score >= threeBetThresh && rng() < 0.6 + per.aggression * 0.2) return raise(1.0);
    if (score >= threeBetThresh) return callOrCheck();
    if (score >= callThresh && ratio < 0.4) return callOrCheck();
    // pot-odds call with playable hands when it's cheap
    if (score >= 5 && need <= pot * 0.2 && ratio < 0.15) return callOrCheck();
    return fold();
  }

  // ---------------- Postflop ----------------
  const hs = handStrength(p.holeCards, state.community);
  const strength = hs.total;
  const potOdds = need > 0 ? need / (pot + need) : 0;
  const river = state.street === 'river';
  const committed = p.stack > 0 && p.stack <= pot * 0.8;
  const stackRatio = need / Math.max(1, p.stack);

  if (need === 0) {
    // Nobody has bet on this street (or we're the first to act)
    if (hs.base >= 0.85) return rng() < 0.85 ? raise(0.7) : callOrCheck(); // occasional trap
    if (hs.base >= 0.7) return raise(0.6);
    if (hs.base >= 0.55) return rng() < 0.55 * per.aggression ? raise(0.55) : callOrCheck();
    if (!river && hs.draw >= 0.3 && rng() < 0.35 * per.aggression) return raise(0.5); // semi-bluff
    if (state.lastAggressorIdx === idx && opponents <= 2 && rng() < per.bluffFreq * 4) return raise(0.5); // c-bet
    if (river && hs.base <= 0.2 && opponents === 1 && rng() < per.bluffFreq) return raise(0.6); // rare river bluff
    return callOrCheck();
  }

  // Facing a bet
  if (hs.base >= 0.85) {
    if (committed || stackRatio > 0.5) return la.raise ? { type: 'raise', amount: la.raise.max } : callOrCheck();
    return rng() < 0.75 ? raise(0.8) : callOrCheck();
  }
  if (hs.base >= 0.7) {
    if (committed) return la.raise ? { type: 'raise', amount: la.raise.max } : callOrCheck();
    if (potOdds > 0.45 && river && rng() < 0.3) return fold(); // huge river bets sometimes get respect
    return rng() < 0.4 * per.aggression ? raise(0.7) : callOrCheck();
  }
  // Draws: call if equity beats pot odds (never on river)
  if (!river && hs.draw > 0 && strength > potOdds + 0.02 && stackRatio < 0.5) return callOrCheck();
  if (hs.base >= 0.55) {
    // top pair / overpair: call reasonable bets, fold to huge pressure sometimes
    if (need <= pot * 0.75 || stackRatio < 0.25) return callOrCheck();
    if (rng() < 0.35 * per.looseness) return callOrCheck();
    return fold();
  }
  if (hs.base >= 0.35) {
    if (need <= pot * 0.4 && stackRatio < 0.3 && rng() < 0.7 * per.looseness) return callOrCheck();
    return fold();
  }
  // Air / board-only: never call big; occasionally float a small bet
  if (need <= pot * 0.25 && stackRatio < 0.1 && rng() < 0.25 * per.looseness) return callOrCheck();
  return fold();
}

export { PV };
