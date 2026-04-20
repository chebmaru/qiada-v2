import { test, expect } from '@playwright/test';

test.describe('Tricks', () => {
  test('tricks page loads', async ({ page }) => {
    await page.goto('/it/tricks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('tricks page in Arabic', async ({ page }) => {
    await page.goto('/ar/tricks');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
