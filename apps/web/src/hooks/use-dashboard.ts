import { useQuery } from '@tanstack/react-query';
import { API_ROUTES, type ApiResponse, type DashboardStats } from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

async function fetchDashboardStats() {
  const response = await apiClient.get<ApiResponse<DashboardStats>>(API_ROUTES.DASHBOARD.STATS);
  return response.data.data;
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardStats,
  });
}
