import { QueryClient } from '@tanstack/react-query';
import { API_ROUTES } from '@gamehub/shared';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  platforms: ['platforms'] as const,
  library: (filters: object) => ['library', filters] as const,
  libraryItem: (id: string) => ['library', id] as const,
  gameSearch: (query: string, page: number) => ['games', 'search', query, page] as const,
  gameDetail: (rawgId: number) => ['games', rawgId] as const,
  syncJob: (jobId: string) => ['steam', 'sync', jobId] as const,
  discover: (page: number, pageSize: number, profile: 'conservative' | 'exploratory') => ['discover', page, pageSize, profile] as const,
  apiRoutes: [API_ROUTES.HEALTH] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});