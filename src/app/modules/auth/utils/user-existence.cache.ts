type CacheEntry = {
  exists: boolean;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 30_000;

/**
 * Process-local TTL cache for JWT user existence checks.
 * Avoids Redis dependency (Render may not have Redis).
 */
export class UserExistenceCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  get(userId: string): boolean | undefined {
    const entry = this.store.get(userId);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(userId);
      return undefined;
    }
    return entry.exists;
  }

  set(userId: string, exists: boolean): void {
    this.store.set(userId, {
      exists,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const userExistenceCache = new UserExistenceCache();
