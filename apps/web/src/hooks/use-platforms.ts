import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  API_ROUTES,
  type ApiResponse,
  type CreatePlatformDTO,
  type Platform,
  type UpdatePlatformDTO,
} from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

async function fetchPlatforms() {
  const response = await apiClient.get<ApiResponse<Platform[]>>(API_ROUTES.PLATFORMS.LIST);
  return response.data.data;
}

async function createPlatformRequest(payload: CreatePlatformDTO) {
  const response = await apiClient.post<ApiResponse<Platform>>(API_ROUTES.PLATFORMS.CREATE, payload);
  return response.data.data;
}

async function updatePlatformRequest({ id, payload }: { id: string; payload: UpdatePlatformDTO }) {
  const response = await apiClient.put<ApiResponse<Platform>>(API_ROUTES.PLATFORMS.UPDATE(id), payload);
  return response.data.data;
}

async function deletePlatformRequest(id: string) {
  const response = await apiClient.delete<ApiResponse<{ deleted: true }>>(API_ROUTES.PLATFORMS.DELETE(id));
  return response.data.data;
}

export function usePlatforms() {
  const queryClient = useQueryClient();

  const platformsQuery = useQuery({
    queryKey: queryKeys.platforms,
    queryFn: fetchPlatforms,
  });

  const createPlatform = useMutation({
    mutationFn: createPlatformRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
    },
  });

  const updatePlatform = useMutation({
    mutationFn: updatePlatformRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
    },
  });

  const deletePlatform = useMutation({
    mutationFn: deletePlatformRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
      await queryClient.invalidateQueries({ queryKey: queryKeys.library({}) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });

  return {
    ...platformsQuery,
    createPlatform,
    updatePlatform,
    deletePlatform,
  };
}
