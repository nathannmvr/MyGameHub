import { expect, test } from '@playwright/test';
import { setupMockApi } from './mock-api';

test('navigation and card layout adapt across the main breakpoints', async ({ page }) => {
  await setupMockApi(page);

  const breakpoints = [375, 768, 1024, 1440];

  for (const width of breakpoints) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/library');

    await expect(page.getByRole('heading', { name: 'A tua coleção unificada.' })).toBeVisible();

    const sidebar = page.locator('aside');
    const mobileNav = page.locator('nav.fixed.bottom-0');

    if (width < 1024) {
      await expect(sidebar).toBeHidden();
      await expect(mobileNav).toBeVisible();
    } else {
      await expect(sidebar).toBeVisible();
      await expect(mobileNav).toBeHidden();
    }
  }

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/library');
  await expect(page.locator('article').first()).toHaveCSS('display', 'flex');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/library');
  await expect(page.locator('article').first()).toHaveCSS('display', 'block');
});