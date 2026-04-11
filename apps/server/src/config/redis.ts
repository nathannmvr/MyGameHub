// src/config/redis.ts
// Redis connection configuration for cache and BullMQ
// Gracefully degrades if Redis is unavailable (logs warning, does not crash)

import { getEnv } from "./env.js";

/**
 * Redis connection options extracted from REDIS_URL.
 * Used by both ioredis (cache) and BullMQ (jobs) in later phases.
 *
 * NOTE: Actual ioredis/BullMQ connections will be created in Phases 6-7.
 * This module provides the parsed config only.
 */
export interface RedisConfig {
  host: string;
  port: number;
  url: string;
}

let cachedConfig: RedisConfig | null = null;

/**
 * Parses the REDIS_URL environment variable into a structured config.
 */
export function getRedisConfig(): RedisConfig {
  if (cachedConfig) return cachedConfig;

  const env = getEnv();
  const url = new URL(env.REDIS_URL);

  cachedConfig = {
    host: url.hostname || "localhost",
    port: parseInt(url.port, 10) || 6379,
    url: env.REDIS_URL,
  };

  return cachedConfig;
}

/**
 * Resets the cached Redis config (useful for testing).
 */
export function resetRedisConfigCache(): void {
  cachedConfig = null;
}
