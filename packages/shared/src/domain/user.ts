// packages/shared/src/domain/user.ts
// User domain types

export interface User {
  id: string;
  username: string;
  email: string | null;
  steamId: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  steamId?: string;
  avatarUrl?: string;
}
