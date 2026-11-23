/**
 * Sliding-window rate limiter.
 * Uses an in-memory store for single-node / local development.
 * Can be swapped to Redis/Upstash in multi-instance production via the same interface.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs;
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0] ?? now;
    store.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetAt: now + windowMs,
  };
}

export function clearRateLimitStore(): void {
  store.clear();
}
