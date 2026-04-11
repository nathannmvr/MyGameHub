import { useQuery } from '@tanstack/react-query';
import {
  API_ROUTES,
  type ApiResponse,
  type GameSearchResult,
  type PaginatedResponse,
} from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';
import { useDebouncedValue } from './use-debounced-value';

async function fetchGameSearch(query: string, page: number, pageSize: number) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<GameSearchResult>>>(API_ROUTES.GAMES.SEARCH, {
    params: { q: query, page, pageSize },
  });

  return response.data.data;
}

export function useGameSearch(query: string, page = 1, pageSize = 20) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const isEnabled = debouncedQuery.length >= 2;

  return useQuery({
    queryKey: queryKeys.gameSearch(debouncedQuery, page),
    queryFn: () => fetchGameSearch(debouncedQuery, page, pageSize),
    enabled: isEnabled,
    placeholderData: (previousData) => previousData,
  });
}
