/**
 * TtlCache — one in-memory time-to-live cache primitive.
 *
 * The app had hand-rolled the same `Map<string, {value, expiry}>` + lazy-expiry
 * pattern four times (cache.ts, datalake-simple.ts, google-drive-simple.ts, and
 * a dead services/datalake/DatalakeCache.ts), with two slightly different expiry
 * schemes. This concentrates the mechanism in one tested place; a bug fix
 * (e.g. expiry off-by-one, invalidation) now lands once.
 *
 * Deliberately config-agnostic: the TTL is a constructor/per-set parameter, not
 * an env read. Call sites keep owning their CACHE_DURATION_HOURS until the
 * separate config-consolidation work. The clock is injectable so expiry is
 * unit-testable without fake timers.
 */
export class TtlCache<T = unknown> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly defaultTtlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Returns the cached value, or undefined when absent or expired (expired entries are evicted). */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** True when a non-expired value is cached. */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Cache a value. `ttlMs` overrides the default TTL for this entry. */
  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  /** Remaining lifetime in ms (0 if absent/expired). Useful for "is it fresh?" checks. */
  ttlRemaining(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - this.now());
  }

  /** Drop a single key. Returns whether it existed. */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Drop entries. With no argument, clears everything. With a string, drops
   * every key that includes that substring. Returns the number removed.
   */
  invalidate(pattern?: string): number {
    if (pattern === undefined) {
      const n = this.store.size;
      this.store.clear();
      return n;
    }
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  /** Evict all currently-expired entries. Returns the number removed. */
  cleanup(): number {
    const cutoff = this.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (cutoff > entry.expiresAt) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  /** Number of entries currently stored (including not-yet-evicted expired ones). */
  get size(): number {
    return this.store.size;
  }

  /** Snapshot of the current keys (including not-yet-evicted expired ones). For stats/inspection. */
  keys(): string[] {
    return [...this.store.keys()];
  }
}

/** Convenience for the common hours-based TTL the app uses. */
export const hoursToMs = (hours: number): number => hours * 60 * 60 * 1000;
