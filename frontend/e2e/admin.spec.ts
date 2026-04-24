import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

test.describe('Admin Page Security', () => {
  test('admin page shows unauthorized without login', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/it/admin');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(autorizzat|Accedi|login|غير مصرح)/i);
  });

  test('admin page in Arabic shows unauthorized', async ({ page }) => {
    await dismissOnboarding(page);
    await page.goto('/ar/admin');
    await page.waitForTimeout(2000);
    const text = await page.textContent('body');
    expect(text).toMatch(/(autorizzat|Accedi|login|غير مصر��)/i);
  });
});
