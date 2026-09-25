import { LoggerManager } from '../logger/manager';
import { LogOptions, LogEntry } from '../logger/types';

function maskArguments(args: any[], maskKeys?: string[]): any[] {
  if (!maskKeys || maskKeys.length === 0) {
    return args;
  }
  return args.map((arg) => {
    if (typeof arg === 'object' && arg !== null) {
      const copy = Array.isArray(arg) ? [...arg] : { ...arg };
      for (const key of Object.keys(copy)) {
        if (maskKeys.includes(key)) {
          copy[key] = '***MASKED***';
        }
      }
      return copy;
    }
    return arg;
  });
}

/**
 * Logs method execution, including arguments, return values, errors, and execution duration.
 *
 * @example
 * // Object syntax
 * @Log({ level: 'info', logRequest: true, logResponse: true, maskParams: ['password'] })
 * async login(user: string, password: string) { ... }
 *
 * @example
 * // Positional legacy syntax
 * @Log(true, true, "extra info")
 * calculate(a: number, b: number) { ... }
 */
export function Log(
  optionsOrLogRequest?: boolean | LogOptions,
  logResponse: boolean = true,
  ...logArgs: any[]
) {
  let options: LogOptions;

  if (typeof optionsOrLogRequest === 'object' && optionsOrLogRequest !== null) {
    options = {
      level: optionsOrLogRequest.level ?? 'info',
      logRequest: optionsOrLogRequest.logRequest ?? true,
      logResponse: optionsOrLogRequest.logResponse ?? true,
      logDuration: optionsOrLogRequest.logDuration ?? true,
      maskParams: optionsOrLogRequest.maskParams,
      transports: optionsOrLogRequest.transports,
      additionalInfo: optionsOrLogRequest.additionalInfo,
    };
  } else {
    options = {
      level: 'info',
      logRequest: typeof optionsOrLogRequest === 'boolean' ? optionsOrLogRequest : false,
      logResponse: logResponse,
      logDuration: true,
      additionalInfo: logArgs,
    };
  }

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target?.constructor?.name !== 'Function' ? target?.constructor?.name : undefined;

    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const maskedArgs = options.logRequest ? maskArguments(args, options.maskParams) : undefined;

      const recordSuccess = (result: any) => {
        const end = performance.now();
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: options.level ?? 'info',
          method: propertyKey,
          className,
          args: maskedArgs,
          result: options.logResponse ? result : undefined,
          durationMs: options.logDuration ? end - start : undefined,
          additionalInfo: options.additionalInfo,
        };
        LoggerManager.dispatch(entry, options.transports);
      };

      const recordError = (error: any) => {
        const end = performance.now();
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: 'error',
          method: propertyKey,
          className,
          args: maskedArgs,
          durationMs: options.logDuration ? end - start : undefined,
          error: {
            name: error?.name ?? 'Error',
            message: error?.message ?? String(error),
            stack: error?.stack,
          },
          additionalInfo: options.additionalInfo,
        };
        LoggerManager.dispatch(entry, options.transports);
      };

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result
            .then((res) => {
              recordSuccess(res);
              return res;
            })
            .catch((err) => {
              recordError(err);
              throw err;
            });
        }

        recordSuccess(result);
        return result;
      } catch (err) {
        recordError(err);
        throw err;
      }
    };

    return descriptor;
  };
}