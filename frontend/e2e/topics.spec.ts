import { test, expect } from '@playwright/test';

test.describe('Topics', () => {
  test('topics page loads with topic cards', async ({ page }) => {
    await page.goto('/it/topics');
    await page.waitForSelector('.card', { timeout: 10000 });
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(10);
  });

  test('topics page loads in Arabic with RTL', async ({ page }) => {
    await page.goto('/ar/topics');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.waitForSelector('.card', { timeout: 10000 });
  });

  test('topic detail page loads questions', async ({ page }) => {
    await page.goto('/it/topics');
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.locator('.card').first().click();
    await page.waitForURL(/\/topics\//);
    await expect(page.locator('h1')).toBeVisible();
  });
});
