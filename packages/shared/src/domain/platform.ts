// packages/shared/src/domain/platform.ts
// Platform (hardware) domain types

export interface Platform {
  id: string;
  userId: string;
  name: string;
  manufacturer: string;
  icon: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
}

export interface CreatePlatformDTO {
  name: string;
  manufacturer: string;
  icon?: string;
}

export interface UpdatePlatformDTO {
  name?: string;
  manufacturer?: string;
  icon?: string;
  isActive?: boolean;
}
