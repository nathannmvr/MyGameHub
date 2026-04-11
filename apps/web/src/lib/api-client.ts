import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gamehub:session-expired'));
    }

    return Promise.reject(error);
  },
);