import { CacheManager } from '../cache/manager';

export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
    Object.setPrototypeOf(this, IdempotencyConflictError.prototype);
  }
}

export interface IdempotentOptions {
  /**
   * Function to derive a unique idempotency key from method arguments (e.g. idempotency header or transaction ID).
   */
  keyGenerator: (...args: any[]) => string;
  /**
   * Time to live for completed idempotency records in seconds. Defaults to 86400 (24 hours).
   */
  ttlSeconds?: number;
  /**
   * Cache store to use (e.g. 'redis' or 'memory'). Defaults to CacheManager default store.
   */
  store?: string;
  /**
   * Cache bucket/namespace. Defaults to 'idempotency'.
   */
  bucket?: string;
}

interface IdempotencyRecord {
  status: 'PENDING' | 'COMPLETED';
  result?: any;
}

/**
 * Idempotency decorator ensuring a method executes only once for a given key.
 * If called with an existing key, returns the cached result.
 * If called concurrently while still pending, throws IdempotencyConflictError.
 *
 * @example
 * @Idempotent({ keyGenerator: (orderId) => orderId, ttlSeconds: 3600 })
 * async chargeCreditCard(orderId: string, amount: number) { ... }
 */
const inFlightPending = new Set<string>();

export function Idempotent(options: IdempotentOptions) {
  const bucket = options.bucket ?? 'idempotency';
  const ttl = options.ttlSeconds ?? 86400;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const store = CacheManager.getStore(options.store);
      const key = options.keyGenerator(...args);

      if (inFlightPending.has(key)) {
        throw new IdempotencyConflictError(
          `A concurrent request with idempotency key '${key}' is currently in progress.`
        );
      }
      inFlightPending.add(key);

      try {
        let record = await store.get<IdempotencyRecord>(key, bucket);

        if (record) {
          if (record.status === 'PENDING') {
            throw new IdempotencyConflictError(
              `A concurrent request with idempotency key '${key}' is currently in progress.`
            );
          }
          if (record.status === 'COMPLETED') {
            return record.result;
          }
        }

        // Mark as PENDING with short failsafe TTL
        await store.set(key, { status: 'PENDING' }, 60, bucket);

        const result = await originalMethod.apply(this, args);
        // Save completed result
        await store.set(key, { status: 'COMPLETED', result }, ttl, bucket);
        return result;
      } catch (err) {
        // Clear pending lock on failure so caller can retry
        await store.del(key, bucket);
        throw err;
      } finally {
        inFlightPending.delete(key);
      }
    };

    return descriptor;
  };
}
