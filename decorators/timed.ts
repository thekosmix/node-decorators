export type TimedCallback = (durationMs: number, propertyKey: string, args: any[]) => void;

/**
 * Measures the exact execution time of a method and outputs the duration via console or a custom callback.
 *
 * @example
 * @Timed()
 * computePrimes() { ... }
 *
 * @example
 * @Timed((ms, method) => metricsClient.recordTime(method, ms))
 * async processPayment() { ... }
 */
export function Timed(callbackOrLabel?: TimedCallback | string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();

      const handleEnd = () => {
        const durationMs = performance.now() - start;
        if (typeof callbackOrLabel === 'function') {
          callbackOrLabel(durationMs, propertyKey, args);
        } else {
          const label = typeof callbackOrLabel === 'string' ? ` [${callbackOrLabel}]` : '';
          console.log(`[TIMED]${label} ${propertyKey} took ${durationMs.toFixed(2)}ms`);
        }
      };

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.finally(handleEnd);
        }

        handleEnd();
        return result;
      } catch (err) {
        handleEnd();
        throw err;
      }
    };

    return descriptor;
  };
}

/**
 * Alias for @Timed
 */
export const MeasureTime = Timed;
