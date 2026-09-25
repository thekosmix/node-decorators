/**
 * Executes a method asynchronously on the next event loop tick.
 * Returns a Promise that resolves with the method's return value.
 *
 * @example
 * @Async
 * sendNotification(userId: string) { ... }
 */
export function Async(
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>
): TypedPropertyDescriptor<any> | void {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const res = await originalMethod.apply(this, args);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };

      if (typeof setImmediate === 'function') {
        setImmediate(execute);
      } else {
        setTimeout(execute, 0);
      }
    });
  };

  return descriptor;
}
