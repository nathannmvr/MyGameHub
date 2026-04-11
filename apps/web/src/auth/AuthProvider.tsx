import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_ROUTES, type ApiResponse } from '@gamehub/shared';
import { apiClient } from '../lib/api-client';
import { pushToast } from '../components/feedback/toast-store';
import { getErrorMessage } from '../lib/error';
import type { AuthMeResponse, ForgotPasswordPayload, LoginPayload, RegisterPayload, ResetPasswordPayload, AuthUser } from './auth-types';
import { AuthContext, type AuthContextValue } from './auth-context';

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const response = await apiClient.get<ApiResponse<AuthMeResponse>>(API_ROUTES.AUTH.ME);
    return response.data.data.user;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      await apiClient.post(API_ROUTES.AUTH.LOGIN, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      await apiClient.post(API_ROUTES.AUTH.REGISTER, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API_ROUTES.AUTH.LOGOUT);
    },
    onSuccess: async () => {
      await queryClient.setQueryData(['auth', 'me'], null);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      await apiClient.post(API_ROUTES.AUTH.FORGOT_PASSWORD, payload);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      await apiClient.post(API_ROUTES.AUTH.RESET_PASSWORD, payload);
    },
  });

  useEffect(() => {
    const handler = () => {
      queryClient.setQueryData(['auth', 'me'], null);
      pushToast({
        variant: 'info',
        title: 'Sessao expirada',
        description: 'Faz login novamente para continuar.',
      });
    };

    window.addEventListener('gamehub:session-expired', handler);
    return () => {
      window.removeEventListener('gamehub:session-expired', handler);
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login: async (payload) => {
        try {
          await loginMutation.mutateAsync(payload);
        } catch (error) {
          pushToast({
            variant: 'error',
            title: 'Falha no login',
            description: getErrorMessage(error),
          });
          throw error;
        }
      },
      register: async (payload) => {
        try {
          await registerMutation.mutateAsync(payload);
        } catch (error) {
          pushToast({
            variant: 'error',
            title: 'Falha ao criar conta',
            description: getErrorMessage(error),
          });
          throw error;
        }
      },
      logout: async () => {
        try {
          await logoutMutation.mutateAsync();
        } catch (error) {
          pushToast({
            variant: 'error',
            title: 'Falha ao sair',
            description: getErrorMessage(error),
          });
          throw error;
        }
      },
      forgotPassword: async (payload) => {
        try {
          await forgotPasswordMutation.mutateAsync(payload);
          pushToast({
            variant: 'success',
            title: 'Pedido enviado',
            description: 'Se o email existir, enviaremos instrucoes para recuperar acesso.',
          });
        } catch (error) {
          pushToast({
            variant: 'error',
            title: 'Falha na recuperacao',
            description: getErrorMessage(error),
          });
          throw error;
        }
      },
      resetPassword: async (payload) => {
        try {
          await resetPasswordMutation.mutateAsync(payload);
          pushToast({
            variant: 'success',
            title: 'Senha redefinida',
            description: 'A tua senha foi atualizada. Faz login para continuar.',
          });
        } catch (error) {
          const message = getErrorMessage(error);
          pushToast({
            variant: 'error',
            title: 'Falha ao redefinir senha',
            description: message,
          });
          throw error;
        }
      },
    }),
    [
      forgotPasswordMutation,
      loginMutation,
      logoutMutation,
      meQuery.data,
      meQuery.isLoading,
      resetPasswordMutation,
      registerMutation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
