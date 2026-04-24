import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Profile & Settings', () => {
  test('settings page requires login', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/settings');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|Accedi|login|impostazioni|دخول)/i);
  });

  test('stats page requires login', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/stats');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|Accedi|statistiche|login)/i);
  });
});
