import type { Page } from '@playwright/test';

/**
 * Dismiss the onboarding modal by setting localStorage before navigating.
 * Call this before page.goto() on pages that show the modal.
 */
export async function dismissOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('qiada_onboarding_done', '1');
  });
}
