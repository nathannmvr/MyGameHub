import { useQuery } from '@tanstack/react-query';
import {
  API_ROUTES,
  type ApiResponse,
  type GameSearchResult,
  type PaginatedResponse,
} from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

async function fetchDiscover(page: number, pageSize: number) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<GameSearchResult>>>(API_ROUTES.DISCOVER.LIST, {
    params: { page, pageSize },
  });

  return response.data.data;
}

export function useDiscover(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.discover(page),
    queryFn: () => fetchDiscover(page, pageSize),
    placeholderData: (previousData) => previousData,
  });
}
