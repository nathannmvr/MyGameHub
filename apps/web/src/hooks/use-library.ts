import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  API_ROUTES,
  type AddToLibraryDTO,
  type ApiResponse,
  type GameStatus,
  type LibraryItemExpanded,
  type PaginatedResponse,
  type UpdateLibraryItemDTO,
} from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

export interface LibraryFilters {
  status?: GameStatus;
  platformId?: string;
  sort?: 'name' | 'rating' | 'playtime' | 'added';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

async function fetchLibrary(filters: LibraryFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const response = await apiClient.get<ApiResponse<PaginatedResponse<LibraryItemExpanded>>>(
    API_ROUTES.LIBRARY.LIST,
    { params },
  );

  return response.data.data;
}

async function addLibraryItemRequest(payload: AddToLibraryDTO) {
  const response = await apiClient.post<ApiResponse<LibraryItemExpanded>>(API_ROUTES.LIBRARY.ADD, payload);
  return response.data.data;
}

async function updateLibraryItemRequest({ id, payload }: { id: string; payload: UpdateLibraryItemDTO }) {
  const response = await apiClient.put<ApiResponse<LibraryItemExpanded>>(API_ROUTES.LIBRARY.UPDATE(id), payload);
  return response.data.data;
}

async function deleteLibraryItemRequest(id: string) {
  const response = await apiClient.delete<ApiResponse<{ deleted: true }>>(API_ROUTES.LIBRARY.DELETE(id));
  return response.data.data;
}

export function useLibrary(filters: LibraryFilters = {}) {
  const queryClient = useQueryClient();

  const libraryQuery = useQuery({
    queryKey: queryKeys.library(filters),
    queryFn: () => fetchLibrary(filters),
  });

  const addLibraryItem = useMutation({
    mutationFn: addLibraryItemRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discover(1) });
    },
  });

  const updateLibraryItem = useMutation({
    mutationFn: updateLibraryItemRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });

  const deleteLibraryItem = useMutation({
    mutationFn: deleteLibraryItemRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      await queryClient.invalidateQueries({ queryKey: queryKeys.discover(1) });
    },
  });

  return {
    ...libraryQuery,
    addLibraryItem,
    updateLibraryItem,
    deleteLibraryItem,
  };
}
