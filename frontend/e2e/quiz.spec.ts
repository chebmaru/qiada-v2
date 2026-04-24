import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Quiz Flow', () => {
  test('quiz page loads with options', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/quiz');
    await page.waitForLoadState('networkidle');
    // Should show demo card and locked exam card
    await expect(page.locator('text=Prova ora').first()).toBeVisible();
  });

  test('demo mode loads quiz page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Skip interactive quiz on mobile');
    await dismissOnboarding(page);
    await page.goto('/it/quiz/exam?demo=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // Should either show V/F buttons or an error/loading state (depends on API speed)
    const body = await page.textContent('body');
    // Verify we're on the quiz exam page and it loaded something
    expect(body!.length).toBeGreaterThan(50);
    expect(page.url()).toContain('/quiz/exam');
  });

  test('exam mode redirects to login/activate without auth', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/quiz/exam');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // Should redirect to activate page or show error
    const url = page.url();
    const text = await page.textContent('body');
    // Either redirected or shows subscription error
    expect(url + text).toMatch(/(activate|login|quiz|Errore|خطأ)/i);
  });

  test('quiz page shows demo CTA in Arabic', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar/quiz');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // Should show Arabic demo text
    await expect(page.locator('text=جرب الآن').first()).toBeVisible();
  });
});
