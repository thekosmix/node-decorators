export interface ICacheStore {
  get<T = any>(key: string, bucket?: string): Promise<T | undefined> | (T | undefined);
  set<T = any>(key: string, value: T, ttlSeconds?: number, bucket?: string): Promise<void> | void;
  del(key: string, bucket?: string): Promise<void> | void;
  clearBucket?(bucket: string): Promise<void> | void;
}

export interface CacheOptions {
  /**
   * The cache bucket/namespace. Defaults to 'default'.
   */
  bucket?: string;
  /**
   * Time to live in seconds.
   */
  ttl?: number;
  /**
   * The store to use, e.g. 'memory', 'redis'. Defaults to the CacheManager default store.
   */
  store?: string;
  /**
   * Optional custom key generator based on method arguments.
   */
  keyGenerator?: (...args: any[]) => string;
}

export interface CacheEvictOptions {
  /**
   * The cache bucket/namespace. Defaults to 'default'.
   */
  bucket?: string;
  /**
   * Specific key to evict. If omitted and allEntries is false, will be derived via keyGenerator or arguments.
   */
  key?: string;
  /**
   * If true, clears the entire bucket.
   */
  allEntries?: boolean;
  /**
   * The store to evict from. Defaults to CacheManager default.
   */
  store?: string;
  /**
   * Optional custom key generator based on method arguments.
   */
  keyGenerator?: (...args: any[]) => string;
}

export interface CachePutOptions extends CacheOptions {}
