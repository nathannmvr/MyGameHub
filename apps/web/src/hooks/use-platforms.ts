import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  API_ROUTES,
  type ApiResponse,
  type CreatePlatformDTO,
  type Platform,
  type UpdatePlatformDTO,
} from '@gamehub/shared';
import { pushToast } from '../components/feedback/toast-store';
import { getErrorMessage } from '../lib/error';
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
      pushToast({
        variant: 'success',
        title: 'Plataforma adicionada',
        description: 'A lista de hardware foi atualizada.',
      });
    },
    onError: (error) => {
      pushToast({
        variant: 'error',
        title: 'Falha ao adicionar plataforma',
        description: getErrorMessage(error),
      });
    },
  });

  const updatePlatform = useMutation({
    mutationFn: updatePlatformRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
      pushToast({
        variant: 'success',
        title: 'Plataforma atualizada',
        description: 'As alterações foram guardadas.',
      });
    },
    onError: (error) => {
      pushToast({
        variant: 'error',
        title: 'Falha ao guardar plataforma',
        description: getErrorMessage(error),
      });
    },
  });

  const deletePlatform = useMutation({
    mutationFn: deletePlatformRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.platforms });
      await queryClient.invalidateQueries({ queryKey: queryKeys.library({}) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      pushToast({
        variant: 'success',
        title: 'Plataforma removida',
        description: 'Os dados relacionados foram atualizados.',
      });
    },
    onError: (error) => {
      pushToast({
        variant: 'error',
        title: 'Falha ao eliminar plataforma',
        description: getErrorMessage(error),
      });
    },
  });

  return {
    ...platformsQuery,
    createPlatform,
    updatePlatform,
    deletePlatform,
  };
}
