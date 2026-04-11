import { expect, test } from '@playwright/test';

test('navigation and card layout adapt across the main breakpoints', async ({ page }) => {
  const breakpoints = [375, 768, 1024, 1440];

  for (const width of breakpoints) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/library');

    await expect(page.getByRole('heading', { name: 'A tua coleção unificada.' })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar a biblioteca')).toHaveCount(0);

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
  await page.goto('/platforms');
  const mobileCard = page.locator('article').first();
  await expect(mobileCard).toBeVisible();
  await expect(mobileCard).toHaveCSS('display', 'block');
});