import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Accessibility', () => {
  test('skip-to-main link exists', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it');
    const skipLink = page.locator('a.skip-to-main');
    await expect(skipLink).toHaveCount(1);
  });

  test('desktop navbar has aria-label', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it');
    const nav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(nav).toHaveCount(1);
  });

  test('mobile nav has aria-label', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it');
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toHaveCount(1);
  });

  test('main content has role=main', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it');
    const main = page.locator('[role="main"]');
    await expect(main).toHaveCount(1);
  });

  test('language attribute and direction match locale', async ({ page }) => {
    await page.goto('/it');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/it');
    const headers = response?.headers() || {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
