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
import { useLibrary } from './use-library';
import { useGameTelemetry } from './use-game-telemetry';

async function fetchDiscover(page: number, pageSize: number, profile: RecommendationProfile, fallbackToTrending: boolean) {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<GameSearchResult>>>(API_ROUTES.DISCOVER.LIST, {
    params: { page, pageSize, profile, fallbackToTrending },
  });

  return response.data.data;
}

async function submitDiscoverFeedback(payload: RecommendationFeedbackDTO) {
  const response = await apiClient.post<ApiResponse<{ dismissed: boolean }>>(API_ROUTES.DISCOVER.FEEDBACK, payload);
  return response.data.data;
}

export function useDiscover(page = 1, pageSize = 20, profile: RecommendationProfile = 'conservative') {
  const queryClient = useQueryClient();
  const libraryQuery = useLibrary({ page: 1, pageSize: 1 });
  const telemetry = useGameTelemetry();
  const libraryCount = libraryQuery.data?.pagination.totalItems ?? 0;
  const isColdStart = libraryCount < 10;

  const query = useQuery({
    queryKey: [...queryKeys.discover(page, pageSize, profile), isColdStart],
    queryFn: () => fetchDiscover(page, pageSize, profile, isColdStart),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    enabled: !libraryQuery.isLoading,
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
    isColdStart,
    onRecommendationImpression: (recommendation: GameSearchResult) => {
      telemetry.sendImpression(recommendation.rawgId, recommendation.title);
    },
    onRecommendationAdd: (recommendation: GameSearchResult) => {
      telemetry.sendAddToLibrary(recommendation.rawgId, recommendation.title);
    },
    onRecommendationDismiss: (recommendation: GameSearchResult) => {
      telemetry.sendDismiss(recommendation.rawgId, recommendation.title);
    },
  };
}
