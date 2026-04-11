import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  API_ROUTES,
  type ApiResponse,
  type GameSearchResult,
  type PaginatedResponse,
  type RecommendationFeedbackDTO,
  type RecommendationProfile,
} from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

async function fetchDiscover(page: number, pageSize: number, profile: RecommendationProfile) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<GameSearchResult>>>(API_ROUTES.DISCOVER.LIST, {
    params: { page, pageSize, profile },
  });

  return response.data.data;
}

async function submitDiscoverFeedback(payload: RecommendationFeedbackDTO) {
  const response = await apiClient.post<ApiResponse<{ dismissed: boolean }>>(API_ROUTES.DISCOVER.FEEDBACK, payload);
  return response.data.data;
}

export function useDiscover(page = 1, pageSize = 20, profile: RecommendationProfile = 'conservative') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.discover(page, pageSize, profile),
    queryFn: () => fetchDiscover(page, pageSize, profile),
    placeholderData: (previousData) => previousData,
  });

  const dismissRecommendation = useMutation({
    mutationFn: submitDiscoverFeedback,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });

  return {
    ...query,
    dismissRecommendation,
  };
}
