import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationReason as RecommendationReasonEnum } from '@gamehub/shared';
import { RecommendationReason } from '../../../src/components/discover/RecommendationReason';

describe('RecommendationReason', () => {
  it('renderiza label de GENRE_AFFINITY', () => {
    render(<RecommendationReason reason={RecommendationReasonEnum.GENRE_AFFINITY} />);
    expect(screen.getByText('Combina com seus generos favoritos')).toBeInTheDocument();
  });

  it('renderiza label de TRENDING_ON_PLATFORM', () => {
    render(<RecommendationReason reason={RecommendationReasonEnum.TRENDING_ON_PLATFORM} />);
    expect(screen.getByText('Em alta na sua plataforma')).toBeInTheDocument();
  });
});
