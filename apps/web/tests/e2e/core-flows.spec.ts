import { expect, test } from '@playwright/test';
import { escapeRegExp, setupMockApi } from './mock-api';

test('core library flow can create, search, edit, and remove a game', async ({ page }) => {
  const mockApi = await setupMockApi(page, {
    searchResult: {
      rawgId: 9_999_001,
      title: `E2E Test Quest ${Date.now()}`,
      coverUrl: null,
      platforms: ['PC'],
      genres: ['Adventure'],
      metacritic: 88,
    },
  });

  const uniqueSuffix = Date.now();
  const platformName = `E2E Platform ${uniqueSuffix}`;
  const gameTitle = mockApi.searchResult.title;

  await page.goto('/platforms');
  await page.getByLabel('Nome').fill(platformName);
  await page.getByLabel('Fabricante').fill('Nintendo');
  await page.getByRole('button', { name: 'Adicionar' }).click();

  await expect(page.getByText('Plataforma adicionada')).toBeVisible();
  await expect(page.getByText(platformName)).toBeVisible();

  await page.goto('/library');
  await page.getByRole('button', { name: 'Adicionar jogo' }).click();
  await page.getByLabel('Buscar jogo').fill('zelda');
  await expect(page.getByText(gameTitle)).toBeVisible();
  await page.getByRole('button', { name: gameTitle }).click();

  await page.getByLabel('Plataforma').selectOption({ label: platformName });
  await page.getByLabel('Nota').fill('8');
  await page.getByLabel('Horas jogadas').fill('12.5');
  await page.getByLabel('Review').fill('Fluxo e2e válido.');
  await page.getByRole('button', { name: 'Adicionar' }).last().click();

  await expect(page.getByText('Jogo adicionado')).toBeVisible();
  const addedGameLink = page.getByRole('link', { name: new RegExp(escapeRegExp(gameTitle)) });
  await expect(addedGameLink).toBeVisible();

  await addedGameLink.click();
  await page.getByLabel('Status').selectOption('PLAYED');
  await page.getByLabel('Review').fill('Atualizado no detalhe.');
  await page.getByRole('button', { name: 'Guardar alterações' }).click();

  await expect(page.getByText('Jogo atualizado')).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Remover da biblioteca' }).click();

  await expect(page.getByText('Jogo removido')).toBeVisible();
  await expect(page.getByText(gameTitle)).toHaveCount(0);

  await page.goto('/platforms');
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  const platformCard = page.locator('article').filter({ hasText: platformName }).first();
  await platformCard.getByRole('button', { name: 'Eliminar' }).click();

  await expect(page.getByText('Plataforma removida')).toBeVisible();
});

test('discover recommendations can be added to the library', async ({ page }) => {
  await setupMockApi(page);

  await page.goto('/discover');

  const recommendationCard = page.locator('article').filter({ hasText: 'Recommendation' }).first();
  await expect(recommendationCard).toBeVisible();

  const recommendationTitle = (await recommendationCard.locator('h3').textContent())?.trim() ?? '';
  await recommendationCard.getByRole('button', { name: 'Adicionar' }).click();

  await page.getByLabel('Plataforma').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Adicionar' }).last().click();

  await expect(page.getByText('Jogo adicionado')).toBeVisible();

  await page.goto('/library');
  const recommendationLink = page.getByRole('link', { name: new RegExp(escapeRegExp(recommendationTitle)) });
  await expect(recommendationLink).toBeVisible();

  await recommendationLink.click();
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Remover da biblioteca' }).click();

  await expect(page.getByText('Jogo removido')).toBeVisible();
});

test('steam sync shows progress and completion feedback', async ({ page }) => {
  await setupMockApi(page);

  await page.goto('/settings');
  await page.getByLabel('Steam ID').fill('76561198000000000');
  await page.getByLabel('Plataforma').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Sincronizar' }).click();

  await expect(page.getByText('Sincronização iniciada')).toBeVisible();
  await expect(page.getByText('A sincronizar 2/4 jogos...')).toBeVisible();

  await page.waitForTimeout(3200);

  await expect(page.getByText('Concluído')).toBeVisible();
  await expect(page.getByText('Sincronização concluída')).toBeVisible();
});