import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Navigation & Pages', () => {
  test('home page loads in Italian', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it');
    await expect(page).toHaveTitle(/Qiada|Patente/i);
    await expect(page.locator('text=6.845').first()).toBeVisible();
  });

  test('home page loads in Arabic', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar');
    await expect(page).toHaveTitle(/Qiada|قيادة/i);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('chapters page shows 25 chapters', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/chapters');
    await page.waitForSelector('main a', { timeout: 10000 });
    const chapters = page.locator('main a');
    const count = await chapters.count();
    expect(count).toBeGreaterThanOrEqual(25);
  });

  test('glossary page loads', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/glossary');
    await page.waitForLoadState('networkidle');
    // h1 has "Glossario" text, visible on both desktop and mobile
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/it/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('locale switch redirects correctly', async ({ page }) => {
    await page.goto('/it');
    await page.waitForLoadState('networkidle');
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('404 page for invalid route', async ({ page }) => {
    const response = await page.goto('/it/nonexistent-page-xyz');
    expect(response?.status()).toBe(404);
  });
});
