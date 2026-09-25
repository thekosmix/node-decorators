export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export interface RateLimitOptions {
  /**
   * Maximum allowed calls within the window.
   */
  maxCalls: number;
  /**
   * Time window in milliseconds.
   */
  windowMs: number;
  /**
   * Optional custom key generator to partition rate limits (e.g. by userId or IP).
   */
  keyGenerator?: (...args: any[]) => string;
  /**
   * Optional custom error message.
   */
  message?: string;
}

/**
 * Enforces rate limiting on method executions using a sliding window algorithm.
 *
 * @example
 * @RateLimit({ maxCalls: 5, windowMs: 1000 })
 * sendEmail(to: string) { ... }
 */
export function RateLimit(options: RateLimitOptions) {
  const callRecords: Map<string, number[]> = new Map();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const now = Date.now();
      const rateKey = options.keyGenerator ? options.keyGenerator(...args) : 'global';

      let timestamps = callRecords.get(rateKey);
      if (!timestamps) {
        timestamps = [];
        callRecords.set(rateKey, timestamps);
      }

      // Filter out timestamps outside the sliding window
      const windowStart = now - options.windowMs;
      timestamps = timestamps.filter((t) => t > windowStart);
      callRecords.set(rateKey, timestamps);

      if (timestamps.length >= options.maxCalls) {
        const errorMsg =
          options.message ??
          `Rate limit exceeded for '${propertyKey}'. Max ${options.maxCalls} calls per ${options.windowMs}ms allowed.`;
        throw new RateLimitError(errorMsg);
      }

      timestamps.push(now);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
