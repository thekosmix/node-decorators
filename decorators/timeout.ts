export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Rejects with a TimeoutError if the decorated method does not complete within the specified milliseconds.
 *
 * @example
 * @Timeout(5000, 'User search timed out')
 * async searchUsers(query: string) { ... }
 */
export function Timeout(ms: number, customMessage?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      let timer: NodeJS.Timeout;

      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const message = customMessage ?? `Method '${propertyKey}' exceeded timeout of ${ms}ms`;
          reject(new TimeoutError(message));
        }, ms);
      });

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return Promise.race([result, timeoutPromise]).finally(() => {
            clearTimeout(timer);
          });
        }

        clearTimeout(timer);
        return result;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    return descriptor;
  };
}
