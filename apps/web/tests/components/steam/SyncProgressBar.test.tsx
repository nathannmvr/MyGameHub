import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobStatus, type SyncJobDTO, SyncType } from '@gamehub/shared';
import { SyncProgressBar } from '../../../src/components/steam/SyncProgressBar';

const baseJob: SyncJobDTO = {
  id: 'job-1',
  userId: 'user-1',
  type: SyncType.STEAM,
  status: JobStatus.RUNNING,
  totalItems: 400,
  processedItems: 127,
  errorMessage: null,
  startedAt: new Date().toISOString(),
  completedAt: null,
};

describe('SyncProgressBar', () => {
  it('shows the current progress', () => {
    render(<SyncProgressBar syncJob={baseJob} />);

    expect(screen.getByText('A sincronizar')).toBeInTheDocument();
    expect(screen.getByText('127/400')).toBeInTheDocument();
    expect(screen.getByText('A sincronizar 127/400 jogos...')).toBeInTheDocument();
  });

  it('shows completed when status is completed', () => {
    render(<SyncProgressBar syncJob={{ ...baseJob, status: JobStatus.COMPLETED, processedItems: 400, completedAt: new Date().toISOString() }} />);

    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('shows the error state when status is failed', () => {
    render(<SyncProgressBar syncJob={{ ...baseJob, status: JobStatus.FAILED, errorMessage: 'Steam indisponível' }} />);

    expect(screen.getByText('Erro na sincronização')).toBeInTheDocument();
    expect(screen.getByText('Steam indisponível')).toBeInTheDocument();
  });
});
