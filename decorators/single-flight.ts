export type SingleFlightKeyGenerator = (...args: any[]) => string;

/**
 * Coalesces concurrent in-flight executions with identical keys into a single execution.
 * Prevents the "thundering herd" problem when multiple callers request the same expensive resource simultaneously.
 *
 * @example
 * @SingleFlight((userId) => `user:${userId}`)
 * async fetchUserProfile(userId: string) { ... }
 */
export function SingleFlight(keyGenerator?: SingleFlightKeyGenerator) {
  const inFlight = new Map<string, Promise<any>>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = keyGenerator
        ? keyGenerator(...args)
        : args.length > 0
        ? JSON.stringify(args)
        : `${target?.constructor?.name ?? 'Global'}:${propertyKey}`;

      if (inFlight.has(key)) {
        return inFlight.get(key)!;
      }

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          const promise = result.finally(() => {
            inFlight.delete(key);
          });
          inFlight.set(key, promise);
          return promise;
        }

        return result;
      } catch (err) {
        inFlight.delete(key);
        throw err;
      }
    };

    return descriptor;
  };
}
