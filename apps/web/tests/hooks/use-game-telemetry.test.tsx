import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameTelemetry } from '../../src/hooks/use-game-telemetry';
import { apiClient } from '../../src/lib/api-client';

vi.mock('../../src/lib/api-client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('useGameTelemetry', () => {
  it('envia batch de eventos no flush manual', async () => {
    const { result } = renderHook(() => useGameTelemetry());

    act(() => {
      result.current.sendImpression(1, 'Game 1');
      result.current.sendDismiss(2, 'Game 2');
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });
});
