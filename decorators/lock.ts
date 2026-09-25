import { CacheManager } from '../cache/manager';
import { RedisCacheStore } from '../cache/redis-store';

export class LockAcquisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockAcquisitionError';
    Object.setPrototypeOf(this, LockAcquisitionError.prototype);
  }
}

export interface LockOptions {
  /**
   * The lock key or key generator based on method arguments.
   * If omitted, defaults to the method name.
   */
  key?: string | ((...args: any[]) => string);
  /**
   * Maximum lease duration for the lock in milliseconds before automatic expiration.
   * Defaults to 10000ms (10 seconds).
   */
  ttlMs?: number;
  /**
   * Whether to wait/poll for the lock if it is currently held.
   * If false, fails immediately if lock cannot be acquired. Defaults to true.
   */
  wait?: boolean;
  /**
   * Maximum time in milliseconds to wait before failing to acquire the lock.
   * Defaults to 5000ms (5 seconds).
   */
  acquireTimeoutMs?: number;
  /**
   * Polling interval in milliseconds when waiting to acquire lock.
   * Defaults to 50ms.
   */
  retryIntervalMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-Memory Lock Engine
class MemoryLockManager {
  private static locks: Map<string, { token: string; timer?: NodeJS.Timeout }> = new Map();

  static acquire(key: string, token: string, ttlMs: number): boolean {
    if (this.locks.has(key)) {
      return false;
    }
    const timer = setTimeout(() => {
      this.locks.delete(key);
    }, ttlMs);

    this.locks.set(key, { token, timer });
    return true;
  }

  static release(key: string, token: string): void {
    const current = this.locks.get(key);
    if (current && current.token === token) {
      if (current.timer) {
        clearTimeout(current.timer);
      }
      this.locks.delete(key);
    }
  }

  static reset(): void {
    for (const lock of this.locks.values()) {
      if (lock.timer) clearTimeout(lock.timer);
    }
    this.locks.clear();
  }
}

/**
 * Concurrency & distributed locking decorator.
 * Prevents concurrent execution of critical sections across processes (via Redis) or within the same process (via in-memory lock).
 *
 * @example
 * @Lock({ key: (userId) => `payment:${userId}`, ttlMs: 5000 })
 * async processPayment(userId: string, amount: number) { ... }
 */
export function Lock(options?: LockOptions) {
  const ttlMs = options?.ttlMs ?? 10000;
  const shouldWait = options?.wait ?? true;
  const timeoutMs = options?.acquireTimeoutMs ?? 5000;
  const retryIntervalMs = options?.retryIntervalMs ?? 50;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let resolvedKey: string;
      if (typeof options?.key === 'function') {
        resolvedKey = options.key(...args);
      } else if (typeof options?.key === 'string') {
        resolvedKey = options.key;
      } else {
        resolvedKey = `${target?.constructor?.name ?? 'Global'}:${propertyKey}`;
      }

      const lockToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const lockKey = `lock:${resolvedKey}`;

      // Check if Redis store is available
      let redisClient: any = null;
      try {
        const store = CacheManager.getStore('redis');
        if (store instanceof RedisCacheStore) {
          redisClient = store.getClient();
        }
      } catch {
        // Redis store not registered, will fallback to memory
      }

      const acquire = async (): Promise<boolean> => {
        if (redisClient) {
          // Atomic Redis acquire: SET key token NX PX ttlMs
          const res = await redisClient.set(lockKey, lockToken, 'PX', ttlMs, 'NX');
          return res === 'OK' || res === 1;
        } else {
          return MemoryLockManager.acquire(lockKey, lockToken, ttlMs);
        }
      };

      const release = async (): Promise<void> => {
        if (redisClient) {
          // Atomic Lua script unlock: release only if token matches
          const lua = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
          if (typeof redisClient.eval === 'function') {
            await redisClient.eval(lua, 1, lockKey, lockToken);
          } else {
            const current = await redisClient.get(lockKey);
            if (current === lockToken) {
              await redisClient.del(lockKey);
            }
          }
        } else {
          MemoryLockManager.release(lockKey, lockToken);
        }
      };

      const start = Date.now();
      let acquired = await acquire();

      if (!acquired) {
        if (!shouldWait) {
          throw new LockAcquisitionError(`Failed to acquire lock for key '${resolvedKey}': resource is currently locked.`);
        }

        while (!acquired) {
          if (Date.now() - start >= timeoutMs) {
            throw new LockAcquisitionError(
              `Lock acquisition timed out after ${timeoutMs}ms for key '${resolvedKey}'.`
            );
          }
          await sleep(retryIntervalMs);
          acquired = await acquire();
        }
      }

      try {
        return await originalMethod.apply(this, args);
      } finally {
        await release();
      }
    };

    return descriptor;
  };
}

export { MemoryLockManager };
