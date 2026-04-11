import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameStatus, type Platform } from '@gamehub/shared';
import { LibraryFilters, type LibraryFiltersValue } from '../../../src/components/library/LibraryFilters';

const platforms: Platform[] = [
  {
    id: 'platform-1',
    userId: 'user-1',
    name: 'PC',
    manufacturer: 'Valve',
    icon: 'gamepad',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'platform-2',
    userId: 'user-1',
    name: 'PS5',
    manufacturer: 'Sony',
    icon: 'gamepad',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

describe('LibraryFilters', () => {
  it('status filter emits the selected value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LibraryFilters value={{}} platforms={platforms} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Status'), GameStatus.PLAYING);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: GameStatus.PLAYING }));
  });

  it('platform filter lists user platforms', () => {
    render(<LibraryFilters value={{}} platforms={platforms} onChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'PC' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PS5' })).toBeInTheDocument();
  });

  it('sort selector updates the sort param', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LibraryFilters value={{}} platforms={platforms} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'rating');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'rating' } satisfies LibraryFiltersValue));
  });
});
