import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Topics', () => {
  test('topics page loads with topic cards', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/topics');
    await page.waitForSelector('.card', { timeout: 10000 });
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('topics page loads in Arabic with RTL', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar/topics');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.waitForSelector('.card', { timeout: 10000 });
  });

  test('topic detail page loads questions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Skip topic detail click on mobile');
    await dismissOnboarding(page);
    await page.goto('/it/topics');
    await page.waitForSelector('a[href*="/topics/"]', { timeout: 10000 });
    await page.locator('a[href*="/topics/"]').first().click();
    await page.waitForURL(/\/topics\//, { timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();
  });
});
