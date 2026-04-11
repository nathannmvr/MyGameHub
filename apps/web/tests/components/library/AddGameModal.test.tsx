import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameStatus } from '@gamehub/shared';
import { AddGameModal } from '../../../src/components/library/AddGameModal';

vi.mock('../../../src/hooks/use-game-search', () => ({
  useGameSearch: () => ({
    isFetching: false,
    data: {
      data: [
        { rawgId: 1, slug: 'game-1', title: 'Test Game', coverUrl: null, releaseDate: null, genres: [], platforms: ['PC'], metacritic: null, alreadyInLibrary: false, reason: 'GENRE_AFFINITY' },
        { rawgId: 2, slug: 'game-2', title: 'Test Game 2', coverUrl: null, releaseDate: null, genres: [], platforms: ['PC'], metacritic: null, alreadyInLibrary: false, reason: 'GENRE_AFFINITY' },
      ],
    },
  }),
}));

const addLibraryItem = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../src/hooks/use-library', () => ({
  useLibrary: () => ({
    addLibraryItem: {
      mutateAsync: addLibraryItem,
      isPending: false,
    },
  }),
}));

vi.mock('../../../src/hooks/use-platforms', () => ({
  usePlatforms: () => ({
    data: [
      { id: 'platform-1', userId: 'user-1', name: 'PC', manufacturer: 'Valve', icon: 'gamepad', isActive: true, createdAt: new Date().toISOString() },
    ],
  }),
}));

describe('AddGameModal', () => {
  it('debounced search shows results and allows selecting a game', async () => {
    const user = userEvent.setup();
    render(<AddGameModal open onClose={vi.fn()} />);

    await user.type(await screen.findByLabelText(/Buscar jogo/i), 'Test Game');

    const resultButtons = await screen.findAllByRole('button', { name: /Test Game/i });
    expect(resultButtons.length).toBeGreaterThan(0);
    await user.click(resultButtons[0]);
    expect(screen.getAllByText('Test Game')).toHaveLength(2);
  });

  it('submit calls the add mutation with valid fields', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AddGameModal open onClose={onClose} />);

    await user.type(await screen.findByLabelText(/Buscar jogo/i), 'Test Game');
    const resultButtons = await screen.findAllByRole('button', { name: /Test Game/i });
    await user.click(resultButtons[0]);
    await user.selectOptions(screen.getByLabelText('Status'), GameStatus.PLAYED);
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => {
      expect(addLibraryItem).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
