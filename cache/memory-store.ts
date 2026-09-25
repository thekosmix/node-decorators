import NodeCache from 'node-cache';
import { ICacheStore } from './types';

export interface MemoryStoreOptions {
  stdTTL?: number;
  checkperiod?: number;
}

export class MemoryCacheStore implements ICacheStore {
  private buckets: Map<string, NodeCache> = new Map();
  private defaultOptions: NodeCache.Options;

  constructor(options?: MemoryStoreOptions) {
    this.defaultOptions = {
      stdTTL: options?.stdTTL ?? 100,
      checkperiod: options?.checkperiod ?? 120,
    };
  }

  private getBucketInstance(bucket: string = 'default'): NodeCache {
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, new NodeCache(this.defaultOptions));
    }
    return this.buckets.get(bucket)!;
  }

  get<T = any>(key: string, bucket: string = 'default'): T | undefined {
    return this.getBucketInstance(bucket).get<T>(key);
  }

  set<T = any>(key: string, value: T, ttlSeconds?: number, bucket: string = 'default'): void {
    const cache = this.getBucketInstance(bucket);
    if (ttlSeconds !== undefined) {
      cache.set(key, value, ttlSeconds);
    } else {
      cache.set(key, value);
    }
  }

  del(key: string, bucket: string = 'default'): void {
    this.getBucketInstance(bucket).del(key);
  }

  clearBucket(bucket: string = 'default'): void {
    const cache = this.buckets.get(bucket);
    if (cache) {
      cache.flushAll();
    }
  }

  flushAll(): void {
    for (const cache of this.buckets.values()) {
      cache.flushAll();
    }
    this.buckets.clear();
  }
}
