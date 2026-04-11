// src/middleware/rate-limiter.ts
// Simple in-memory rate limiter middleware
// Will be replaced with Redis-backed limiter in Phase 6-7

import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiterOptions {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;     // Custom error message
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60_000,     // 1 minute
  maxRequests: 100,     // 100 requests per minute
  message: "Too many requests, please try again later.",
};

/**
 * Simple in-memory rate limiter.
 * Uses IP-based tracking with a sliding window.
 *
 * NOTE: This is a basic implementation suitable for development.
 * For production, use Redis-backed rate limiting (Phase 7).
 */
export function rateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, config.windowMs);

  // Allow garbage collection of the interval when the process exits
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      next();
      return;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: config.message,
          retryAfter,
        },
      });
      return;
    }

    next();
  };
}
