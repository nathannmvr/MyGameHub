import { expect, test } from '@playwright/test';

test('platform and library flow can create, search, edit, and remove data', async ({ page, request }) => {
  const existingLibrary = await request.get('/api/v1/library');
  if (existingLibrary.ok()) {
    const payload = await existingLibrary.json();
    const items: Array<{ id: string }> = payload?.data?.data ?? [];

    for (const item of items) {
      await request.delete(`/api/v1/library/${item.id}`);
    }
  }

  const uniqueSuffix = Date.now();
  const platformName = `E2E Platform ${uniqueSuffix}`;

  await page.goto('/platforms');
  await expect(page.getByRole('heading', { name: 'Gestão do hardware do utilizador.' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Nome' }).first().fill(platformName);
  await page.getByRole('textbox', { name: 'Fabricante' }).first().fill('Nintendo');
  await page.getByRole('button', { name: 'Adicionar' }).first().click();

  const platformCard = page.locator('article').filter({ hasText: platformName }).first();
  await expect(platformCard).toBeVisible();

  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'A tua coleção unificada.' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar jogo' }).first().click();

  await page.getByRole('textbox', { name: 'Buscar jogo' }).fill('hades');
  const addGameDialog = page.getByRole('dialog').filter({ hasText: 'Adicionar jogo à biblioteca' });
  const searchResultButton = addGameDialog.locator('button:enabled').filter({ hasText: /hades/i }).first();
  await expect(searchResultButton).toBeVisible();
  const gameTitle = (await searchResultButton.locator('p').first().textContent())?.trim() ?? 'Hades';
  await searchResultButton.click();

  await addGameDialog.getByRole('combobox', { name: 'Plataforma' }).selectOption({ label: platformName });
  await addGameDialog.getByRole('spinbutton', { name: 'Nota' }).fill('8');
  await addGameDialog.getByRole('spinbutton', { name: 'Horas jogadas' }).fill('12.5');
  await addGameDialog.getByRole('textbox', { name: 'Review' }).fill(`Fluxo e2e válido ${uniqueSuffix}`);
  await addGameDialog.getByRole('button', { name: 'Adicionar' }).click();
  await expect(addGameDialog).toBeHidden({ timeout: 15_000 });

  const addedGameCard = page.locator('article').filter({ hasText: new RegExp(gameTitle, 'i') }).first();
  await expect(addedGameCard).toBeVisible();
  await addedGameCard.click();

  await page.getByRole('combobox', { name: 'Status' }).selectOption('PLAYED');
  await page.getByRole('textbox', { name: 'Review' }).fill(`Atualizado no detalhe ${uniqueSuffix}`);
  await page.getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(page.getByRole('textbox', { name: 'Review' })).toHaveValue(`Atualizado no detalhe ${uniqueSuffix}`);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Remover da biblioteca' }).click();
  await page.goto('/library');
  await expect(page.locator('article').filter({ hasText: new RegExp(gameTitle, 'i') })).toHaveCount(0);

  await page.goto('/platforms');
  await expect(platformCard).toBeVisible();
  await platformCard.getByRole('textbox', { name: 'Fabricante' }).fill('Nintendo Updated');
  await platformCard.getByRole('button', { name: 'Guardar' }).click();
  await expect(platformCard.getByRole('textbox', { name: 'Fabricante' })).toHaveValue('Nintendo Updated');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await platformCard.getByRole('button', { name: 'Eliminar' }).click();
  await expect(platformCard).toHaveCount(0);
});

test('discover page loads recommendations without API errors', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByRole('heading', { name: 'Recomendações filtradas pelas tuas plataformas.' })).toBeVisible();
  await expect(page.getByText('Não foi possível carregar as recomendações')).toHaveCount(0);

  const recommendationCards = page.locator('article').filter({ has: page.getByRole('button', { name: 'Adicionar' }) });
  const emptyTitle = page.getByText('Sem recomendações por agora');

  if (await recommendationCards.count()) {
    await expect(recommendationCards.first()).toBeVisible();
  } else {
    await expect(emptyTitle).toBeVisible();
  }
});

test('steam sync starts and reaches terminal status with progress visible', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Perfil e sincronização Steam.' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Steam ID' }).fill('76561198185150675');
  await page.getByRole('combobox', { name: 'Plataforma' }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Sincronizar' }).click();

  const syncSection = page
    .locator('section')
    .filter({ hasText: 'Steam sync' })
    .last();
  await expect(syncSection).toBeVisible();
  await expect(syncSection.locator('span').filter({ hasText: /\d+\/\d+/ }).first()).toBeVisible();

  await expect
    .poll(async () => {
      return (await syncSection.locator('h2').first().textContent())?.trim();
    }, { timeout: 180_000 })
    .toMatch(/Concluído|Erro na sincronização/);
});