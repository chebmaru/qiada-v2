import { test, expect } from '@playwright/test';

test.describe('Navigation & Pages', () => {
  test('home page loads in Italian', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveTitle(/Qiada|Patente/i);
    await expect(page.locator('text=6.845')).toBeVisible();
  });

  test('home page loads in Arabic', async ({ page }) => {
    await page.goto('/ar');
    await expect(page).toHaveTitle(/Qiada|قيادة/i);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('chapters page shows 25 chapters', async ({ page }) => {
    await page.goto('/it/chapters');
    await page.waitForSelector('main a[href*="chapter"]', { timeout: 10000 });
    const chapters = page.locator('main a[href*="chapter"]');
    await expect(chapters).toHaveCount(25);
  });

  test('glossary page loads', async ({ page }) => {
    await page.goto('/it/glossary');
    await expect(page.locator('text=Glossario').first()).toBeVisible();
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/it/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('locale switch redirects correctly', async ({ page }) => {
    await page.goto('/it');
    await page.waitForLoadState('networkidle');
    // Navigate to Arabic version
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('404 page for invalid route', async ({ page }) => {
    const response = await page.goto('/it/nonexistent-page-xyz');
    expect(response?.status()).toBe(404);
  });
});
