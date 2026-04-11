import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  API_ROUTES,
  JobStatus,
  type ApiResponse,
  type SyncJobDTO,
  type SteamSyncRequestDTO,
} from '@gamehub/shared';
import { pushToast } from '../components/feedback/toast-store';
import { getErrorMessage } from '../lib/error';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-client';

async function startSteamSyncRequest(payload: SteamSyncRequestDTO) {
  const response = await apiClient.post<ApiResponse<{ jobId: string; status: JobStatus }>>(
    API_ROUTES.STEAM.SYNC,
    payload,
  );

  return response.data.data.jobId;
}

async function fetchSteamSyncStatus(jobId: string) {
  const response = await apiClient.get<ApiResponse<SyncJobDTO>>(API_ROUTES.STEAM.SYNC_STATUS(jobId));
  return response.data.data;
}

export function useSteamSync() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const lastToastStatus = useRef<JobStatus | null>(null);

  const startSteamSync = useMutation({
    mutationFn: startSteamSyncRequest,
    onSuccess: async (newJobId) => {
      setJobId(newJobId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      pushToast({
        variant: 'info',
        title: 'Sincronização iniciada',
        description: 'A biblioteca Steam está a ser processada em segundo plano.',
      });
    },
    onError: (error) => {
      pushToast({
        variant: 'error',
        title: 'Falha ao iniciar sincronização',
        description: getErrorMessage(error),
      });
    },
  });

  const syncJobQuery = useQuery({
    queryKey: jobId ? queryKeys.syncJob(jobId) : queryKeys.syncJob('idle'),
    queryFn: () => {
      if (!jobId) {
        throw new Error('Steam sync job ID is not available');
      }

      return fetchSteamSyncStatus(jobId);
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
        return false;
      }

      return 3_000;
    },
  });

  useEffect(() => {
    const status = syncJobQuery.data?.status;
    const errorMessage = syncJobQuery.data?.errorMessage;

    if (!status || status === lastToastStatus.current) {
      return;
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });

      pushToast({
        variant: status === JobStatus.COMPLETED ? 'success' : 'error',
        title: status === JobStatus.COMPLETED ? 'Sincronização concluída' : 'Sincronização falhou',
        description:
          status === JobStatus.COMPLETED
            ? 'A biblioteca Steam foi atualizada com sucesso.'
            : errorMessage ?? 'O job terminou com erro.',
      });

      lastToastStatus.current = status;
    }
  }, [queryClient, syncJobQuery.data?.status, syncJobQuery.data?.errorMessage]);

  const resetSync = () => {
    setJobId(null);
  };

  return {
    startSteamSync,
    syncJob: syncJobQuery.data ?? null,
    syncJobQuery,
    isPolling: syncJobQuery.isFetching,
    isRunning: syncJobQuery.data?.status === JobStatus.RUNNING || syncJobQuery.data?.status === JobStatus.PENDING,
    resetSync,
  };
}
