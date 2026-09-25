export type ErrorHandler = (error: any, ...args: any[]) => any;
export type ErrorConstructor = new (...args: any[]) => any;

/**
 * Catches errors thrown by a method and handles them via a custom error handler function.
 *
 * @example
 * @Catch((err) => ({ error: err.message, fallback: true }))
 * riskyOperation() { ... }
 *
 * @example
 * @Catch((err) => null, NotFoundError)
 * findUser(id: string) { ... }
 */
export function Catch(handler: ErrorHandler, errorType?: ErrorConstructor) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.catch((err) => {
            if (errorType && !(err instanceof errorType)) {
              throw err;
            }
            return handler.call(this, err, ...args);
          });
        }

        return result;
      } catch (err) {
        if (errorType && !(err instanceof errorType)) {
          throw err;
        }
        return handler.call(this, err, ...args);
      }
    };

    return descriptor;
  };
}

/**
 * Provides a fallback value or fallback function if the decorated method throws an error.
 *
 * @example
 * @Fallback({ defaultUser: true })
 * getUser(id: string) { ... }
 */
export function Fallback(fallbackValueOrFn: any) {
  const handler: ErrorHandler = (_err, ...args) => {
    if (typeof fallbackValueOrFn === 'function') {
      return fallbackValueOrFn(...args);
    }
    return fallbackValueOrFn;
  };

  return Catch(handler);
}
