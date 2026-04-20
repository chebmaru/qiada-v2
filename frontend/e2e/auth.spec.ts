import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/it/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/it/login');
    await page.fill('input[type="email"]', 'fake@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    // Should show error or stay on login
    expect(page.url()).toContain('/login');
  });

  test('register page renders form', async ({ page }) => {
    await page.goto('/it/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/it/dashboard');
    await page.waitForTimeout(2000);
    // Should show login prompt or redirect
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|login|دخول)/i);
  });
});
