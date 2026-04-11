import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationReason } from '@gamehub/shared';
import { RecommendationCard } from '../../../src/components/discover/RecommendationCard';

describe('RecommendationCard', () => {
  it('dispara callback de impression no mount e mostra reason', () => {
    const onImpression = vi.fn();

    render(
      <RecommendationCard
        recommendation={{
          rawgId: 99,
          slug: 'test-game',
          title: 'Test Game',
          coverUrl: null,
          releaseDate: null,
          genres: ['RPG'],
          platforms: ['PC'],
          metacritic: 88,
          alreadyInLibrary: false,
          reason: RecommendationReason.GENRE_AFFINITY,
        }}
        onAdd={vi.fn()}
        onDismiss={vi.fn()}
        onImpression={onImpression}
      />,
    );

    expect(onImpression).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Combina com seus generos favoritos')).toBeInTheDocument();
  });
});
