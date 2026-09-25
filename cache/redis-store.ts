import { ICacheStore } from './types';

export interface RedisStoreOptions {
  keyPrefix?: string;
  defaultTTL?: number;
}

export interface MinimalRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

export class RedisCacheStore implements ICacheStore {
  private client: MinimalRedisClient;
  private keyPrefix: string;
  private defaultTTL?: number;

  constructor(client: MinimalRedisClient, options?: RedisStoreOptions) {
    if (!client) {
      throw new Error('A Redis client instance (e.g. ioredis or redis) must be provided to RedisCacheStore.');
    }
    this.client = client;
    this.keyPrefix = options?.keyPrefix ?? 'nd:';
    this.defaultTTL = options?.defaultTTL;
  }

  getClient(): MinimalRedisClient {
    return this.client;
  }

  private buildKey(key: string, bucket: string = 'default'): string {
    return `${this.keyPrefix}${bucket}:${key}`;
  }

  async get<T = any>(key: string, bucket: string = 'default'): Promise<T | undefined> {
    const fullKey = this.buildKey(key, bucket);
    const raw = await this.client.get(fullKey);
    if (raw === null || raw === undefined) {
      return undefined;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number, bucket: string = 'default'): Promise<void> {
    const fullKey = this.buildKey(key, bucket);
    const serialized = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTTL;

    if (ttl !== undefined && ttl > 0) {
      await this.client.set(fullKey, serialized, 'EX', ttl);
    } else {
      await this.client.set(fullKey, serialized);
    }
  }

  async del(key: string, bucket: string = 'default'): Promise<void> {
    const fullKey = this.buildKey(key, bucket);
    await this.client.del(fullKey);
  }

  async clearBucket(bucket: string = 'default'): Promise<void> {
    const pattern = `${this.keyPrefix}${bucket}:*`;
    const keys = await this.client.keys(pattern);
    if (keys && keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
