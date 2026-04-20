import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('theme toggle cycles through modes', async ({ page }) => {
    await page.goto('/it');
    await page.waitForLoadState('networkidle');

    // Find theme toggle button (desktop navbar)
    const toggle = page.locator('button[aria-label="Toggle theme"]').first();
    if (await toggle.isVisible()) {
      // Click to cycle: system -> light
      await toggle.click();
      await page.waitForTimeout(300);

      // Click to cycle: light -> dark
      await toggle.click();
      await page.waitForTimeout(300);
      await expect(page.locator('html')).toHaveClass(/dark/);

      // Click to cycle: dark -> system
      await toggle.click();
      await page.waitForTimeout(300);
    }
  });

  test('dark mode persists across navigation', async ({ page }) => {
    await page.goto('/it');
    await page.waitForLoadState('networkidle');

    const toggle = page.locator('button[aria-label="Toggle theme"]').first();
    if (await toggle.isVisible()) {
      // Set to dark (system -> light -> dark)
      await toggle.click();
      await page.waitForTimeout(200);
      await toggle.click();
      await page.waitForTimeout(200);
      await expect(page.locator('html')).toHaveClass(/dark/);

      // Navigate and check persistence
      await page.goto('/it/glossary');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveClass(/dark/);
    }
  });
});
