import { CacheManager } from '../cache/manager';
import { CacheOptions, CacheEvictOptions, CachePutOptions } from '../cache/types';

function resolveCacheOptions(optionsOrBucket?: string | CacheOptions): CacheOptions {
  if (typeof optionsOrBucket === 'string') {
    return { bucket: optionsOrBucket };
  }
  return optionsOrBucket ?? {};
}

function defaultKeyGenerator(...args: any[]): string {
  if (args.length === 0) {
    return '__no_args__';
  }
  return args
    .map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join('-');
}

/**
 * Caches the return value of a method.
 * Supports synchronous and asynchronous methods, bucket partitioning, TTL, and pluggable stores (Memory, Redis).
 *
 * @example
 * @Cache('user-bucket')
 * getUser(id: string) { ... }
 *
 * @example
 * @Cache({ bucket: 'users', ttl: 300, store: 'redis' })
 * async getUserProfile(id: string) { ... }
 */
export function Cache(optionsOrBucket?: string | CacheOptions) {
  const options = resolveCacheOptions(optionsOrBucket);
  const bucket = options.bucket ?? 'default';

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const store = CacheManager.getStore(options.store);
      const keyGen = options.keyGenerator ?? defaultKeyGenerator;
      const key = keyGen(...args);

      const cached = store.get(key, bucket);

      // Handle async store (e.g. Redis)
      if (cached instanceof Promise) {
        return cached.then(async (val) => {
          if (val !== undefined && val !== null) {
            return val;
          }
          const result = await originalMethod.apply(this, args);
          await store.set(key, result, options.ttl, bucket);
          return result;
        });
      }

      // Sync store (e.g. Memory)
      if (cached !== undefined && cached !== null) {
        return cached;
      }

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then(async (asyncVal) => {
          await store.set(key, asyncVal, options.ttl, bucket);
          return asyncVal;
        });
      }

      store.set(key, result, options.ttl, bucket);
      return result;
    };

    return descriptor;
  };
}

/**
 * Evicts an entry or the entire bucket from the cache upon successful method execution.
 *
 * @example
 * @CacheEvict({ bucket: 'users', allEntries: true })
 * async clearUserCache() { ... }
 *
 * @example
 * @CacheEvict({ bucket: 'users', keyGenerator: (id) => String(id) })
 * deleteUser(id: string) { ... }
 */
export function CacheEvict(optionsOrBucket?: string | CacheEvictOptions) {
  const options: CacheEvictOptions =
    typeof optionsOrBucket === 'string'
      ? { bucket: optionsOrBucket }
      : optionsOrBucket ?? {};
  const bucket = options.bucket ?? 'default';

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const store = CacheManager.getStore(options.store);
      const evict = async () => {
        if (options.allEntries && store.clearBucket) {
          await store.clearBucket(bucket);
        } else {
          const keyGen = options.keyGenerator ?? defaultKeyGenerator;
          const key = options.key ?? keyGen(...args);
          await store.del(key, bucket);
        }
      };

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then(async (val) => {
          await evict();
          return val;
        });
      }

      const evictResult = evict();
      if (evictResult instanceof Promise) {
        return evictResult.then(() => result);
      }
      return result;
    };

    return descriptor;
  };
}

/**
 * Updates the cache with the return value of the decorated method without skipping method execution.
 *
 * @example
 * @CachePut({ bucket: 'users', keyGenerator: (user) => user.id })
 * updateUser(user: User) { ... }
 */
export function CachePut(optionsOrBucket?: string | CachePutOptions) {
  const options = resolveCacheOptions(optionsOrBucket);
  const bucket = options.bucket ?? 'default';

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const store = CacheManager.getStore(options.store);
      const keyGen = options.keyGenerator ?? defaultKeyGenerator;
      const key = keyGen(...args);

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then(async (val) => {
          await store.set(key, val, options.ttl, bucket);
          return val;
        });
      }

      const setResult = store.set(key, result, options.ttl, bucket);
      if (setResult instanceof Promise) {
        return setResult.then(() => result);
      }
      return result;
    };

    return descriptor;
  };
}