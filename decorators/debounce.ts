export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
}

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Debounces a method execution, postponing invocation until after `waitMs` milliseconds
 * have elapsed since the last invocation.
 *
 * @example
 * @Debounce(300)
 * search(term: string) { ... }
 */
export function Debounce(waitMs: number, options?: DebounceOptions) {
  const leading = options?.leading ?? false;
  const trailing = options?.trailing ?? true;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    let timer: NodeJS.Timeout | null = null;
    let lastArgs: any[] | null = null;
    let lastThis: any = null;
    let pendingResolvers: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = [];

    descriptor.value = function (...args: any[]) {
      lastArgs = args;
      lastThis = this;

      return new Promise((resolve, reject) => {
        pendingResolvers.push({ resolve, reject });

        const execute = async () => {
          const resolvers = [...pendingResolvers];
          pendingResolvers = [];
          timer = null;

          try {
            const result = await originalMethod.apply(lastThis, lastArgs!);
            resolvers.forEach((r) => r.resolve(result));
          } catch (err) {
            resolvers.forEach((r) => r.reject(err));
          }
        };

        const isInvoking = leading && !timer;

        if (timer) {
          clearTimeout(timer);
        }

        if (isInvoking) {
          execute();
        } else if (trailing) {
          timer = setTimeout(execute, waitMs);
        }
      });
    };

    return descriptor;
  };
}

/**
 * Throttles method execution, ensuring it runs at most once per `limitMs` milliseconds.
 *
 * @example
 * @Throttle(1000)
 * saveProgress(data: any) { ... }
 */
export function Throttle(limitMs: number, options?: ThrottleOptions) {
  const leading = options?.leading ?? true;
  const trailing = options?.trailing ?? true;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    let lastRan: number = 0;
    let trailingTimer: NodeJS.Timeout | null = null;
    let lastArgs: any[] | null = null;
    let lastThis: any = null;
    let lastResult: any = undefined;

    descriptor.value = async function (...args: any[]) {
      const now = Date.now();
      lastArgs = args;
      lastThis = this;

      if (!lastRan && !leading) {
        lastRan = now;
      }

      const remaining = limitMs - (now - lastRan);

      if (remaining <= 0 || remaining > limitMs) {
        if (trailingTimer) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        lastRan = now;
        lastResult = await originalMethod.apply(this, args);
        return lastResult;
      } else if (trailing && !trailingTimer) {
        trailingTimer = setTimeout(async () => {
          lastRan = leading ? Date.now() : 0;
          trailingTimer = null;
          lastResult = await originalMethod.apply(lastThis, lastArgs!);
        }, remaining);
      }

      return lastResult;
    };

    return descriptor;
  };
}
