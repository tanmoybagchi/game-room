import { test, expect } from '@playwright/test';
import { openPoker, state } from './helpers.mjs';
import { LESSONS } from '../../games/poker/lessons.js';

async function openTutorial(page) {
  const errors = await openPoker(page);
  await page.evaluate(() => window.__poker.setTutorialDelay(0));
  await page.click('#btn-tutorial');
  await expect(page.locator('#lesson-list')).toBeVisible();
  return errors;
}

async function startLesson(page, id) {
  await page.click(`.lesson-item[data-lesson="${id}"] .lesson-start`);
  await expect(page.locator('#coach')).toBeVisible();
}

// What can the driver do right now?
function actionable() {
  const vis = el => el && !el.hidden && el.offsetParent !== null;
  if (vis(document.getElementById('lesson-list'))) return 'done';
  const choices = [...document.querySelectorAll('#coach-choices .coach-choice')].filter(b => !b.disabled);
  if (choices.length) return 'quiz';
  if (vis(document.getElementById('coach-next'))) return 'next';
  const bar = document.getElementById('action-bar');
  if (vis(bar) && ['btn-fold', 'btn-check-call', 'btn-raise'].some(id => !document.getElementById(id).disabled)) return 'act';
  return null;
}

/**
 * Drive a lesson to completion. Quiz answers and table actions are brute-forced
 * so the wrong-answer / rejected-action paths get exercised too.
 */
async function driveLesson(page, { maxSteps = 400 } = {}) {
  let stats = { wrongQuiz: 0, rejected: 0, actions: 0 };
  for (let i = 0; i < maxSteps; i++) {
    const kind = await page.waitForFunction(actionable, null, { timeout: 20_000 }).then(h => h.jsonValue());
    if (kind === 'done') return stats;
    if (kind === 'quiz') {
      const buttons = page.locator('#coach-choices .coach-choice:not([disabled])');
      const n = await buttons.count();
      // click choices in order until one lights up as correct
      for (let k = 0; k < n; k++) {
        const b = page.locator('#coach-choices .coach-choice').nth(k);
        if (await b.isDisabled()) continue;
        await b.click();
        if (await b.evaluate(el => el.classList.contains('correct'))) break;
        stats.wrongQuiz++;
        await expect(page.locator('#coach-choices .coach-feedback.bad')).toBeVisible();
      }
      await expect(page.locator('#coach-next')).toBeVisible();
      continue;
    }
    if (kind === 'next') {
      // the runner may hide the button between detection and click; that's fine
      await page.click('#coach-next', { timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(60);
      continue;
    }
    if (kind === 'act') {
      const before = (await state(page)).history.length;
      const tryAction = async (sel, prep) => {
        const btn = page.locator(sel);
        if (await btn.isDisabled()) return false;
        if (prep) await prep();
        await btn.click();
        await page.waitForTimeout(80);
        const after = (await state(page)).history.length;
        return after > before;
      };
      let ok = await tryAction('#btn-check-call');
      if (!ok) { stats.rejected++; ok = await tryAction('#btn-raise', () => page.click('.preset[data-preset="half"]').catch(() => {})); }
      if (!ok) { stats.rejected++; ok = await tryAction('#btn-fold'); }
      if (!ok) { stats.rejected++; ok = await tryAction('#btn-raise', () => page.click('.preset[data-preset="min"]').catch(() => {})); }
      if (!ok) throw new Error('every available action was rejected');
      stats.actions++;
      continue;
    }
  }
  throw new Error('lesson did not finish');
}

test.describe('Tutorial course', () => {
  test('lists all lessons with none completed', async ({ page }) => {
    const errors = await openTutorial(page);
    await expect(page.locator('.lesson-item')).toHaveCount(LESSONS.length);
    await expect(page.locator('.lesson-item.done')).toHaveCount(0);
    await expect(page.locator('#course-progress')).toContainText(`0 of ${LESSONS.length}`);
    expect(errors).toEqual([]);
  });

  test('wrong quiz answer shows feedback and stays on the step', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'hand-rankings');
    // advance through the say/showCards steps to the first quiz
    for (let i = 0; i < 4; i++) await page.click('#coach-next');
    await expect(page.locator('.coach-choice')).toHaveCount(2);
    await page.locator('.coach-choice').nth(1).click(); // wrong: straight over flush
    await expect(page.locator('.coach-feedback.bad')).toBeVisible();
    await expect(page.locator('#coach-next')).toBeHidden();
    await page.locator('.coach-choice').nth(0).click();
    await expect(page.locator('.coach-choice').nth(0)).toHaveClass(/correct/);
    await expect(page.locator('#coach-next')).toBeVisible();
  });

  test('rejected table action leaves the engine state untouched', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'betting-actions');
    // say/highlights until the awaitAction (raise expected)
    await page.waitForFunction(() => !document.getElementById('coach-next').hidden);
    for (let i = 0; i < 4; i++) { await page.click('#coach-next'); await page.waitForTimeout(50); }
    await expect(page.locator('#btn-check-call')).toBeEnabled();
    const before = JSON.stringify(await state(page));
    await page.click('#btn-check-call'); // calling with aces is rejected by the coach
    await expect(page.locator('#coach-text')).toHaveClass(/bad/);
    expect(JSON.stringify(await state(page))).toBe(before);
    await expect(page.locator('#action-bar')).toBeVisible();
  });

  test('Back returns to the previous coach message', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'hand-rankings');
    await expect(page.locator('#coach-back')).toBeHidden(); // first message
    const first = await page.locator('#coach-text').innerText();
    await page.click('#coach-next');
    await expect(page.locator('#coach-back')).toBeVisible();
    expect(await page.locator('#coach-text').innerText()).not.toBe(first);
    await page.click('#coach-back');
    await expect(page.locator('#coach-text')).toHaveText(first);
    await expect(page.locator('#coach-back')).toBeHidden();
    await page.click('#coach-next'); // still moves forward afterwards
    await expect(page.locator('#coach-back')).toBeVisible();
  });

  test('Back from a later talk step rebuilds the dealt hand', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'betting-actions');
    await page.waitForFunction(() => !document.getElementById('coach-next').hidden);
    for (let i = 0; i < 2; i++) { await page.click('#coach-next'); await page.waitForTimeout(50); }
    await page.click('#coach-back');
    await page.waitForTimeout(200);
    const s = await state(page);
    expect(s.players[0].holeCards).toHaveLength(2);
    await expect(page.locator('#coach')).toBeVisible();
  });

  test('Exit returns to the lesson list without completing', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'position');
    await page.click('#coach-exit');
    await expect(page.locator('#lesson-list')).toBeVisible();
    await expect(page.locator('.lesson-item.done')).toHaveCount(0);
    await expect(page.locator('#coach')).toBeHidden();
  });

  test('spotlight frames the highlighted element', async ({ page }) => {
    await openTutorial(page);
    await startLesson(page, 'position');
    await expect(page.locator('#spotlight')).toBeVisible();
    const [spot, target] = await page.evaluate(() => {
      const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const s = window.__poker.getState();
      return [r(document.getElementById('spotlight')), r(document.querySelector(`.seat[data-idx="${s.dealerIdx}"] .dealer-btn`))];
    });
    expect(spot[0]).toBeLessThanOrEqual(target[0]);
    expect(spot[1]).toBeLessThanOrEqual(target[1]);
    expect(spot[2]).toBeGreaterThanOrEqual(target[2]);
    expect(spot[3]).toBeGreaterThanOrEqual(target[3]);
  });

  for (const lesson of LESSONS) {
    test(`lesson "${lesson.title}" runs to completion`, async ({ page }) => {
      const errors = await openTutorial(page);
      await startLesson(page, lesson.id);
      const stats = await driveLesson(page);
      await expect(page.locator(`.lesson-item[data-lesson="${lesson.id}"]`)).toHaveClass(/done/);
      expect(errors).toEqual([]);
      // completion persists across a reload
      await page.reload();
      await page.waitForFunction(() => window.__poker);
      await page.click('#btn-tutorial');
      await expect(page.locator(`.lesson-item[data-lesson="${lesson.id}"]`)).toHaveClass(/done/);
      test.info().annotations.push({ type: 'stats', description: JSON.stringify(stats) });
    });
  }

  test('finishing every lesson shows the course-complete celebration', async ({ page }) => {
    await openTutorial(page);
    await page.evaluate(ids => {
      const save = JSON.parse(localStorage.getItem('gameroom-poker') || '{}');
      save.v = 1;
      save.lessonsCompleted = ids.filter(id => id !== 'hand-rankings'); // everything but the one we'll play
      localStorage.setItem('gameroom-poker', JSON.stringify(save));
    }, LESSONS.map(l => l.id));
    await page.reload();
    await page.waitForFunction(() => window.__poker);
    await page.evaluate(() => window.__poker.setTutorialDelay(0));
    await page.click('#btn-tutorial');
    await startLesson(page, 'hand-rankings');
    await driveLesson(page);
    await expect(page.locator('#win-overlay')).toBeVisible();
    await expect(page.locator('#win-title')).toContainText('Course Complete');
    await page.click('#btn-win-continue');
    await expect(page.locator('#win-overlay')).toBeHidden();
    await expect(page.locator('#course-progress')).toContainText('Course complete');
  });
});
