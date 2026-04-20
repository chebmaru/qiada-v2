import { test, expect } from '@playwright/test';

test.describe('Glossary', () => {
  test('glossary shows bilingual terms', async ({ page }) => {
    await page.goto('/it/glossary');
    await page.waitForSelector('.card', { timeout: 10000 });
    const terms = page.locator('.card');
    const count = await terms.count();
    expect(count).toBeGreaterThan(10);
  });

  test('glossary in Arabic', async ({ page }) => {
    await page.goto('/ar/glossary');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.waitForSelector('.card', { timeout: 10000 });
  });
});
