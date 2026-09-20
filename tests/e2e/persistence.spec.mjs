import { test, expect } from '@playwright/test';
import { openPoker, startPlay, state, rig, waitForHumanTurn, waitForHandOver, playThrough } from './helpers.mjs';

const getSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('gameroom-poker')));

async function reloadAndResume(page) {
  await page.reload();
  await page.waitForFunction(() => window.__poker);
  await page.evaluate(() => { window.__poker.setBotDelay(0); window.__poker.setAutoAdvance(60_000); });
  await page.click('#btn-play');
  await expect(page.locator('#table-screen')).toBeVisible();
}

test.describe('Persistence & shell', () => {
  test('reload mid-hand with the human to act resumes the same hand', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 3);
    await rig(page, { holes: { 0: 'Qs Qd' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    const before = await state(page);
    expect((await getSave(page)).hand.handNo).toBe(before.handNo);
    await reloadAndResume(page);
    await waitForHumanTurn(page);
    const after = await state(page);
    expect(after.handNo).toBe(before.handNo);
    expect(after.players[0].holeCards).toEqual(before.players[0].holeCards);
    expect(after.currentIdx).toBe(0);
    await expect(page.locator('#hand-strength')).toHaveText('You have: Pair of Queens');
  });

  test('reload mid-hand with a bot to act lets the bots resume', async ({ page }) => {
    await openPoker(page, { botDelay: 30_000 }); // bots stall so we can reload on their turn
    await startPlay(page, 3);
    await rig(page, { holes: { 0: 'As Ks' }, dealerIdx: 0 }); // first to act is seat 3 (a bot)
    const before = await state(page);
    expect(before.currentIdx).toBe(3);
    await reloadAndResume(page);
    await page.waitForFunction(n => window.__poker.getState().history.length > n, before.history.length);
    const after = await state(page);
    expect(after.handNo).toBe(before.handNo);
  });

  test('New Hand discards the saved hand but keeps bankroll and lessons', async ({ page }) => {
    await openPoker(page);
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('gameroom-poker') || '{}');
      save.v = 1;
      save.lessonsCompleted = ['hand-rankings'];
      localStorage.setItem('gameroom-poker', JSON.stringify(save));
    });
    await page.reload();
    await page.waitForFunction(() => window.__poker);
    await page.evaluate(() => { window.__poker.setBotDelay(0); window.__poker.setAutoAdvance(60_000); });
    await startPlay(page, 3);
    await rig(page, { holes: { 0: 'Qs Qd' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    const before = await state(page);
    await page.click('#btn-new-game');
    await page.waitForFunction(n => window.__poker.getState().handNo === n + 1, before.handNo);
    const save = await getSave(page);
    expect(save.lessonsCompleted).toEqual(['hand-rankings']);
    expect(save.bankroll).toBeGreaterThan(0);
    // abandoning the hand refunded the chips in the middle
    const after = await state(page);
    const total = after.players.reduce((s, p) => s + p.stack + p.bet, 0) + after.pot;
    expect(total).toBe(4000);
  });

  test('busting shows the rebuy overlay and Rebuy restores 1000 chips', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 2);
    // Human is the big blind; the bots (aces and kings) act first, then the human shoves 7-2 and gets called
    await rig(page, { holes: { 0: '7c 2d', 1: 'As Ad', 2: 'Ks Kd' }, board: 'Ah Kh 9c 4d 3s', dealerIdx: 1 });
    await waitForHumanTurn(page);
    await page.click('.preset[data-preset="allin"]');
    await page.click('#btn-raise');
    await waitForHandOver(page);
    await expect(page.locator('#bust-overlay')).toBeVisible({ timeout: 15_000 });
    expect((await state(page)).players[0].stack).toBe(0);
    await page.click('#btn-play-again');
    await expect(page.locator('#bust-overlay')).toBeHidden();
    const s = await state(page);
    expect(s.players[0].stack + s.players[0].bet + s.players[0].totalBet).toBe(1000);
    expect(s.players[0].out).toBe(false);
    // the saved bankroll always mirrors the live stack (a blind may already be posted)
    expect((await getSave(page)).bankroll).toBe(s.players[0].stack);
  });

  test('bankroll carries over between sessions', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 2);
    await rig(page, { holes: { 0: 'As Ad', 1: '7c 2d', 2: '8h 3c' }, board: 'Ah Kh 9c 4d 3s', dealerIdx: 0 });
    await playThrough(page); // check/call along
    const s = await state(page);
    await page.click('#btn-menu');
    await expect(page.locator('#bankroll-display')).toHaveText(String(s.players[0].stack));
    await page.reload();
    await page.waitForFunction(() => window.__poker);
    await expect(page.locator('#bankroll-display')).toHaveText(String(s.players[0].stack));
  });

  test('help modal opens with the hand ranking chart and closes', async ({ page }) => {
    await openPoker(page);
    await page.click('#btn-help');
    await expect(page.locator('#help-modal')).toBeVisible();
    await expect(page.locator('#help-modal .rankings dt').first()).toHaveText('Royal Flush');
    await expect(page.locator('#help-modal .rankings dt')).toHaveCount(10);
    await page.click('#btn-help-close');
    await expect(page.locator('#help-modal')).toBeHidden();
  });

  test('dashboard lists Poker between Nonogram and Pyramid', async ({ page }) => {
    await page.goto('');
    const names = await page.locator('game-card').evaluateAll(els => els.map(e => e.getAttribute('name')));
    const i = names.indexOf('Poker');
    expect(i).toBeGreaterThan(0);
    expect(names[i - 1]).toBe('Nonogram');
    expect(names[i + 1]).toBe('Pyramid');
    await expect(page.locator('game-card[name="Poker"]')).toHaveAttribute('href', 'games/poker/');
  });
});

test.describe('Offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('service worker caches the poker game for offline play', async ({ page, context }) => {
    await page.goto('');
    // First install triggers a reload via controllerchange; tolerate the context swap.
    for (let i = 0; i < 3; i++) {
      try {
        await page.waitForFunction(() => navigator.serviceWorker.controller != null, null, { timeout: 15_000 });
        break;
      } catch (e) {
        if (!String(e).includes('Execution context')) throw e;
      }
    }
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      if (!keys.length) return false;
      const hit = await caches.match(new URL('games/poker/lessons.js', location.href).href);
      return !!hit;
    }, null, { timeout: 20_000 });
    await context.setOffline(true);
    await page.goto('games/poker/');
    await expect(page.locator('#btn-play')).toBeVisible();
    await page.click('#btn-play');
    await expect(page.locator('#table-screen')).toBeVisible();
    await expect(page.locator('.seat')).toHaveCount(4);
    await context.setOffline(false);
  });
});
