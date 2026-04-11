// src/config/env.ts
// Environment variable validation with Zod
// Ensures all required config is present and correctly typed at startup

import { z } from "zod";

const envSchema = z.object({
  // ─── Database ───
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .startsWith("postgresql://", "DATABASE_URL must start with postgresql://"),

  // ─── Server ───
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SESSION_COOKIE_NAME: z.string().min(3).default("gh_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // ─── Redis ───
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // ─── External APIs (optional — required only for Phases 6-7) ───
  RAWG_API_KEY: z.string().optional(),
  STEAM_API_KEY: z.string().optional(),
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns typed environment variables.
 * Throws on first call if required variables are missing.
 * Caches result for subsequent calls.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `❌ Environment validation failed:\n${formatted}\n\nCheck your .env file against .env.example.`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Resets the cached environment (useful for testing).
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
