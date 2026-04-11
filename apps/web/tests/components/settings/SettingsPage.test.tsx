import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../../../src/pages/SettingsPage';

// Mock the hooks used by SettingsPage
vi.mock('../../../src/hooks/use-platforms', () => ({
  usePlatforms: () => ({
    data: [
      { id: 'plat-1', name: 'PC', manufacturer: 'Various', icon: 'gamepad', isActive: true, createdAt: '2026-01-01' },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../src/hooks/use-steam-sync', () => ({
  useSteamSync: () => ({
    startSteamSync: { mutateAsync: vi.fn(), isPending: false },
    syncJob: null,
    syncJobQuery: { data: null },
    isPolling: false,
    isRunning: false,
    resetSync: vi.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage (Fase 17)', () => {
  it('does NOT render the "Dados básicos" profile form', () => {
    renderWithProviders(<SettingsPage />);

    // These fields should no longer exist
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/avatar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dados básicos/i)).not.toBeInTheDocument();
  });

  it('renders the Steam sync section with all controls', () => {
    renderWithProviders(<SettingsPage />);

    // Page heading
    expect(screen.getByText('Sincronização Steam.')).toBeInTheDocument();

    // Steam section
    expect(screen.getByText('Sincronização automática')).toBeInTheDocument();
    expect(screen.getByLabelText(/steam id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plataforma/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sincronizar/i })).toBeInTheDocument();
  });

  it('shows the platform options in the select', () => {
    renderWithProviders(<SettingsPage />);

    expect(screen.getByText('PC')).toBeInTheDocument();
    expect(screen.getByText('Seleciona uma plataforma')).toBeInTheDocument();
  });
});
