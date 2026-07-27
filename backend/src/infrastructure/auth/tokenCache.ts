interface CacheEntry {
  token: string;
  expiresAt: number;
}

export class TokenCache {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): string | undefined {
    const entry = this.getValidEntry(key);
    return entry?.token;
  }

  set(key: string, token: string, ttlSeconds: number): void {
    this.store.set(key, {
      token,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  getRemainingTtlSeconds(key: string): number | undefined {
    const entry = this.getValidEntry(key);
    if (!entry) {
      return undefined;
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  private getValidEntry(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }
}
