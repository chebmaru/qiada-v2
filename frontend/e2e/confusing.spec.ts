import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Confusing Pairs', () => {
  test('confusing page loads pairs', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/confusing');
    await page.waitForSelector('.card', { timeout: 10000 });
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('confusing page in Arabic', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar/confusing');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.waitForSelector('.card', { timeout: 10000 });
  });
});
