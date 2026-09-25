export interface RetryOptions {
  /**
   * Maximum number of attempts (including initial call). Defaults to 3.
   */
  maxAttempts?: number;
  /**
   * Initial delay in milliseconds before the first retry. Defaults to 100ms.
   */
  delayMs?: number;
  /**
   * Multiplier applied to delayMs on each consecutive failure. Defaults to 2 (exponential backoff).
   */
  backoffMultiplier?: number;
  /**
   * Maximum delay cap in milliseconds.
   */
  maxDelayMs?: number;
  /**
   * Predicate function to determine if the error is retryable. Defaults to retrying all errors.
   */
  retryIf?: (error: any) => boolean;
  /**
   * Optional callback invoked whenever a retry is triggered.
   */
  onRetry?: (error: any, attempt: number) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries a failed method execution with configurable attempts, delays, and exponential backoff.
 *
 * @example
 * @Retry({ maxAttempts: 3, delayMs: 500, backoffMultiplier: 2 })
 * async fetchExternalData() { ... }
 */
export function Retry(options?: RetryOptions) {
  const maxAttempts = options?.maxAttempts ?? 3;
  const initialDelay = options?.delayMs ?? 100;
  const backoffMultiplier = options?.backoffMultiplier ?? 2;
  const maxDelay = options?.maxDelayMs ?? Infinity;
  const retryIf = options?.retryIf ?? (() => true);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let attempt = 1;
      let delay = initialDelay;

      while (true) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (attempt >= maxAttempts || !retryIf(error)) {
            throw error;
          }

          if (options?.onRetry) {
            options.onRetry(error, attempt);
          }

          if (delay > 0) {
            await sleep(Math.min(delay, maxDelay));
            delay *= backoffMultiplier;
          }

          attempt++;
        }
      }
    };

    return descriptor;
  };
}
