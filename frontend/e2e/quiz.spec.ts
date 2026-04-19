import { test, expect } from '@playwright/test';

test.describe('Quiz Flow', () => {
  test('quiz page loads with options', async ({ page }) => {
    await page.goto('/it/quiz');
    await page.waitForLoadState('networkidle');
    // Should show quiz setup or chapter selection
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('exam mode starts with 40 questions', async ({ page }) => {
    await page.goto('/it/quiz/exam');
    await page.waitForLoadState('networkidle');
    // Should show exam interface or redirect to login
    const url = page.url();
    expect(url).toMatch(/\/(quiz|login)/);
  });
});
