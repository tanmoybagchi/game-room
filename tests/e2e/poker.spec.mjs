import { test, expect } from '@playwright/test';
import { openPoker, startPlay, state, rig, waitForHumanTurn, waitForHandOver, playThrough } from './helpers.mjs';

test.describe('Poker table', () => {
  test('loads without console errors and shows the start screen', async ({ page }) => {
    const errors = await openPoker(page);
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#bankroll-display')).toHaveText('1000');
    await expect(page.locator('#btn-play')).toBeVisible();
    await expect(page.locator('#btn-tutorial')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Play seats the human with three bots and deals hole cards', async ({ page }) => {
    const errors = await openPoker(page);
    await startPlay(page, 3);
    await expect(page.locator('.seat')).toHaveCount(4);
    await expect(page.locator('.seat.human')).toHaveCount(1);
    // human's two cards are face-up (flipped), bots face-down
    await expect(page.locator('.seat.human .card-slot.flipped')).toHaveCount(2);
    await expect(page.locator('.seat.bot .card-slot')).toHaveCount(6);
    await expect(page.locator('.seat.bot .card-slot.flipped')).toHaveCount(0);
    await expect(page.locator('#community .card-slot.empty')).toHaveCount(5);
    await expect(page.locator('#hand-strength')).toContainText('You have:');
    expect(errors).toEqual([]);
  });

  test('action bar appears on the human turn with a Call label preflop', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 3);
    // Rig: dealer at seat 1 -> human is BB? No: we want the human to face a call. Dealer 2: sb=3, bb=0(human).
    // Use dealer 1: sb=2, bb=3, first to act = 0 (human) facing the big blind.
    await rig(page, { holes: { 0: 'As Ad' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    const s = await state(page);
    expect(s.currentIdx).toBe(0);
    await expect(page.locator('#btn-check-call')).toHaveText('Call 20');
    await expect(page.locator('#btn-raise')).toHaveText('Raise to 40');
    await expect(page.locator('#hand-strength')).toHaveText('You have: Pair of Aces');
  });

  test('fold lets the bots finish the hand and a new hand starts', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 3);
    await rig(page, { holes: { 0: '7c 2d' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    const before = await state(page);
    await page.click('#btn-fold');
    await expect(page.locator('#action-bar')).toBeHidden();
    await expect(page.locator('#hand-strength')).toHaveText('You folded');
    await waitForHandOver(page);
    await expect(page.locator('#banner')).toBeVisible();
    await expect(page.locator('#next-hand-row')).toBeVisible();
    await page.click('#btn-next-hand');
    await page.waitForFunction(n => window.__poker.getState().handNo === n + 1, before.handNo);
    const after = await state(page);
    expect(after.handNo).toBe(before.handNo + 1);
    expect(after.players[0].holeCards).toHaveLength(2);
  });

  test('raising with aces increases the pot and moves the action on', async ({ page }) => {
    await openPoker(page, { botDelay: 3000 }); // slow bots so the table state holds still for assertions
    await startPlay(page, 3);
    await rig(page, { holes: { 0: 'As Ad' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    await page.click('.preset[data-preset="pot"]');
    const label = await page.locator('#btn-raise').textContent();
    expect(label).toMatch(/Raise to (\d+)/);
    const amount = +label.match(/(\d+)/)[1];
    // Pot-sized raise: current bet 20 + (pot 30 + our call 20) = 70
    expect(amount).toBe(70);
    await page.click('#btn-raise');
    await expect(page.locator('#action-bar')).toBeHidden();
    const s = await state(page);
    expect(s.players[0].bet + s.players[0].totalBet).toBe(70);
    expect(s.history.some(h => h.text === 'You raise to 70')).toBe(true);
    await expect(page.locator('.seat.human .seat-bet')).toContainText('70');
    await expect(page.locator('#pot')).toHaveText('Pot: 100');
  });

  test('all-in preset equals the full stack and shows an all-in label', async ({ page }) => {
    await openPoker(page);
    await startPlay(page, 3);
    await rig(page, { holes: { 0: 'Ks Kd' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    await page.click('.preset[data-preset="allin"]');
    await expect(page.locator('#raise-amount')).toHaveText('1000');
    await expect(page.locator('#btn-raise')).toHaveText('All-in 1000');
  });

  test('showdown reveals bot cards and highlights exactly five winning cards', async ({ page }, testInfo) => {
    await openPoker(page);
    await startPlay(page, 2);
    // Human has the nuts: royal flush; bots have strong hands so they stay in. Dealer 1 -> sb 2, bb 0.
    await rig(page, {
      holes: { 0: 'As Ks', 1: 'Kd Kc', 2: 'Qd Qc' },
      board: 'Qs Js 10s 4d 9c',
      dealerIdx: 1,
    });
    await playThrough(page); // check/call until the hand ends
    await waitForHandOver(page);
    await expect(page.locator('#banner')).toContainText('Royal Flush');
    await expect(page.locator('.seat.human.winner')).toHaveCount(1);
    await expect(page.locator('.card.winning')).toHaveCount(5);
    await expect(page.locator('#hand-strength')).toHaveText('You have: Royal Flush');
    // Bots that went to showdown are revealed
    const s = await state(page);
    const liveBots = s.players.filter((p, i) => i > 0 && !p.folded).length;
    await expect(page.locator('.seat.bot .card-slot.flipped')).toHaveCount(liveBots * 2);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `test-results/screens/showdown-${testInfo.project.name}.png`, fullPage: true });
  });

  test('no horizontal overflow at the current viewport', async ({ page }, testInfo) => {
    await openPoker(page);
    await page.screenshot({ path: `test-results/screens/start-${testInfo.project.name}.png` });
    await startPlay(page, 4);
    await rig(page, { holes: { 0: 'As Ad' }, dealerIdx: 1 });
    await waitForHumanTurn(page);
    await page.waitForTimeout(1200); // let the deal animation finish
    await page.screenshot({ path: `test-results/screens/table-${testInfo.project.name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
