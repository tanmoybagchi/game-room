import { expect } from '@playwright/test';

export const POKER_URL = 'games/poker/';

/** Cards in "As Kd 10h" shorthand -> engine card objects (mirrors hand-eval parseCards). */
export function cards(str) {
  const SUIT = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  return str.trim().split(/\s+/).map(tok => {
    let rank = tok.slice(0, -1);
    if (rank === 'T') rank = '10';
    return { suit: SUIT[tok.slice(-1)], rank, faceUp: true };
  });
}

/**
 * Open the poker page with console error tracking, bots acting instantly and
 * no auto-advance between hands (tests drive progression). The service worker
 * is blocked by default because its first-install reload would destroy the
 * page mid-test; pass { sw: true } for the offline/caching spec.
 */
export async function openPoker(page, { botDelay = 0, autoAdvance = 60_000, sw = false } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  void sw; // service workers are blocked via playwright.config (serviceWorkers: 'block')
  await page.goto(POKER_URL);
  await page.waitForFunction(() => window.__poker);
  await page.evaluate(({ ms, auto }) => {
    window.__poker.setBotDelay(ms);
    window.__poker.setAutoAdvance(auto);
  }, { ms: botDelay, auto: autoAdvance });
  return errors.filter(e => !/sw\.js|ServiceWorker/i.test(e));
}

export async function startPlay(page, botCount = 3) {
  await page.selectOption('#bot-count', String(botCount));
  await page.click('#btn-play');
  await expect(page.locator('#table-screen')).toBeVisible();
}

export const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__poker.getState())));

/** Start a rigged hand. holes: { seatIdx: 'As Kd' }, board: 'Qc 7d 2h 9s 3c' */
export async function rig(page, { holes = {}, board = '', dealerIdx = 0 }) {
  const spec = {
    holes: Object.fromEntries(Object.entries(holes).map(([k, v]) => [k, cards(v)])),
    board: board ? cards(board) : [],
  };
  await page.evaluate(({ spec, dealerIdx }) => window.__poker.rig(spec, dealerIdx), { spec, dealerIdx });
}

export async function waitForHumanTurn(page) {
  await expect(page.locator('#action-bar')).toBeVisible();
}

/**
 * Keep acting for the human until the hand ends. `choose(state)` returns
 * 'fold' | 'check-call' | 'raise' (default: check/call). Returns final state.
 */
export async function playThrough(page, choose = () => 'check-call') {
  for (let i = 0; i < 20; i++) {
    await page.waitForFunction(
      () => window.__poker.getState().street === 'hand-over' || !document.getElementById('action-bar').hidden,
      null, { timeout: 30_000 },
    );
    const s = await state(page);
    if (s.street === 'hand-over') return s;
    const before = s.history.length;
    await page.click(`#btn-${choose(s)}`);
    // Wait for the action to be applied (bots may act instantly and re-show the bar)
    await page.waitForFunction(n => window.__poker.getState().history.length > n, before);
  }
  throw new Error('hand did not finish');
}

export async function waitForHandOver(page) {
  await page.waitForFunction(() => window.__poker.getState()?.street === 'hand-over', null, { timeout: 30_000 });
}
