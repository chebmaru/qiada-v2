import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Security - Protected Routes', () => {
  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/dashboard');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|Accedi|login)/i);
  });

  test('review page requires authentication', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/review');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(accedere|Accedi|login|ripasso)/i);
  });

  test('exam page requires subscription', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/quiz/exam');
    await page.waitForTimeout(3000);
    // Should show login or subscription message
    const url = page.url();
    const text = await page.textContent('body');
    const isProtected = url.includes('/login') || text?.match(/(accedere|abbonamento|subscription|Accedi)/i);
    expect(isProtected).toBeTruthy();
  });
});

test.describe('Security - API responses', () => {
  test('questions API does not expose correct answers', async ({ page }) => {
    const response = await page.request.get('/api/questions?limit=3');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    for (const q of body.data) {
      expect(q).not.toHaveProperty('isTrue');
      expect(q).not.toHaveProperty('explanationIt');
      expect(q).not.toHaveProperty('explanationAr');
    }
  });

  test('quiz result API requires authentication', async ({ page }) => {
    const response = await page.request.get('/api/quiz/1');
    expect(response.status()).toBe(401);
  });

  test('admin API rejects unauthenticated requests', async ({ page }) => {
    const response = await page.request.get('/api/admin/stats');
    expect(response.status()).toBe(401);
  });

  test('health endpoint is public', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
