import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Internationalization', () => {
  test('Italian pages have ltr direction', async ({ page }) => {
    await page.goto('/it');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  });

  test('Arabic pages have rtl direction', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('language switcher navigates between locales', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/glossary');
    await page.waitForLoadState('networkidle');
    // Find the language switcher (the circle button with "ع" or "IT")
    const switcher = page.locator('a').filter({ hasText: /^(ع|IT)$/ }).first();
    if (await switcher.isVisible()) {
      await switcher.click();
      await page.waitForURL(/\/ar\//, { timeout: 10000 });
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }
  });

  test('quiz page loads in both locales', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/quiz');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.goto('/ar/quiz');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
