import axios from 'axios';

type ApiErrorResponse = {
  error?: {
    message?: string;
    code?: string;
  };
  message?: string;
};

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}