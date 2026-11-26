type Bucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as unknown as {
  __onetabRateLimit?: Map<string, Bucket>;
};

const store = globalStore.__onetabRateLimit ?? new Map<string, Bucket>();
if (!globalStore.__onetabRateLimit) {
  globalStore.__onetabRateLimit = store;
}

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
  };
}
