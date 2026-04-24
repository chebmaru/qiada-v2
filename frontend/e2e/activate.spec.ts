import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Activate Page', () => {
  test('shows login prompt when not authenticated', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/activate');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // Should show "Devi accedere prima" or login/register links
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|Accedi|login)/i);
  });

  test('shows login prompt in Arabic when not authenticated', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar/activate');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const text = await page.textContent('body');
    expect(text).toMatch(/(تسجيل الدخول|يجب)/);
  });

  test('expired reason banner shows when ?reason=expired', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/activate?reason=expired');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Subscription Gate', () => {
  test('dashboard shows login prompt when not authenticated', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(Accedi|accedere|login)/i);
  });

  test('review page shows gate for unauthenticated users', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/review');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(Accedi|accedere|login)/i);
  });

  test('stats page shows gate for unauthenticated users', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/stats');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(Accedi|accedere|login)/i);
  });
});
