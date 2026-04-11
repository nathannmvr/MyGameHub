// src/services/cache.service.ts
// Cache abstraction with in-memory and Redis adapters.

import Redis from "ioredis";

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(pattern: string): Promise<void>;
}

interface MemoryValue {
  value: unknown;
  expiresAt: number;
}

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export class MemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, MemoryValue>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flush(pattern: string): Promise<void> {
    const regex = patternToRegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

export class RedisCacheAdapter implements CacheAdapter {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async flush(pattern: string): Promise<void> {
    let cursor = "0";

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== "0");
  }
}

export interface CacheServiceOptions {
  adapter?: CacheAdapter;
  defaultTtlSeconds?: number;
  redisUrl?: string;
}

export class CacheService {
  private readonly adapter: CacheAdapter;
  private readonly defaultTtlSeconds: number;

  constructor(options: CacheServiceOptions = {}) {
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 300;

    if (options.adapter) {
      this.adapter = options.adapter;
      return;
    }

    if (options.redisUrl) {
      this.adapter = new RedisCacheAdapter(new Redis(options.redisUrl));
      return;
    }

    this.adapter = new MemoryCacheAdapter();
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): Promise<void> {
    await this.adapter.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.adapter.del(key);
  }

  async flush(pattern: string): Promise<void> {
    await this.adapter.flush(pattern);
  }
}
