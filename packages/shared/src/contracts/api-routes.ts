// packages/shared/src/contracts/api-routes.ts
// API route contracts — single source of truth for all endpoint paths

export const API_PREFIX = "/api/v1" as const;

export const API_ROUTES = {
  // ─── Auth ───
  AUTH: {
    REGISTER: `${API_PREFIX}/auth/register`,
    LOGIN: `${API_PREFIX}/auth/login`,
    LOGOUT: `${API_PREFIX}/auth/logout`,
    ME: `${API_PREFIX}/auth/me`,
    FORGOT_PASSWORD: `${API_PREFIX}/auth/forgot-password`,
  },

  // ─── Platforms ───
  PLATFORMS: {
    LIST:   `${API_PREFIX}/platforms`,
    CREATE: `${API_PREFIX}/platforms`,
    UPDATE: (id: string) => `${API_PREFIX}/platforms/${id}`,
    DELETE: (id: string) => `${API_PREFIX}/platforms/${id}`,
  },

  // ─── Library ───
  LIBRARY: {
    LIST:   `${API_PREFIX}/library`,
    ADD:    `${API_PREFIX}/library`,
    UPDATE: (id: string) => `${API_PREFIX}/library/${id}`,
    DELETE: (id: string) => `${API_PREFIX}/library/${id}`,
  },

  // ─── Games (RAWG search) ───
  GAMES: {
    SEARCH:  `${API_PREFIX}/games/search`,
    DETAILS: (rawgId: number) => `${API_PREFIX}/games/${rawgId}`,
  },

  // ─── Steam ───
  STEAM: {
    SYNC:        `${API_PREFIX}/steam/sync`,
    SYNC_STATUS: (jobId: string) => `${API_PREFIX}/steam/sync/${jobId}`,
  },

  // ─── Discovery ───
  DISCOVER: {
    LIST: `${API_PREFIX}/discover`,
    FEEDBACK: `${API_PREFIX}/discover/feedback`,
  },

  // ─── Dashboard ───
  DASHBOARD: {
    STATS: `${API_PREFIX}/dashboard/stats`,
  },

  // ─── Health ───
  HEALTH: `/api/health`,
} as const;
