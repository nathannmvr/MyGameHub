import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameStatus, type LibraryItemExpanded } from '@gamehub/shared';
import { QuickEditForm } from '../../../src/components/game/QuickEditForm';

const updateLibraryItem = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../src/hooks/use-library', () => ({
  useLibrary: () => ({
    updateLibraryItem: {
      mutateAsync: updateLibraryItem,
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

const item: LibraryItemExpanded = {
  id: 'item-1',
  status: GameStatus.PLAYING,
  rating: 8,
  playtimeHours: 12,
  review: 'Good game',
  addedAt: new Date().toISOString(),
  game: {
    id: 'game-1',
    title: 'Test Game',
    coverUrl: null,
    developer: 'Studio',
    genres: ['Action'],
  },
  platform: {
    id: 'platform-1',
    name: 'PC',
    icon: 'gamepad',
  },
};

describe('QuickEditForm', () => {
  it('renders with the current values prefilled', () => {
    render(<QuickEditForm item={item} />);

    expect(screen.getByLabelText('Status')).toHaveValue(GameStatus.PLAYING);
    expect(screen.getByLabelText('Plataforma')).toHaveValue('platform-1');
    expect(screen.getByLabelText('Review')).toHaveValue('Good game');
  });

  it('changing status calls the mutation on save', async () => {
    const user = userEvent.setup();
    render(<QuickEditForm item={item} />);

    await user.selectOptions(screen.getByLabelText('Status'), GameStatus.PLAYED);
    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }));

    expect(updateLibraryItem).toHaveBeenCalledWith(expect.objectContaining({
      id: 'item-1',
      payload: expect.objectContaining({ status: GameStatus.PLAYED }),
    }));
  });

  it('star rating emits the selected value', async () => {
    const user = userEvent.setup();
    render(<QuickEditForm item={item} />);

    await user.click(screen.getByRole('button', { name: '10 stars' }));
    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }));

    expect(updateLibraryItem).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ rating: 10 }),
    }));
  });
});
